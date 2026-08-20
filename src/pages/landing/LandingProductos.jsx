import React from 'react';
import { Check, Heart, ImageOff, Layers } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../lib/mensajeWhatsapp';

export default function LandingProductos({ 
  seccion, items, contacto, wishlist, toggleWishlist, agregadoRapido, handleAgregarRapido, slug, navigate 
}) {
  const { template = 'grid_4', config = {}, contenido = {} } = seccion || {};
  const { titulo, descuento, boton_texto, imagen_fondo } = contenido;
  
  // Si no hay navigate (como en preview), noop
  const onCardClick = (item) => {
    if (navigate) {
      navigate(slug ? `/l/${slug}/${item.content_id}` : `/${item.content_id}`, item);
    }
  };

  const renderCard = (item) => {
    const isWishlisted = wishlist && wishlist.has(item.content_id);
    const isAdded = agregadoRapido === item.content_id;
    const tieneOferta = item.precio_antes && item.precio_antes > item.precio && item.descuento_pct > 0;
    return (
      <div key={item.content_id} className="lp-card" onClick={() => onCardClick(item)} role="button" tabIndex={0}>
        <div className="lp-card-media group">
          {item.imagen ? (
            <>
              <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" className="lp-card-img-main" />
              {item.imagenes && item.imagenes.length > 1 && (
                <img src={getMediaUrl(item.imagenes[1])} alt={item.nombre} loading="lazy" className="lp-card-img-hover" />
              )}
            </>
          ) : (
            <div className="lp-card-media-placeholder">
              {item.tipo === 'combo' ? <Layers size={32} /> : <ImageOff size={32} />}
            </div>
          )}
          <div className="lp-card-badges">
            {item.tipo === 'combo' && <span className="lp-card-badge combo"><Layers size={11} /> Combo</span>}
            {item.nuevo && <span className="lp-card-badge nuevo">Nuevo</span>}
            {tieneOferta && (
              <span className="lp-card-badge oferta">Oferta -{item.descuento_pct}%</span>
            )}
          </div>
          {item.variantes?.length > 0 && <span className="lp-card-badge variantes">{item.variantes.length} opciones</span>}
          
          {toggleWishlist && (
            <button
              type="button"
              className={`lp-card-wishlist ${isWishlisted ? 'activo' : ''}`}
              onClick={(e) => toggleWishlist(e, item.content_id)}
            >
              <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <div className="lp-card-body">
          {item.etiqueta && item.etiqueta.split(',').map(s => s.trim()).filter(Boolean).map((tag, idx) => (
            <span key={idx} className="lp-card-tag">{tag}</span>
          ))}
          <h3>{item.nombre}</h3>
          <div className="lp-card-price-block">
            {tieneOferta && (
              <span className="lp-card-price-antes">{formatPrecio(item.precio_antes)}</span>
            )}
            <span className={`lp-card-price${tieneOferta ? ' oferta' : ''}`}>{formatPrecio(item.precio)}</span>
          </div>
          
          {handleAgregarRapido && (
            <div className="lp-card-actions">
              <button
                type="button"
                className={`lp-card-btn-add ${isAdded ? 'agregado' : ''}`}
                onClick={(e) => handleAgregarRapido(e, item)}
              >
                {isAdded ? <><Check size={14} /> Agregado</> : 'Comprar rápido'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Logica de renderizado segun template
  if (template === 'banner_oferta') {
    return (
      <div className="lp-banner" style={imagen_fondo ? { backgroundImage: `url(${getMediaUrl(imagen_fondo)})` } : {}}>
        <div className="lp-banner-overlay">
          {titulo && <h2>{titulo}</h2>}
          {descuento && <p>{descuento}% de descuento!</p>}
          {boton_texto && <button className="lp-banner-btn">{boton_texto}</button>}
        </div>
      </div>
    );
  }

  // Grillas y carruseles
  const isCarousel = template === 'carousel';
  const gridClass = template === 'grid_3' ? 'lp-grid lp-grid-3' : 'lp-grid';

  return (
    <div className={isCarousel ? 'lp-carousel-container' : gridClass} id="lp-productos">
      {items.map(renderCard)}
    </div>
  );
}
