import React, { useMemo, useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ImageOff, Layers, ArrowLeft, Check, Loader } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { buscarOpcionDelivery, descripcionDelivery, etiquetaDelivery, prepararOpcionesDelivery } from '../../lib/deliveryOptions';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '', payment_method: 'efectivo',
};

/**
 * El drawer ahora tiene tres pasos en vez de ir directo a WhatsApp:
 * carrito → formulario de checkout → confirmación. "Finalizar pedido" ya
 * no depende de que la tienda tenga WhatsApp configurado (antes SÍ era
 * obligatorio) — el pedido se crea igual, WhatsApp es un paso posterior
 * opcional que decide la propia landing (ver checkout.redirigir_whatsapp
 * en LandingPublica.jsx).
 */
export default function CartDrawer({ items, sugerencias = [], onAgregarSugerencia, abierto, onAbrir, onCerrar, onCantidad, onQuitar, onConfirmarPedido, onValidarCupon, pasarelas = [], deliveryCiudades = [] }) {
  const [paso, setPaso] = useState('carrito'); // 'carrito' | 'formulario' | 'confirmado'
  const [form, setForm] = useState(FORM_VACIO);
  const [ciudadDeliveryInput, setCiudadDeliveryInput] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Cupón: `codigoCupon` es lo que se está tipeando; `cupon` es el que el
  // servidor ya validó (con su descuento en guaraníes). Son dos cosas
  // distintas a propósito — mientras no haya validación no hay descuento.
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cupon, setCupon] = useState(null);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [errorCupon, setErrorCupon] = useState(null);

  async function aplicarCupon() {
    setValidandoCupon(true);
    setErrorCupon(null);
    try {
      const r = await onValidarCupon(codigoCupon);
      setCupon(r);
    } catch (err) {
      // El motivo lo escribe el backend ("vencido", "no aplica a tus
      // productos"): mostrarlo tal cual es lo que evita que la persona
      // reintente a ciegas.
      setErrorCupon(err?.response?.data?.message || 'No pudimos aplicar ese cupón.');
      setCupon(null);
    } finally {
      setValidandoCupon(false);
    }
  }

  function quitarCupon() {
    setCupon(null);
    setCodigoCupon('');
    setErrorCupon(null);
  }

  const cantidadTotal = items.reduce((s, it) => s + it.cantidad, 0);
  const subtotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const formularioValido = form.nombre_cliente.trim() && form.telefono.trim()
    && form.ciudad.trim() && form.direccion.trim() && acepta;

  const hasPagoPar = pasarelas.some(p => p.provider === 'pagopar');
  const opcionesDelivery = useMemo(() => prepararOpcionesDelivery(deliveryCiudades), [deliveryCiudades]);
  const pedidoConEnvioIncluido = items.length > 0 && items.every(it => it.envioIncluido === true || it.envio_incluido === true);
  const opcionDeliverySeleccionada = opcionesDelivery.find(op =>
    op.ciudad === form.ciudad && (op.departamento || '') === (form.departamento || '')
  );
  const detalleDelivery = opcionDeliverySeleccionada
    ? descripcionDelivery(opcionDeliverySeleccionada, pedidoConEnvioIncluido, formatPrecio)
    : null;
  const costoEnvioVisible = opcionDeliverySeleccionada && !pedidoConEnvioIncluido
    ? Number(opcionDeliverySeleccionada.costo) || 0
    : 0;
  const descuentoVisible = cupon ? (Number(cupon.descuento) || 0) : 0;
  const totalVisible = Math.max(0, subtotal - descuentoVisible) + costoEnvioVisible;

  function reiniciar() {
    setPaso('carrito');
    setForm(FORM_VACIO);
    setCiudadDeliveryInput('');
    setAcepta(false);
    setResultado(null);
    setError(null);
  }

  function cerrar() {
    onCerrar();
    // Reset diferido: si se cierra en medio del formulario o ya
    // confirmado, la próxima vez que se abra el drawer arranca de cero.
    if (paso !== 'carrito') setTimeout(reiniciar, 200);
  }

  function actualizarCampo(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
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

  async function enviarFormulario(e) {
    e.preventDefault();
    if (!formularioValido) return;
    setError(null);
    setEnviando(true);
    try {
      // El código viaja con el pedido; el backend lo revalida y recalcula
      // el descuento por su cuenta antes de cobrar.
      const res = await onConfirmarPedido({ ...form, cupon_codigo: cupon ? cupon.codigo : null });
      if (res?.payment_data?.payment_url) {
        window.location.href = res.payment_data.payment_url;
        return;
      }
      setResultado(res);
      setPaso('confirmado');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el pedido. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {cantidadTotal > 0 && !abierto && (
        <button type="button" className="lp-cart-fab" onClick={onAbrir}>
          <ShoppingCart size={20} />
          <span className="lp-cart-fab-badge">{cantidadTotal}</span>
        </button>
      )}

      {abierto && (
        <div className="lp-cart-overlay" onClick={cerrar} role="presentation">
          <aside className="lp-cart-drawer" onClick={e => e.stopPropagation()}>

            {paso === 'carrito' && (
              <>
                <header className="lp-cart-head">
                  <h3><ShoppingCart size={16} /> Tu pedido</h3>
                  <button type="button" className="lp-cart-close" onClick={cerrar}><X size={18} /></button>
                </header>

                {items.length === 0 ? (
                  <div className="lp-cart-vacio">
                    <ShoppingCart size={28} opacity={0.3} />
                    <p>Todavía no agregaste productos.</p>
                  </div>
                ) : (
                  <>
                    <div className="lp-cart-items">
                      {items.map(it => (
                        <div key={it.clave} className="lp-cart-item">
                          <div className="lp-cart-item-media">
                            {it.imagen ? (
                              <img src={getMediaUrl(it.imagen)} alt="" />
                            ) : (
                              it.tipo === 'combo' ? <Layers size={16} /> : <ImageOff size={16} />
                            )}
                          </div>
                          <div className="lp-cart-item-info">
                            <span className="lp-cart-item-nombre">{it.nombre}</span>
                            {it.ofertaNombre && <span className="lp-cart-item-variante">{it.ofertaNombre}</span>}
                            {it.varianteNombre && <span className="lp-cart-item-variante">{it.varianteNombre}</span>}
                            <span className="lp-cart-item-precio">{formatPrecio(it.precio)}</span>
                          </div>
                          <div className="lp-cart-item-acciones">
                            <div className="lp-cart-stepper">
                              <button type="button" onClick={() => onCantidad(it.clave, -1)}><Minus size={12} /></button>
                              <span>{it.cantidad}</span>
                              <button type="button" onClick={() => onCantidad(it.clave, 1)} disabled={it.stockMax != null && it.cantidad >= it.stockMax}><Plus size={12} /></button>
                            </div>
                            <button type="button" className="lp-cart-quitar" onClick={() => onQuitar(it.clave)} title="Quitar">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {sugerencias.length > 0 && (
                      <div className="lp-cart-sugerencias">
                        {sugerencias.map(({ item, oferta }) => (
                          <div key={oferta.id} className="lp-cart-sugerencia">
                            <div className="lp-cart-item-media">
                              {item.imagen ? <img src={getMediaUrl(item.imagen)} alt="" /> : <ImageOff size={16} />}
                            </div>
                            <div className="lp-cart-item-info">
                              <span className="lp-cart-item-nombre">
                                {oferta.estrategia === 'order_bump' ? '¿Agregás esto? ' : 'También te puede interesar: '}
                                {item.nombre} — {oferta.nombre}
                              </span>
                              {oferta.descripcion && <span className="lp-cart-item-variante">{oferta.descripcion}</span>}
                              {/* precio_efectivo = lo que el backend va a cobrar por esta
                                  oferta; los fallbacks cubren el DTO anterior a que
                                  precio normal y promocional fueran dos campos. */}
                              <span className="lp-cart-item-precio">
                                {formatPrecio(oferta.precio_efectivo ?? oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio)}
                              </span>
                            </div>
                            <button type="button" className="lp-cart-sugerencia-add" onClick={() => onAgregarSugerencia(item, oferta)} title="Agregar">
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <footer className="lp-cart-footer">
                      <div className="lp-cart-subtotal">
                        <span>Total</span>
                        <strong>{formatPrecio(subtotal)}</strong>
                      </div>
                      <button type="button" className="lp-cart-checkout" onClick={() => setPaso('formulario')}>
                        Finalizar pedido
                      </button>
                    </footer>
                  </>
                )}
              </>
            )}

            {paso === 'formulario' && (
              <>
                <header className="lp-cart-head">
                  <button type="button" className="lp-cart-back" onClick={() => setPaso('carrito')} title="Volver al carrito">
                    <ArrowLeft size={18} />
                  </button>
                  <h3>Completá tus datos</h3>
                  <button type="button" className="lp-cart-close" onClick={cerrar}><X size={18} /></button>
                </header>

                <form className="lp-checkout-form" onSubmit={enviarFormulario}>
                  {error && <p className="lp-checkout-error">{error}</p>}

                  <label className="lp-checkout-field">
                    <span>Nombre y Apellido <em>*</em></span>
                    <input
                      required
                      value={form.nombre_cliente}
                      onChange={e => actualizarCampo('nombre_cliente', e.target.value)}
                      placeholder="Nombre y Apellido"
                    />
                  </label>

                  <label className="lp-checkout-field">
                    <span>RUC (Factura Virtual)</span>
                    <input
                      value={form.ruc}
                      onChange={e => actualizarCampo('ruc', e.target.value)}
                      placeholder="Opcional"
                    />
                  </label>

                  <label className="lp-checkout-field">
                    <span>Celular <em>*</em></span>
                    <div className="lp-checkout-tel">
                      <span className="lp-checkout-tel-prefijo">+595</span>
                      <input
                        required
                        value={form.telefono}
                        onChange={e => actualizarCampo('telefono', e.target.value)}
                        placeholder="9XX XXXXXX"
                      />
                    </div>
                  </label>

                  {opcionesDelivery.length > 0 ? (
                    <label className="lp-checkout-field">
                      <span>Ciudad y departamento <em>*</em></span>
                      <input
                        required
                        list="lp-delivery-ciudades"
                        value={ciudadDeliveryInput}
                        onChange={e => actualizarCiudadDelivery(e.target.value)}
                        placeholder="Buscá tu ciudad..."
                      />
                      <datalist id="lp-delivery-ciudades">
                        {opcionesDelivery.map(op => (
                          <option key={op.id} value={op.label} label={descripcionDelivery(op, false, formatPrecio) || undefined} />
                        ))}
                      </datalist>
                      {detalleDelivery && (
                        <small className="lp-checkout-delivery-hint">
                          {etiquetaDelivery(opcionDeliverySeleccionada)} · {detalleDelivery}
                        </small>
                      )}
                    </label>
                  ) : (
                    <>
                      <label className="lp-checkout-field">
                        <span>Ciudad <em>*</em></span>
                        <input
                          required
                          value={form.ciudad}
                          onChange={e => actualizarCampo('ciudad', e.target.value)}
                          placeholder="Ciudad"
                        />
                      </label>

                      <label className="lp-checkout-field">
                        <span>Departamento</span>
                        <input
                          value={form.departamento}
                          onChange={e => actualizarCampo('departamento', e.target.value)}
                          placeholder="Departamento"
                        />
                      </label>
                    </>
                  )}

                  <label className="lp-checkout-field">
                    <span>Dirección <em>*</em></span>
                    <input
                      required
                      value={form.direccion}
                      onChange={e => actualizarCampo('direccion', e.target.value)}
                      placeholder="Nombre de la calle y número de casa"
                    />
                  </label>

                  <label className="lp-checkout-field">
                    <span>Referencia</span>
                    <input
                      value={form.referencia}
                      onChange={e => actualizarCampo('referencia', e.target.value)}
                      placeholder="Opcional — un punto conocido cerca"
                    />
                  </label>

                  <label className="lp-checkout-terminos">
                    <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
                    <span>Acepto que mis datos se usen para procesar este pedido.</span>
                  </label>

                  {hasPagoPar && (
                    <div className="lp-checkout-payment-methods" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111' }}>Medio de pago</p>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer', color: '#333' }}>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="efectivo"
                          checked={form.payment_method === 'efectivo'}
                          onChange={() => actualizarCampo('payment_method', 'efectivo')}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>Pagar en efectivo al recibir</span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#333' }}>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="pagopar"
                          checked={form.payment_method === 'pagopar'}
                          onChange={() => actualizarCampo('payment_method', 'pagopar')}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>Pago online (Tarjetas, QR, Tigo Money)</span>
                      </label>
                    </div>
                  )}

                  {/* ── Cupón de descuento ─────────────────────────────
                      El descuento que se muestra acá es solo informativo:
                      el backend lo vuelve a calcular al crear el pedido, así
                      que tocar esto en el navegador no cambia lo que se cobra. */}
                  {/* Solo donde la página sabe validar cupones. FunnelView y
                      TiendaPaginaView arman su propio confirmarPedido y todavía
                      no lo pasan: sin esta guarda, ahí el botón "Aplicar"
                      reventaría al llamar una función inexistente. */}
                  {onValidarCupon && (
                  <div className="lp-cart-cupon">
                    {cupon ? (
                      <div className="lp-cart-cupon-ok">
                        <Check size={15} />
                        <span>
                          Cupón <strong>{cupon.codigo}</strong> aplicado — {cupon.descuento_porcentaje}% de descuento
                        </span>
                        <button type="button" onClick={quitarCupon} title="Quitar el cupón">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="lp-cart-cupon-form">
                        <input
                          type="text"
                          placeholder="¿Tenés un cupón?"
                          value={codigoCupon}
                          onChange={e => { setCodigoCupon(e.target.value.toUpperCase()); setErrorCupon(null); }}
                          maxLength={40}
                        />
                        <button
                          type="button"
                          onClick={aplicarCupon}
                          disabled={!codigoCupon.trim() || validandoCupon}
                        >
                          {validandoCupon ? <Loader size={14} className="lp-spin" /> : 'Aplicar'}
                        </button>
                      </div>
                    )}
                    {errorCupon && <p className="lp-cart-cupon-error">{errorCupon}</p>}
                  </div>
                  )}

                  <div className="lp-cart-subtotal">
                    <span>Total</span>
                    <strong>{formatPrecio(subtotal)}</strong>
                  </div>

                  {opcionDeliverySeleccionada && (
                    <div className="lp-cart-subtotal lp-cart-delivery">
                      <span>Delivery</span>
                      <strong>{pedidoConEnvioIncluido ? 'Incluido' : formatPrecio(costoEnvioVisible)}</strong>
                    </div>
                  )}

                  {cupon && (
                    <>
                      <div className="lp-cart-subtotal lp-cart-descuento">
                        <span>Descuento ({cupon.descuento_porcentaje}%)</span>
                        <strong>− {formatPrecio(cupon.descuento)}</strong>
                      </div>
                      <div className="lp-cart-subtotal lp-cart-total-final">
                        <span>Total estimado</span>
                        <strong>{formatPrecio(totalVisible)}</strong>
                      </div>
                    </>
                  )}

                  {!cupon && opcionDeliverySeleccionada && !pedidoConEnvioIncluido && (
                    <div className="lp-cart-subtotal lp-cart-total-final">
                      <span>Total estimado</span>
                      <strong>{formatPrecio(totalVisible)}</strong>
                    </div>
                  )}

                  <button type="submit" className="lp-cart-checkout" disabled={!formularioValido || enviando}>
                    {enviando ? (<><Loader size={16} className="lp-spin" /> Enviando...</>) : 'Completá tu compra'}
                  </button>
                </form>
              </>
            )}

            {paso === 'confirmado' && (
              <div className="lp-cart-confirmado">
                <div className="lp-cart-confirmado-icono"><Check size={30} /></div>
                <h3>¡Pedido recibido!</h3>
                <p>
                  {resultado?.redirigido
                    ? 'Te vamos a escribir por WhatsApp para coordinar el pago y la entrega.'
                    : 'La tienda se va a contactar para coordinar el pago y la entrega.'}
                </p>
                <button type="button" className="lp-cart-checkout" onClick={cerrar}>Cerrar</button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
