import React from 'react';
import { Check, Heart, ImageOff, Layers, MessageCircle, Plus, ShoppingCart } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../lib/mensajeWhatsapp';

/**
 * Productos destacados — items reales marcados `destacado` desde el
 * catálogo (Producto.destacado, ya existente; los combos nunca son
 * destacados). Antes esto se resolvía con "el primer producto por orden"
 * porque se asumió que no existía este campo — estaba mal: si la dueña
 * marca productos como destacados, esta sección tiene que reflejar
 * exactamente esos, no adivinar uno.
 *
 * Reusa las clases .lp-card/.lp-grid tal cual (mismas que la grilla
 * principal) para que las tarjetas se vean idénticas — mismo hover, mismos
 * badges, mismo wishlist — sin duplicar CSS nueva para esta sección.
 */
export default function LandingFeatured({
  seccion,
  items, contacto, wishlist, onToggleWishlist, agregadoRapido, onAgregarRapido, onAbrir, onContactar,
}) {
  const { template = 'grid_4', contenido = {} } = seccion || {};
  const titulo = contenido.titulo || 'Productos destacados';
  return (
    <section id="lp-destacados" className="lp-shell py-14">
      <h2 className="mb-6 text-2xl font-extrabold text-[var(--l-text)]" style={{ letterSpacing: '-0.02em' }}> {titulo} </h2>
      <div className={template === 'carousel' ? "lp-carousel-container" : (template === 'grid_3' ? "lp-grid-3" : "lp-grid")}>
        {items.map(item => {
          const linkWhatsapp = armarLinkWhatsapp(contacto, item);
          return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div key={item.content_id} className="lp-card" onClick={() => onAbrir(item)} role="button" tabIndex={0}>
              <div className="lp-card-media">
                {item.imagen ? (
                  <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
                ) : (
                  <div className="lp-card-media-placeholder">
                    {item.tipo === 'combo' ? <Layers size={32} /> : <ImageOff size={32} />}
                    <span>Sin imagen</span>
                  </div>
                )}
                <div className="lp-card-badges">
                  <span className="lp-card-badge">Destacado</span>
                </div>
                <button
                  type="button"
                  className={`lp-card-wishlist ${wishlist.has(item.content_id) ? 'activo' : ''}`}
                  onClick={(e) => onToggleWishlist(e, item.content_id)}
                  title={wishlist.has(item.content_id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  aria-pressed={wishlist.has(item.content_id)}
                >
                  <Heart size={14} fill={wishlist.has(item.content_id) ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  className="lp-card-quickview"
                  onClick={(e) => { e.stopPropagation(); onAbrir(item); }}
                >
                  Vista rápida
                </button>
              </div>
              <div className="lp-card-body">
                {item.etiqueta && <span className="lp-card-tag">{item.etiqueta}</span>}
                <h3>{item.nombre}</h3>
                <span className="lp-card-price">{formatPrecio(item.precio)}</span>
                <div className="lp-card-actions">
                  <button
                    type="button"
                    className={`lp-card-btn-add ${agregadoRapido === item.content_id ? 'agregado' : ''}`}
                    onClick={(e) => onAgregarRapido(e, item)}
                    title="Agregar al carrito"
                  >
                    {agregadoRapido === item.content_id ? (
                      <><Check size={14} /> Agregado</>
                    ) : (
                      <><Plus size={14} /> Agregar</>
                    )}
                  </button>
                  {linkWhatsapp && (
                    <a
                      className="lp-card-contact-btn"
                      href={linkWhatsapp}
                      target="_blank"
                      rel="noreferrer"
                      title="Consultar por WhatsApp"
                      onClick={(e) => { e.stopPropagation(); onContactar(item); }}
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
