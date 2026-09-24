import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ImageOff, Layers, ArrowLeft, ArrowRight, Check, Loader, Sparkles, Zap, MapPin, Gift, PartyPopper, Award, ShieldCheck, Banknote } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import { buscarOpcionDelivery, descripcionDelivery, etiquetaDelivery, prepararOpcionesDelivery } from '../../lib/deliveryOptions';
import { agruparOpciones, resolverVariante, seleccionDeVariante } from '../../lib/varianteOpciones';
import { esColorClaro, normalizarColorHex, tintaSobre } from '../../lib/landingDiseno';

const FORM_VACIO = {
  nombre_cliente: '', documento: '', quiere_factura: false, ruc: '', razon_social: '', telefono: '', ciudad: '', departamento: '', direccion: '', referencia: '', payment_method: 'efectivo',
};

function precioOfertaCheckout(oferta) {
  return Number(oferta?.precio_efectivo ?? oferta?.precio_order_bump ?? oferta?.precio_normal ?? oferta?.precio ?? 0) || 0;
}

function detalleOfertaCheckout(item, oferta) {
  const complementario = oferta?.producto_complementario || oferta?.productos_incluidos?.[0] || null;
  const imagen = oferta?.imagen || complementario?.imagen || null;
  const precioNormal = Number(oferta?.precio_normal ?? oferta?.precio ?? 0) || 0;
  const precioFinal = precioOfertaCheckout(oferta);
  const ahorro = precioNormal > precioFinal ? precioNormal - precioFinal : 0;
  const ahorroPorcentaje = ahorro > 0 && precioNormal > 0 ? Math.round((ahorro / precioNormal) * 100) : null;
  return {
    complementario,
    imagen,
    precioNormal,
    precioFinal,
    ahorro,
    ahorroPorcentaje,
    titulo: oferta?.nombre || complementario?.nombre || item?.nombre || 'Oferta exclusiva para tu pedido',
    descripcion: oferta?.descripcion || complementario?.nombre || 'Agregalo ahora a tu compra con un solo clic.',
  };
}

function ofertaCheckoutPublicable(item, oferta) {
  if (!oferta || !['order_bump', 'upsell'].includes(oferta.estrategia)) return false;
  const detalle = detalleOfertaCheckout(item, oferta);
  return Boolean(
    detalle.complementario
    && detalle.imagen
    && detalle.precioFinal > 0
    && (detalle.precioNormal <= 0 || detalle.precioFinal <= detalle.precioNormal)
  );
}

function ofertaCheckoutVisible(item, oferta, permitirIncompletas = false) {
  if (!oferta || !['order_bump', 'upsell'].includes(oferta.estrategia)) return false;
  return ofertaCheckoutPublicable(item, oferta) || (permitirIncompletas && oferta.__previewBorrador);
}

function normalizarBeneficiosOferta(beneficios) {
  return Array.isArray(beneficios)
    ? beneficios.map(b => String(b || '').trim()).filter(Boolean)
    : [];
}

function beneficiosUpsell(detalle, oferta) {
  return normalizarBeneficiosOferta(oferta?.beneficios);
}

function esNombreInterno(nombre) {
  return /(test|qa|prueba|checkout)/i.test(String(nombre || ''));
}

function textoBump(item, oferta) {
  const detalle = detalleOfertaCheckout(item, oferta);
  const nombreComplemento = detalle.complementario?.nombre || 'este complemento';
  const titulo = esNombreInterno(oferta?.nombre)
    ? `Completá tu compra con ${nombreComplemento}`
    : (oferta?.nombre || `Sumá ${nombreComplemento}`);
  const descripcion = oferta?.descripcion && !esNombreInterno(oferta.descripcion)
    ? oferta.descripcion
    : `Se suma a tu pedido con un toque.`;
  return { ...detalle, titulo, descripcion };
}

function textoUpsell(item, oferta) {
  const detalle = detalleOfertaCheckout(item, oferta);
  const nombreComplemento = detalle.complementario?.nombre || 'este complemento';
  const titulo = esNombreInterno(oferta?.nombre)
    ? `Sumá ${nombreComplemento} a tu pedido`
    : (oferta?.nombre || `Sumá ${nombreComplemento} a tu pedido`);
  const descripcion = oferta?.descripcion && !esNombreInterno(oferta.descripcion)
    ? oferta.descripcion
    : 'Aprovechá esta oferta exclusiva antes de finalizar tu compra.';
  return { ...detalle, titulo, descripcion };
}

/**
 * El drawer ahora tiene tres pasos en vez de ir directo a WhatsApp:
 * carrito → formulario de checkout → confirmación. "Finalizar pedido" ya
 * no depende de que la tienda tenga WhatsApp configurado (antes SÍ era
 * obligatorio) — el pedido se crea igual, WhatsApp es un paso posterior
 * opcional que decide la propia landing (ver checkout.redirigir_whatsapp
 * en LandingPublica.jsx).
 */
export default function CartDrawer({
  items, sugerencias = [], onAgregarSugerencia, abierto, onAbrir, onCerrar, onCantidad, onQuitar, onConfirmarPedido, onValidarCupon, pasarelas = [], deliveryCiudades = [],
  // Solo los usa la vista previa del editor (ver LandingSimpleEditor.jsx):
  // arrancar directo en el paso donde vive lo que se está armando, en vez
  // de obligar a un click en "Finalizar pedido" + llenar el formulario
  // falso antes de poder verlo. La tienda publicada nunca pasa estas
  // props, así que el comprador real sigue viendo carrito -> formulario ->
  // upsell en ese orden, sin ningún cambio.
  pasoInicial = 'carrito',
  mostrarUpsellInicial = false,
  permitirSugerenciasIncompletas = false,
  // Colores de la landing que hospeda al carrito: { primario, fondo, modo? }.
  // Sin esto el drawer hereda --l-primary/--l-bg del contenedor (si los
  // hay) y deduce claro/oscuro leyendo --l-bg ya resuelto — ver `modo`.
  apariencia = null,
  // Cross-sell: otros productos del catálogo de la landing, a precio normal.
  // Distinto del order bump (una oferta configurada con precio especial).
  crossSells = [],
  onAgregarCrossSell,
}) {
  const [paso, setPaso] = useState(pasoInicial); // carrito | formulario | confirmado
  // El upsell NO es un paso del drawer: tiene que interrumpir con un popup
  // real sobre toda la pantalla, no otra pantalla más adentro del drawer
  // (que quedaba mayormente vacía y no se leía como una pregunta urgente).
  const [mostrarUpsellPopup, setMostrarUpsellPopup] = useState(mostrarUpsellInicial);
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
  const [cuponAbierto, setCuponAbierto] = useState(false);
  const [mostrarBumpsExtra, setMostrarBumpsExtra] = useState(false);
  const [upsellRevisado, setUpsellRevisado] = useState(false);
  // Id de la oferta de upsell que se acaba de aceptar: onAgregarSugerencia solo
  // dispara un setState en el padre, así que `items` todavía no la trae en este
  // mismo tick. Se guarda el id y se espera a que aparezca en `items` (ver el
  // useEffect más abajo) antes de recién ahí mandar el pedido — mandarlo antes
  // mandaría el pedido SIN el upsell que el cliente acaba de aceptar.
  const [upsellPendiente, setUpsellPendiente] = useState(null);

  // ─── Tema ─────────────────────────────────────────────────────────────
  // El drawer siempre fue oscuro fijo: sobre una landing blanca quedaba
  // como un panel ajeno. Ahora sigue el fondo de la landing: explícito si
  // viene `apariencia`, o leyendo --l-bg ya resuelto del contenedor.
  const rootRef = useRef(null);
  const [modoDetectado, setModoDetectado] = useState(null);
  const primarioTema = normalizarColorHex(apariencia?.primario);
  const modoExplicito = apariencia?.modo
    || (apariencia?.fondo != null ? (esColorClaro(apariencia.fondo) ? 'claro' : 'oscuro') : null);

  useLayoutEffect(() => {
    if (modoExplicito || !rootRef.current) return;
    const estilo = getComputedStyle(rootRef.current);
    const fondo = estilo.getPropertyValue('--l-bg').trim()
      || getComputedStyle(document.body).backgroundColor;
    const claro = esColorClaro(fondo);
    if (claro !== null) setModoDetectado(claro ? 'claro' : 'oscuro');
  }, [modoExplicito, abierto]);

  const modo = modoExplicito || modoDetectado || 'oscuro';
  const varsTema = primarioTema
    ? { '--l-primary': primarioTema, '--l-on-primary': tintaSobre(primarioTema) }
    : undefined;

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
    setCuponAbierto(false);
  }

  const cantidadTotal = items.reduce((s, it) => s + it.cantidad, 0);
  const subtotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const pagaOnline = form.payment_method === 'pagopar';
  const formularioValido = form.nombre_cliente.trim() && form.telefono.trim()
    && form.ciudad.trim() && form.direccion.trim() && acepta
    // PagoPar exige el documento del comprador para emitir el cobro.
    && (!pagaOnline || form.documento.trim())
    // Si pide factura, los datos fiscales dejan de ser opcionales.
    && (!form.quiere_factura || (form.ruc.trim() && form.razon_social.trim()));

  const hasPagoPar = pasarelas.some(p => p.provider === 'pagopar');
  const opcionesDelivery = useMemo(() => prepararOpcionesDelivery(deliveryCiudades), [deliveryCiudades]);
  const pedidoConEnvioIncluido = items.length > 0 && items.every(it => it.envioIncluido === true || it.envio_incluido === true);
  const opcionDeliverySeleccionada = opcionesDelivery.find(op =>
    op.ciudad === form.ciudad && (op.departamento || '') === (form.departamento || '')
  );
  const detalleDelivery = opcionDeliverySeleccionada
    ? descripcionDelivery(opcionDeliverySeleccionada, pedidoConEnvioIncluido, formatPrecio, { items, paymentMethod: form.payment_method })
    : null;
  const descuentoVisible = cupon ? (Number(cupon.descuento) || 0) : 0;
  // Exactamente lo que va a quedar registrado en el pedido: subtotal menos
  // el cupón, sin el flete. Es el mismo cálculo que hace el backend
  // (landing.service.js/crearCheckout), para que lo que ve el comprador y lo
  // que se le cobra sean el mismo número.
  const totalVisible = Math.max(0, subtotal - descuentoVisible);
  // Momentos separados:
  // - order bump: agregado chico dentro del carrito, con botón "+".
  // - upsell: paso intermedio antes del formulario/confirmación.
  // Mezclarlos hace que el upsell se vea repetido y pierda sentido comercial.
  const sugerenciasVisibles = sugerencias.filter(s => ofertaCheckoutVisible(s.item, s.oferta, permitirSugerenciasIncompletas));
  const orderBumps = sugerenciasVisibles.filter(s => s.oferta?.estrategia === 'order_bump');
  const upsells = sugerenciasVisibles.filter(s => s.oferta?.estrategia === 'upsell');
  const orderBumpsVisibles = orderBumps.slice(0, mostrarBumpsExtra ? 2 : 1);
  const orderBumpsOcultos = Math.max(0, orderBumps.length - orderBumpsVisibles.length);
  const complementosAgregados = items.filter(it => it.ofertaId);

  // Variante elegida por oferta.id para el componente "elegible" del bump/
  // upsell (ver Oferta/OfertaComponente.permite_elegir_variante) — se lee
  // de oferta.producto_complementario.variantes, nunca se inventa acá.
  const [seleccionVariantePorOferta, setSeleccionVariantePorOferta] = useState({});

  useEffect(() => {
    sugerencias.forEach(({ oferta }) => {
      const prod = oferta?.producto_complementario;
      if (!prod?.permite_elegir_variante || seleccionVariantePorOferta[oferta.id]) return;
      const conStock = (prod.variantes || []).find(v => v.stock > 0);
      const inicial = seleccionDeVariante(prod, conStock || prod.variantes?.[0]);
      if (Object.keys(inicial).length) {
        setSeleccionVariantePorOferta(prev => ({ ...prev, [oferta.id]: inicial }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugerencias]);

  function cambiarValorVarianteOferta(ofertaId, opcionNombre, valor) {
    setSeleccionVariantePorOferta(prev => ({
      ...prev,
      [ofertaId]: { ...(prev[ofertaId] || {}), [opcionNombre]: valor },
    }));
  }

  function componenteVarianteDe(oferta) {
    const prod = oferta?.producto_complementario;
    if (!prod?.permite_elegir_variante) return null;
    return resolverVariante(prod, seleccionVariantePorOferta[oferta.id] || {});
  }

  function SelectorVarianteOferta({ oferta }) {
    const prod = oferta?.producto_complementario;
    if (!prod?.permite_elegir_variante) return null;
    const grupos = agruparOpciones(prod);
    const seleccion = seleccionVariantePorOferta[oferta.id] || {};
    return (
      <div className="lp-cart-sugerencia-variantes" onClick={e => e.stopPropagation()}>
        {grupos.map(grupo => (
          <div key={grupo.nombre} className="lp-cart-sugerencia-variante-grupo">
            <span className="lp-cart-sugerencia-variante-label">{grupo.nombre}:</span>
            {grupo.valores.map(valor => {
              const activo = seleccion[grupo.nombre] === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  className={`lp-cart-sugerencia-variante-pill ${activo ? 'active' : ''}`}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); cambiarValorVarianteOferta(oferta.id, grupo.nombre, valor); }}
                >
                  {valor}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function reiniciar() {
    setPaso('carrito');
    setForm(FORM_VACIO);
    setCiudadDeliveryInput('');
    setAcepta(false);
    setResultado(null);
    setError(null);
    setCuponAbierto(false);
    setMostrarBumpsExtra(false);
    setUpsellRevisado(false);
    setUpsellPendiente(null);
    setMostrarUpsellPopup(false);
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

  function avanzarDesdeCarrito() {
    setPaso('formulario');
  }

  // El pedido real se manda desde acá (no desde el <form onSubmit>) para que
  // el paso "upsell" pueda reusarla tal cual, sin duplicar la llamada a
  // onConfirmarPedido ni su manejo de error/redirección.
  async function confirmarPedidoFinal() {
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
      setPaso('formulario');
    } finally {
      setEnviando(false);
      setUpsellPendiente(null);
    }
  }

  function manejarSubmitFormulario(e) {
    e.preventDefault();
    if (!formularioValido) return;
    // El upsell se pregunta ACÁ, al terminar el formulario — no al salir del
    // carrito — porque recién ahí el cliente ya decidió que va a comprar.
    if (upsells.length > 0 && !upsellRevisado) {
      setMostrarUpsellPopup(true);
      return;
    }
    confirmarPedidoFinal();
  }

  function aceptarUpsell(item, oferta, componenteVariante = null) {
    setUpsellRevisado(true);
    setMostrarUpsellPopup(false);
    setEnviando(true);
    onAgregarSugerencia(item, oferta, componenteVariante);
    // No se manda el pedido todavía: `items` (prop) recién va a traer este
    // upsell después de que el padre re-renderice con su nuevo carrito.
    setUpsellPendiente(oferta.id);
  }

  function declinarUpsell() {
    setUpsellRevisado(true);
    setMostrarUpsellPopup(false);
    confirmarPedidoFinal();
  }

  // Dispara el pedido apenas el upsell aceptado aparece en `items` — recién
  // ahí es seguro mandarlo, porque onConfirmarPedido lee el carrito del padre
  // (no lo que esta pantalla acaba de pedir agregar).
  useEffect(() => {
    if (upsellPendiente == null) return;
    if (items.some(it => Number(it.ofertaId) === Number(upsellPendiente))) {
      setUpsellPendiente(null);
      confirmarPedidoFinal();
    }
  }, [items, upsellPendiente]);

  /**
   * Única tarjeta de order bump — la misma en "Tu pedido" y en el
   * formulario, para que no convivan dos diseños. Es una función de render
   * y no un componente: declarado dentro de CartDrawer, un componente se
   * re-montaría en cada render y perdería el foco/animación.
   *
   * Layout en dos filas a propósito: [imagen | texto] arriba y el botón a
   * todo el ancho abajo. Con imagen + texto + botón en una sola fila, en
   * los 400px del drawer el título quedaba en una columna de 60px, una
   * palabra por renglón.
   */
  function renderTarjetaBump({ item, oferta }) {
    const detalle = textoBump(item, oferta);
    const imagenOferta = detalle.imagen || item.imagen;
    const completo = ofertaCheckoutPublicable(item, oferta);
    const beneficios = normalizarBeneficiosOferta(oferta?.beneficios).slice(0, 3);
    const agregar = () => onAgregarSugerencia(item, oferta, componenteVarianteDe(oferta));
    // Order bump "de checkbox" (el formato clásico que más convierte): la
    // franja de arriba ES la acción — una casilla grande "Sí, sumalo" que se
    // lee como decisión de un toque, no como otro producto más para evaluar.
    return (
      <article key={oferta.id} className="lp-bump">
        <button type="button" className="lp-bump-check" onClick={agregar} disabled={!completo}>
          <span className="lp-bump-box" aria-hidden="true"><Check size={14} /></span>
          <span className="lp-bump-cta">
            {completo ? <>Sí, sumalo a mi pedido por <b>{formatPrecio(detalle.precioFinal)}</b></> : 'Completá producto, imagen y precio'}
          </span>
          <ArrowRight size={16} className="lp-bump-arrow" aria-hidden="true" />
        </button>
        <div className="lp-bump-body">
          <div className="lp-bump-media">
            {imagenOferta ? <img src={getMediaUrl(imagenOferta)} alt="" /> : <ImageOff size={18} />}
            {detalle.ahorroPorcentaje ? <span className="lp-bump-off">-{detalle.ahorroPorcentaje}%</span> : null}
          </div>
          <div className="lp-bump-info">
            <span className="lp-bump-eyebrow"><Zap size={11} /> Solo en este pedido</span>
            <h4>{detalle.titulo}</h4>
            {detalle.descripcion && <p>{detalle.descripcion}</p>}
            <div className="lp-bump-price">
              <strong>{completo ? formatPrecio(detalle.precioFinal) : 'Falta precio'}</strong>
              {detalle.ahorro > 0 && <del>{formatPrecio(detalle.precioNormal)}</del>}
            </div>
          </div>
        </div>
        {beneficios.length > 0 && (
          <ul className="lp-bump-benefits">
            {beneficios.map(b => <li key={b}><Check size={12} /> {b}</li>)}
          </ul>
        )}
        <SelectorVarianteOferta oferta={oferta} />
      </article>
    );
  }

  const crossSellsVisibles = (onAgregarCrossSell ? crossSells : []).slice(0, 3);
  // Ahorro real del carrito: precio de lista (precioAntes, lo guarda el
  // carrito al agregar) contra lo que se cobra. Nunca se inventa: una línea
  // sin precioAntes no suma ahorro.
  const ahorroCarrito = items.reduce(
    (s, it) => s + Math.max(0, (Number(it.precioAntes) || 0) - (Number(it.precio) || 0)) * it.cantidad, 0,
  );
  const mejorAhorroBump = orderBumps.reduce((max, { item, oferta }) => Math.max(max, detalleOfertaCheckout(item, oferta).ahorro), 0);

  return (
    <div ref={rootRef} className="lp-cart-root" data-cart-modo={modo} style={varsTema}>
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
                  <h3>
                    <ShoppingCart size={17} /> Tu carrito
                    {cantidadTotal > 0 && <span className="lp-cart-count">{cantidadTotal}</span>}
                  </h3>
                  <button type="button" className="lp-cart-close" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
                </header>

                {items.length === 0 ? (
                  <div className="lp-cart-vacio">
                    <ShoppingCart size={28} opacity={0.3} />
                    <p>Todavía no agregaste productos.</p>
                  </div>
                ) : (
                  <>
                    {/* Barra de recompensa: arriba de todo, es lo primero que se
                        lee. Con ahorro celebra lo ganado; si todavía no hay, avisa
                        que abajo hay una oferta (sin inventar montos). */}
                    {ahorroCarrito > 0 ? (
                      <div className="lp-cart-reward lp-cart-reward--ok" role="status">
                        <PartyPopper size={16} />
                        <span>¡Genial! Estás ahorrando <b>{formatPrecio(ahorroCarrito)}</b> en este pedido</span>
                      </div>
                    ) : mejorAhorroBump > 0 ? (
                      <div className="lp-cart-reward">
                        <Gift size={16} />
                        <span>Tenés una oferta exclusiva abajo: ahorrá hasta <b>{formatPrecio(mejorAhorroBump)}</b></span>
                      </div>
                    ) : null}

                    <div className="lp-cart-scroll">
                    <div className="lp-cart-items">
                      {items.map(it => {
                        const antes = Number(it.precioAntes) || 0;
                        return (
                        <div key={it.clave} className="lp-cart-item">
                          <div className="lp-cart-item-media">
                            {it.imagen ? (
                              <img src={getMediaUrl(it.imagen)} alt="" />
                            ) : (
                              it.tipo === 'combo' ? <Layers size={16} /> : <ImageOff size={16} />
                            )}
                          </div>
                          <div className="lp-cart-item-info">
                            {/* Con oferta, el nombre de la oferta ES lo que se compró
                                (un bump de Implementa se guarda sobre la línea del
                                producto ancla): mismo criterio que el resumen del
                                formulario, `ofertaNombre || nombre`. */}
                            <span className="lp-cart-item-nombre">{it.ofertaNombre || it.nombre}</span>
                            {it.componenteVarianteNombre && <span className="lp-cart-item-variante">{it.componenteVarianteNombre}</span>}
                            {it.varianteNombre && <span className="lp-cart-item-variante">{it.varianteNombre}</span>}
                            <span className="lp-cart-item-precio">
                              <b>{formatPrecio(it.precio * it.cantidad)}</b>
                              {antes > it.precio && <del>{formatPrecio(antes * it.cantidad)}</del>}
                            </span>
                          </div>
                          <div className="lp-cart-item-acciones">
                            <button type="button" className="lp-cart-quitar" onClick={() => onQuitar(it.clave)} aria-label={`Quitar ${it.ofertaNombre || it.nombre}`}>
                              <Trash2 size={14} />
                            </button>
                            <div className="lp-cart-stepper">
                              <button type="button" onClick={() => onCantidad(it.clave, -1)} aria-label="Restar uno"><Minus size={13} /></button>
                              <span>{it.cantidad}</span>
                              <button type="button" onClick={() => onCantidad(it.clave, 1)} disabled={it.stockMax != null && it.cantidad >= it.stockMax} aria-label="Sumar uno"><Plus size={13} /></button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {orderBumpsVisibles.length > 0 && (
                      <section className="lp-cart-section" aria-label="Oferta para tu pedido">
                        <h4 className="lp-cart-section-title">Aprovechá antes de terminar</h4>
                        {orderBumpsVisibles.map(renderTarjetaBump)}
                        {orderBumpsOcultos > 0 && (
                          <button type="button" className="lp-cart-bumps-more" onClick={() => setMostrarBumpsExtra(true)}>
                            Ver {orderBumpsOcultos} oferta{orderBumpsOcultos === 1 ? '' : 's'} más
                          </button>
                        )}
                      </section>
                    )}

                    {/* Cross-sell: DEBAJO del contenido del carrito (Baymard:
                        nunca arriba de lo que el cliente ya eligió) y 2-3
                        tarjetas en carrusel. La medalla sale de la etiqueta que
                        el comercio le pone al producto en la landing ("Más
                        vendido", "Nuevo"…) — `badge` queda como gancho para una
                        medalla calculada por ventas más adelante. */}
                    {crossSellsVisibles.length > 0 && (
                      <section className="lp-cart-section" aria-label="Clientes también llevan">
                        <h4 className="lp-cart-section-title">Clientes también llevan</h4>
                        <div className="lp-cross-rail">
                          {crossSellsVisibles.map(item => {
                            const medalla = item.badge || item.etiqueta;
                            const antes = Number(item.precio_antes) || 0;
                            return (
                              <article key={item.content_id || `${item.tipo}-${item.referencia_id}`} className="lp-cross-card">
                                <div className="lp-cross-card-media">
                                  {item.imagen ? <img src={getMediaUrl(item.imagen)} alt="" /> : <ImageOff size={16} />}
                                  {medalla && <span className="lp-cross-medal"><Award size={11} /> {medalla}</span>}
                                </div>
                                <span className="lp-cross-card-nombre">{item.nombre}</span>
                                <span className="lp-cross-card-precio">
                                  <b>{formatPrecio(item.precio)}</b>
                                  {antes > item.precio && <del>{formatPrecio(antes)}</del>}
                                </span>
                                <button type="button" className="lp-cross-card-add" onClick={() => onAgregarCrossSell(item)} aria-label={`Agregar ${item.nombre}`}>
                                  <Plus size={14} /> Agregar
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    )}
                    </div>

                    <footer className="lp-cart-footer">
                      <div className="lp-cart-lines">
                        {ahorroCarrito > 0 && (
                          <div className="lp-cart-line lp-cart-line--ahorro">
                            <span>Ahorro</span>
                            <strong>− {formatPrecio(ahorroCarrito)}</strong>
                          </div>
                        )}
                        <div className="lp-cart-subtotal">
                          <span>Total</span>
                          <strong>{formatPrecio(subtotal)}</strong>
                        </div>
                      </div>
                      <button type="button" className="lp-cart-checkout lp-cart-checkout--hero" onClick={avanzarDesdeCarrito}>
                        Finalizar compra <ArrowRight size={18} />
                      </button>
                      <ul className="lp-cart-trust">
                        <li><ShieldCheck size={14} /> Compra segura</li>
                        <li><Banknote size={14} /> Podés pagar al recibir</li>
                      </ul>
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

                <form className="lp-checkout-form" onSubmit={manejarSubmitFormulario}>
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

                  {/* La cedula no tiene que ver con la factura: la pide la
                      pasarela para poder cobrar online. Por eso es un campo
                      aparte y solo es obligatorio si se paga por ahi. */}
                  <label className="lp-checkout-field">
                    <span>Cédula {pagaOnline && <em>*</em>}</span>
                    <input
                      required={pagaOnline}
                      value={form.documento}
                      onChange={e => actualizarCampo('documento', e.target.value)}
                      placeholder="Ej: 4123456"
                      inputMode="numeric"
                    />
                    {pagaOnline && (
                      <small className="lp-checkout-ayuda">
                        Obligatorio para compras online.
                      </small>
                    )}
                  </label>

                  <label className="lp-checkout-check">
                    <input
                      type="checkbox"
                      checked={form.quiere_factura}
                      onChange={e => {
                        const quiere = e.target.checked;
                        actualizarCampo('quiere_factura', quiere);
                        if (!quiere) {
                          actualizarCampo('ruc', '');
                          actualizarCampo('razon_social', '');
                        }
                      }}
                    />
                    <span>Quiero factura</span>
                  </label>

                  {form.quiere_factura && (
                    <>
                      <label className="lp-checkout-field">
                        <span>Razón social <em>*</em></span>
                        <input
                          required
                          value={form.razon_social}
                          onChange={e => actualizarCampo('razon_social', e.target.value)}
                          placeholder="Nombre o empresa que va en la factura"
                        />
                      </label>

                      <label className="lp-checkout-field">
                        <span>RUC <em>*</em></span>
                        <input
                          required
                          value={form.ruc}
                          onChange={e => actualizarCampo('ruc', e.target.value)}
                          placeholder="Ej: 80012345-6"
                        />
                        <small className="lp-checkout-ayuda">
                          Al facturar se aplica el IVA correspondiente.
                        </small>
                      </label>
                    </>
                  )}

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

                  {/* Ciudad/departamento, dirección y referencia son un
                      solo bloque conceptual ("adónde entregamos"): antes
                      eran 3-4 campos sueltos mezclados con el resto del
                      formulario, sin distinguirse de nombre/cédula/celular.
                      Agrupados en una tarjeta propia, igual que ya se hace
                      con el medio de pago (.lp-checkout-payment-methods) más
                      abajo. */}
                  <section className="lp-checkout-address" aria-label="Dirección de entrega">
                    <div className="lp-checkout-address-head">
                      <MapPin size={14} /> <span>Dirección de entrega</span>
                    </div>

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
                            <option key={op.id} value={op.label} label={descripcionDelivery(op, false, formatPrecio, { items, paymentMethod: form.payment_method }) || undefined} />
                          ))}
                        </datalist>
                        {detalleDelivery && (
                          <small className="lp-checkout-delivery-hint">
                            {etiquetaDelivery(opcionDeliverySeleccionada)} · {detalleDelivery}
                          </small>
                        )}
                      </label>
                    ) : (
                      <div className="lp-checkout-address-row">
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
                      </div>
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
                  </section>

                  <label className="lp-checkout-terminos">
                    <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
                    <span>Acepto que mis datos se usen para procesar este pedido.</span>
                  </label>

                  <section className="lp-checkout-summary" aria-label="Resumen del pedido">
                    <div className="lp-checkout-summary-head">
                      <span>Resumen de tu pedido</span>
                      <strong>{formatPrecio(subtotal)}</strong>
                    </div>
                    <div className="lp-checkout-summary-list">
                      {items.map(it => (
                        <div key={it.clave} className="lp-checkout-summary-item">
                          <span>
                            {it.cantidad} × {it.ofertaNombre || it.nombre}
                            {it.varianteNombre && <em> · {it.varianteNombre}</em>}
                          </span>
                          <strong>{formatPrecio(it.precio * it.cantidad)}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  {(orderBumps.length > 0 || complementosAgregados.length > 0) && (
                    <section className="lp-cart-bumps" aria-label="Ofertas especiales del checkout">
                      <div className="lp-cart-bumps-head">
                        <span><Zap size={14} /> Antes de terminar</span>
                        <small>Sumalo ahora y llega en el mismo envío.</small>
                      </div>

                      {complementosAgregados.length > 0 && (
                        <div className="lp-cart-bumps-agregados">
                          {complementosAgregados.map(it => (
                            <div key={it.clave} className="lp-cart-bump-added">
                              <span><Check size={14} /> Agregado: {it.ofertaNombre || it.nombre}</span>
                              <button type="button" onClick={() => onQuitar(it.clave)}>Quitar</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {orderBumpsVisibles.map(renderTarjetaBump)}

                      {orderBumpsOcultos > 0 && (
                        <button type="button" className="lp-cart-bumps-more" onClick={() => setMostrarBumpsExtra(true)}>
                          Ver {orderBumpsOcultos} complemento{orderBumpsOcultos === 1 ? '' : 's'} adicional{orderBumpsOcultos === 1 ? '' : 'es'}
                        </button>
                      )}
                    </section>
                  )}

                  {hasPagoPar && (
                    <div className="lp-checkout-payment-methods">
                      <p>Medio de pago</p>
                      
                      <label>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="efectivo"
                          checked={form.payment_method === 'efectivo'}
                          onChange={() => actualizarCampo('payment_method', 'efectivo')}
                        />
                        <span>Pagar en efectivo al recibir</span>
                      </label>
                      
                      <label>
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="pagopar"
                          checked={form.payment_method === 'pagopar'}
                          onChange={() => actualizarCampo('payment_method', 'pagopar')}
                        />
                        <span>Pago online (Tarjetas, QR, Tigo Money)</span>
                      </label>
                    </div>
                  )}

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
                    ) : cuponAbierto ? (
                      <div className="lp-cart-cupon-form">
                        <input
                          type="text"
                          placeholder="Código de cupón"
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
                    ) : (
                      <button type="button" className="lp-cart-cupon-toggle" onClick={() => setCuponAbierto(true)}>
                        ¿Tenés un cupón?
                      </button>
                    )}
                    {errorCupon && <p className="lp-cart-cupon-error">{errorCupon}</p>}
                  </div>
                  )}

                  <section className="lp-checkout-total-box" aria-label="Total del pedido">
                    {ahorroCarrito > 0 && (
                      <div className="lp-cart-line lp-cart-line--ahorro">
                        <span>Ahorrás en este pedido</span>
                        <strong>− {formatPrecio(ahorroCarrito)}</strong>
                      </div>
                    )}
                    <div className="lp-cart-subtotal">
                      <span>Productos</span>
                      <strong>{formatPrecio(subtotal)}</strong>
                    </div>

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

                    <p>El envío se coordina con la tienda; si aplica, no está sumado a este total.</p>
                  </section>

                  <div className="lp-checkout-submit-wrap">
                    <button type="submit" className="lp-cart-checkout lp-checkout-submit" disabled={!formularioValido || enviando}>
                      {enviando ? (<><Loader size={16} className="lp-spin" /> Enviando...</>) : <>Completar compra <span>{formatPrecio(totalVisible)}</span></>}
                    </button>
                  </div>
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

      {/* Popup real, no otro paso del drawer: tapa toda la pantalla del
          cliente (por encima del propio drawer, que sigue ahí atrás) para
          que se lea como una pregunta que hay que responder antes de seguir. */}
      {abierto && mostrarUpsellPopup && upsells.length > 0 && (
        <div className="lp-upsell-overlay" role="presentation" onClick={declinarUpsell}>
          <div className="lp-upsell-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="lp-upsell-modal-close" onClick={declinarUpsell} title="Cerrar" disabled={enviando}>
              <X size={16} />
            </button>

            {upsells.map(({ item, oferta }) => {
              const detalle = textoUpsell(item, oferta);
              const beneficios = beneficiosUpsell(detalle, oferta);
              const upsellCompleto = ofertaCheckoutPublicable(item, oferta);
              return (
                <article key={oferta.id} className="lp-upsell-offer">
                  <div className="lp-upsell-header">
                    <span className="lp-upsell-eyebrow"><Sparkles size={14} /> Oferta exclusiva para tu pedido</span>
                  </div>

                  <div className="lp-upsell-grid">
                    <figure className="lp-upsell-media">
                      {detalle.imagen ? (
                        <img src={getMediaUrl(detalle.imagen)} alt={detalle.complementario?.nombre || detalle.titulo} />
                      ) : (
                        <div className="lp-upsell-media-placeholder">
                          <ImageOff size={26} />
                          <span>Subí una imagen para esta oferta</span>
                        </div>
                      )}
                    </figure>

                    <div className="lp-upsell-copy">
                      <h3 className="lp-upsell-title">{detalle.titulo}</h3>
                      {detalle.descripcion && <p className="lp-upsell-desc">{detalle.descripcion}</p>}

                      {beneficios.length > 0 && (
                        <ul className="lp-upsell-benefits">
                          {beneficios.map(beneficio => (
                            <li key={beneficio}><Check size={15} /> {beneficio}</li>
                          ))}
                        </ul>
                      )}

                      <div className="lp-upsell-pricebox">
                        {detalle.ahorro > 0 && (
                          <span className="lp-upsell-before">
                            Antes <del>{formatPrecio(detalle.precioNormal)}</del>
                          </span>
                        )}
                        {detalle.precioFinal > 0 ? (
                          <span className="lp-upsell-now">
                            {detalle.ahorro > 0 ? 'Hoy: ' : 'Precio: '}
                            <strong>{formatPrecio(detalle.precioFinal)}</strong>
                          </span>
                        ) : (
                          <span className="lp-upsell-now lp-upsell-now--pending">Definí el precio de la oferta</span>
                        )}
                        {detalle.ahorro > 0 && (
                          <span className="lp-upsell-save">
                            {`Ahorrás ${formatPrecio(detalle.ahorro)}${detalle.ahorroPorcentaje ? ` (${detalle.ahorroPorcentaje}%)` : ''}`}
                          </span>
                        )}
                      </div>

                      <SelectorVarianteOferta oferta={oferta} />

                      <button
                        type="button"
                        className="lp-upsell-primary"
                        onClick={() => aceptarUpsell(item, oferta, componenteVarianteDe(oferta))}
                        disabled={enviando || !upsellCompleto}
                      >
                        {upsellCompleto ? `Sí, agregar por ${formatPrecio(detalle.precioFinal)}` : 'Completá producto, imagen y precio'}
                      </button>
                      <p className="lp-upsell-microcopy">Se agregará con un solo clic. No tendrás que volver a completar tus datos.</p>
                    </div>
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              className="lp-upsell-decline"
              onClick={declinarUpsell}
              disabled={enviando}
            >
              Continuar sin agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
