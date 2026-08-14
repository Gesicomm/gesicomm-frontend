import React, { useState, useMemo, useEffect } from 'react';
import { useRenderContext } from '../../core/RenderContext';
import { Plus, Minus, ShoppingCart, ImageOff, Layers, Check, ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, Loader, Zap } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';
import { formatPrecio, armarLinkWhatsapp } from '../../../lib/mensajeWhatsapp';

const FORM_VACIO = {
  nombre_cliente: '', ruc: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '',
};

export const ProductDetailBlock = ({ content, settings }) => {
  const { data, actions, page } = useRenderContext();
  const item = data.item;
  const contacto = page.contacto;

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

  const tieneVariantes = item.variantes && item.variantes.length > 0;
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

  // % de ahorro de cada pack, contra el precio individual × unidades — ver
  // el campo "unidades" que agrega landing.service.js SOLO para packs
  // (nunca combos, para no filtrar la receta de stock). Sin "unidades" no
  // se puede calcular un ahorro real, así que esa oferta no muestra badge.
  const tiersConAhorro = useMemo(() => {
    return ofertasNormales.map(o => {
      if (o.tipo_contenido !== 'pack' || !o.unidades) return { ...o, ahorroPct: null };
      const precioListaTotal = item.precio * o.unidades;
      if (precioListaTotal <= 0) return { ...o, ahorroPct: null };
      const ahorroPct = Math.round((1 - o.precio / precioListaTotal) * 100);
      return { ...o, ahorroPct: ahorroPct > 0 ? ahorroPct : null };
    });
  }, [ofertasNormales, item.precio]);

  const mejorAhorroId = useMemo(() => {
    const conAhorro = tiersConAhorro.filter(o => o.ahorroPct);
    if (!conAhorro.length) return null;
    return conAhorro.reduce((mejor, o) => (o.ahorroPct > mejor.ahorroPct ? o : mejor)).id;
  }, [tiersConAhorro]);

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

  return (
    <div className="lp-product-page-container">
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

              {tieneOfertas && (
                <div className="lp-product-tiers">
                  <span className="lp-modal-label">Elegí cómo comprarlo:</span>
                  <div className="lp-product-tiers-grid">
                    <label className={`lp-tier-card ${!ofertaId ? 'active' : ''}`}>
                      <input type="radio" name="tier" checked={!ofertaId} onChange={() => cambiarOferta(null)} />
                      <span className="lp-tier-nombre">Individual</span>
                      <span className="lp-tier-precio">{formatPrecio(item.precio)}</span>
                    </label>
                    {tiersConAhorro.map(o => (
                      <label key={o.id} className={`lp-tier-card ${o.id === ofertaId ? 'active' : ''}`}>
                        <input type="radio" name="tier" checked={o.id === ofertaId} onChange={() => cambiarOferta(o.id)} />
                        {o.id === mejorAhorroId && <span className="lp-tier-badge">Mejor oferta</span>}
                        <span className="lp-tier-nombre">{o.nombre}</span>
                        <span className="lp-tier-precio">{formatPrecio(o.precio)}</span>
                        {o.ahorroPct && <span className="lp-tier-ahorro">-{o.ahorroPct}% OFF</span>}
                      </label>
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
              ) : comprando ? (
                <form className="lp-checkout-inline" onSubmit={enviarCompraDirecta}>
                  {errorCompra && <p className="lp-checkout-error">{errorCompra}</p>}

                  <div className="lp-checkout-resumen">
                    <span>{cantidad} × {oferta ? oferta.nombre : (variante ? variante.nombre : item.nombre)}</span>
                    <strong>{formatPrecio(precio * cantidad)}</strong>
                  </div>

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

                  <div className="lp-product-botones-grid">
                    <button type="button" className="lp-modal-whatsapp" onClick={() => setComprando(false)} disabled={enviandoCompra}>
                      Volver
                    </button>
                    <button type="submit" className="lp-modal-agregar" disabled={!formCheckoutValido || enviandoCompra}>
                      {enviandoCompra ? <><Loader size={16} className="lp-spin" /> Enviando...</> : `Completá tu compra — ${formatPrecio(precio * cantidad)}`}
                    </button>
                  </div>
                </form>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
