import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRenderContext } from '../../core/RenderContext';
import { Plus, Minus, ShoppingCart, ImageOff, Layers, Check, ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, Loader, Zap, X, Gift } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../../lib/mensajeWhatsapp';
import { recalcularCarritoLanding } from '../../../services/landingPublicaService';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '',
};

export const ProductDetailBlock = ({ content, settings }) => {
  const { data, actions, page, state } = useRenderContext();
  const item = data.item;
  const contacto = page.contacto;
  const previewCheckoutAbierto = state.previewCheckoutAbierto;

  if (!item) {
    return (
      <div className="lp-product-page-container">
        <div className="lp-product-page-wrapper" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Producto no encontrado</h2>
          <button type="button" className="lp-product-back-btn" onClick={() => actions.navigate && actions.navigate(page.slug ? `/l/${page.slug}` : '/')}>
             <ArrowLeft size={16} /> Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  // Configurable desde el inspector (ver ProductDetailInspector.jsx) —
  // valores por defecto iguales al comportamiento de siempre, así que una
  // sección ya guardada sin estos campos no cambia en nada.
  const imagenALaDerecha = settings?.imagen_posicion === 'derecha';
  const mostrarBotonComprarAhora = settings?.mostrar_comprar_ahora !== false;
  const mostrarBotonAgregarCarrito = settings?.mostrar_agregar_carrito !== false;
  const mostrarBotonWhatsapp = settings?.mostrar_whatsapp !== false;
  // Imagen/etiqueta por tarjeta de cantidad, configurables desde el
  // armador (ver ProductDetailInspector.jsx) — clave 'individual' o el id
  // de la Oferta (pack) como string.
  const tarjetasPrecio = content.tarjetas_precio || {};

  const tieneVariantes = item.variantes && item.variantes.length > 0;
  const ofertasNormales = (item.ofertas || []).filter(o => o.estrategia === 'normal');
  // "La cantidad decide el precio": los packs (mismo producto, distinta
  // cantidad — "PACK x2"/"x3") ya no se eligen a mano, el Pricing Engine
  // los aplica solo cuando la cantidad del stepper matchea uno (ver
  // PricingService.mejorOfertaParaCantidad en el backend). Los combos
  // (productos distintos agrupados) SÍ siguen necesitando un selector
  // manual — la cantidad no puede indicar por sí sola "cuál combo".
  // (productos distintos agrupados) SÍ siguen necesitando un selector
  // manual — la cantidad no puede indicar por sí sola "cuál combo".
  const packsReales = ofertasNormales.filter(o => o.tipo_contenido === 'pack');
  const enEditor = state?.previewCheckoutAbierto !== undefined || item.id === 'preview';
  
  let packsNormales = packsReales.length > 0 ? packsReales : [];
  if (enEditor) {
    // En el editor priorizamos _preview_packs para reflejar cambios y eliminaciones en vivo
    try {
      packsNormales = settings?._preview_packs 
        ? (typeof settings._preview_packs === 'string' ? JSON.parse(settings._preview_packs) : settings._preview_packs)
        : [];
    } catch (e) {
      packsNormales = [];
    }
  } else if (packsReales.length === 0 && settings?._preview_packs) {
    try {
      packsNormales = typeof settings._preview_packs === 'string' ? JSON.parse(settings._preview_packs) : settings._preview_packs;
    } catch(e) {}
  }
  
  const combosNormales = ofertasNormales.filter(o => o.tipo_contenido === 'combo');
  const tieneCombos = combosNormales.length > 0;

  const [varianteId, setVarianteId] = useState(() => {
    if (!tieneVariantes) return null;
    const conStock = item.variantes.find(v => v.stock > 0);
    return (conStock || item.variantes[0]).id;
  });
  const [ofertaComboId, setOfertaComboId] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [agregado, setAgregado] = useState(false);

  // Precio real resuelto por el backend (mismo Pricing Engine que cobra el
  // checkout) — se recalcula al cambiar cantidad/variante/combo. Mientras
  // no llega o si falla, se usa el cálculo local de abajo como fallback
  // (nunca bloquea la UI por un problema de red).
  const [precioResuelto, setPrecioResuelto] = useState(null);
  const timeoutPrecioRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    async function actualizarPrecios() {
      if (item.id === 'preview' || !page.slug) return;
      try {
        const respuesta = await recalcularCarritoLanding(page.slug, [{
          content_id: item.content_id || item.id,
          variante_id: varianteId,
          oferta_id: ofertaComboId || undefined,
          cantidad,
        }]);
        if (!cancel && respuesta && respuesta.items && respuesta.items[0]) {
          setPrecioResuelto(respuesta.items[0]);
        }
      } catch (e) {
        if (!cancel) setPrecioResuelto(null);
      }
    }
    
    if (timeoutPrecioRef.current) clearTimeout(timeoutPrecioRef.current);
    timeoutPrecioRef.current = setTimeout(actualizarPrecios, 250);
    return () => { cancel = true; if (timeoutPrecioRef.current) clearTimeout(timeoutPrecioRef.current); };
  }, [item.content_id, item.id, varianteId, ofertaComboId, cantidad, page.slug]);

  // Checkout de una sola pantalla — "Comprar ahora" abre este formulario
  // inline en vez de mandar a un carrito multi-producto. "Agregar al
  // carrito" sigue existiendo aparte para quien quiera seguir comprando
  // (los order bumps/upsells del carrito necesitan más de un ítem, ver
  // Oferta.estrategia — por eso el carrito no desaparece).
  const [comprando, setComprando] = useState(false);
  const [formCheckout, setFormCheckout] = useState(FORM_VACIO);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [enviandoCompra, setEnviandoCompra] = useState(false);
  const [errorCompra, setErrorCompra] = useState(null);
  const [compraConfirmada, setCompraConfirmada] = useState(null);

  // "Visualizar checkout" del armador (ProductDetailInspector.jsx) — fuerza
  // a mostrar el formulario inline sin tener que clickear "Comprar ahora",
  // que en la preview del editor no es interactivo (pointer-events-none
  // del SectionWrapper de LandingPreview.jsx). Es solo visual: los campos
  // igual no son clickeables ahí, sirve para revisar que las tarjetas de
  // precio/order bump quedaron bien configuradas.
  useEffect(() => {
    if (previewCheckoutAbierto !== undefined) {
      setComprando(!!previewCheckoutAbierto);
    }
  }, [previewCheckoutAbierto]);

  const variante = tieneVariantes ? item.variantes.find(v => v.id === varianteId) : null;
  // Pack auto-aplicado por cantidad (solo si no hay un combo elegido a
  // mano — mismo orden de prioridad que PricingService en el backend).
  const ofertaPackAplicada = !ofertaComboId && precioResuelto?.oferta_id
    ? packsNormales.find(o => o.id === precioResuelto.oferta_id)
    : null;
  // Order bump del checkout — reusa el mismo mecanismo que un combo
  // (ofertaComboId): tildar el check cambia qué Oferta se está comprando,
  // no agrega una línea de carrito nueva (la receta de la oferta ya
  // incluye el producto complementario, ver Oferta/OfertaComponente).
  const orderBumpOferta = useMemo(() => {
    if (settings?.mostrar_order_bump === false || !settings?.order_bump_oferta_id) return null;
    // Buscar en las ofertas reales del producto (modo sitio público)
    const real = (item.ofertas || []).find(o => o.id === settings.order_bump_oferta_id && o.estrategia === 'order_bump');
    if (real) return real;
    // Fallback para el editor: buscar la oferta por id sin filtrar estrategia
    const fallback = (item.ofertas || []).find(o => o.id === settings.order_bump_oferta_id);
    if (fallback) return { ...fallback, estrategia: 'order_bump' };
    // Si no hay datos en el ítem (mock del editor), devolver objeto mínimo
    if (settings.order_bump_oferta_id) {
      return { 
        id: settings.order_bump_oferta_id, 
        nombre: settings._preview_bump_nombre || 'Producto complementario', 
        descripcion: settings._preview_bump_descripcion || null, 
        precio: settings._preview_bump_precio || 0,
        producto_complementario: {
          nombre: settings._preview_bump_nombre || 'Producto complementario',
          imagen: settings._preview_bump_imagen || null
        }, 
        componentes: [] 
      };
    }
    return null;
  }, [item.ofertas, settings]);

  const oferta = ofertaComboId 
    ? (combosNormales.find(o => o.id === ofertaComboId) || (orderBumpOferta?.id === ofertaComboId ? orderBumpOferta : null))
    : ofertaPackAplicada;

  const galeria = useMemo(() => {
    const propia = variante?.imagenes?.length ? variante.imagenes : item.imagenes;
    return propia && propia.length ? propia : [];
  }, [variante, item.imagenes]);

  useEffect(() => { setIndiceImagen(0); }, [varianteId]);

  // Precio local (fallback inmediato mientras no llega la primera
  // respuesta del recálculo, o si falla) vs. el resuelto por el backend
  // (fuente de verdad real — el mismo Pricing Engine que cobra el
  // checkout, incluye packs por cantidad y descuento por fecha).
  // precio_efectivo = el que el backend va a cobrar por esta oferta (el
  // promocional de checkout si lo tiene, el normal si no). El fallback a
  // `precio` cubre el DTO anterior a que fueran dos campos separados.
  const precioLocal = oferta
    ? (oferta.precio_efectivo ?? oferta.precio)
    : (variante ? variante.precio_efectivo : (item.precio ?? item.precio_base ?? item.precio_efectivo ?? 0));
  const precio = precioResuelto ? precioResuelto.precio_unitario : precioLocal;
  const stock = variante ? variante.stock : item.stock;
  const stockConocido = stock !== null && stock !== undefined;
  const sinStock = stockConocido && stock <= 0;
  const maxCantidad = stockConocido && stock > 0 ? Math.min(stock, 99) : 99;

  // % de ahorro de cada pack, contra el precio individual × unidades — ver
  // el campo "unidades" que agrega landing.service.js SOLO para packs
  // (nunca combos, para no filtrar la receta de stock). Se usa para el
  // aviso de "se aplicó tal pack" (ver más abajo), ya no para tarjetas
  // seleccionables — la cantidad ya decide cuál pack corresponde.
  const packsConAhorro = useMemo(() => {
    return packsNormales.map(o => {
      if (!o.unidades) return { ...o, ahorroPct: null };
      const precioListaTotal = item.precio * o.unidades;
      if (precioListaTotal <= 0) return { ...o, ahorroPct: null };
      const ahorroPct = Math.round((1 - o.precio / precioListaTotal) * 100);
      return { ...o, ahorroPct: ahorroPct > 0 ? ahorroPct : null };
    });
  }, [packsNormales, item.precio]);



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

  function cambiarOfertaCombo(id) {
    setOfertaComboId(id);
    setCantidad(1);
    setAgregado(false);
  }

  function ajustarCantidad(delta) {
    setCantidad(c => Math.min(maxCantidad, Math.max(1, c + delta)));
  }

  function agregar() {
    if (sinStock) return;
    actions.agregarRapido({
      item,
      variante,
      oferta,
      cantidad,
      precio,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1600);
  }

  function actualizarCampoCheckout(campo, valor) {
    setFormCheckout(prev => ({ ...prev, [campo]: valor }));
  }

  const formCheckoutValido = formCheckout.nombre_cliente.trim() && formCheckout.telefono.trim()
    && formCheckout.ciudad.trim() && formCheckout.direccion.trim() && aceptaTerminos;

  async function enviarCompraDirecta(e) {
    e.preventDefault();
    if (!formCheckoutValido || sinStock || !actions.comprarAhora) return;
    setErrorCompra(null);
    setEnviandoCompra(true);
    try {
      const resultado = await actions.comprarAhora(item, variante, oferta, cantidad, precio, formCheckout);
      setCompraConfirmada(resultado);
    } catch (err) {
      setErrorCompra(err.message || 'No se pudo enviar el pedido. Probá de nuevo.');
    } finally {
      setEnviandoCompra(false);
    }
  }

  const descripcion = item.descripcion_larga || item.descripcion;

  const handleVolver = () => {
    if (actions.navigate) {
      actions.navigate(page.slug ? `/l/${page.slug}` : '/');
    }
  };

  const [portalTarget, setPortalTarget] = useState(null);
  const containerRef = useRef(null);

  const handleCloseModal = () => {
    setComprando(false);
    if (actions.onTogglePreviewCheckout) {
      actions.onTogglePreviewCheckout(false);
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      // Find nearest .lp-page to keep the modal scoped to the landing page styles,
      // avoiding overflowing into the editor UI.
      setPortalTarget(containerRef.current.closest('.lp-page') || document.body);
    }
  }, []);

  return (
    <div ref={containerRef} className="lp-product-page-container">
      <div className="lp-product-page-wrapper">
        <button type="button" className="lp-product-back-btn" onClick={handleVolver}>
           <ArrowLeft size={16} /> Volver al catálogo
        </button>

        <div className={`lp-product-grid ${imagenALaDerecha ? 'lp-imagen-derecha' : ''}`}>
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
              <div className="lp-product-price-group">
                {item.precio_antes && item.precio_antes > precio && (
                  <span className="lp-product-price-antes">{formatPrecio(item.precio_antes)}</span>
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

            {descripcion && <p className="lp-product-desc">{descripcion}</p>}

            {/* Bloques de info (Beneficios, Qué incluye...) — configurables
                desde ProductDetailInspector.jsx, viven en la MISMA columna
                de compra en vez de como secciones aparte más abajo. */}
            {(content.bloques_info || []).map((bloque, idx) => {
              const items = (bloque.items || []).filter(i => i.trim());
              if (!items.length) return null;
              return (
                <div key={idx} className="lp-product-bloque-info">
                  {bloque.titulo && <h3>{bloque.titulo}</h3>}
                  <ul>
                    {items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                </div>
              );
            })}

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



              {tieneCombos && (
                <div className="lp-product-tiers">
                  <span className="lp-modal-label">Elegí cómo comprarlo:</span>
                  <div className="lp-product-tiers-grid">
                    <label className={`lp-tier-card ${!ofertaComboId ? 'active' : ''}`}>
                      <input type="radio" name="tier" checked={!ofertaComboId} onChange={() => cambiarOfertaCombo(null)} />
                      <span className="lp-tier-nombre">Individual</span>
                      <span className="lp-tier-precio">{formatPrecio(item.precio)}</span>
                    </label>
                    {combosNormales.map(o => (
                      <label key={o.id} className={`lp-tier-card ${o.id === ofertaComboId ? 'active' : ''}`}>
                        <input type="radio" name="tier" checked={o.id === ofertaComboId} onChange={() => cambiarOfertaCombo(o.id)} />
                        <span className="lp-tier-nombre">{o.nombre}</span>
                        <span className="lp-tier-precio">{formatPrecio(o.precio)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="lp-product-actions-wrapper">
                <div className="lp-product-botones-grid">
                  {mostrarBotonComprarAhora && (
                    <button
                      type="button"
                      className="lp-modal-agregar"
                      onClick={() => setComprando(true)}
                      disabled={sinStock || !actions.comprarAhora}
                    >
                      <Zap size={18} /> Comprar ahora
                    </button>
                  )}
                  {mostrarBotonAgregarCarrito && (
                    <button
                      type="button"
                      className={`lp-modal-whatsapp ${agregado ? 'agregado' : ''}`}
                      onClick={agregar}
                      disabled={sinStock}
                    >
                      {agregado ? <><Check size={18} /> ¡Agregado!</> : <><ShoppingCart size={18} /> Agregar al carrito</>}
                    </button>
                  )}

                  {mostrarBotonWhatsapp && linkWhatsapp && (
                    <a
                      className="lp-modal-whatsapp"
                      href={linkWhatsapp}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => actions.contactar && actions.contactar(item)}
                    >
                      <MessageCircle size={17} /> Consultar por WhatsApp
                    </a>
                  )}
                </div>

                {(comprando || compraConfirmada) && portalTarget && createPortal(
                  <div className="lp-checkout-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
                    <div className="lp-checkout-modal-content slide-down">
                      {!compraConfirmada && (
                        <button type="button" className="lp-modal-close" onClick={handleCloseModal}>
                          <X size={20} />
                        </button>
                      )}
                      
                      {compraConfirmada ? (
                        <div className="lp-checkout-confirmado">
                          <div className="lp-cart-confirmado-icono"><Check size={26} /></div>
                          <h3>¡Pedido recibido!</h3>
                          <p>
                            {compraConfirmada.redirigido
                              ? 'Te vamos a escribir por WhatsApp para coordinar el pago y la entrega.'
                              : 'La tienda se va a contactar para coordinar el pago y la entrega.'}
                          </p>
                        </div>
                      ) : (
                        <form className="lp-checkout-inline" onSubmit={enviarCompraDirecta}>
                          {errorCompra && <p className="lp-checkout-error">{errorCompra}</p>}

                          {packsNormales.length > 0 ? (
                            <div className="lp-product-tiers-grid lp-product-tiers-grid--imagen mb-4">
                              {[{ clave: 'individual', unidades: 1, nombre: 'Individual', precio: item.precio, ahorroPct: null },
                                ...packsConAhorro.map(o => ({ clave: String(o.id), unidades: o.unidades || 1, nombre: o.nombre, precio: o.precio, ahorroPct: o.ahorroPct }))]
                                .map(t => {
                                  const cfg = tarjetasPrecio[t.clave] || {};
                                  const imagenTarjeta = galeria[0];
                                  const activa = cantidad === t.unidades && !ofertaComboId;
                                  return (
                                    <button
                                      key={t.clave}
                                      type="button"
                                      className={`lp-tier-card lp-tier-card--imagen ${activa ? 'active' : ''}`}
                                      onClick={() => { setCantidad(t.unidades); setOfertaComboId(null); setAgregado(false); }}
                                    >
                                      <span className="lp-tier-imagen">
                                        {imagenTarjeta ? <img src={getMediaUrl(imagenTarjeta)} alt="" /> : <ImageOff size={20} color="var(--vit-muted-2)" />}
                                      </span>
                                      <div className="flex flex-col items-start w-full">
                                        <span className="lp-tier-nombre">{cfg.etiqueta || t.nombre}</span>
                                        <span className="lp-tier-precio">{formatPrecio(t.precio)}</span>
                                      </div>
                                      {t.ahorroPct > 0 && <span className="lp-tier-ahorro" style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.65rem' }}>-{t.ahorroPct}% OFF</span>}
                                      
                                      {/* Checkbox circle to look like a radio selection */}
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-auto ${activa ? 'border-[var(--vit-accent)]' : 'border-[var(--vit-border)]'}`}>
                                        {activa && <div className="w-2.5 h-2.5 rounded-full bg-[var(--vit-accent)]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="lp-checkout-resumen mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--vit-accent)', borderRadius: '8px', backgroundColor: 'var(--vit-accent-bg, rgba(0,0,0,0.02))' }}>
                              <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--vit-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--vit-border)' }}>
                                {galeria[0] ? (
                                  <img src={getMediaUrl(galeria[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <ImageOff size={20} color="var(--vit-muted-2)" />
                                )}
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{cantidad} × {variante ? variante.nombre : item.nombre}</span>
                                {ofertaComboId && orderBumpOferta && (
                                  <span style={{ fontSize: '0.85rem', color: 'var(--l-primary)', fontWeight: 600, marginTop: '2px' }}>
                                    + {orderBumpOferta.producto_complementario?.nombre || orderBumpOferta.componentes?.[1]?.Producto?.nombre || orderBumpOferta.nombre}
                                  </span>
                                )}
                              </div>
                              <strong style={{ fontSize: '1.1rem' }}>{formatPrecio(precio * cantidad)}</strong>
                            </div>
                          )}


                          <label className="lp-checkout-field">
                            <span>Nombre y Apellido <em>*</em></span>
                            <input required value={formCheckout.nombre_cliente} onChange={e => actualizarCampoCheckout('nombre_cliente', e.target.value)} placeholder="Nombre y Apellido" />
                          </label>
                          <label className="lp-checkout-field">
                            <span>RUC (Factura Virtual)</span>
                            <input value={formCheckout.ruc} onChange={e => actualizarCampoCheckout('ruc', e.target.value)} placeholder="Opcional" />
                          </label>
                          <label className="lp-checkout-field">
                            <span>Celular <em>*</em></span>
                            <div className="lp-checkout-tel">
                              <span className="lp-checkout-tel-prefijo">+595</span>
                              <input required value={formCheckout.telefono} onChange={e => actualizarCampoCheckout('telefono', e.target.value)} placeholder="9XX XXXXXX" />
                            </div>
                          </label>
                          <label className="lp-checkout-field">
                            <span>Ciudad <em>*</em></span>
                            <input required value={formCheckout.ciudad} onChange={e => actualizarCampoCheckout('ciudad', e.target.value)} placeholder="Ciudad" />
                          </label>
                          <label className="lp-checkout-field">
                            <span>Departamento</span>
                            <input value={formCheckout.departamento} onChange={e => actualizarCampoCheckout('departamento', e.target.value)} placeholder="Departamento" />
                          </label>
                          <label className="lp-checkout-field">
                            <span>Dirección <em>*</em></span>
                            <input required value={formCheckout.direccion} onChange={e => actualizarCampoCheckout('direccion', e.target.value)} placeholder="Nombre de la calle y número de casa" />
                          </label>
                          <label className="lp-checkout-field">
                            <span>Referencia</span>
                            <input value={formCheckout.referencia} onChange={e => actualizarCampoCheckout('referencia', e.target.value)} placeholder="Opcional — un punto conocido cerca" />
                          </label>
                          <label className="lp-checkout-terminos">
                            <input type="checkbox" checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)} />
                            <span>Acepto que mis datos se usen para procesar este pedido.</span>
                          </label>

                          {orderBumpOferta && (() => {
                            const bumpComponents = orderBumpOferta.componentes?.filter(c => String(c.producto_id) !== String(item.id)) || [orderBumpOferta.componentes?.[1]].filter(Boolean);
                            let bumpImg = null;
                            let mainBumpProd = null;
                            for (const c of bumpComponents) {
                              const p = c?.Producto || orderBumpOferta.producto_complementario;
                              if (!mainBumpProd) mainBumpProd = p;
                              const rawImg = p?.imagen || p?.imagen_principal || p?.imagenes?.[0];
                              const parsedImg = typeof rawImg === 'string' ? rawImg : (rawImg?.url || rawImg?.ruta || null);
                              if (parsedImg) {
                                bumpImg = parsedImg;
                                break;
                              }
                            }
                            bumpImg = bumpImg || settings?._preview_bump_imagen;
                            const checkoutText = orderBumpOferta.descripcion || orderBumpOferta.nombre || `Agregar ${mainBumpProd?.nombre || 'oferta'} a este pedido`;
                            
                            return (
                              <label className={`mt-4 mb-4 block rounded-md border-2 p-3 cursor-pointer transition-colors ${ofertaComboId === orderBumpOferta.id ? 'bg-[var(--l-surface)] shadow-md' : 'border-dashed bg-[var(--l-surface)]'}`} style={{ borderColor: ofertaComboId === orderBumpOferta.id ? 'var(--l-primary)' : 'var(--l-surface-border)' }}>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 flex-shrink-0 rounded border-gray-300 focus:ring-0 focus:outline-none"
                                    style={{ color: 'var(--l-primary)' }}
                                    checked={ofertaComboId === orderBumpOferta.id}
                                    onChange={e => setOfertaComboId(e.target.checked ? orderBumpOferta.id : null)}
                                  />
                                  <div className="w-14 h-14 rounded border flex-shrink-0 flex items-center justify-center overflow-hidden bg-[var(--l-bg)]" style={{ borderColor: 'var(--l-surface-border)' }}>
                                    {bumpImg ? (
                                      <img className="w-full h-full object-cover" src={getMediaUrl(typeof bumpImg === 'string' ? bumpImg : (bumpImg?.url || bumpImg?.ruta || ''))} alt="" />
                                    ) : (
                                      <Gift size={20} style={{ color: 'var(--l-primary)' }} />
                                    )}
                                  </div>
                                  <div className="flex-1 flex flex-col justify-center">
                                    <span className="text-sm font-bold leading-tight" style={{ color: 'var(--l-text)' }}>
                                      {checkoutText}
                                    </span>
                                    {orderBumpOferta.descripcion && (
                                      <span className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--l-text)', opacity: 0.8 }}>
                                        {orderBumpOferta.descripcion}
                                      </span>
                                    )}
                                  </div>
                                  {(orderBumpOferta.precio > 0 || settings?._preview_bump_precio > 0) && (
                                    <div className="flex-shrink-0 text-right ml-2">
                                      <span className="text-sm font-bold" style={{ color: 'var(--l-text)' }}>
                                        {formatPrecio(orderBumpOferta.precio || settings?._preview_bump_precio)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })()}

                          <div className="lp-product-botones-grid" style={{ marginTop: '1rem' }}>
                            <button type="submit" className="lp-modal-agregar" disabled={!formCheckoutValido || enviandoCompra}>
                              {enviandoCompra ? <><Loader size={16} className="lp-spin" /> Enviando...</> : `Completá tu compra — ${formatPrecio(precio * cantidad)}`}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>,
                  portalTarget
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
