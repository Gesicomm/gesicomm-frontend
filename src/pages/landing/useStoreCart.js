import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generarEventId, leerCookiesFacebook, trackearEvento } from '../../lib/metaPixel';
import { trackearEventoGA } from '../../lib/googleAnalytics';
import { trackearEventoTikTok } from '../../lib/tiktokPixel';
import { registrarEventoLanding, recalcularCarritoLanding, crearCheckoutLanding, validarCuponLanding } from '../../services/landingPublicaService';
import { calcularCrossSells, ofertaCheckoutPublicable, ordenarOfertasCheckout } from './ofertasCheckout';

function claveCarrito(item, varianteId, ofertaId, componenteVarianteId, descuentoBotonPct = 0) {
  return `${item.tipo}:${item.content_id}:${varianteId || 'base'}:${ofertaId || 'individual'}:${componenteVarianteId || 'sinbump'}:${descuentoBotonPct || 'sindescuento'}`;
}

function normalizarDescuentoBoton(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(95, Math.round(n * 10) / 10);
}

export function cargarCarritoGuardado(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-carrito-${slug || 'home'}`);
    return crudo ? new Map(JSON.parse(crudo)) : new Map();
  } catch {
    return new Map();
  }
}

const CLAVE_UTM = 'gesicomm:utm';
const CAMPOS_UTM = ['utm_source', 'utm_medium', 'utm_campaign'];

/**
 * Los UTM llegan solo en la URL de entrada (el link del anuncio). Al pasar a
 * la ficha de un producto el SPA cambia de ruta y el query string se pierde,
 * así que el pedido salía sin campaña aunque la visita viniera de una. Se
 * guardan en sessionStorage la primera vez que aparecen: duran lo que dura
 * la visita, que es justo el alcance de la atribución.
 */
function capturarUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const nuevos = {};
    CAMPOS_UTM.forEach(c => { const v = params.get(c); if (v) nuevos[c] = v.slice(0, 100); });
    if (Object.keys(nuevos).length) sessionStorage.setItem(CLAVE_UTM, JSON.stringify(nuevos));
  } catch { /* sin storage: se usa lo que haya en la URL al pagar */ }
}

function leerUtm() {
  const params = new URLSearchParams(window.location.search);
  let guardados = {};
  try { guardados = JSON.parse(sessionStorage.getItem(CLAVE_UTM) || '{}') || {}; } catch { guardados = {}; }
  const salida = {};
  CAMPOS_UTM.forEach(c => { salida[c] = params.get(c) || guardados[c] || undefined; });
  return salida;
}

export function useStoreCart(slug, data, catalogoCompleto) {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState(() => cargarCarritoGuardado(slug));
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => { capturarUtm(); }, []);

  useEffect(() => { setCarrito(cargarCarritoGuardado(slug)); }, [slug]);
  
  useEffect(() => {
    try {
      localStorage.setItem(`gesicomm-carrito-${slug || 'home'}`, JSON.stringify(Array.from(carrito.entries())));
    } catch { }
  }, [carrito, slug]);

  const sugerenciasCarrito = useMemo(() => {
    const itemsCarrito = Array.from(carrito.values());
    if (itemsCarrito.length === 0) return [];
    const configOfertas = data?.content?.ofertas_carrito || [];
    const idsConfigurados = new Set(configOfertas.map(Number));
    const ofertaIdsEnCarrito = new Set(itemsCarrito.map(it => it.ofertaId).filter(Boolean).map(Number));
    const sugerencias = [];
    // El tope es por tipo de oferta: con uno solo, dos order bumps llenaban
    // los dos lugares y el upsell del producto no se ofrecía nunca.
    const maxOfertas = 2;
    const lleno = estrategia => sugerencias.filter(s => s.oferta.estrategia === estrategia).length >= maxOfertas;
    for (const itemC of itemsCarrito) {
      const productoDict = catalogoCompleto.find(i => i.content_id === itemC.contentId);
      if (!productoDict || !productoDict.ofertas?.length) continue;
      const ofertasAptas = ordenarOfertasCheckout(
        productoDict.ofertas.filter(o => !ofertaIdsEnCarrito.has(Number(o.id)) && ofertaCheckoutPublicable(o)),
        idsConfigurados
      );
      for (const o of ofertasAptas) {
        if (lleno(o.estrategia)) continue;
        const claveOferta = claveCarrito(productoDict, itemC.varianteId, o.id);
        if (!carrito.has(claveOferta) && !sugerencias.some(s => s.oferta.id === o.id)) {
          sugerencias.push({ item: productoDict, oferta: o });
        }
      }
    }
    return sugerencias;
  }, [data?.content?.ofertas_carrito, catalogoCompleto, carrito]);

  const crossSellsCarrito = useMemo(
    () => calcularCrossSells(catalogoCompleto, Array.from(carrito.values())),
    [catalogoCompleto, carrito],
  );

  function agregarCrossSell(item) {
    agregarAlCarrito({ item, variante: null, oferta: null, cantidad: 1, precio: item.precio || 0 });
  }

  // componenteVariante: variante elegida para el componente "elegible" del
  // bump/upsell — mismo contrato que TiendaPaginaView. Antes se ignoraba y
  // el pedido salía sin la variante que el cliente eligió en el carrito.
  function agregarSugerencia(item, oferta, componenteVariante = null) {
    const precio = oferta.precio_efectivo ?? oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? 0;
    agregarAlCarrito({ item, variante: null, oferta, cantidad: 1, precio, componenteVariante });
  }

  function agregarAlCarrito({ item, variante, oferta, cantidad, precio, componenteVariante = null, descuentoBotonPct = 0, precioAntesBoton = null }) {
    const descuentoBoton = normalizarDescuentoBoton(descuentoBotonPct);
    const clave = claveCarrito(item, variante?.id, oferta?.id, componenteVariante?.id, descuentoBoton);
    const stockMax = variante ? variante.stock : (oferta ? null : item.stock);
    setCarrito(prev => {
      const copia = new Map(prev);
      const existente = copia.get(clave);
      const nuevaCantidad = stockMax != null
        ? Math.min(stockMax, (existente?.cantidad || 0) + cantidad)
        : (existente?.cantidad || 0) + cantidad;
      copia.set(clave, {
        clave,
        tipo: item.tipo,
        contentId: item.content_id,
        nombre: item.nombre,
        varianteId: variante?.id || null,
        varianteNombre: variante?.nombre || null,
        ofertaId: oferta?.id || null,
        ofertaNombre: oferta?.nombre || null,
        componenteVarianteId: componenteVariante?.id || null,
        componenteVarianteNombre: componenteVariante?.nombre || null,
        precio,
        descuentoBotonPct: descuentoBoton || null,
        // Precio de lista, para mostrar el ahorro en el carrito: el normal de
        // la oferta (bump/upsell/pack) o el "antes" del producto. Con
        // variante no se usa: precio_antes es del producto base.
        precioAntes: precioAntesBoton
          ? Number(precioAntesBoton)
          : oferta
          ? (Number(oferta.precio_normal) || null)
          : (variante ? null : (Number(item.precio_antes) || null)),
        cantidad: nuevaCantidad,
        imagen: componenteVariante?.imagenes?.[0] || oferta?.imagen || oferta?.producto_complementario?.imagen || item.imagenes?.[0] || item.imagen || null,
        stockMax: stockMax ?? null,
        envioIncluido: item.envio_incluido === true,
        // Oferta "por cantidad" (estrategia 'normal'): la cantidad la fija el
        // paquete, igual que en la ficha (ver `conCantidad` en los templates
        // de producto) — el carrito no debe dejar sumar/restar unidades.
        cantidadFija: oferta?.estrategia === 'normal',
      });
      return copia;
    });

    try {
      const eventId = generarEventId();
      const { fbc, fbp } = leerCookiesFacebook();
      const nombreCompleto = oferta?.nombre ? `${item.nombre} — ${oferta.nombre}` : (variante?.nombre ? `${item.nombre} (${variante.nombre})` : item.nombre);
      const valorTotal = (precio || 0) * cantidad;
      const customData = {
        content_ids: [item.content_id],
        content_name: nombreCompleto,
        content_type: item.tipo === 'combo' ? 'product_group' : 'product',
        value: valorTotal,
        currency: 'PYG',
        num_items: cantidad,
      };
      trackearEvento('AddToCart', eventId, customData);
      trackearEventoGA('add_to_cart', {
        currency: 'PYG',
        value: valorTotal,
        items: [{
          item_id: item.content_id,
          item_name: nombreCompleto,
          price: precio,
          quantity: cantidad
        }]
      });
      trackearEventoTikTok('AddToCart', {
        contents: [{
          content_id: item.content_id,
          content_name: nombreCompleto,
          quantity: cantidad,
          price: precio
        }],
        value: valorTotal,
        currency: 'PYG'
      });
      // Misma firma que PageView/InitiateCheckout: (slug, {event_name, ...}).
      // Antes se llamaba con (data.id, 'AddToCart', {...}) — el backend
      // recibía el string como body y lo rechazaba, así que ningún
      // AddToCart llegó nunca a la Conversions API ni a las estadísticas.
      registrarEventoLanding(slug, {
        event_name: 'AddToCart',
        event_id: eventId,
        event_source_url: window.location.href,
        fbc,
        fbp,
        custom_data: customData,
        items: [{ content_id: item.content_id, nombre: nombreCompleto, cantidad, precio }],
      }).catch(() => {});
    } catch (e) {
      console.error('Error trackeando AddToCart:', e);
    }
  }

  function quitarDelCarrito(clave) {
    setCarrito(prev => {
      const copia = new Map(prev);
      copia.delete(clave);
      return copia;
    });
  }

  function cambiarCantidadCarrito(clave, delta) {
    setCarrito(prev => {
      const copia = new Map(prev);
      const existente = copia.get(clave);
      if (!existente) return copia;
      const nueva = existente.cantidad + delta;
      if (nueva <= 0) {
        copia.delete(clave);
      } else {
        if (existente.stockMax != null && nueva > existente.stockMax) return copia;
        copia.set(clave, { ...existente, cantidad: nueva });
      }
      return copia;
    });
  }

  /**
   * Valida un cupón contra el carrito actual. Manda los mismos items que el
   * checkout, para que el descuento que se muestra se calcule sobre
   * exactamente lo que se va a cobrar.
   */
  function validarCupon(codigo) {
    const itemsPayload = Array.from(carrito.values()).map(i => ({
      content_id: i.contentId,
      cantidad: i.cantidad,
      variante_id: i.varianteId,
      oferta_id: i.ofertaId,
      componente_variante_id: i.componenteVarianteId || undefined,
      descuento_boton_pct: i.descuentoBotonPct || undefined,
    }));
    return validarCuponLanding(slug, codigo, itemsPayload);
  }

  async function confirmarPedido(datosFormulario = {}) {
    if (carrito.size === 0) throw new Error('Tu carrito está vacío.');
    const itemsCrudos = Array.from(carrito.values());
    const itemsPayload = itemsCrudos.map(i => ({
      tipo: i.tipo,
      content_id: i.contentId,
      cantidad: i.cantidad,
      variante_id: i.varianteId,
      oferta_id: i.ofertaId,
      componente_variante_id: i.componenteVarianteId || undefined,
      descuento_boton_pct: i.descuentoBotonPct || undefined,
    }));

    const res = await recalcularCarritoLanding(slug, itemsPayload);
    const cookiesFb = leerCookiesFacebook();
    const checkout = await crearCheckoutLanding(slug, {
      ...datosFormulario,
      items: itemsPayload,
      descuentos: res.descuentos_aplicados || [],
      origen: slug ? 'landing' : 'tienda_directa',
      ...leerUtm(),
      // Para el Purchase que manda el backend por la Conversions API: sin
      // fbc/fbp Meta no puede asociar la compra al clic del anuncio.
      fbc: cookiesFb.fbc || undefined,
      fbp: cookiesFb.fbp || undefined,
      event_source_url: window.location.href,
    });

    // Purchase de navegador, con el MISMO event_id que el backend ya mandó
    // por CAPI (Meta cuenta una sola compra). Solo viene cuando el pedido
    // cuenta como venta ya: con PagoPar el Purchase sale del servidor recién
    // al confirmarse el pago, y esta pantalla ya no está (se va a PagoPar).
    if (checkout.purchase_event_id) {
      try {
        const valor = Number(checkout.monto) || 0;
        trackearEvento('Purchase', checkout.purchase_event_id, {
          value: valor,
          currency: 'PYG',
          content_ids: itemsCrudos.map(i => i.contentId),
          content_type: 'product',
          num_items: itemsCrudos.reduce((sum, item) => sum + item.cantidad, 0),
        });
        trackearEventoGA('purchase', {
          transaction_id: String(checkout.numero_pedido || checkout.pedido_id),
          currency: 'PYG',
          value: valor,
          items: itemsCrudos.map(i => ({ item_id: i.contentId, item_name: i.nombre, price: i.precio, quantity: i.cantidad })),
        });
        trackearEventoTikTok('CompletePayment', {
          contents: itemsCrudos.map(i => ({ content_id: i.contentId, content_name: i.nombre, quantity: i.cantidad, price: i.precio })),
          value: valor,
          currency: 'PYG',
        });
      } catch (e) {
        console.error('Error trackeando Purchase:', e);
      }
    }

    try {
      const eventId = generarEventId();
      const { fbc, fbp } = leerCookiesFacebook();
      const valorTotal = res.total || itemsCrudos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
      const customData = {
        content_ids: itemsCrudos.map(i => i.contentId),
        contents: itemsCrudos.map(i => ({ id: i.contentId, quantity: i.cantidad })),
        content_type: 'product',
        value: valorTotal,
        currency: 'PYG',
        num_items: itemsCrudos.reduce((sum, item) => sum + item.cantidad, 0)
      };
      trackearEvento('InitiateCheckout', eventId, customData);
      trackearEventoGA('begin_checkout', {
        currency: 'PYG',
        value: valorTotal,
        items: itemsCrudos.map(i => ({ item_id: i.contentId, item_name: i.nombre, price: i.precio, quantity: i.cantidad }))
      });
      trackearEventoTikTok('InitiateCheckout', {
        contents: itemsCrudos.map(i => ({ content_id: i.contentId, content_name: i.nombre, quantity: i.cantidad, price: i.precio })),
        value: valorTotal,
        currency: 'PYG'
      });
      registrarEventoLanding(slug, {
        event_name: 'InitiateCheckout',
        event_id: eventId,
        event_source_url: window.location.href,
        fbc,
        fbp,
        custom_data: customData,
      }).catch(() => {});
    } catch (e) {
      console.error('Error trackeando InitiateCheckout:', e);
    }

    setCarrito(new Map());
    return {
      redirigido: false,
      pedido_id: checkout.pedido_id,
      numero_pedido: checkout.numero_pedido,
      payment_data: checkout.payment_data,
    };
  }

  return {
    carrito,
    setCarrito,
    carritoAbierto,
    setCarritoAbierto,
    sugerenciasCarrito,
    agregarSugerencia,
    crossSellsCarrito,
    agregarCrossSell,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidadCarrito,
    confirmarPedido,
    validarCupon
  };
}
