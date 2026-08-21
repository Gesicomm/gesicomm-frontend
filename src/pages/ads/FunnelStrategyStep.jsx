import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, ShoppingCart, TrendingUp, Package, Check, Loader2, AlertTriangle,
  ExternalLink, ArrowLeft, Search, ImageOff, Star, Sparkles, Eye, Copy, Link2,
} from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { landingSimpleService } from '../../services/landingSimpleService';
import { tiendaService } from '../../services/tiendaService';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import CurrencyInput from '../../components/CurrencyInput';

/**
 * Paso "Funnel" del wizard de Nueva Campaña — solo se muestra con tipo='web'.
 *
 * No introduce una entidad nueva para "la estrategia elegida": se deriva en
 * vivo de qué Ofertas (order_bump/upsell/normal) tiene activas el producto.
 * Elegir una card = crear/editar esas Ofertas con ofertaService, que ya
 * existe — la estrategia es una lectura de esos datos, no una segunda
 * fuente de verdad.
 */

const ESTRATEGIAS = [
  {
    id: 'venta_rapida',
    icon: Zap,
    color: '#3b82f6',
    titulo: 'Vendé sin complicaciones',
    desc: 'Ideal si querés que el cliente pase del producto al checkout lo más rápido posible.',
    incluye: 'Incluye: producto, variantes, oferta opcional, compra directa.',
    cta: 'Usar esta estrategia',
  },
  {
    id: 'venta_complemento',
    icon: ShoppingCart,
    color: '#10b981',
    titulo: 'Sumá un complemento a cada compra',
    desc: 'Agregá un producto relacionado durante el proceso de compra.',
    incluye: 'Ideal para: zapatillas + medias, cámara + memoria, cafetera + cápsulas.',
    cta: 'Usar esta estrategia',
  },
  {
    id: 'maximizar_ticket',
    icon: TrendingUp,
    color: '#f59e0b',
    titulo: 'Aumentá el valor de cada pedido',
    desc: 'Combiná ofertas, order bumps y upsells para aprovechar mejor cada compra.',
    incluye: 'Más opciones de configuración.',
    cta: 'Usar esta estrategia',
  },
  {
    id: 'combo_especial',
    icon: Package,
    color: '#a78bfa',
    titulo: 'Creá una oferta completa',
    desc: 'Vendé varios productos juntos, con precio y rentabilidad propios.',
    incluye: 'Ideal para: kits, packs especiales, liquidaciones.',
    cta: 'Crear combo',
  },
];

function generarCodigo(prefijo, productoId) {
  return `${prefijo}-${productoId}-${Date.now().toString(36).toUpperCase()}`;
}

function nombreComplemento(oferta, productoActivoId) {
  const comp = (oferta.componentes || []).find(c => Number(c.producto_id) !== Number(productoActivoId));
  return comp?.producto?.nombre || oferta.nombre;
}

function computeRecomendacion(ofertas, productoActivoId) {
  const activas = (ofertas || []).filter(o => o.activo !== false);
  const bump = activas.find(o => o.estrategia === 'order_bump');
  const upsell = activas.find(o => o.estrategia === 'upsell');
  const total = activas.length;

  if (total === 0) {
    return { id: 'venta_rapida', razon: 'Todavía no tenés ofertas ni combos cargados para este producto.' };
  }
  if (bump && !upsell && total === 1) {
    return { id: 'venta_complemento', razon: `Tenés un complemento configurado: ${nombreComplemento(bump, productoActivoId)}.` };
  }
  if (total >= 2) {
    return { id: 'maximizar_ticket', razon: `Tenés ${total} ofertas configuradas que pueden ayudarte a aumentar el valor del pedido.` };
  }
  return { id: 'venta_rapida', razon: 'Todavía no tenés ofertas ni combos cargados para este producto.' };
}

/* ─── Estilos compartidos (mismos tokens que CampanaInternaModal) ───────── */
const s = {
  card: { border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', background: '#141416', padding: '1rem' },
  label: { fontSize: '0.82rem', color: '#aaa', display: 'block', marginBottom: '0.35rem' },
  input: { width: '100%' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  muted: { fontSize: '0.78rem', color: '#777' },
  err: { fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem' },
};

/* ─── Selector de producto (campañas con más de un producto) ────────────── */
function SelectorProducto({ productos, productoIds, onElegir }) {
  const elegibles = productos.filter(p => productoIds.includes(p.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={s.muted}>Un funnel es siempre de un solo producto. ¿Para cuál de los elegidos lo armamos?</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
        {elegibles.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onElegir(p.id)}
            style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left', cursor: 'pointer', padding: '0.6rem' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#1a1a1c', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.imagenes?.[0]?.url ? <img src={getMediaUrl(p.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOff size={16} color="#444" />}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{p.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Cards de estrategia ─────────────────────────────────────────────── */
function SelectorEstrategia({ recomendacion, landingActual, onElegir }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>¿Cómo querés vender este producto?</p>
        <p style={{ ...s.muted, margin: '2px 0 0' }}>Elegí el enfoque. Después podés cambiarlo sin perder lo que ya configuraste.</p>
      </div>
      {landingActual && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
          <Check size={15} color="#34d399" />
          <span style={{ fontSize: '0.8rem', color: '#c4c4c8' }}>
            La página ya existe en tu landing — la estrategia solo cambia qué se ofrece durante la compra.
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {ESTRATEGIAS.map(e => {
          const Icon = e.icon;
          const recomendada = recomendacion.id === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onElegir(e.id)}
              style={{
                ...s.card, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                border: recomendada ? `1.5px solid ${e.color}` : s.card.border,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon size={20} color={e.color} />
                {recomendada && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: e.color, fontWeight: 700 }}>
                    <Star size={11} fill={e.color} /> RECOMENDADO
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{e.titulo}</div>
              <div style={{ fontSize: '0.76rem', color: '#999', lineHeight: 1.4 }}>{e.desc}</div>
              <div style={{ fontSize: '0.7rem', color: '#666' }}>{e.incluye}</div>
              {recomendada && <div style={{ fontSize: '0.7rem', color: e.color, marginTop: '2px' }}>{recomendacion.razon}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Selector compacto de producto complementario ───────────────────── */
function SelectorComplementario({ productos, excluirId, value, onChange }) {
  const [busqueda, setBusqueda] = useState('');
  const elegido = productos.find(p => p.id === Number(value));
  const opciones = productos
    .filter(p => p.id !== excluirId)
    .filter(p => !busqueda.trim() || p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .slice(0, 30);

  return (
    <div>
      <label style={s.label}>Producto complementario</label>
      {elegido ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.08)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, overflow: 'hidden', background: '#1a1a1c', flexShrink: 0 }}>
            {elegido.imagenes?.[0]?.url ? <img src={getMediaUrl(elegido.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#fff', flex: 1 }}>{elegido.nombre}</span>
          <button type="button" onClick={() => onChange('')} style={{ fontSize: '0.72rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>Cambiar</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: '1.8rem', width: '100%' }}
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: '140px', overflowY: 'auto', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {opciones.length === 0 ? (
              <span style={{ ...s.muted, padding: '0.4rem 0' }}>Sin resultados.</span>
            ) : opciones.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.4rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, overflow: 'hidden', background: '#1a1a1c', flexShrink: 0 }}>
                  {p.imagenes?.[0]?.url ? <img src={getMediaUrl(p.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#ddd' }}>{p.nombre}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Form de Order Bump / Upsell — misma forma, distinta estrategia ───── */
function SugerenciaForm({ tipo, productoActivoId, productos, ofertaExistente, onGuardado, onError }) {
  const label = tipo === 'order_bump' ? 'Order Bump' : 'Upsell';
  const copyEnCarrito = tipo === 'order_bump' ? '"¿Agregás esto?"' : '"También te puede interesar"';
  const compExistenteId = ofertaExistente ? (ofertaExistente.componentes || []).find(c => Number(c.producto_id) !== Number(productoActivoId))?.producto_id || '' : '';

  const [complementarioId, setComplementarioId] = useState(compExistenteId);
  const [precio, setPrecio] = useState(ofertaExistente?.precio || '');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [validacion, setValidacion] = useState(null);

  useEffect(() => {
    setComplementarioId(compExistenteId);
    setPrecio(ofertaExistente?.precio || '');
  }, [ofertaExistente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    if (!complementarioId || !precio || Number(precio) <= 0) {
      setValidacion('Elegí un producto complementario y un precio válido.');
      return;
    }
    setValidacion(null);
    setGuardando(true);
    try {
      const nombreComp = productos.find(p => p.id === Number(complementarioId))?.nombre || 'Complemento';
      const payload = {
        codigo: ofertaExistente?.codigo || generarCodigo(tipo === 'order_bump' ? 'OB' : 'UP', productoActivoId),
        nombre: `${label} — ${nombreComp}`,
        tipo_contenido: 'combo',
        estrategia: tipo,
        precio: Number(precio),
        activo: true,
        componentes: [
          { producto_id: productoActivoId, cantidad: 1, descuento_porcentaje: 0 },
          { producto_id: Number(complementarioId), cantidad: 1, descuento_porcentaje: 0 },
        ],
      };
      if (ofertaExistente) await ofertaService.actualizar(ofertaExistente.id, payload);
      else await ofertaService.crear(productoActivoId, payload);
      setGuardado(true);
      onGuardado?.();
      setTimeout(() => setGuardado(false), 2200);
    } catch (err) {
      onError?.(err.response?.data?.message || err.message || `No pudimos guardar el ${label.toLowerCase()}. Probá de nuevo.`);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar() {
    if (!ofertaExistente) return;
    setGuardando(true);
    try {
      await ofertaService.actualizar(ofertaExistente.id, { activo: false });
      onGuardado?.();
    } catch (err) {
      onError?.(err.response?.data?.message || err.message || 'No pudimos desactivarlo. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{label}</span>
        <span style={s.muted}>Aparece en el carrito como {copyEnCarrito}</span>
      </div>

      <SelectorComplementario productos={productos} excluirId={productoActivoId} value={complementarioId} onChange={setComplementarioId} />

      <div>
        <label style={s.label}>Precio del {label.toLowerCase()}</label>
        <CurrencyInput className="filter-input" value={precio} onChange={setPrecio} style={{ width: '100%' }} />
      </div>

      {validacion && <span style={s.err}>{validacion}</span>}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" className="btn-primary" onClick={guardar} disabled={guardando} style={s.btnPrimary}>
          {guardando ? <Loader2 size={14} className="animate-spin" /> : (guardado ? <Check size={14} /> : null)}
          {guardado ? 'Guardado' : `Guardar ${label.toLowerCase()}`}
        </button>
        {ofertaExistente && (
          <button type="button" className="btn-secondary" onClick={desactivar} disabled={guardando}>Desactivar</button>
        )}
      </div>
    </div>
  );
}

/* ─── Preview del recorrido (refleja el estado ya guardado) ────────────── */
function PreviewRecorrido({ producto, bump, upsell }) {
  const box = { border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', background: '#0f0f10', padding: '0.7rem 0.9rem', width: '100%', maxWidth: '300px' };
  const arrow = { textAlign: 'center', color: '#555', fontSize: '0.9rem', padding: '2px 0' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, margin: '0.5rem 0' }}>
      <div style={box}>
        <div style={{ fontSize: '0.65rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</div>
        <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{producto?.nombre || '—'}</div>
      </div>
      <div style={arrow}>↓</div>
      <div style={box}>
        <div style={{ fontSize: '0.65rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carrito</div>
        <div style={{ fontSize: '0.8rem', color: bump ? '#fff' : '#555', marginTop: '4px' }}>
          {bump ? `☑ ${nombreComplemento(bump, producto?.id)} — ${formatPrecio(bump.precio)}` : '☐ (sin order bump activo)'}
        </div>
        {bump && <div style={{ fontSize: '0.65rem', color: '#666' }}>⭐ Complemento recomendado</div>}
        <div style={{ fontSize: '0.8rem', color: upsell ? '#fff' : '#555', marginTop: '6px' }}>
          {upsell ? `${nombreComplemento(upsell, producto?.id)} — ${formatPrecio(upsell.precio)}` : '(sin upsell activo)'}
        </div>
        {upsell && <div style={{ fontSize: '0.65rem', color: '#666' }}>🚀 También te puede interesar</div>}
      </div>
      <div style={arrow}>↓</div>
      <div style={{ ...box, textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Checkout</div>
      </div>
    </div>
  );
}

/* ─── Panel: Venta rápida ────────────────────────────────────────────── */
function PanelVentaRapida({ ofertas, guardando, onConfirmar }) {
  const activas = (ofertas || []).filter(o => o.activo !== false && o.estrategia !== 'normal');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={s.muted}>El cliente pasa del producto directo al checkout de una pantalla. Sin order bump ni upsell.</p>
      {activas.length > 0 && (
        <div style={{ ...s.card, display: 'flex', gap: '0.5rem', background: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.3)' }}>
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '0.8rem', color: '#e0b978' }}>
            Tenés {activas.length} oferta{activas.length === 1 ? '' : 's'} de order bump/upsell activa{activas.length === 1 ? '' : 's'}. Con esta estrategia no se muestran en el checkout de una pantalla, pero siguen existiendo — podés desactivarlas desde "Maximizar ticket" si ya no las querés usar.
          </span>
        </div>
      )}
      <button type="button" className="btn-primary" onClick={onConfirmar} disabled={guardando} style={s.btnPrimary}>
        {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Usar esta estrategia
      </button>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────────────── */
export default function FunnelStrategyStep({ productos, productoIds, setLandingId, onError }) {
  const [productoActivoId, setProductoActivoId] = useState(productoIds.length === 1 ? productoIds[0] : null);
  const [ofertas, setOfertas] = useState([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(false);
  const [estrategiaAbierta, setEstrategiaAbierta] = useState(null);
  const [mensajeCombo, setMensajeCombo] = useState(false);
  const [tienda, setTienda] = useState(null);
  const [landingTienda, setLandingTienda] = useState(undefined); // undefined = cargando
  const [copiado, setCopiado] = useState(false);

  const producto = productos.find(p => p.id === productoActivoId);

  // Un funnel de venta directa NO es una landing aparte: es la página de
  // producto de la landing del comercio (la de /landing, template rígido).
  // Así hereda header, footer, redes y colores sin configurarse dos veces
  // — el comercio solo completa fotos y descripción desde ahí.
  const urlPublica = tienda?.subdominio && producto?.slug
    ? `https://${tienda.subdominio}.gesicomm.com/${producto.slug}`
    : null;

  const publicada = !!landingTienda?.activo;

  function copiarUrl() {
    if (!urlPublica) return;
    navigator.clipboard.writeText(urlPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });
  }

  useEffect(() => {
    tiendaService.obtener().then(setTienda).catch(() => {});
    landingSimpleService.listar()
      .then(ls => {
        const propia = (ls || [])[0] || null;
        setLandingTienda(propia);
        // La campaña se vincula a la landing del comercio: es la página
        // donde realmente cae el tráfico del anuncio.
        if (propia?.id) setLandingId(propia.id);
      })
      .catch(() => setLandingTienda(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function recargarOfertas() {
    if (!productoActivoId) return;
    setCargandoOfertas(true);
    ofertaService.listarPorProducto(productoActivoId)
      .then(data => setOfertas(Array.isArray(data) ? data : []))
      .catch(() => setOfertas([]))
      .finally(() => setCargandoOfertas(false));
  }

  useEffect(() => {
    setEstrategiaAbierta(null);
    setMensajeCombo(false);
    recargarOfertas();
  }, [productoActivoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recomendacion = useMemo(() => computeRecomendacion(ofertas, productoActivoId), [ofertas, productoActivoId]);
  const bumpActivo = ofertas.find(o => o.activo !== false && o.estrategia === 'order_bump');
  const upsellActivo = ofertas.find(o => o.activo !== false && o.estrategia === 'upsell');

  // Abre el editor de la landing en la ficha de ESTE producto. El payload
  // va por sessionStorage, no por query string (misma convención que el
  // tab inicial de ProductForm).
  function abrirEditorDeContenido() {
    sessionStorage.setItem('gesicomm:landingProductoId', String(productoActivoId));
    window.open('/landing', '_blank', 'noopener');
  }

  async function onElegirEstrategia(id) {
    if (id === 'combo_especial') {
      window.open('/combos/nuevo', '_blank', 'noopener');
      setMensajeCombo(true);
      return;
    }
    setEstrategiaAbierta(id);
  }

  if (!productoActivoId) {
    return <SelectorProducto productos={productos} productoIds={productoIds} onElegir={setProductoActivoId} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {productoIds.length > 1 && (
        <button type="button" onClick={() => setProductoActivoId(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
          <ArrowLeft size={13} /> Elegir otro producto
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, overflow: 'hidden', background: '#1a1a1c', flexShrink: 0 }}>
          {producto?.imagenes?.[0]?.url ? <img src={getMediaUrl(producto.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
        </div>
        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, flex: 1 }}>{producto?.nombre}</span>

        {publicada ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
            <Check size={12} /> Publicada
          </span>
        ) : landingTienda ? (
          <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>Landing en borrador</span>
        ) : null}
      </div>

      <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link2 size={13} color="#888" />
          <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Link para tus anuncios
          </span>
        </div>

        {landingTienda === undefined ? (
          <span style={s.muted}>Cargando…</span>
        ) : !landingTienda ? (
          <span style={s.muted}>
            Todavía no armaste tu landing. Creala desde “Landing” y este link aparece solo.
          </span>
        ) : urlPublica ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem', color: '#34d399', wordBreak: 'break-all' }}>
              {urlPublica}
            </code>
            <button type="button" className="btn-secondary" onClick={copiarUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 10px' }}>
              {copiado ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 10px', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Ver
            </a>
          </div>
        ) : (
          <span style={s.muted}>Este producto no tiene enlace propio todavía.</span>
        )}

        {landingTienda && !publicada && (
          <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
            Tu landing está en borrador — publicala desde “Landing” para que este link funcione.
          </span>
        )}

        <span style={{ ...s.muted, fontSize: '0.72rem' }}>
          El diseño, el header, el footer y las redes salen de tu landing — no se configuran de nuevo acá.
        </span>

        {landingTienda && (
          <button
            type="button"
            onClick={abrirEditorDeContenido}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}
          >
            Editar fotos y descripción de este producto <ExternalLink size={11} />
          </button>
        )}
      </div>

      {mensajeCombo && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.3)' }}>
          <ExternalLink size={15} color="#a78bfa" />
          <span style={{ fontSize: '0.8rem', color: '#c4c4c8' }}>Se abrió el editor de combos en una pestaña nueva. Cuando termines, podés volver acá y seguir con la campaña.</span>
        </div>
      )}

      {cargandoOfertas ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={22} color="#a78bfa" /></div>
      ) : !estrategiaAbierta ? (
        <SelectorEstrategia recomendacion={recomendacion} landingActual={landingTienda} onElegir={onElegirEstrategia} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button type="button" onClick={() => setEstrategiaAbierta(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
            <ArrowLeft size={13} /> Volver a estrategias
          </button>

          {estrategiaAbierta === 'venta_rapida' && (
            <PanelVentaRapida ofertas={ofertas} guardando={false} onConfirmar={() => setEstrategiaAbierta(null)} />
          )}

          {estrategiaAbierta === 'venta_complemento' && (
            <SugerenciaForm
              tipo="order_bump"
              productoActivoId={productoActivoId}
              productos={productos}
              ofertaExistente={bumpActivo}
              onGuardado={recargarOfertas}
              onError={onError}
            />
          )}

          {estrategiaAbierta === 'maximizar_ticket' && (
            <>
              <div style={s.card}>
                <span style={{ fontSize: '0.8rem', color: '#ccc' }}>
                  <Sparkles size={13} style={{ marginRight: '4px', verticalAlign: '-2px' }} color="#f59e0b" />
                  Oferta principal (packs/combos "normales"): administralos desde la ficha del producto.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Payload por sessionStorage, no por query string — se
                    // copia a la pestaña nueva por ser same-origin y se
                    // consume una sola vez (ver ProductForm.jsx).
                    sessionStorage.setItem('gesicomm:tabInicial', 'ofertas');
                    window.open(`/products/${productoActivoId}/editar`, '_blank');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.4rem', padding: 0 }}
                >
                  Abrir ofertas del producto <ExternalLink size={12} />
                </button>
              </div>

              <SugerenciaForm tipo="order_bump" productoActivoId={productoActivoId} productos={productos} ofertaExistente={bumpActivo} onGuardado={recargarOfertas} onError={onError} />
              <SugerenciaForm tipo="upsell" productoActivoId={productoActivoId} productos={productos} ofertaExistente={upsellActivo} onGuardado={recargarOfertas} onError={onError} />

              <div>
                <div style={{ fontSize: '0.72rem', color: '#777', textAlign: 'center', margin: '0.3rem 0' }}>Así se ve el recorrido hoy</div>
                <PreviewRecorrido producto={producto} bump={bumpActivo} upsell={upsellActivo} />
              </div>
            </>
          )}

          {urlPublica && (
            <a
              href={urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#a78bfa', alignSelf: 'flex-start' }}
            >
              Ver cómo queda <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
