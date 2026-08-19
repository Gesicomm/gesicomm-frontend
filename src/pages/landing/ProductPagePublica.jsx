import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingCart, ImageOff, Layers, Check, ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../lib/mensajeWhatsapp';
import { RedesSocialesFooter } from '../landing-simple/templates/sections';
import RichText from '../../components/RichText';

/**
 * Página de producto dedicada a pantalla completa para la landing pública.
 * Sustituye al antiguo ProductDetailModal.
 */
export default function ProductPagePublica({ item, onAgregar, contacto, tema, onContactar, slug }) {
  const navigate = useNavigate();
  const tieneVariantes = item.variantes && item.variantes.length > 0;
  // Solo las ofertas "normal" se eligen acá — order_bump/upsell se ofrecen
  // en el carrito (ver CartDrawer.jsx)
  const ofertasNormales = (item.ofertas || []).filter(o => o.estrategia === 'normal');
  const tieneOfertas = ofertasNormales.length > 0;

  const [varianteId, setVarianteId] = useState(() => {
    if (!tieneVariantes) return null;
    const conStock = item.variantes.find(v => v.stock > 0);
    return (conStock || item.variantes[0]).id;
  });
  const [ofertaId, setOfertaId] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [agregado, setAgregado] = useState(false);
  const [preguntaAbierta, setPreguntaAbierta] = useState(null);

  const variante = tieneVariantes ? item.variantes.find(v => v.id === varianteId) : null;
  const oferta = ofertaId ? ofertasNormales.find(o => o.id === ofertaId) : null;

  const galeria = useMemo(() => {
    const propia = variante?.imagenes?.length ? variante.imagenes : item.imagenes;
    return propia && propia.length ? propia : [];
  }, [variante, item.imagenes]);

  useEffect(() => { setIndiceImagen(0); }, [varianteId]);

  const precio = oferta ? oferta.precio : (variante ? variante.precio_efectivo : item.precio);
  const stock = variante ? variante.stock : item.stock;
  const stockConocido = stock !== null && stock !== undefined;
  const sinStock = stockConocido && stock <= 0;
  const maxCantidad = stockConocido && stock > 0 ? Math.min(stock, 99) : 99;

  const linkWhatsapp = useMemo(() => {
    if (!contacto?.whatsapp) return null;
    const itemParaWhatsapp = {
      ...item,
      nombre: oferta ? `${item.nombre} — ${oferta.nombre}` : (variante ? `${item.nombre} (${variante.nombre})` : item.nombre),
      precio,
    };
    return armarLinkWhatsapp(contacto, itemParaWhatsapp);
  }, [contacto, item, variante, oferta, precio]);

  function cambiarVariante(id) {
    setVarianteId(id);
    setCantidad(1);
    setAgregado(false);
  }

  function cambiarOferta(id) {
    setOfertaId(id);
    setCantidad(1);
    setAgregado(false);
  }

  function ajustarCantidad(delta) {
    setCantidad(c => Math.min(maxCantidad, Math.max(1, c + delta)));
  }

  function agregar() {
    if (sinStock) return;
    onAgregar({
      item,
      variante,
      oferta,
      cantidad,
      precio,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1600);
  }

  const descripcion = item.descripcion_larga || item.descripcion;

  // Botón volver
  const handleVolver = () => {
    if (slug) {
      navigate(`/l/${slug}`);
    } else {
      navigate(`/`);
    }
  };

  return (
    <div className="lp-product-page-container">
      <div className="lp-product-page-wrapper">
        <button type="button" className="lp-product-back-btn" onClick={handleVolver}>
           <ArrowLeft size={16} /> Volver al catálogo
        </button>

        <div className="lp-product-grid">
          {/* Columna Izquierda: Galería */}
          <div className="lp-product-gallery">
            {galeria.length > 0 ? (
              <>
                <div className="lp-product-main-image">
                  <img src={getMediaUrl(galeria[indiceImagen])} alt={item.nombre} />
                  {galeria.length > 1 && (
                    <>
                      <button type="button" className="lp-modal-nav prev" onClick={() => setIndiceImagen(i => (i - 1 + galeria.length) % galeria.length)}>
                        <ChevronLeft size={18} />
                      </button>
                      <button type="button" className="lp-modal-nav next" onClick={() => setIndiceImagen(i => (i + 1) % galeria.length)}>
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>
                {galeria.length > 1 && (
                  <div className="lp-product-thumbnails">
                    {galeria.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        className={`lp-product-thumbnail ${i === indiceImagen ? 'active' : ''}`}
                        onClick={() => setIndiceImagen(i)}
                      >
                        <img src={getMediaUrl(url)} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="lp-product-main-image placeholder">
                <div className="lp-placeholder-content">
                  {item.tipo === 'combo' ? <Layers size={44} /> : <ImageOff size={44} />}
                  <span>Sin imagen disponible</span>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Información y Compra */}
          <div className="lp-product-info">
            <div className="lp-product-header-tags">
              {item.tipo === 'combo' && <span className="lp-modal-badge combo"><Layers size={12} /> Combo especial</span>}
              {item.etiqueta && <span className="lp-modal-tag">{item.etiqueta}</span>}
            </div>

            <h1 className="lp-product-title">{item.nombre}</h1>
            
            <div className="lp-product-price-row">
              <span className="lp-product-price">{formatPrecio(precio)}</span>
              {stockConocido && (
                <span className={`lp-product-stock-badge ${sinStock ? 'agotado' : 'disponible'}`}>
                  {sinStock ? 'Sin stock' : `✓ ${stock} disponibles`}
                </span>
              )}
            </div>

            {item.tipo === 'combo' && item.productos_incluidos?.length > 0 && (
              <div className="lp-product-incluye-box">
                <strong>Incluye:</strong>
                <p>{item.productos_incluidos.join(' · ')}</p>
              </div>
            )}

            {descripcion && <RichText text={descripcion} className="lp-product-desc" />}

            {/* Opciones */}
            <div className="lp-product-options-container">
              {tieneVariantes && (
                <div className="lp-product-variantes">
                  <span className="lp-modal-label">Selecciona una opción:</span>
                  <div className="lp-modal-variante-pills">
                    {item.variantes.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className={`lp-modal-pill ${v.id === varianteId ? 'active' : ''} ${v.stock <= 0 ? 'agotada' : ''}`}
                        onClick={() => cambiarVariante(v.id)}
                        disabled={v.stock <= 0}
                        title={v.stock <= 0 ? 'Sin stock' : undefined}
                      >
                        <span>{v.nombre}</span>
                        {v.precio_efectivo && v.precio_efectivo !== item.precio && (
                          <small className="lp-pill-precio">{formatPrecio(v.precio_efectivo)}</small>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tieneOfertas && (
                <div className="lp-product-variantes">
                  <span className="lp-modal-label">Elegí cómo comprarlo:</span>
                  <div className="lp-modal-variante-pills">
                    <button
                      type="button"
                      className={`lp-modal-pill ${!ofertaId ? 'active' : ''}`}
                      onClick={() => cambiarOferta(null)}
                    >
                      <span>Individual</span>
                      <small className="lp-pill-precio">{formatPrecio(item.precio)}</small>
                    </button>
                    {ofertasNormales.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        className={`lp-modal-pill ${o.id === ofertaId ? 'active' : ''}`}
                        onClick={() => cambiarOferta(o.id)}
                      >
                        <span>{o.nombre}</span>
                        <small className="lp-pill-precio">{formatPrecio(o.precio)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lp-product-actions-wrapper">
              <div className="lp-product-cantidad-row">
                <span className="lp-modal-label">Cantidad:</span>
                <div className="lp-modal-stepper">
                  <button type="button" onClick={() => ajustarCantidad(-1)} disabled={cantidad <= 1}><Minus size={14} /></button>
                  <span>{cantidad}</span>
                  <button type="button" onClick={() => ajustarCantidad(1)} disabled={cantidad >= maxCantidad}><Plus size={14} /></button>
                </div>
              </div>

              <div className="lp-product-botones-grid">
                <button
                  type="button"
                  className={`lp-modal-agregar ${agregado ? 'agregado' : ''}`}
                  onClick={agregar}
                  disabled={sinStock}
                >
                  {agregado ? <><Check size={18} /> ¡Agregado al carrito!</> : <><ShoppingCart size={18} /> Agregar al carrito</>}
                </button>

                {linkWhatsapp && (
                  <a
                    className="lp-modal-whatsapp"
                    href={linkWhatsapp}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onContactar && onContactar(item)}
                  >
                    <MessageCircle size={17} /> Consultar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {item.faq?.length > 0 && (
          <div className="lp-product-faq">
            <h2 className="lp-product-faq-titulo">{item.faq_titulo || 'Todo lo que necesitas saber'}</h2>
            <div className="lp-product-faq-lista">
              {item.faq.map((f, idx) => (
                <div key={idx} className="lp-product-faq-item">
                  <button
                    type="button"
                    className="lp-product-faq-pregunta"
                    onClick={() => setPreguntaAbierta(preguntaAbierta === idx ? null : idx)}
                  >
                    {f.pregunta}
                    <ChevronDown size={16} className={`lp-product-faq-icono ${preguntaAbierta === idx ? 'abierta' : ''}`} />
                  </button>
                  {preguntaAbierta === idx && <p className="lp-product-faq-respuesta">{f.respuesta}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {contacto && tema && (
        <div style={{ marginTop: 'auto', paddingBottom: '2rem' }}>
          <RedesSocialesFooter contacto={contacto} acento={tema.acento || 'var(--lp-acento)'} bordeSuave="rgba(0,0,0,0.1)" />
        </div>
      )}
    </div>
  );
}
