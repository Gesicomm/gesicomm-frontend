import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader, Save, Trash2, ExternalLink, Eye, EyeOff, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeftOpen, ArrowLeft, Copy, Check,
} from 'lucide-react';
import { funnelService } from '../../services/funnelService';
import { productService } from '../../services/productService';
import { tiendaService } from '../../services/tiendaService';
import { verificarSesion } from '../../utils/auth';
import { mapEditorDraftToFunnelData } from './mapFunnelToTemplateData';
import VentaDirectaTemplate from './templates/VentaDirectaTemplate';
import ProductoPanel from './panels/ProductoPanel';
import ValorPanel from './panels/ValorPanel';
import BeneficiosPanel from './panels/BeneficiosPanel';
import ConfianzaPanel from './panels/ConfianzaPanel';
import OpinionesPanel from './panels/OpinionesPanel';
import FaqPanel from '../landing-simple/panels/FaqPanel';
import ColoresPanel from '../landing-simple/panels/ColoresPanel';
import RedesPanel from '../landing-simple/panels/RedesPanel';
import ComplementoPanel from './panels/ComplementoPanel';
import { ofertaService } from '../../services/ofertaService';
import {
  guardarComplementoDelFunnel, encontrarOfertaComplemento,
  productoDelComplemento, SLUG_VENTA_COMPLEMENTO,
} from './complementoOferta';

// Las tabs siguen el orden en que el comprador toma la decisión, no el
// orden en que es cómodo programarlas: producto → por qué → confianza →
// beneficios → opiniones → objeciones. "Complemento" va justo después de
// Producto porque es lo segundo que se vende, y solo existe en el embudo
// que realmente lo ofrece.
const TABS = [
  { key: 'producto', label: 'Producto' },
  { key: 'complemento', label: 'Complemento', soloEn: SLUG_VENTA_COMPLEMENTO },
  { key: 'valor', label: 'Propuesta' },
  { key: 'confianza', label: 'Confianza' },
  { key: 'beneficios', label: 'Beneficios' },
  { key: 'opiniones', label: 'Opiniones' },
  { key: 'faq', label: 'Preguntas' },
  { key: 'redes', label: 'Redes' },
  { key: 'colores', label: 'Colores' },
];

/**
 * Editor de EMBUDO — módulo propio, separado del editor de landing.
 *
 * No es un page builder: panel de configuración a la izquierda, preview en
 * vivo a la derecha, sin canvas de edición estructural ni "+ Agregar
 * sección". La estructura del embudo es fija a propósito (ver
 * VentaDirectaTemplate.jsx): si se pudiera reordenar, dejaría de ser un
 * embudo.
 *
 * El preview usa EL MISMO componente que la página pública, así nunca
 * pueden divergir.
 */
export default function FunnelEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [funnel, setFunnel] = useState(null);
  const [producto, setProducto] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [tienda, setTienda] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  // Ofertas del producto — de acá sale el complemento actualmente enlazado
  // al embudo (ver complementoOferta.js).
  const [ofertas, setOfertas] = useState([]);
  const [guardandoComplemento, setGuardandoComplemento] = useState(false);
  const [errorComplemento, setErrorComplemento] = useState(null);

  // Borrador local: el panel de la izquierda edita esto y el preview lo
  // refleja en vivo, sin esperar a un guardado (mismo patrón que
  // LandingSimpleEditor).
  const [draft, setDraft] = useState(null);
  const [content, setContent] = useState({});
  const [beneficios, setBeneficios] = useState([]);
  const [opiniones, setOpiniones] = useState([]);
  const [faq, setFaq] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState('producto');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewportMode, setViewportMode] = useState('desktop');
  const [desktopScale, setDesktopScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    funnelService.obtener(id)
      .then(async (f) => {
        if (!vivo) return;
        setFunnel(f);
        setDraft(f);
        setContent(f.content || {});
        setBeneficios((f.beneficios || []).map(b => ({ titulo: b.titulo, texto: b.texto })));
        setOpiniones((f.testimonios || []).map(t => ({
          nombre: t.nombre, calificacion: t.calificacion, comentario: t.comentario,
        })));
        setFaq((f.faq || []).map(q => ({ pregunta: q.pregunta, respuesta: q.respuesta })));

        const pid = f.producto_id;
        const [p, imgs, vars, t, sesion, ofs] = await Promise.all([
          pid ? productService.detalle(pid).catch(() => null) : Promise.resolve(null),
          pid ? productService.imagenes(pid).catch(() => []) : Promise.resolve([]),
          pid ? productService.variantes(pid).catch(() => []) : Promise.resolve([]),
          tiendaService.obtener().catch(() => null),
          verificarSesion().catch(() => null),
          pid ? ofertaService.listarPorProducto(pid, { soloActivas: true }).catch(() => []) : Promise.resolve([]),
        ]);
        if (!vivo) return;
        setProducto(p);
        setImagenes(imgs || []);
        setVariantes(vars || []);
        setUsuarioActual(sesion);
        setTienda(t);
        setOfertas(Array.isArray(ofs) ? ofs : []);

        if (p) {
          setContent(prev => ({
            ...prev,
            propuesta_valor: prev?.propuesta_valor || p.propuesta_valor || '',
            sobre_este_producto: prev?.sobre_este_producto || p.sobre_este_producto || '',
          }));

          setBeneficios(prev => {
            if (prev && prev.length > 0) return prev;
            return (p.beneficios || []).map(b => ({ titulo: b.titulo || '', texto: b.texto || '' }));
          });

          setFaq(prev => {
            if (prev && prev.length > 0) return prev;
            const pFaq = p.preguntas_frecuentes || p.faq || [];
            return pFaq.map(q => ({ pregunta: q.pregunta || '', respuesta: q.respuesta || '' }));
          });
        }

        setCargando(false);
      })
      .catch(() => {
        if (!vivo) return;
        setError('No se pudo cargar el embudo.');
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [id]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDesktopScale(Math.min(entry.contentRect.width / 1440, 1));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cargando]);

  // Qué complemento está ofreciendo hoy este embudo (si es del tipo que los
  // ofrece). Se deriva de la oferta enlazada en content.ofertas_producto_vista,
  // nunca se guarda por duplicado en el embudo.
  const esFunnelComplemento = funnel?.template?.slug === SLUG_VENTA_COMPLEMENTO;
  const ofertaComplemento = esFunnelComplemento ? encontrarOfertaComplemento(funnel, ofertas) : null;
  const complementoProductoId = ofertaComplemento
    ? productoDelComplemento(ofertaComplemento, funnel?.producto_id)
    : null;
  const tabsVisibles = TABS.filter(t => !t.soloEn || t.soloEn === funnel?.template?.slug);

  function campo(clave, valor) {
    setDraft(prev => ({ ...prev, [clave]: valor }));
    setAviso('');
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const actualizado = await funnelService.actualizar(id, {
        content,
        beneficios,
        testimonios: opiniones,
        faq,
        color_primario: draft.color_primario,
        color_fondo: draft.color_fondo,
        color_texto: draft.color_texto,
        contacto_whatsapp: draft.contacto_whatsapp,
        contacto_instagram: draft.contacto_instagram,
        contacto_facebook: draft.contacto_facebook,
        contacto_tiktok: draft.contacto_tiktok,
        contacto_youtube: draft.contacto_youtube,
        contacto_twitter: draft.contacto_twitter,
      });
      setFunnel(actualizado);
      setDraft(actualizado);
      setAviso('Cambios guardados.');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarComplemento({ complementoId, precio }) {
    setGuardandoComplemento(true);
    setErrorComplemento(null);
    try {
      const nombreComplemento = (await productService.detalle(complementoId).catch(() => null))?.nombre
        || 'Complemento';
      const actualizado = await guardarComplementoDelFunnel({
        funnel,
        productoId: funnel.producto_id,
        complementoId,
        precio,
        nombreComplemento,
        ofertaExistente: ofertaComplemento,
      });
      setFunnel(actualizado);
      setDraft(prev => ({ ...prev, content: actualizado.content }));
      setContent(actualizado.content || {});
      // Releer las ofertas: la que se acaba de crear/editar tiene que quedar
      // reflejada en el panel sin recargar la página.
      const ofs = await ofertaService.listarPorProducto(funnel.producto_id, { soloActivas: true }).catch(() => []);
      setOfertas(Array.isArray(ofs) ? ofs : []);
      setAviso('Complemento guardado.');
    } catch (err) {
      setErrorComplemento(err?.response?.data?.message || err?.message || 'No se pudo guardar el complemento.');
    } finally {
      setGuardandoComplemento(false);
    }
  }

  async function cambiarEstado(activo) {
    setError('');
    try {
      const actualizado = await funnelService.cambiarEstado(id, activo);
      setFunnel(actualizado);
      setDraft(prev => ({ ...prev, activo: actualizado.activo }));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar este embudo? Esta acción no se puede deshacer.')) return;
    try {
      await funnelService.eliminar(id);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el embudo.');
    }
  }

  if (cargando || !draft) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando embudo...
      </div>
    );
  }

  const datosPreview = mapEditorDraftToFunnelData(
    { ...draft, content, beneficios, testimonios: opiniones, faq },
    producto, imagenes, variantes, tienda,
  );

  // En local, resolverTienda.js (backend) NUNCA resuelve tienda por
  // hostname (esHostnameDeTienda() da false en 'localhost') — el subdominio
  // real de producción no sirve para probar acá. El fallback /l/:slug sí
  // funciona en cualquier entorno, así que en dev se linkea directo ahí en
  // vez de a una URL de producción que todavía no tiene este código.
  const enLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const urlPublica = enLocal
    ? `${window.location.origin}/l/${draft.slug}`
    : (tienda?.subdominio ? `https://${tienda.subdominio}.gesicomm.com/${draft.slug}` : `/l/${draft.slug}`);

  function copiarUrl() {
    navigator.clipboard.writeText(urlPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    });
  }

  const anchoPreview = viewportMode === 'mobile' ? '375px' : viewportMode === 'tablet' ? '768px' : '100%';

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior */}
      <div className="h-14 border-b border-white/10 shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/mi-catalogo')}
            className="p-2 -ml-2 text-white/50 hover:text-white transition-colors"
            title="Volver a la Vitrina B2B"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-1.5 p-2 text-white/50 hover:text-white transition-colors text-xs font-semibold bg-white/5 rounded-lg px-3"
            title={sidebarVisible ? 'Ocultar panel' : 'Mostrar panel'}
          >
            {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Embudo</span>
              <h1 className="text-sm font-bold truncate max-w-[240px]">{producto?.nombre || draft.nombre}</h1>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/45">
              <span className="truncate max-w-[260px]">{urlPublica.replace('https://', '')}</span>
              <button type="button" onClick={copiarUrl} title="Copiar link">
                {copiado ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
              {!draft.activo && <span className="text-amber-400">— borrador</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-1 border border-white/10">
            {[
              { modo: 'desktop', Icono: Monitor },
              { modo: 'tablet', Icono: Tablet },
              { modo: 'mobile', Icono: Smartphone },
            ].map(({ modo, Icono }) => (
              <button
                key={modo}
                type="button"
                onClick={() => setViewportMode(modo)}
                className={`p-1.5 rounded transition-colors ${viewportMode === modo ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                title={modo}
              >
                <Icono size={14} />
              </button>
            ))}
          </div>

          {aviso && <span className="text-xs text-emerald-400">{aviso}</span>}

          <button type="button" onClick={eliminar} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400" title="Eliminar embudo">
            <Trash2 size={16} />
          </button>
          <a href={urlPublica} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title="Ver embudo público">
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            onClick={() => cambiarEstado(!draft.activo)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
          >
            {draft.activo ? <><EyeOff size={13} /> Despublicar</> : <><Eye size={13} /> Publicar</>}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50"
          >
            {guardando ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
      )}

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <div className="w-80 shrink-0 border-r border-white/10 overflow-y-auto">
            <div className="grid grid-cols-4 gap-1 p-2 border-b border-white/10">
              {tabsVisibles.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-semibold text-center transition-colors ${tab === t.key ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {tab === 'producto' && (
                <ProductoPanel
                  producto={producto}
                  imagenes={imagenes}
                  variantes={variantes}
                  puedeEditar={usuarioActual?.rol === 'administrador' || (usuarioActual && producto?.creado_por === usuarioActual.id)}
                />
              )}
              {tab === 'complemento' && (
                <ComplementoPanel
                  producto={producto}
                  complementoId={complementoProductoId}
                  precio={ofertaComplemento?.precio_order_bump ?? ofertaComplemento?.precio_normal ?? null}
                  guardando={guardandoComplemento}
                  error={errorComplemento}
                  onGuardar={guardarComplemento}
                />
              )}
              {tab === 'valor' && <ValorPanel content={content} onContent={setContent} />}
              {tab === 'confianza' && <ConfianzaPanel content={content} onContent={setContent} />}
              {tab === 'beneficios' && <BeneficiosPanel beneficios={beneficios} onChange={setBeneficios} />}
              {tab === 'opiniones' && <OpinionesPanel opiniones={opiniones} onChange={setOpiniones} />}
              {tab === 'faq' && <FaqPanel faq={faq} onChange={setFaq} />}
              {tab === 'redes' && <RedesPanel draft={draft} onCampo={campo} />}
              {tab === 'colores' && <ColoresPanel draft={draft} onCampo={campo} />}
            </div>
          </div>
        )}

        <div ref={containerRef} className="flex-1 overflow-y-auto bg-black/30 flex justify-center w-full relative">
          {viewportMode === 'desktop' && desktopScale < 1 ? (
            // El transform:scale no cambia la caja de layout — sin compensar
            // la altura acá, el contenedor scrolleable calculaba scrollHeight
            // contra el tamaño SIN escalar y el scroll quedaba desalineado
            // (parecía "trabado"). Mismo truco que LandingSimpleEditor.jsx.
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', transform: `scale(${desktopScale})`, transformOrigin: 'top center' }}>
              <div style={{ width: '1440px', height: `${100 / desktopScale}%`, flexShrink: 0 }}>
                <VentaDirectaTemplate data={datosPreview} previewMode isMobile={false} />
              </div>
            </div>
          ) : (
            <div
              className="relative transition-all duration-300 ease-in-out"
              style={{
                width: anchoPreview,
                minHeight: '100%',
                boxShadow: viewportMode === 'desktop' ? 'none' : '0 0 40px rgba(0,0,0,0.5)',
                margin: viewportMode === 'desktop' ? 0 : '2rem auto',
                borderRadius: viewportMode === 'mobile' ? '36px' : viewportMode === 'tablet' ? '24px' : 0,
                border: viewportMode === 'desktop' ? 'none' : '12px solid #1c2230',
                overflow: 'hidden',
              }}
            >
              <VentaDirectaTemplate
                data={datosPreview}
                previewMode
                isMobile={viewportMode === 'mobile'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
