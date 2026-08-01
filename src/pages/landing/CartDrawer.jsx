import React from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ImageOff, Layers, MessageCircle } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';

export default function CartDrawer({ items, abierto, onAbrir, onCerrar, onCantidad, onQuitar, onCheckout, whatsappConfigurado }) {
  const cantidadTotal = items.reduce((s, it) => s + it.cantidad, 0);
  const subtotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);

  return (
    <>
      {cantidadTotal > 0 && !abierto && (
        <button type="button" className="lp-cart-fab" onClick={onAbrir}>
          <ShoppingCart size={20} />
          <span className="lp-cart-fab-badge">{cantidadTotal}</span>
        </button>
      )}

      {abierto && (
        <div className="lp-cart-overlay" onClick={onCerrar} role="presentation">
          <aside className="lp-cart-drawer" onClick={e => e.stopPropagation()}>
            <header className="lp-cart-head">
              <h3><ShoppingCart size={16} /> Tu pedido</h3>
              <button type="button" className="lp-cart-close" onClick={onCerrar}><X size={18} /></button>
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
                  {whatsappConfigurado ? (
                    <button type="button" className="lp-cart-checkout" onClick={onCheckout}>
                      <MessageCircle size={16} /> Finalizar pedido por WhatsApp
                    </button>
                  ) : (
                    <p className="lp-cart-sin-whatsapp">Esta tienda no tiene WhatsApp configurado todavía.</p>
                  )}
                </footer>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
