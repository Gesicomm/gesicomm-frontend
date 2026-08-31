import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';

import { pageBuilderService, mensajeDeError } from '../../../services/pageBuilderService';
import { urlPublicaBuilder } from '../../../lib/urlPublicaBuilder';
import CodeTabs, { TABS } from './CodeTabs';
import CodeArea from './CodeArea';
import PreviewPanel from './PreviewPanel';
import EditorToolbar from './EditorToolbar';
import AdvertenciasBanner from './AdvertenciasBanner';
import AjustesPanel from './AjustesPanel';
import ImportarHtmlModal from './ImportarHtmlModal';
import VersionesPanel from '../versiones/VersionesPanel';

/**
 * El editor de una página: código a la izquierda, preview a la derecha.
 *
 * Tres cosas que parecen detalles y no lo son:
 *
 * 1. El preview se repinta con RETARDO (600 ms). Sin eso el iframe se
 *    recarga en cada tecla, la página parpadea y el JavaScript del
 *    usuario se reinicia a mitad de una frase.
 *
 * 2. Al guardar, el borrador local se REEMPLAZA por lo que devolvió el
 *    servidor. El código pasa por el sanitizador y puede volver
 *    recortado; si no se reemplazara, el editor mostraría un <script> que
 *    en la base ya no existe.
 *
 * 3. Guardar y publicar son dos acciones separadas. Guardar crea una
 *    versión y no toca lo que ve el visitante.
 */

const CODIGO_VACIO = { html: '', css: '', js: '' };
const RETARDO_PREVIEW = 600;

export default function PageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pagina, setPagina] = useState(null);
  const [codigo, setCodigo] = useState(CODIGO_VACIO);
  const [codigoPreview, setCodigoPreview] = useState(CODIGO_VACIO);
  const [ajustes, setAjustes] = useState({});
  const [tab, setTab] = useState('html');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [sucio, setSucio] = useState(false);

  const [errores, setErrores] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [mostrarVersiones, setMostrarVersiones] = useState(false);

  const temporizador = useRef(null);

  // ─── Carga ────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      const p = await pageBuilderService.obtenerPagina(id);
      const c = { ...CODIGO_VACIO, ...(p.codigo || {}) };
      setPagina(p);
      setCodigo(c);
      setCodigoPreview(c);
      setAjustes({
        nombre: p.nombre || '',
        slug: p.slug || '',
        seo_titulo: p.seo_titulo || '',
        seo_descripcion: p.seo_descripcion || '',
        og_titulo: p.og_titulo || '',
        og_descripcion: p.og_descripcion || '',
      });
      setSucio(false);
    } catch (err) {
      setErrorCarga(mensajeDeError(err, 'No se pudo cargar la página.'));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Preview con retardo ──────────────────────────────────────────
  // El HTML pasa por el backend antes de pintarse: resuelve los tokens de
  // navegación ({{siguiente}}, {{cta}}...) contra código sin guardar. Sin
  // esto, el iframe mostraba el token literal como href y un clic ahí
  // navegaba a esa URL cruda — es lo que rompía al "usar las etiquetas".
  // No persiste nada; es la misma resolución que usa la página pública.
  useEffect(() => {
    let activo = true;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      try {
        const res = await pageBuilderService.previsualizar(id, codigo);
        if (activo) setCodigoPreview({ ...codigo, html: res.codigo.html });
      } catch {
        // Si el preview falla (ej: la página se acaba de crear y todavía
        // no cargó), se muestra el código tal cual escrito antes que
        // dejar el panel congelado en blanco.
        if (activo) setCodigoPreview(codigo);
      }
    }, RETARDO_PREVIEW);
    return () => { activo = false; clearTimeout(temporizador.current); };
  }, [codigo, id]);

  // ─── Avisar antes de perder cambios ───────────────────────────────
  useEffect(() => {
    if (!sucio) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sucio]);

  // ─── Acciones ─────────────────────────────────────────────────────
  const guardar = useCallback(async () => {
    setGuardando(true);
    setErrores([]);
    setAdvertencias([]);
    try {
      // Los ajustes son metadatos de la página y van por su propio
      // endpoint; el código va como versión nueva. Se guardan juntos para
      // que "Guardar" signifique una sola cosa para el usuario.
      const actualizada = await pageBuilderService.actualizarPagina(id, ajustes);
      const res = await pageBuilderService.guardar(id, codigo);

      // Reemplazar el borrador con lo que devolvió el servidor: puede
      // venir recortado por el sanitizador.
      const limpio = { ...CODIGO_VACIO, ...res.codigo };
      setCodigo(limpio);
      setCodigoPreview(limpio);
      setAdvertencias(res.advertencias || []);
      setPagina({ ...actualizada, ...res.pagina });
      setSucio(false);
    } catch (err) {
      const data = err?.response?.data;
      setErrores(data?.errores?.length ? data.errores : [mensajeDeError(err, 'No se pudo guardar.')]);
    } finally {
      setGuardando(false);
    }
  }, [id, codigo, ajustes]);

  // Ctrl/Cmd+S guarda, como en cualquier editor.
  useEffect(() => {
    function alTeclado(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!guardando) guardar();
      }
    }
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [guardar, guardando]);

  async function publicar() {
    if (sucio && !window.confirm('Tenés cambios sin guardar. Se va a publicar la última versión guardada. ¿Seguir?')) return;
    setPublicando(true);
    setErrores([]);
    try {
      const res = await pageBuilderService.publicar(id);
      setPagina(p => ({ ...p, ...res.pagina }));
    } catch (err) {
      setErrores([mensajeDeError(err, 'No se pudo publicar.')]);
    } finally {
      setPublicando(false);
    }
  }

  async function despublicar() {
    if (!window.confirm('La página va a dejar de estar disponible para los visitantes. ¿Seguir?')) return;
    setPublicando(true);
    try {
      const res = await pageBuilderService.despublicar(id);
      setPagina(p => ({ ...p, ...res.pagina }));
    } catch (err) {
      setErrores([mensajeDeError(err, 'No se pudo despublicar.')]);
    } finally {
      setPublicando(false);
    }
  }

  function escribir(clave, valor) {
    setCodigo(prev => ({ ...prev, [clave]: valor }));
    setSucio(true);
  }

  function alImportar(nuevoCodigo, avisos) {
    setCodigo({ ...CODIGO_VACIO, ...nuevoCodigo });
    setAdvertencias(avisos);
    setErrores([]);
    setSucio(true);
    setTab('html');
  }

  // ─── Render ───────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Loader className="animate-spin text-fg-muted" />
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-canvas text-center">
        <p className="text-fg">{errorCarga}</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/page-builder')}>
          Volver al Page Builder
        </button>
      </div>
    );
  }

  const tabActual = TABS.find(t => t.clave === tab);
  const urlPublica = urlPublicaBuilder(pagina, pagina?.funnel, pagina?.url_publica);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <EditorToolbar
        pagina={pagina}
        hayCambiosSinGuardar={sucio}
        guardando={guardando}
        publicando={publicando}
        urlPublica={urlPublica}
        onVolver={() => {
          if (pagina.funnel_id) {
            navigate(`/page-builder/funnels/${pagina.funnel_id}`);
          } else {
            navigate(`/page-builder/p/${pagina.proyecto_id}`);
          }
        }}
        onImportar={() => setMostrarImportar(true)}
        onVersiones={() => setMostrarVersiones(true)}
        onGuardar={guardar}
        onPublicar={publicar}
        onDespublicar={despublicar}
      />

      <AdvertenciasBanner
        errores={errores}
        advertencias={advertencias}
        onCerrar={() => { setErrores([]); setAdvertencias([]); }}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col border-border lg:w-1/2 lg:border-r">
          <CodeTabs activa={tab} onCambiar={setTab} codigo={codigo} />

          <div className="min-h-0 flex-1">
            {tab === 'ajustes' ? (
              <AjustesPanel
                ajustes={ajustes}
                onCambio={(a) => { setAjustes(a); setSucio(true); }}
                pathPublico={pagina?.path_publico}
              />
            ) : (
              <CodeArea
                value={codigo[tab]}
                onChange={(v) => escribir(tab, v)}
                lenguaje={tabActual?.lenguaje}
                placeholder={
                  tab === 'html' ? 'Pegá o escribí el HTML de la página…' :
                  tab === 'css' ? 'Los estilos van acá…' :
                  'El JavaScript va acá…'
                }
              />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 lg:w-1/2">
          <PreviewPanel codigo={codigoPreview} titulo={ajustes.nombre} />
        </section>
      </div>

      {mostrarImportar && (
        <ImportarHtmlModal
          paginaId={id}
          onImportado={alImportar}
          onCerrar={() => setMostrarImportar(false)}
        />
      )}

      {mostrarVersiones && (
        <VersionesPanel
          paginaId={id}
          publicadaId={pagina?.published_version_id}
          borradorId={pagina?.draft_version_id}
          onCerrar={() => setMostrarVersiones(false)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
