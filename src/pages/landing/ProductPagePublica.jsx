import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingCart, ImageOff, Layers, Check, ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, ChevronDown, Zap } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../lib/mensajeWhatsapp';
import { RedesSocialesFooter } from '../landing-simple/templates/sections';
import { hexToRgba } from '../landing-simple/templates/themeUtils';
import RichText from '../../components/RichText';
import StoreFooterLegal from './StoreFooterLegal';
import FunnelCheckout from '../funnel/FunnelCheckout';

/**
 * Página de producto dedicada a pantalla completa para la landing pública.
 * Sustituye al antiguo ProductDetailModal.
 */
export default function ProductPagePublica({ item, onAgregar, onComprarAhora, landingConfig, contacto, tema, onContactar, slug, nombreComercio, relacionados, onClickRelacionado }) {
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
  const [comprandoDirecto, setComprandoDirecto] = useState(false);
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

  // Las clases lp-* toman los colores de las variables --l-* que
  // landingPublica.css define en `.lp-page`. En una landing RÍGIDA esta
  // página se monta sin ese wrapper (ver LandingPublica.jsx), así que las
  // variables quedaban sin definir: `background: var(--l-primary)` no
  // resolvía y el botón "Agregar al carrito" salía transparente sobre
  // fondo oscuro (invisible). Se declaran acá a partir del tema de la
  // landing para que los botones existan visualmente y respeten la paleta.
  // Además de primary/bg/text, se pisan acá los tokens de "superficie"
  // (fondo de miniaturas vacías, placeholders de relacionados, bordes,
  // texto secundario) — si no, quedan con el default genérico gris/celeste
  // de calcularEstiloLanding (pensado para el builder por secciones), que
  // no tiene ninguna relación con el blanco/negro (u otro) del template
  // rígido real. Se derivan del texto/fondo reales, mismo criterio que
  // hexToRgba(tema.texto, ...) en BasicTemplate/ProductoPreview.
  const varsTema = tema ? {
    '--l-primary': tema.acento,
    '--l-secondary': tema.acento,
    '--l-bg': tema.fondo,
    '--l-on-primary': tema.fondo,
    '--l-text': tema.texto,
    '--l-text-muted': hexToRgba(tema.texto, 0.55),
    '--l-surface': hexToRgba(tema.texto, 0.05),
    '--l-card-bg': tema.fondo,
    '--l-card-border': hexToRgba(tema.texto, 0.1),
    '--l-surface-border': hexToRgba(tema.texto, 0.12),
    '--l-popover-bg': tema.fondo,
    '--l-modal-bg': tema.fondo,
  } : null;

  return (
    <div className="lp-page lp-product-page-container" style={varsTema || undefined}>
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
              {item.etiqueta && item.etiqueta.split(',').map(s => s.trim()).filter(Boolean).map((tag, idx) => (
                <span key={idx} className="lp-modal-tag">{tag}</span>
              ))}
            </div>

            <h1 className="lp-product-title">{item.nombre}</h1>
            
            <div className="lp-product-price-row">
              <div className="lp-product-price-group">
                {item.precio_antes && item.precio_antes > precio && (
                  <span className="lp-product-price-antes" style={{ textDecoration: 'line-through', color: 'var(--vit-muted)', fontSize: '0.9em', marginRight: '8px' }}>{formatPrecio(item.precio_antes)}</span>
                )}
                <span className="lp-product-price">{formatPrecio(precio)}</span>
                {item.precio_antes && item.precio_antes > precio && item.descuento_pct > 0 && (
                  <span className="lp-product-descuento-badge">-{item.descuento_pct}%</span>
                )}
              </div>
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

              <div className="lp-product-botones-grid" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="lp-modal-agregar"
                  style={{ backgroundColor: 'var(--vit-accent)', color: 'var(--vit-bg)' }}
                  onClick={() => setComprandoDirecto(true)}
                  disabled={sinStock || !onComprarAhora}
                >
                  <Zap size={18} /> Comprar Ahora
                </button>
              </div>
            </div>
            
            <FunnelCheckout
              abierto={comprandoDirecto}
              onCerrar={() => setComprandoDirecto(false)}
              tema={tema || {}}
              resumen={{
                nombre: item.nombre,
                variante: variante?.nombre || null,
                precio: precio * cantidad,
                imagen: galeria[0] || null,
              }}
              ofertasLanding={landingConfig?.ofertas_producto_vista || []}
              itemOriginal={item}
              onConfirmar={(form, orderBumpSeleccionado) => {
                if (onComprarAhora) {
                  onComprarAhora(item, variante, orderBumpSeleccionado || oferta, cantidad, precio, form);
                }
              }}
            />
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

        {relacionados?.items?.length > 0 && (
          <div className="lp-product-relacionados">
            <h2 className="lp-product-relacionados-titulo">
              {relacionados.titulo || 'Productos relacionados'}
            </h2>
            <div className="lp-product-relacionados-grid">
              {relacionados.items.map(r => {
                const rEnOferta = r.precio_tachado != null && r.precio_tachado > r.precio;
                return (
                  <div
                    key={r.id}
                    className="lp-product-relacionados-card"
                    onClick={() => onClickRelacionado?.(r)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="lp-product-relacionados-img">
                      {r.imagen ? <img src={getMediaUrl(r.imagen)} alt={r.nombre} /> : <ImageOff size={20} />}
                    </div>
                    <p className="lp-product-relacionados-nombre">{r.nombre}</p>
                    <div className="lp-product-relacionados-precio">
                      <span>{formatPrecio(r.precio)}</span>
                      {rEnOferta && <span className="tachado">{formatPrecio(r.precio_tachado)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {contacto && tema && (
        <div style={{ marginTop: 'auto' }}>
          <RedesSocialesFooter contacto={contacto} acento={tema.acento || 'var(--lp-acento)'} bordeSuave="rgba(0,0,0,0.1)" />
        </div>
      )}
      <StoreFooterLegal tema={tema} bordeSuave='rgba(0,0,0,0.1)' nombreComercio={nombreComercio} isPreview={false} />
    </div>
  );
}
