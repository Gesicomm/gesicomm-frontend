import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generarEventId, leerCookiesFacebook, trackearEvento } from '../../lib/metaPixel';
import { trackearEventoGA } from '../../lib/googleAnalytics';
import { trackearEventoTikTok } from '../../lib/tiktokPixel';
import { registrarEventoLanding, recalcularCarritoLanding, crearCheckoutLanding, validarCuponLanding } from '../../services/landingPublicaService';

function claveCarrito(item, varianteId, ofertaId) {
  return `${item.tipo}:${item.content_id}:${varianteId || 'base'}:${ofertaId || 'individual'}`;
}

export function cargarCarritoGuardado(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-carrito-${slug || 'home'}`);
    return crudo ? new Map(JSON.parse(crudo)) : new Map();
  } catch {
    return new Map();
  }
}

export function useStoreCart(slug, data, catalogoCompleto) {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState(() => cargarCarritoGuardado(slug));
  const [carritoAbierto, setCarritoAbierto] = useState(false);

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
    const maxOfertas = 2;
    for (const itemC of itemsCarrito) {
      if (sugerencias.length >= maxOfertas) break;
      const productoDict = catalogoCompleto.find(i => i.content_id === itemC.contentId);
      if (!productoDict || !productoDict.ofertas?.length) continue;
      const ofertasAptas = productoDict.ofertas.filter(o => {
        if (ofertaIdsEnCarrito.has(Number(o.id))) return false;
        // La configuración explícita filtra por estrategia, no globalmente.
        // Así un bump elegido para carrito no oculta los upsells activos.
        const hayConfigParaEstrategia = productoDict.ofertas.some(oferta =>
          oferta.estrategia === o.estrategia && idsConfigurados.has(Number(oferta.id))
        );
        if (hayConfigParaEstrategia && !idsConfigurados.has(Number(o.id))) return false;
        if (!o.producto_complementario && !o.productos_incluidos?.length) return false;
        if (o.estrategia === 'order_bump') return true;
        if (o.estrategia === 'upsell') return true;
        return false;
      });
      for (const o of ofertasAptas) {
        if (sugerencias.length >= maxOfertas) break;
        const claveOferta = claveCarrito(productoDict, itemC.varianteId, o.id);
        if (!carrito.has(claveOferta) && !sugerencias.some(s => s.oferta.id === o.id)) {
          sugerencias.push({ item: productoDict, oferta: o });
        }
      }
    }
    return sugerencias;
  }, [data?.content?.ofertas_carrito, catalogoCompleto, carrito]);

  function agregarSugerencia(item, oferta) {
    const precio = oferta.precio_efectivo ?? oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? 0;
    agregarAlCarrito({ item, variante: null, oferta, cantidad: 1, precio });
  }

  function agregarAlCarrito({ item, variante, oferta, cantidad, precio }) {
    const clave = claveCarrito(item, variante?.id, oferta?.id);
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
        precio,
        cantidad: nuevaCantidad,
        imagen: oferta?.imagen || oferta?.producto_complementario?.imagen || item.imagenes?.[0] || item.imagen || null,
        stockMax: stockMax ?? null,
        envioIncluido: item.envio_incluido === true,
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
      trackearEvento('AddToCart', customData, eventId);
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
      registrarEventoLanding(data.id, 'AddToCart', {
        fbp, fbc, user_agent: navigator.userAgent, event_source_url: window.location.href, event_id: eventId,
        custom_data: customData
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
    }));

    const res = await recalcularCarritoLanding(slug, itemsPayload);
    const checkout = await crearCheckoutLanding(slug, {
      ...datosFormulario,
      items: itemsPayload,
      descuentos: res.descuentos_aplicados || [],
      origen: slug ? 'landing' : 'tienda_directa',
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
    });

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
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidadCarrito,
    confirmarPedido,
    validarCupon
  };
}
