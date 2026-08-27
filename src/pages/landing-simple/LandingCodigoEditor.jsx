import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import { tiendaService } from '../../services/tiendaService';
import CodigoPreview from './CodigoPreview';
import { urlPublicaLanding } from './urlPublicaLanding';

/**
 * Editor del modo "Lienzo en blanco": tres campos de código (HTML/CSS/JS)
 * a la izquierda, la landing renderizada a la derecha. Hermano de
 * LandingSimpleEditor — misma barra superior (guardar, publicar, ver,
 * eliminar), mismo servicio, misma fila de Landing — pero acá no hay
 * paneles de contenido: lo que se ve es exactamente lo que el comercio
 * escribió.
 *
 * El preview corre el borrador SIN guardar, dentro del mismo iframe
 * aislado que usa la landing pública (CodigoPreview). Guardar es lo que
 * pasa el código por el sanitizador del servidor, así que puede devolver
 * el código recortado: por eso después de guardar el borrador se
 * reemplaza por lo que respondió el backend y se muestran las
 * advertencias ("te saqué los <script> del HTML").
 */

const TABS = [
  { key: 'html', label: 'HTML', lenguaje: 'html' },
  { key: 'css', label: 'CSS', lenguaje: 'css' },
  { key: 'js', label: 'JavaScript', lenguaje: 'js' },
  { key: 'ajustes', label: 'Ajustes', lenguaje: null },
];

const CODIGO_VACIO = { html: '', css: '', js: '' };

const ANCHOS_VIEWPORT = { desktop: '100%', tablet: '768px', mobile: '390px' };

export default function LandingCodigoEditor({ landingInicial, onEliminada }) {
  const { id: idParam } = useParams();
  const id = landingInicial?.id ?? idParam;
  const navigate = useNavigate();

  const [landing, setLanding] = useState(landingInicial || null);
  const [tienda, setTienda] = useState(null);
  const [cargando, setCargando] = useState(!landingInicial);
  const [codigo, setCodigo] = useState(landingInicial?.content?.codigo || CODIGO_VACIO);
  const [ajustes, setAjustes] = useState({ titulo: '', seo_titulo: '', seo_descripcion: '' });
  const [tab, setTab] = useState('html');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [erroresDetalle, setErroresDetalle] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);
  const [aviso, setAviso] = useState('');
  const [errorRuntime, setErrorRuntime] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewportMode, setViewportMode] = useState('desktop');

  // El preview se repinta con un borrador aparte y con retardo: recargar
  // el iframe en cada tecla hace que la landing parpadee sin parar y
  // reinicia el JS del comercio a mitad de una frase.
  const [codigoPreview, setCodigoPreview] = useState(landingInicial?.content?.codigo || CODIGO_VACIO);
  const temporizador = useRef(null);

  useEffect(() => {
    let activo = true;
    Promise.all([
      landingInicial ? Promise.resolve(landingInicial) : landingSimpleService.obtener(id),
      tiendaService.obtener().catch(() => null),
    ]).then(([l, t]) => {
      if (!activo) return;
      const inicial = { ...CODIGO_VACIO, ...(l.content?.codigo || {}) };
      setLanding(l);
      setCodigo(inicial);
      setCodigoPreview(inicial);
      setAjustes({
        titulo: l.titulo || '',
        seo_titulo: l.seo_titulo || '',
        seo_descripcion: l.seo_descripcion || '',
      });
      setTienda(t);
      setCargando(false);
    }).catch(() => {
      if (activo) { setError('No se pudo cargar la landing.'); setCargando(false); }
    });
    return () => { activo = false; };
  }, [id, landingInicial]);

  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setErrorRuntime('');
      setCodigoPreview(codigo);
    }, 600);
    return () => clearTimeout(temporizador.current);
  }, [codigo]);

  function escribir(clave, valor) {
    setCodigo(prev => ({ ...prev, [clave]: valor }));
    setAviso('');
  }

  // El iframe se remonta al refrescar (key nueva) — es la forma de volver
  // a correr el JS del comercio sin tocar el código.
  const [generacion, setGeneracion] = useState(0);
  const alErrorRuntime = useCallback((mensaje) => setErrorRuntime(mensaje), []);

  async function guardar() {
    setGuardando(true);
    setError('');
    setErroresDetalle([]);
    setAdvertencias([]);
    try {
      const actualizada = await landingSimpleService.actualizar(id, {
        titulo: ajustes.titulo,
        seo_titulo: ajustes.seo_titulo,
        seo_descripcion: ajustes.seo_descripcion,
        codigo,
      });
      const guardado = { ...CODIGO_VACIO, ...(actualizada.content?.codigo || {}) };
      setLanding(actualizada);
      setCodigo(guardado);
      setCodigoPreview(guardado);
      setAdvertencias(actualizada.codigo_advertencias || []);
      setAviso('Cambios guardados.');
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.message || 'No se pudo guardar.');
      setErroresDetalle(data?.errores || []);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(activo) {
    setError('');
    try {
      const actualizada = await landingSimpleService.cambiarEstado(id, activo);
      setLanding(prev => ({ ...prev, activo: actualizada.activo }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta landing? Se pierde todo el código escrito y no se puede deshacer.')) return;
    try {
      await landingSimpleService.eliminar(id);
      if (onEliminada) onEliminada();
      else navigate('/landing', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la landing.');
    }
  }

  // Tab dentro del textarea indenta en vez de saltar al control siguiente:
  // sin esto es imposible escribir código con el teclado.
  function alTeclear(e, clave) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const { selectionStart: ini, selectionEnd: fin, value } = el;
    const nuevo = `${value.slice(0, ini)}  ${value.slice(fin)}`;
    escribir(clave, nuevo);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = ini + 2; });
  }

  const publicUrl = useMemo(() => urlPublicaLanding(tienda, landing), [tienda, landing]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  const tabActiva = TABS.find(t => t.key === tab);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-fg/10 shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 -ml-2 text-fg/50 hover:text-fg transition-colors text-xs font-semibold bg-fg/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar editor de código' : 'Mostrar editor de código'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar código' : 'Mostrar código'}</span>
          </button>
          <div>
            <h1 className="text-sm font-bold truncate">{landing?.titulo || 'Landing en blanco'}</h1>
            {/* Se muestra la URL real a la que lleva "Ver": en local es la
                de este mismo entorno, no la de producción. */}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-fg/50 hover:text-fg/80">
              {publicUrl.startsWith('http') ? publicUrl.replace(/^https?:\/\//, '') : `${window.location.host}${publicUrl}`}
              <ExternalLink size={10} />
              {!landing?.activo && <span className="ml-1 text-amber-400/80">(sin publicar)</span>}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-fg/5 rounded-lg p-0.5 mr-2 border border-fg/10">
            {[['desktop', Monitor, 'Desktop'], ['tablet', Tablet, 'Tablet'], ['mobile', Smartphone, 'Mobile']].map(([modo, Icono, titulo]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setViewportMode(modo)}
                className={`p-1.5 rounded transition-colors ${viewportMode === modo ? 'bg-fg text-canvas' : 'text-fg/50 hover:text-fg'}`}
                title={titulo}
              >
                <Icono size={14} />
              </button>
            ))}
          </div>
          {aviso && <span className="text-xs text-emerald-400">{aviso}</span>}
          <button type="button" onClick={eliminar} className="p-2 rounded-lg hover:bg-red-500/10 text-fg/40 hover:text-red-400" title="Eliminar landing">
            <Trash2 size={16} />
          </button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-fg/10 text-fg/40 hover:text-fg" title="Ver landing pública">
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            onClick={() => cambiarEstado(!landing?.activo)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg"
          >
            {landing?.activo ? <><EyeOff size={13} /> Despublicar</> : <><Eye size={13} /> Publicar</>}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-fg text-canvas hover:bg-fg-muted disabled:opacity-50"
          >
            {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <p className="font-semibold">{error}</p>
          {erroresDetalle.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-red-200/90">
              {erroresDetalle.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {advertencias.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={14} /> Se guardó, pero con cambios</p>
          <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-amber-100/90">
            {advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className="w-[46%] max-w-[720px] min-w-[320px] shrink-0 border-r border-fg/10 flex flex-col min-h-0">
            <div className="flex gap-1 p-2 border-b border-fg/10">
              {TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-fg text-canvas' : 'text-fg/50 hover:bg-fg/10'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tabActiva?.lenguaje ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <textarea
                  key={tab}
                  value={codigo[tabActiva.lenguaje] || ''}
                  onChange={e => escribir(tabActiva.lenguaje, e.target.value)}
                  onKeyDown={e => alTeclear(e, tabActiva.lenguaje)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={PLACEHOLDERS[tabActiva.lenguaje]}
                  className="flex-1 min-h-0 w-full resize-none bg-black/40 text-fg/90 font-mono text-[12.5px] leading-[1.6] p-4 outline-none placeholder:text-fg/25"
                />
                <p className="px-4 py-2 border-t border-fg/10 text-[11px] text-fg/35">
                  {AYUDAS[tabActiva.lenguaje]}
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto">
                <Campo
                  etiqueta="Nombre de la landing"
                  ayuda="Solo lo ves vos, en el panel."
                  valor={ajustes.titulo}
                  onChange={v => { setAjustes(a => ({ ...a, titulo: v })); setAviso(''); }}
                />
                <Campo
                  etiqueta="Título para Google y redes"
                  ayuda="Lo que se lee en la pestaña del navegador y al compartir el link."
                  valor={ajustes.seo_titulo}
                  onChange={v => { setAjustes(a => ({ ...a, seo_titulo: v })); setAviso(''); }}
                />
                <Campo
                  etiqueta="Descripción para Google y redes"
                  ayuda="Dos líneas que resuman la oferta."
                  valor={ajustes.seo_descripcion}
                  onChange={v => { setAjustes(a => ({ ...a, seo_descripcion: v })); setAviso(''); }}
                  multilinea
                />
                <div className="pt-2 border-t border-fg/10 text-[11px] text-fg/40 leading-relaxed">
                  Tu código corre aislado: no puede leer la sesión de la tienda ni
                  mandar datos a otros servidores. Por eso el JavaScript no admite
                  <code className="mx-1 text-fg/60">fetch</code>,
                  <code className="mx-1 text-fg/60">localStorage</code> ni
                  <code className="mx-1 text-fg/60">document.cookie</code>.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-neutral-900/40">
          <div className="h-9 shrink-0 border-b border-fg/10 flex items-center justify-between px-3">
            <span className="text-[11px] text-fg/35">Vista previa en vivo</span>
            <div className="flex items-center gap-2">
              {errorRuntime && (
                <span className="text-[11px] text-red-300 truncate max-w-[420px]" title={errorRuntime}>
                  Error en tu JavaScript: {errorRuntime}
                </span>
              )}
              <button
                type="button"
                onClick={() => { setErrorRuntime(''); setGeneracion(g => g + 1); }}
                className="p-1.5 rounded hover:bg-fg/10 text-fg/40 hover:text-fg"
                title="Volver a ejecutar"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
            <div style={{ width: ANCHOS_VIEWPORT[viewportMode], maxWidth: '100%', height: '100%' }}>
              <CodigoPreview
                key={`${generacion}-${viewportMode}`}
                codigo={codigoPreview}
                titulo={ajustes.seo_titulo || ajustes.titulo}
                onError={alErrorRuntime}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, ayuda, valor, onChange, multilinea }) {
  const Elemento = multilinea ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-fg/70 mb-1">{etiqueta}</span>
      <Elemento
        value={valor}
        onChange={e => onChange(e.target.value)}
        rows={multilinea ? 3 : undefined}
        className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg/30"
      />
      {ayuda && <span className="block mt-1 text-[11px] text-fg/35">{ayuda}</span>}
    </label>
  );
}

const PLACEHOLDERS = {
  html: '<section class="hero">\n  <h1>Tu titular</h1>\n</section>',
  css: '.hero {\n  padding: 80px 24px;\n}',
  js: "document.querySelector('.cta')?.addEventListener('click', () => {\n  // ...\n});",
};

const AYUDAS = {
  html: 'Podés pegar una página completa: al guardar, su <style> y su <script> se mueven solos a las otras pestañas.',
  css: 'Se inyecta en un <style> propio. @import no está permitido: usá <link> en el HTML o @font-face.',
  js: 'Corre al final del body, dentro del iframe aislado. Sin fetch, localStorage ni acceso a la ventana contenedora.',
};
