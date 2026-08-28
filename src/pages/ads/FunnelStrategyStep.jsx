import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, ShoppingCart, TrendingUp, Package, Check, Loader2, AlertTriangle,
  ExternalLink, ArrowLeft, Search, ImageOff, Star, Sparkles, Eye, Copy, Link2,
} from 'lucide-react';
import { ofertaService } from '../../services/ofertaService';
import { landingSimpleService } from '../../services/landingSimpleService';
import { funnelService } from '../../services/funnelService';
import ComplementoConfig from '../funnel/ComplementoConfig';
import { guardarComplementoDelFunnel, leerConfigComplemento, SLUG_VENTA_COMPLEMENTO } from '../funnel/complementoOferta';
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
    color: '#3d5fa3',
    titulo: 'Creá una oferta completa',
    desc: 'Vendé varios productos juntos, con precio y rentabilidad propios.',
    incluye: 'Ideal para: kits, packs especiales, liquidaciones.',
    cta: 'Crear combo',
  },
];

/**
 * Estrategias que se materializan en un EMBUDO propio (pages/funnel/), con
 * su slug de template. Las que no están acá siguen siendo solo configuración
 * de Ofertas sobre la landing del comercio.
 */
const ESTRATEGIAS_CON_EMBUDO = {
  venta_rapida: 'venta-directa',
  venta_complemento: SLUG_VENTA_COMPLEMENTO,
};

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
  card: { border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', borderRadius: '10px', background: 'var(--color-canvas)', padding: '1rem' },
  label: { fontSize: '0.82rem', color: 'var(--color-fg-muted)', display: 'block', marginBottom: '0.35rem' },
  input: { width: '100%' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  muted: { fontSize: '0.78rem', color: 'var(--color-fg-muted)' },
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
            <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--color-canvas)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.imagenes?.[0]?.url ? <img src={getMediaUrl(p.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOff size={16} color="var(--color-fg-subtle)" />}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-fg)', fontWeight: 600 }}>{p.nombre}</span>
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
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-fg)', fontWeight: 600 }}>¿Cómo querés vender este producto?</p>
        <p style={{ ...s.muted, margin: '2px 0 0' }}>Elegí el enfoque. Después podés cambiarlo sin perder lo que ya configuraste.</p>
      </div>
      {landingActual && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
          <Check size={15} color="#34d399" />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>
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
              <div style={{ fontWeight: 700, color: 'var(--color-fg)', fontSize: '0.88rem' }}>{e.titulo}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-fg-muted)', lineHeight: 1.4 }}>{e.desc}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-subtle)' }}>{e.incluye}</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(61, 95, 163,0.4)', background: 'rgba(61, 95, 163,0.08)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, overflow: 'hidden', background: 'var(--color-canvas)', flexShrink: 0 }}>
            {elegido.imagenes?.[0]?.url ? <img src={getMediaUrl(elegido.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-fg)', flex: 1 }}>{elegido.nombre}</span>
          <button type="button" onClick={() => onChange('')} style={{ fontSize: '0.72rem', color: '#3d5fa3', background: 'none', border: 'none', cursor: 'pointer' }}>Cambiar</button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fg-subtle)' }} />
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
                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--color-fg) 6%, transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, overflow: 'hidden', background: 'var(--color-canvas)', flexShrink: 0 }}>
                  {p.imagenes?.[0]?.url ? <img src={getMediaUrl(p.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>{p.nombre}</span>
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
        <span style={{ fontWeight: 700, color: 'var(--color-fg)', fontSize: '0.85rem' }}>{label}</span>
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
  const box = { border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', borderRadius: '8px', background: 'var(--color-canvas)', padding: '0.7rem 0.9rem', width: '100%', maxWidth: '300px' };
  const arrow = { textAlign: 'center', color: 'var(--color-fg-subtle)', fontSize: '0.9rem', padding: '2px 0' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, margin: '0.5rem 0' }}>
      <div style={box}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-fg)', fontWeight: 700 }}>{producto?.nombre || '—'}</div>
      </div>
      <div style={arrow}>↓</div>
      <div style={box}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carrito</div>
        <div style={{ fontSize: '0.8rem', color: bump ? 'var(--color-fg)' : 'var(--color-fg-subtle)', marginTop: '4px' }}>
          {bump ? `☑ ${nombreComplemento(bump, producto?.id)} — ${formatPrecio(bump.precio)}` : '☐ (sin order bump activo)'}
        </div>
        {bump && <div style={{ fontSize: '0.65rem', color: 'var(--color-fg-subtle)' }}>⭐ Complemento recomendado</div>}
        <div style={{ fontSize: '0.8rem', color: upsell ? 'var(--color-fg)' : 'var(--color-fg-subtle)', marginTop: '6px' }}>
          {upsell ? `${nombreComplemento(upsell, producto?.id)} — ${formatPrecio(upsell.precio)}` : '(sin upsell activo)'}
        </div>
        {upsell && <div style={{ fontSize: '0.65rem', color: 'var(--color-fg-subtle)' }}>🚀 También te puede interesar</div>}
      </div>
      <div style={arrow}>↓</div>
      <div style={{ ...box, textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>Checkout</div>
      </div>
    </div>
  );
}

/**
 * Estado "ya existe el embudo" — compartido por las dos estrategias que se
 * materializan en uno, para que digan lo mismo de la misma forma.
 */
function EmbudoListo({ funnel, urlFunnel, etiqueta }) {
  return (
    <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Check size={14} color="#34d399" />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>Embudo de {etiqueta} listo para este producto.</span>
      </div>
      {urlFunnel && (
        <code style={{ fontSize: '0.76rem', color: '#34d399', wordBreak: 'break-all' }}>{urlFunnel}</code>
      )}
      <a
        href={`/funnel/${funnel.id}`}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#3d5fa3', alignSelf: 'flex-start' }}
      >
        Editar contenido del embudo <ExternalLink size={11} />
      </a>
      {!funnel.activo && (
        <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
          Está en borrador — publicalo desde el editor para que el link funcione.
        </span>
      )}
    </div>
  );
}

/**
 * Un producto tiene UN embudo. Si ya tiene uno de otro tipo, esta estrategia
 * lo convertiría — se avisa antes en vez de cambiarlo por sorpresa.
 */
function AvisoCambioDeTipo({ funnel }) {
  return (
    <div style={{ ...s.card, display: 'flex', gap: '0.5rem', background: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.3)' }}>
      <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
      <span style={{ fontSize: '0.8rem', color: '#e0b978' }}>
        Este producto ya tiene un embudo de <b>{funnel.template?.name}</b>. Un
        producto tiene un solo embudo, así que continuar lo convierte a esta
        estrategia (el contenido que ya cargaste se conserva).
      </span>
    </div>
  );
}

/* ─── Panel: Venta rápida — usa el módulo de EMBUDOS propio ─────────────
   No es la página de producto de la landing del comercio (eso era el
   comportamiento viejo): "Venta Directa" es su propio Landing con
   template.kind='funnel', separado del editor de landing. Elegir esta
   estrategia crea (o reutiliza, es idempotente) el embudo del producto y
   lo deja linkeado a la campaña vía landingId — mismo id que
   MetaCampanaInterna.landing_id. ────────────────────────────────────── */
function PanelVentaRapida({ ofertas, onConfirmar, funnel, esDeEstaEstrategia, cargandoFunnel, creando, errorFunnel, urlFunnel, onCrearFunnel }) {
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

      {errorFunnel && <span style={s.err}>{errorFunnel}</span>}

      {cargandoFunnel ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <Loader2 size={18} className="animate-spin" color="#3d5fa3" />
        </div>
      ) : esDeEstaEstrategia ? (
        <EmbudoListo funnel={funnel} urlFunnel={urlFunnel} etiqueta="Venta Directa" />
      ) : (
        <>
          {funnel && <AvisoCambioDeTipo funnel={funnel} />}
          <button
            type="button"
            className="btn-primary"
            onClick={onCrearFunnel}
            disabled={creando}
            style={s.btnPrimary}
          >
            {creando ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {creando ? 'Creando…' : (funnel ? 'Convertir a Venta Directa' : 'Crear embudo de Venta Directa')}
          </button>
        </>
      )}

      <button type="button" className="btn-primary" onClick={onConfirmar} disabled={!esDeEstaEstrategia} style={s.btnPrimary}>
        <Check size={14} /> Usar esta estrategia
      </button>
    </div>
  );
}

/* ─── Panel: Venta con complemento ──────────────────────────────────────
   Misma estrategia que se arma desde Mis Productos, con el MISMO
   configurador (ComplementoConfig) — el complemento se elige antes de crear
   el embudo, nunca queda a medias. El order bump no es una sección de la
   página: se ofrece en el checkout (ver FunnelCheckout.jsx). ─────────── */
function PanelVentaComplemento({
  producto, funnel, esDeEstaEstrategia, cargandoFunnel, creando,
  errorFunnel, urlFunnel, complementoActual, onCrearFunnel, onConfirmar,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={s.muted}>
        El cliente compra tu producto principal y, justo antes de terminar, se
        le ofrece un complemento relacionado.
      </p>

      {errorFunnel && <span style={s.err}>{errorFunnel}</span>}

      {cargandoFunnel ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <Loader2 size={18} className="animate-spin" color="#3d5fa3" />
        </div>
      ) : esDeEstaEstrategia ? (
        <>
          <EmbudoListo funnel={funnel} urlFunnel={urlFunnel} etiqueta="Venta con complemento" />
          <span style={{ ...s.muted, fontSize: '0.74rem' }}>
            El complemento se cambia desde la pestaña “Complemento” del editor.
          </span>
        </>
      ) : (
        <>
          {funnel && <AvisoCambioDeTipo funnel={funnel} />}
          <div style={{ ...s.card }}>
            <ComplementoConfig
              producto={producto}
              complementoInicialId={complementoActual?.productoId || null}
              precioInicial={complementoActual?.precio ?? null}
              precioListaInicial={complementoActual?.precioLista ?? null}
              descripcionInicial={complementoActual?.descripcion || ''}
              cantidadInicial={complementoActual?.cantidad || 1}
              guardando={creando}
              textoConfirmar={funnel ? 'Convertir y guardar' : 'Crear embudo'}
              onConfirmar={onCrearFunnel}
            />
          </div>
        </>
      )}

      <button type="button" className="btn-primary" onClick={onConfirmar} disabled={!esDeEstaEstrategia} style={s.btnPrimary}>
        <Check size={14} /> Usar esta estrategia
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

  // Embudo de Venta Directa del producto activo — módulo propio (ver
  // pages/funnel/), nada que ver con landingTienda de acá arriba.
  // Un producto tiene UN embudo (funnelService.crear es idempotente) — este
  // es el que ya existe, sea del tipo que sea. Cada card sabe si coincide
  // con el suyo mirando funnel.template.slug.
  const [funnelDelProducto, setFunnelDelProducto] = useState(null);
  const [templatesFunnel, setTemplatesFunnel] = useState([]);
  const [cargandoFunnel, setCargandoFunnel] = useState(false);
  const [creandoFunnelId, setCreandoFunnelId] = useState(null);
  const [errorFunnel, setErrorFunnel] = useState(null);

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
    setFunnelDelProducto(null);
    setErrorFunnel(null);
    recargarOfertas();
  }, [productoActivoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al abrir una estrategia que se materializa en un embudo se busca el que
  // el producto ya tenga (funnelService.crear es idempotente) y se linkea la
  // campaña. Nunca se crea uno en silencio: cada panel pide primero lo que
  // su estrategia necesita.
  useEffect(() => {
    if (!ESTRATEGIAS_CON_EMBUDO[estrategiaAbierta] || !productoActivoId) return;
    let vivo = true;
    setCargandoFunnel(true);
    setErrorFunnel(null);
    setFunnelDelProducto(null);
    Promise.all([
      funnelService.porProducto(productoActivoId),
      funnelService.listarTemplates().catch(() => []),
    ])
      .then(([existente, tpls]) => {
        if (!vivo) return;
        setTemplatesFunnel(tpls || []);
        if (existente) {
          setFunnelDelProducto(existente);
          setLandingId(existente.id);
        }
      })
      .catch(err => {
        if (!vivo) return;
        setErrorFunnel(err?.response?.data?.message || err?.message || 'No se pudo cargar el embudo.');
      })
      .finally(() => { if (vivo) setCargandoFunnel(false); });
    return () => { vivo = false; };
  }, [estrategiaAbierta, productoActivoId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** El template de embudo que corresponde a la estrategia abierta. */
  function templateDe(slug) {
    return (templatesFunnel || []).find(t => t.slug === slug) || null;
  }

  /**
   * Crea (o convierte) el embudo del producto al tipo de esta estrategia y lo
   * deja vinculado a la campaña. `extras` lo usa Venta con complemento para
   * configurar el order bump en el mismo paso.
   */
  async function crearFunnel(slug, extras = null) {
    const tpl = templateDe(slug);
    if (!tpl) {
      setErrorFunnel('No se encontró el tipo de embudo. Probá recargar la página.');
      return;
    }
    setCreandoFunnelId(tpl.id);
    setErrorFunnel(null);
    try {
      let funnel = await funnelService.crear(productoActivoId, tpl.id);
      if (extras?.complementoId) {
        const nombreComplemento = productos.find(p => p.id === Number(extras.complementoId))?.nombre || 'Complemento';
        funnel = await guardarComplementoDelFunnel({
          funnel,
          productoId: Number(productoActivoId),
          complementoId: extras.complementoId,
          precio: extras.precio,
          precioLista: extras.precioLista,
          descripcion: extras.descripcion,
          cantidad: extras.cantidad,
          nombreComplemento,
          ofertaExistente: bumpActivo,
        });
        recargarOfertas();
      }
      setFunnelDelProducto(funnel);
      setLandingId(funnel.id);
    } catch (err) {
      setErrorFunnel(err?.response?.data?.message || err?.message || 'No se pudo crear el embudo.');
    } finally {
      setCreandoFunnelId(null);
    }
  }

  const urlFunnel = tienda?.subdominio && funnelDelProducto?.slug
    ? `https://${tienda.subdominio}.gesicomm.com/${funnelDelProducto.slug}`
    : null;


  const recomendacion = useMemo(() => computeRecomendacion(ofertas, productoActivoId), [ofertas, productoActivoId]);
  const bumpActivo = ofertas.find(o => o.activo !== false && o.estrategia === 'order_bump');
  const upsellActivo = ofertas.find(o => o.activo !== false && o.estrategia === 'upsell');

  // Si el producto ya tiene un order bump cargado (por el flujo viejo o por
  // otro embudo), el configurador arranca con esa config en vez de pedirla
  // de cero. Mismo lector que usa el editor del embudo — una sola fuente.
  const complementoActual = useMemo(
    () => leerConfigComplemento(bumpActivo, productoActivoId),
    [bumpActivo, productoActivoId]
  );

  // Abre el editor del funnel. Si no existe, lo crea automáticamente con el
  // primer template disponible para que el usuario no tenga que elegirlo de nuevo.
  async function abrirEditorDeContenido() {
    if (funnelDelProducto) {
      window.open(`/funnel/${funnelDelProducto.id}`, '_blank', 'noopener');
      return;
    }
    
    // Abrimos la pestaña sincronamente para evitar el bloqueador de popups
    const nuevaPestana = window.open('about:blank', '_blank', 'noopener');
    
    try {
      const existente = await funnelService.porProducto(productoActivoId);
      if (existente) {
        nuevaPestana.location.href = `/funnel/${existente.id}`;
        return;
      }
      
      const tpls = await funnelService.listarTemplates();
      if (tpls && tpls.length > 0) {
        const nuevo = await funnelService.crear(productoActivoId, tpls[0].id);
        nuevaPestana.location.href = `/funnel/${nuevo.id}`;
        return;
      }
    } catch (e) {
      console.error(e);
    }
    
    // Fallback original por si falla la API
    sessionStorage.setItem('gesicomm:landingProductoId', String(productoActivoId));
    nuevaPestana.location.href = '/landing';
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
        <button type="button" onClick={() => setProductoActivoId(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#3d5fa3', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
          <ArrowLeft size={13} /> Elegir otro producto
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, overflow: 'hidden', background: 'var(--color-canvas)', flexShrink: 0 }}>
          {producto?.imagenes?.[0]?.url ? <img src={getMediaUrl(producto.imagenes[0].url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-fg)', fontWeight: 600, flex: 1 }}>{producto?.nombre}</span>

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
          <Link2 size={13} color="var(--color-fg-muted)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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


      </div>

      {mensajeCombo && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(61, 95, 163,0.08)', borderColor: 'rgba(61, 95, 163,0.3)' }}>
          <ExternalLink size={15} color="#3d5fa3" />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>Se abrió el editor de combos en una pestaña nueva. Cuando termines, podés volver acá y seguir con la campaña.</span>
        </div>
      )}

      {cargandoOfertas ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={22} color="#3d5fa3" /></div>
      ) : !estrategiaAbierta ? (
        <SelectorEstrategia recomendacion={recomendacion} landingActual={landingTienda} onElegir={onElegirEstrategia} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button type="button" onClick={() => setEstrategiaAbierta(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#3d5fa3', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
            <ArrowLeft size={13} /> Volver a estrategias
          </button>

          {estrategiaAbierta === 'venta_rapida' && (
            <PanelVentaRapida
              ofertas={ofertas}
              onConfirmar={() => setEstrategiaAbierta(null)}
              funnel={funnelDelProducto}
              esDeEstaEstrategia={funnelDelProducto?.template?.slug === 'venta-directa'}
              cargandoFunnel={cargandoFunnel}
              creando={creandoFunnelId !== null}
              errorFunnel={errorFunnel}
              urlFunnel={urlFunnel}
              onCrearFunnel={() => crearFunnel('venta-directa')}
            />
          )}

          {estrategiaAbierta === 'venta_complemento' && (
            <PanelVentaComplemento
              producto={producto}
              funnel={funnelDelProducto}
              esDeEstaEstrategia={funnelDelProducto?.template?.slug === SLUG_VENTA_COMPLEMENTO}
              cargandoFunnel={cargandoFunnel}
              creando={creandoFunnelId !== null}
              errorFunnel={errorFunnel}
              urlFunnel={urlFunnel}
              complementoActual={complementoActual}
              onCrearFunnel={(datos) => crearFunnel(SLUG_VENTA_COMPLEMENTO, datos)}
              onConfirmar={() => setEstrategiaAbierta(null)}
            />
          )}

          {estrategiaAbierta === 'maximizar_ticket' && (
            <>
              <div style={s.card}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-fg)' }}>
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#3d5fa3', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.4rem', padding: 0 }}
                >
                  Abrir ofertas del producto <ExternalLink size={12} />
                </button>
              </div>

              <SugerenciaForm tipo="order_bump" productoActivoId={productoActivoId} productos={productos} ofertaExistente={bumpActivo} onGuardado={recargarOfertas} onError={onError} />
              <SugerenciaForm tipo="upsell" productoActivoId={productoActivoId} productos={productos} ofertaExistente={upsellActivo} onGuardado={recargarOfertas} onError={onError} />

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', textAlign: 'center', margin: '0.3rem 0' }}>Así se ve el recorrido hoy</div>
                <PreviewRecorrido producto={producto} bump={bumpActivo} upsell={upsellActivo} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
