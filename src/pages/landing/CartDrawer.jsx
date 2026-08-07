import React, { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ImageOff, Layers, ArrowLeft, Check, Loader } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '',
};

/**
 * El drawer ahora tiene tres pasos en vez de ir directo a WhatsApp:
 * carrito → formulario de checkout → confirmación. "Finalizar pedido" ya
 * no depende de que la tienda tenga WhatsApp configurado (antes SÍ era
 * obligatorio) — el pedido se crea igual, WhatsApp es un paso posterior
 * opcional que decide la propia landing (ver checkout.redirigir_whatsapp
 * en LandingPublica.jsx).
 */
export default function CartDrawer({ items, abierto, onAbrir, onCerrar, onCantidad, onQuitar, onConfirmarPedido }) {
  const [paso, setPaso] = useState('carrito'); // 'carrito' | 'formulario' | 'confirmado'
  const [form, setForm] = useState(FORM_VACIO);
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const cantidadTotal = items.reduce((s, it) => s + it.cantidad, 0);
  const subtotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const formularioValido = form.nombre_cliente.trim() && form.telefono.trim()
    && form.ciudad.trim() && form.direccion.trim() && acepta;

  function reiniciar() {
    setPaso('carrito');
    setForm(FORM_VACIO);
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

  async function enviarFormulario(e) {
    e.preventDefault();
    if (!formularioValido) return;
    setError(null);
    setEnviando(true);
    try {
      const res = await onConfirmarPedido(form);
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

                  <div className="lp-cart-subtotal">
                    <span>Total</span>
                    <strong>{formatPrecio(subtotal)}</strong>
                  </div>

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
