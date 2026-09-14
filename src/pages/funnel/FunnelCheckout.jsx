import React, { useState, useMemo } from 'react';
import { X, Check, Loader, ImageOff, Gift, Sparkles } from 'lucide-react';
import { hexToRgba } from '../landing-simple/templates/themeUtils';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { getMediaUrl } from '../../services/api';
import { buscarOpcionDelivery, descripcionDelivery, etiquetaDelivery, prepararOpcionesDelivery } from '../../lib/deliveryOptions';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '', payment_method: 'efectivo',
};

/**
 * Checkout del embudo: UNA sola pantalla, sin pasar por el carrito.
 */
/**
 * El checkout tiene dos momentos comerciales distintos:
 * - order_bump: se muestra como checkbox chico antes del formulario.
 * - upsell: se muestra como paso de decisión después de que la persona ya
 *   completó sus datos, pero antes de crear el pedido. Así no se pierde si
 *   el cliente compra directo desde la ficha y nunca abre el carrito.
 */
const ESTRATEGIAS_CHECKOUT = ['order_bump', 'upsell'];

/**
 * Lo que se cobra si el visitante acepta la oferta acá. El backend ya manda
 * `precio_efectivo` resuelto; los fallbacks cubren ofertas servidas por una
 * versión anterior del DTO, que traían un único `precio`.
 */
function precioEnCheckout(oferta) {
  if (oferta?.precio_efectivo !== undefined && oferta.precio_efectivo !== null) return oferta.precio_efectivo;
  if (oferta?.precio_order_bump !== undefined && oferta.precio_order_bump !== null) return oferta.precio_order_bump;
  return oferta?.precio_normal ?? oferta?.precio ?? 0;
}

export default function FunnelCheckout({ abierto, onCerrar, onConfirmar, resumen, tema, ofertasLanding = [], itemOriginal = null, pasarelas = [], deliveryCiudades = [] }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [ciudadDeliveryInput, setCiudadDeliveryInput] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmado, setConfirmado] = useState(null);
  const [paso, setPaso] = useState('formulario'); // formulario | upsell
  const [formPendiente, setFormPendiente] = useState(null);
  const [upsellRevisado, setUpsellRevisado] = useState(false);
  // Varias ofertas a la vez: son casillas independientes, no un radio.
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());

  const hasPagoPar = pasarelas.some(p => p.provider === 'pagopar');
  const opcionesDelivery = useMemo(() => prepararOpcionesDelivery(deliveryCiudades), [deliveryCiudades]);
  const productoConEnvioIncluido = itemOriginal?.envio_incluido === true || itemOriginal?.envioIncluido === true;
  const opcionDeliverySeleccionada = opcionesDelivery.find(op =>
    op.ciudad === form.ciudad && (op.departamento || '') === (form.departamento || '')
  );
  const itemsDelivery = [{ cantidad: resumen?.cantidad || 1 }];
  const detalleDelivery = opcionDeliverySeleccionada
    ? descripcionDelivery(opcionDeliverySeleccionada, productoConEnvioIncluido, formatPrecio, { items: itemsDelivery, paymentMethod: form.payment_method })
    : null;

  const ofertasCheckout = useMemo(() => {
    if (!itemOriginal?.ofertas?.length) return [];
    // Se compara por número: la config de la landing guarda ids numéricos,
    // pero puede venir de un JSON donde quedaron como strings.
    //
    // Importante: la selección explícita es por estrategia. Si el comercio
    // marcó un order bump en la landing, eso no debe apagar los upsells del
    // mismo producto. Antes una lista con cualquier id hacía de filtro global
    // y por eso el upsell podía estar creado, activo y aun así no aparecer.
    const habilitadas = new Set(ofertasLanding.map(Number));
    const hayConfigParaEstrategia = estrategia => itemOriginal.ofertas.some(o =>
      o.estrategia === estrategia && habilitadas.has(Number(o.id))
    );
    return itemOriginal.ofertas.filter(o => {
      if (!ESTRATEGIAS_CHECKOUT.includes(o.estrategia)) return false;
      return !hayConfigParaEstrategia(o.estrategia) || habilitadas.has(Number(o.id));
    });
  }, [itemOriginal, ofertasLanding]);

  const orderBumps = useMemo(
    () => ofertasCheckout.filter(o => o.estrategia === 'order_bump'),
    [ofertasCheckout]
  );
  const upsells = useMemo(
    () => ofertasCheckout.filter(o => o.estrategia === 'upsell'),
    [ofertasCheckout]
  );

  const ofertasElegidas = useMemo(
    () => ofertasCheckout.filter(o => seleccionadas.has(o.id)),
    [ofertasCheckout, seleccionadas]
  );
  
  const total = (resumen?.precio || 0) + Array.from(seleccionadas).reduce((sum, id) => {
    const o = ofertasCheckout.find(x => x.id === id);
    return sum + (o ? precioEnCheckout(o) : 0);
  }, 0);
  // El delivery no se le cobra al comprador: su costo es interno (lo que el
  // comercio le paga al courier) y el pedido se registra sin él — ver
  // crearCheckout, donde el monto es subtotal − cupón. Sumarlo acá le
  // prometía al comprador un total distinto al que quedaba grabado.
  const totalConDelivery = total;

  function alternarOferta(ofertaId, elegida) {
    setSeleccionadas(prev => {
      const copia = new Set(prev);
      if (elegida) copia.add(ofertaId); else copia.delete(ofertaId);
      return copia;
    });
  }

  if (!abierto) return null;

  const bordeSuave = hexToRgba(tema.texto, 0.15);
  const valido = form.nombre_cliente.trim() && form.telefono.trim()
    && form.ciudad.trim() && form.direccion.trim() && acepta;

  function campo(clave, valor) {
    setForm(prev => ({ ...prev, [clave]: valor }));
  }

  function cerrar() {
    onCerrar();
    // Reset diferido: si se cierra a mitad del formulario o ya confirmado,
    // la próxima apertura arranca limpia.
    setTimeout(() => {
      setForm(FORM_VACIO);
      setCiudadDeliveryInput('');
      setAcepta(false);
      setError(null);
      setConfirmado(null);
      setPaso('formulario');
      setFormPendiente(null);
      setUpsellRevisado(false);
      setSeleccionadas(new Set());
    }, 200);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!valido) return;
    if (upsells.length > 0 && !upsellRevisado) {
      setFormPendiente(form);
      setPaso('upsell');
      setError(null);
      return;
    }
    await confirmarConOfertas(form, ofertasElegidas);
  }

  async function confirmarConOfertas(formulario, ofertas = ofertasElegidas) {
    setError(null);
    setEnviando(true);
    try {
      // Las ofertas aceptadas van como líneas APARTE del producto principal.
      // Antes se mandaba la oferta del bump EN LUGAR de la del producto, así
      // que el backend cobraba todo el pedido al precio promocional del bump.
      const res = await onConfirmar(formulario, ofertas);
      if (res?.payment_data?.payment_url) {
        window.location.href = res.payment_data.payment_url;
        return;
      }
      setConfirmado(res || {});
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el pedido. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function confirmarUpsell(aceptado) {
    const base = ofertasElegidas.filter(o => o.estrategia !== 'upsell');
    const ofertas = aceptado ? [...base, ...upsells] : base;
    setUpsellRevisado(true);
    confirmarConOfertas(formPendiente || form, ofertas);
  }

  function actualizarCiudadDelivery(valor) {
    setCiudadDeliveryInput(valor);
    const opcion = buscarOpcionDelivery(opcionesDelivery, valor);
    if (opcion) {
      setForm(prev => ({ ...prev, ciudad: opcion.ciudad, departamento: opcion.departamento || '' }));
    } else {
      setForm(prev => ({ ...prev, ciudad: '', departamento: '' }));
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '0.6rem',
    border: `1px solid ${bordeSuave}`,
    backgroundColor: hexToRgba(tema.texto, 0.04),
    color: tema.texto,
    fontSize: '0.9rem',
    outline: 'none',
  };
  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: '0.3rem',
    color: hexToRgba(tema.texto, 0.65),
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '440px',
          backgroundColor: tema.fondo, color: tema.texto,
          borderRadius: '1rem', padding: '1.5rem',
          position: 'relative', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {!confirmado && (
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: hexToRgba(tema.texto, 0.5) }}
          >
            <X size={20} />
          </button>
        )}

        {confirmado ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: hexToRgba(tema.acento, 0.15), color: tema.acento,
              }}
            >
              <Check size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>¡Pedido recibido!</h3>
            <p style={{ fontSize: '0.9rem', color: hexToRgba(tema.texto, 0.65), lineHeight: 1.5 }}>
              {confirmado.redirigido
                ? 'Te vamos a escribir por WhatsApp para coordinar el pago y la entrega.'
                : 'La tienda se va a contactar para coordinar el pago y la entrega.'}
            </p>
            <button
              type="button"
              onClick={cerrar}
              style={{
                marginTop: '1.5rem', width: '100%', padding: '0.75rem',
                borderRadius: '0.75rem', fontWeight: 700,
                backgroundColor: tema.acento, color: tema.fondo,
              }}
            >
              Cerrar
            </button>
          </div>
        ) : paso === 'upsell' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <button
              type="button"
              onClick={() => setPaso('formulario')}
              style={{ alignSelf: 'flex-start', fontSize: '0.85rem', color: hexToRgba(tema.texto, 0.65) }}
            >
              Volver
            </button>
            <p style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: tema.acento,
            }}>
              <Sparkles size={14} /> Oferta especial antes de confirmar
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 }}>
              ¿Querés mejorar tu pedido?
            </h3>
            <p style={{ fontSize: '0.9rem', color: hexToRgba(tema.texto, 0.66), lineHeight: 1.45 }}>
              Podés sumar esta mejora ahora y recibir todo en el mismo pedido.
            </p>

            {upsells.map(oferta => {
              const principal = oferta.producto_complementario || oferta.productos_incluidos?.[0] || null;
              const imgCruda = oferta.imagen || principal?.imagen;
              const img = typeof imgCruda === 'string' ? imgCruda : (imgCruda?.url || imgCruda?.ruta || null);
              const precio = precioEnCheckout(oferta);
              return (
                <div key={oferta.id} style={{
                  display: 'grid', gridTemplateColumns: '76px 1fr', gap: '0.85rem',
                  border: `1px solid ${bordeSuave}`, borderRadius: '0.85rem',
                  padding: '0.85rem', backgroundColor: hexToRgba(tema.texto, 0.03),
                }}>
                  <div style={{
                    width: 76, height: 76, borderRadius: '0.65rem', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: hexToRgba(tema.texto, 0.06),
                  }}>
                    {img ? <img src={getMediaUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Gift size={25} style={{ color: tema.acento }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', lineHeight: 1.25 }}>{oferta.nombre}</strong>
                    {(oferta.descripcion || principal?.nombre) && (
                      <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', color: hexToRgba(tema.texto, 0.62), lineHeight: 1.35 }}>
                        {oferta.descripcion || principal?.nombre}
                      </span>
                    )}
                    <span style={{ display: 'block', marginTop: '0.45rem', fontWeight: 900, fontSize: '1rem' }}>
                      {formatPrecio(precio)}
                    </span>
                  </div>
                </div>
              );
            })}

            {error && <p style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>{error}</p>}

            <button
              type="button"
              disabled={enviando}
              onClick={() => confirmarUpsell(true)}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '0.75rem',
                fontWeight: 900, backgroundColor: tema.acento, color: tema.fondo,
                opacity: enviando ? 0.55 : 1,
              }}
            >
              {enviando ? 'Confirmando...' : 'Sí, agregar a mi pedido'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => confirmarUpsell(false)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                fontWeight: 800, border: `1px solid ${bordeSuave}`,
                color: tema.texto, backgroundColor: 'transparent', opacity: enviando ? 0.55 : 1,
              }}
            >
              No, confirmar sin agregar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>Completá tu compra</h3>

            {/* Resumen: qué se está comprando exactamente, para que no haya
                sorpresas al confirmar. */}
            {resumen && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: '0.75rem',
                  border: `1px solid ${bordeSuave}`, marginBottom: '0.25rem',
                }}
              >
                <div
                  style={{
                    width: 46, height: 46, borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0,
                    backgroundColor: hexToRgba(tema.texto, 0.06),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {resumen.imagen
                    ? <img src={getMediaUrl(resumen.imagen)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImageOff size={18} style={{ color: hexToRgba(tema.texto, 0.3) }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{resumen.nombre}</p>
                  {resumen.variante && (
                    <p style={{ fontSize: '0.78rem', color: hexToRgba(tema.texto, 0.6) }}>{resumen.variante}</p>
                  )}
                </div>
                <strong style={{ fontSize: '1rem' }}>{formatPrecio(resumen.precio)}</strong>
              </div>
            )}

            {/* ORDER BUMP — va acá, entre el resumen y el formulario: el
                cliente ya decidió qué compra y todavía no empezó a completar
                datos, que es el momento en que sumar algo cuesta menos. No es
                otra página de venta: es una decisión chica y contextual. */}
            {orderBumps.length > 0 && (
              <div style={{ borderTop: `1px solid ${bordeSuave}`, paddingTop: '0.85rem', marginTop: '0.15rem' }}>
                <p style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em',
                  textTransform: 'uppercase', color: hexToRgba(tema.texto, 0.55),
                  marginBottom: '0.5rem',
                }}>
                  <Sparkles size={13} style={{ color: tema.acento }} /> Completá tu compra
                </p>

                {orderBumps.map(oferta => {
                  const principal = oferta.producto_complementario || oferta.productos_incluidos?.[0] || null;
                  const imgCruda = principal?.imagen;
                  const img = typeof imgCruda === 'string' ? imgCruda : (imgCruda?.url || imgCruda?.ruta || null);
                  const elegida = seleccionadas.has(oferta.id);
                  const precio = precioEnCheckout(oferta);
                  const precioNormal = oferta.precio_normal ?? oferta.precio;
                  // Solo se tacha si el promocional es de verdad más barato —
                  // si no, se vería un "antes" igual al "ahora".
                  const hayDescuento = precioNormal > precio;
                  const unidades = oferta.unidades > 1 ? oferta.unidades : null;
                  // Solo el order bump aparece acá (ver ESTRATEGIAS_CHECKOUT arriba):
                  // se describe por el producto que suma.
                  const detalle = principal?.nombre;
                  return (
                    <label key={oferta.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                      borderRadius: '0.5rem', border: `2px ${elegida ? 'solid' : 'dashed'}`,
                      borderColor: elegida ? tema.acento : bordeSuave,
                      backgroundColor: elegida ? hexToRgba(tema.acento, 0.06) : hexToRgba(tema.texto, 0.02),
                      cursor: 'pointer', marginTop: '0.4rem', transition: 'border-color 0.2s, background-color 0.2s',
                    }}>
                      <input
                        type="checkbox"
                        checked={elegida}
                        onChange={e => alternarOferta(oferta.id, e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: tema.acento }}
                      />
                      <div style={{ width: 44, height: 44, borderRadius: '0.25rem', overflow: 'hidden', backgroundColor: hexToRgba(tema.texto, 0.06), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {img ? <img src={getMediaUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Gift size={20} style={{ color: tema.acento }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: tema.texto, lineHeight: 1.2 }}>
                          {oferta.descripcion || oferta.nombre || `Agregar ${detalle || 'oferta'}`}
                        </span>
                        {detalle && (
                          <span style={{ fontSize: '0.72rem', color: hexToRgba(tema.texto, 0.55), lineHeight: 1.3, marginTop: '1px' }}>
                            {unidades ? `${unidades} × ` : ''}{detalle}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: tema.texto }}>{formatPrecio(precio)}</span>
                          {hayDescuento && (
                            <span style={{ fontSize: '0.75rem', color: hexToRgba(tema.texto, 0.5), textDecoration: 'line-through' }}>{formatPrecio(precioNormal)}</span>
                          )}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {error && (
              <p style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>{error}</p>
            )}

            <div>
              <label style={labelStyle}>Nombre y Apellido *</label>
              <input required value={form.nombre_cliente} onChange={e => campo('nombre_cliente', e.target.value)} placeholder="Nombre y Apellido" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Celular *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: hexToRgba(tema.texto, 0.6) }}>+595</span>
                <input required value={form.telefono} onChange={e => campo('telefono', e.target.value)} placeholder="9XX XXXXXX" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{opcionesDelivery.length > 0 ? 'Ciudad y departamento *' : 'Ciudad *'}</label>
              {opcionesDelivery.length > 0 ? (
                <>
                  <input
                    required
                    list="funnel-delivery-ciudades"
                    value={ciudadDeliveryInput}
                    onChange={e => actualizarCiudadDelivery(e.target.value)}
                    placeholder="Buscá tu ciudad..."
                    style={inputStyle}
                  />
                  <datalist id="funnel-delivery-ciudades">
                    {opcionesDelivery.map(op => (
                      <option key={op.id} value={op.label} label={descripcionDelivery(op, false, formatPrecio, { items: itemsDelivery, paymentMethod: form.payment_method }) || undefined} />
                    ))}
                  </datalist>
                  {detalleDelivery && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.76rem', color: hexToRgba(tema.texto, 0.58), lineHeight: 1.35 }}>
                      {etiquetaDelivery(opcionDeliverySeleccionada)} · {detalleDelivery}
                    </p>
                  )}
                </>
              ) : (
                <input required value={form.ciudad} onChange={e => campo('ciudad', e.target.value)} placeholder="Ciudad" style={inputStyle} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Dirección *</label>
              <input required value={form.direccion} onChange={e => campo('direccion', e.target.value)} placeholder="Calle y número de casa" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Referencia</label>
              <input value={form.referencia} onChange={e => campo('referencia', e.target.value)} placeholder="Opcional — un punto conocido cerca" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>RUC (factura)</label>
              <input value={form.ruc} onChange={e => campo('ruc', e.target.value)} placeholder="Opcional" style={inputStyle} />
            </div>

            {hasPagoPar && (
              <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: hexToRgba(tema.texto, 0.03), borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: tema.texto }}>Medio de pago</p>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer', color: tema.texto }}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="efectivo"
                    checked={form.payment_method === 'efectivo'}
                    onChange={() => campo('payment_method', 'efectivo')}
                    style={{ margin: 0, cursor: 'pointer', accentColor: tema.acento }}
                  />
                  <span style={{ fontSize: '0.85rem' }}>Pagar en efectivo al recibir</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: tema.texto }}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="pagopar"
                    checked={form.payment_method === 'pagopar'}
                    onChange={() => campo('payment_method', 'pagopar')}
                    style={{ margin: 0, cursor: 'pointer', accentColor: tema.acento }}
                  />
                  <span style={{ fontSize: '0.85rem' }}>Pago online (Tarjetas, QR, Tigo Money)</span>
                </label>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: hexToRgba(tema.texto, 0.7), cursor: 'pointer' }}>
              <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} style={{ marginTop: '0.15rem' }} />
              <span>Acepto que mis datos se usen para procesar este pedido.</span>
            </label>

            <button
              type="submit"
              disabled={!valido || enviando}
              style={{
                marginTop: '0.25rem', width: '100%', padding: '0.9rem',
                borderRadius: '0.75rem', fontWeight: 800, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                backgroundColor: tema.acento, color: tema.fondo,
                opacity: (!valido || enviando) ? 0.5 : 1,
                cursor: (!valido || enviando) ? 'not-allowed' : 'pointer',
              }}
            >
              {enviando
                ? <><Loader size={17} className="animate-spin" /> Enviando...</>
                : `Confirmar pedido — ${formatPrecio(totalConDelivery)}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
