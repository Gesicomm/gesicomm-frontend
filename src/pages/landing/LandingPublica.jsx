import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Search, MessageCircle, Package, Layers, ImageOff, ShoppingCart, Plus, Check, Heart, Eye } from 'lucide-react';
import { obtenerLandingPublica, obtenerProductoLanding, registrarEventoLanding, crearCheckoutLanding, recalcularCarritoLanding } from '../../services/landingPublicaService';
import { getMediaUrl } from '../../services/api';
import { inicializarPixel, generarEventId, leerCookiesFacebook, trackearEvento } from '../../lib/metaPixel';
import { inicializarGA, trackearEventoGA } from '../../lib/googleAnalytics';
import { inicializarTikTokPixel, trackearEventoTikTok } from '../../lib/tiktokPixel';
import { calcularEstiloLanding, cargarFuenteGoogle } from '../../lib/landingDiseno';
import { useDocumentSeo } from '../../hooks/useDocumentSeo';
import { formatPrecio, armarLinkWhatsapp, armarLinkWhatsappCarrito } from '../../lib/mensajeWhatsapp';
import ProductPagePublica from './ProductPagePublica';
import FitnessProductPagePublica from '../landing-simple/templates/fitness/FitnessProductPagePublica';
import StoreHeader from '../landing-simple/templates/StoreHeader';
import { useNavigate } from 'react-router-dom';
import CartDrawer from './CartDrawer';
import LandingDropdown from './LandingDropdown';
import { PageRenderer } from '../../page-builder/core/PageRenderer';
import { registerLegacyBlocks } from '../../page-builder/blocks/legacyBlocks';
import { getComponenteTemplate } from '../landing-simple/templates';
import { mapPublicDtoToTemplateData } from '../landing-simple/mapLandingToTemplateData';
import { resolverTemaPorSlug, hexToRgba } from '../landing-simple/templates/themeUtils';
import LandingCodigoPublica from '../landing-simple/LandingCodigoPublica';
import StoreFooterLegal from './StoreFooterLegal';
import VentaDirectaTemplate from '../funnel/templates/VentaDirectaTemplate';
import FunnelCheckout from '../funnel/FunnelCheckout';
import { mapPublicDtoToFunnelData } from '../funnel/mapFunnelToTemplateData';
import './landingPublica.css';

registerLegacyBlocks();
const VENTANA_NUEVO_DIAS = 14;

function claveCarrito(item, varianteId, ofertaId) {
  return `${item.tipo}:${item.content_id}:${varianteId || 'base'}:${ofertaId || 'individual'}`;
}

function cargarCarritoGuardado(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-carrito-${slug || 'home'}`);
    return crudo ? new Map(JSON.parse(crudo)) : new Map();
  } catch {
    return new Map(); // localStorage puede no estar disponible (modo privado) — el carrito solo vive en memoria.
  }
}

/** Mismo criterio que el carrito, pero un Set: no hay cantidad/variante que trackear. */
function cargarWishlistGuardada(slug) {
  try {
    const crudo = localStorage.getItem(`gesicomm-wishlist-${slug || 'home'}`);
    return crudo ? new Set(JSON.parse(crudo)) : new Set();
  } catch {
    return new Set();
  }
}

function esNuevo(item) {
  if (!item.creado) return false;
  return Date.now() - new Date(item.creado).getTime() < VENTANA_NUEVO_DIAS * 86400000;
}

const TikTokIcon = ({ size = 24, color = "currentColor" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const InstagramIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function LandingPublica() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'no-encontrada' | 'no-disponible' | 'ok'
  const [data, setData] = useState(null);

  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('');

    const [carrito, setCarrito] = useState(() => new Map());
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [agregadoRapido, setAgregadoRapido] = useState(null);
  const [wishlist, setWishlist] = useState(() => new Set());
  const [itemAbierto, setItemAbierto] = useState(null);
  // Compra directa del embudo: qué se está comprando mientras el checkout
  // de una pantalla está abierto (ver pages/funnel/FunnelCheckout.jsx).
  const [compraFunnel, setCompraFunnel] = useState(null);

  useEffect(() => {
    let activo = true;
    setEstado('cargando');
    // Con :productId se pide el endpoint por-producto (no solo el general
    // de la landing): es el único que resuelve si ESE producto tiene
    // diseño de página propio (ver LandingSeccion.producto_id /
    // obtenerProductoPublico en el backend) — antes esto nunca se llamaba
    // y secciones_producto quedaba siempre en la plantilla compartida,
    // sin importar qué producto se estuviera mirando.
    // En la raíz del hostname de una tienda (/:algo, sin "/l/") ese único
    // segmento puede ser dos cosas distintas: el slug de una landing/funnel
    // o el slug de un producto. Se prueba primero como landing —es la URL
    // que se comparte en anuncios— y recién si no existe se cae al
    // endpoint por-producto, que era el único comportamiento anterior.
    const promesa = productId
      ? (slug
          ? obtenerProductoLanding(slug, productId)
          : obtenerLandingPublica(productId)
              .then(res => (res === null ? obtenerProductoLanding(null, productId) : res))
              .catch(() => obtenerProductoLanding(null, productId)))
      : obtenerLandingPublica(slug);
    promesa
      .then((res) => {
        if (!activo) return;
        if (res === null) return setEstado('no-encontrada');
        if (!res.disponible) return setEstado('no-disponible');
        setData(res);
        setEstado('ok');
        if (res.meta?.pixel_id) inicializarPixel(res.meta.pixel_id);
        if (res.meta?.google_analytics_id) inicializarGA(res.meta.google_analytics_id);
        if (res.meta?.tiktok_pixel_id) inicializarTikTokPixel(res.meta.tiktok_pixel_id);
        if (res.diseno?.fuente) cargarFuenteGoogle(res.diseno.fuente);
      })
      .catch(() => { if (activo) setEstado('no-encontrada'); });
    return () => { activo = false; };
  }, [slug, productId]);

  useDocumentSeo(data?.seo, typeof window !== 'undefined' ? window.location.href : undefined);

  // Un slug por carrito: si la tienda tiene varias landings, cada una guarda
  // el suyo por separado (no tiene sentido mezclar pedidos de vidrieras
  // distintas). Se recarga desde localStorage cada vez que cambia el slug,
  // y se persiste en cada cambio del carrito mismo.
  useEffect(() => { setCarrito(cargarCarritoGuardado(slug)); }, [slug]);
  useEffect(() => {
    try {
      localStorage.setItem(`gesicomm-carrito-${slug || 'home'}`, JSON.stringify(Array.from(carrito.entries())));
    } catch { /* modo privado / storage lleno — el carrito sigue funcionando solo en memoria */ }
  }, [carrito, slug]);

  useEffect(() => { setWishlist(cargarWishlistGuardada(slug)); }, [slug]);
  useEffect(() => {
    try {
      localStorage.setItem(`gesicomm-wishlist-${slug || 'home'}`, JSON.stringify(Array.from(wishlist)));
    } catch { /* modo privado / storage lleno — la wishlist sigue funcionando solo en memoria */ }
  }, [wishlist, slug]);

  function toggleWishlist(e, contentId) {
    e.stopPropagation();
    setWishlist(prev => {
      const copia = new Set(prev);
      if (copia.has(contentId)) copia.delete(contentId); else copia.add(contentId);
      return copia;
    });
  }

  /**
   * TODOS los productos de la landing, destacados o no.
   *
   * En las plantillas rígidas `data.items` son solo los que el comercio
   * marcó para el home ("Productos destacados"); el catálogo completo va en
   * `data.catalogo_items` (ver landing.service.js#obtenerPublica). Resolver
   * un producto por content_id contra `items` hacía que la página de
   * cualquier producto NO destacado devolviera "Esta vidriera no está
   * disponible", aunque el catálogo lo mostrara y linkeara. mostrar_en_inicio
   * decide dónde aparece, nunca si su página existe.
   */
  const catalogoCompleto = useMemo(
    () => (data?.catalogo_items?.length ? data.catalogo_items : (data?.items || [])),
    [data]
  );

  // Ofertas para mostrar como sugerencia en el carrito: order_bump siempre
  // que no esté ya agregada, upsell solo si su producto ancla ya está en el
  // carrito (mismo criterio que Oferta.estrategia documenta en el backend).
  const sugerenciasCarrito = useMemo(() => {
    if (!data) return [];
    
    // Si la landing tiene configuracion específica de ofertas de carrito,
    // solo mostramos las ofertas listadas ahí. Si no tiene nada configurado,
    // por defecto no muestra NINGUNA oferta (comportamiento opt-in).
    // NOTA: Antes mostraba todas por defecto, pero el usuario pidió control total.
    const configOfertas = data?.content?.ofertas_carrito || [];
    
    const contentIdsEnCarrito = new Set(Array.from(carrito.values()).map(it => it.contentId));
    const ofertaIdsEnCarrito = new Set(Array.from(carrito.values()).map(it => it.ofertaId).filter(Boolean));
    const sugerencias = [];
    for (const item of catalogoCompleto) {
      if (item.tipo !== 'producto' || !item.ofertas?.length) continue;
      for (const oferta of item.ofertas) {
        if (ofertaIdsEnCarrito.has(oferta.id)) continue;
        
        // Filtro estricto: la oferta DEBE estar seleccionada en la configuración
        const estaEnConfiguracion = configOfertas.includes(String(oferta.id)) || configOfertas.includes(Number(oferta.id));
        if (!estaEnConfiguracion) continue;

        // El order bump se sugiere siempre; el upsell solo cuando su producto
        // ancla ya está en el carrito. Los combos no entran acá: se eligen en
        // la ficha del producto, antes de agregar nada al carrito.
        if (oferta.estrategia === 'order_bump') {
          sugerencias.push({ item, oferta });
        } else if (oferta.estrategia === 'upsell' && contentIdsEnCarrito.has(item.content_id)) {
          sugerencias.push({ item, oferta });
        }
      }
    }
    return sugerencias;
  }, [data, catalogoCompleto, carrito]);

  function agregarSugerencia(item, oferta) {
    // precio_efectivo es el que el backend va a cobrar por esta oferta
    // (promocional si la tiene, normal si no) — ver landing.service.js. Los
    // fallbacks cubren un DTO servido antes de separar ambos precios.
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
        imagen: item.imagenes?.[0] || item.imagen || null,
        stockMax: stockMax ?? null,
      });
      return copia;
    });

    // Tracking del evento AddToCart (Meta Pixel, CAPI, GA, TikTok y Estadísticas)
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
        item_id: item.content_id,
        item_name: nombreCompleto,
        price: precio,
        quantity: cantidad,
      });
      trackearEventoTikTok('AddToCart', {
        content_id: item.content_id,
        content_name: nombreCompleto,
        value: valorTotal,
      });

      registrarEventoLanding(slug, {
        event_name: 'AddToCart',
        event_id: eventId,
        event_source_url: window.location.href,
        fbc,
        fbp,
        custom_data: customData,
        items: [{
          content_id: item.content_id,
          nombre: nombreCompleto,
          cantidad,
          precio,
        }],
      });
    } catch (err) {
      console.warn('[tracking] AddToCart error:', err);
    }
  }

  // "La cantidad decide el precio" — al cambiar cantidad, el subtotal
  // local (precio × cantidad) puede no reflejar packs/descuentos reales
  // hasta que el backend recalcule. Debounce corto para no golpear el
  // endpoint en cada click del stepper; si falla, el carrito se queda con
  // el último precio conocido (resiliencia, nunca bloquea al visitante).
  const timeoutRecalculoRef = useRef(null);

  function recalcularPrecioCarrito(mapaCarrito) {
    if (timeoutRecalculoRef.current) clearTimeout(timeoutRecalculoRef.current);
    timeoutRecalculoRef.current = setTimeout(async () => {
      const entradas = Array.from(mapaCarrito.values());
      if (!entradas.length) return;
      const items = entradas.map(it => ({
        content_id: it.contentId,
        variante_id: it.varianteId || undefined,
        oferta_id: it.ofertaId || undefined,
        cantidad: it.cantidad,
      }));
      try {
        const resultado = await recalcularCarritoLanding(slug, items);
        setCarrito(prev => {
          const copia = new Map(prev);
          for (const linea of resultado.items || []) {
            // Correlación por content_id + variante/oferta SOLICITADA (no
            // por posición: el backend descarta líneas inválidas en
            // silencio, así que el índice no es confiable).
            for (const [clave, item] of copia) {
              if (
                item.contentId === linea.content_id &&
                (item.varianteId || null) === (linea.variante_id_solicitada || null) &&
                (item.ofertaId || null) === (linea.oferta_id_solicitada || null)
              ) {
                copia.set(clave, { ...item, precio: linea.precio_unitario });
                break;
              }
            }
          }
          return copia;
        });
      } catch (err) {
        console.warn('[carrito] no se pudo recalcular el precio:', err?.message || err);
      }
    }, 300);
  }

  function cambiarCantidadCarrito(clave, delta) {
    let mapaResultante = null;
    setCarrito(prev => {
      const actual = prev.get(clave);
      if (!actual) return prev;
      const nueva = actual.cantidad + delta;
      if (nueva <= 0) {
        const copia = new Map(prev);
        copia.delete(clave);
        mapaResultante = copia;
        return copia;
      }
      if (actual.stockMax != null && nueva > actual.stockMax) return prev;
      const copia = new Map(prev);
      copia.set(clave, { ...actual, cantidad: nueva });
      mapaResultante = copia;
      return copia;
    });
    if (mapaResultante) recalcularPrecioCarrito(mapaResultante);
  }

  function quitarDelCarrito(clave) {
    setCarrito(prev => {
      const copia = new Map(prev);
      copia.delete(clave);
      return copia;
    });
  }

  /**
   * Reemplaza el viejo checkoutCarrito() que iba directo a WhatsApp: ahora
   * primero crea el pedido (Envío) real en el backend — el link de
   * WhatsApp, si corresponde, es un paso DESPUÉS de que el pedido ya
   * existe, no el checkout entero. El tracking (Meta/GA/TikTok/
   * Estadísticas) se sigue disparando igual que antes, ahora recién
   * después de que el backend confirma que el pedido se creó.
   *
   * @param {object} datosFormulario - lo que completó el visitante en CartDrawer.
   * @returns {{redirigido: boolean, pedido_id: number}}
   * @throws {Error} si el backend rechaza el pedido (ej. sin stock) — CartDrawer lo muestra.
   */
  /**
   * @param {object} datosFormulario - lo que completó el visitante.
   * @param {Array|null} itemsOverride - si viene, se compra ESTO en vez del
   *   carrito (ver actions.comprarAhora en renderContextValue, usado por
   *   el checkout de una sola pantalla en ProductDetailBlock.jsx) — mismo
   *   shape que un item del carrito (ver agregarAlCarrito). El carrito NO
   *   se vacía en ese caso: es una compra directa, aparte de lo que el
   *   visitante ya tenga juntando para otro pedido.
   */
  async function confirmarPedido(datosFormulario, itemsOverride = null) {
    const items = itemsOverride || Array.from(carrito.values());
    if (!items.length) throw new Error('Tu carrito está vacío.');

    const resultado = await crearCheckoutLanding(slug, {
      ...datosFormulario,
      items: items.map(it => ({
        content_id: it.contentId,
        variante_id: it.varianteId || undefined,
        oferta_id: it.ofertaId || undefined,
        cantidad: it.cantidad,
      })),
    });

    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const esUnSolo = items.length === 1;
    const valorTotal = items.reduce((s, it) => s + (it.precio || 0) * it.cantidad, 0);
    const customData = {
      content_ids: items.map(it => it.contentId),
      content_name: esUnSolo ? items[0].nombre : `Carrito (${items.length} productos)`,
      content_type: esUnSolo && items[0].tipo !== 'combo' ? 'product' : 'product_group',
      value: valorTotal,
      currency: 'PYG',
      num_items: items.reduce((s, it) => s + it.cantidad, 0),
    };

    trackearEvento('InitiateCheckout', eventId, customData);
    trackearEvento('Contact', eventId + '-contact', customData);
    trackearEventoGA('checkout_whatsapp', { valor: valorTotal, cantidad_items: items.length });
    trackearEventoTikTok('Contact', { content_ids: customData.content_ids, value: valorTotal });

    const basePayload = {
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
      items: items.map(it => ({
        content_id: it.contentId,
        nombre: it.ofertaNombre ? `${it.nombre} — ${it.ofertaNombre}` : (it.varianteNombre ? `${it.nombre} (${it.varianteNombre})` : it.nombre),
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    };

    registrarEventoLanding(slug, { ...basePayload, event_name: 'InitiateCheckout', event_id: eventId });
    registrarEventoLanding(slug, { ...basePayload, event_name: 'Contact', event_id: eventId + '-contact' });

    let redirigido = false;
    if (resultado.redirigir_whatsapp && contacto?.whatsapp) {
      const link = armarLinkWhatsappCarrito(contacto, items);
      if (link) {
        window.open(link, '_blank', 'noopener');
        redirigido = true;
      }
    }

    if (!itemsOverride) setCarrito(new Map());
    return { redirigido, pedido_id: resultado.pedido_id };
  }

  /**
   * Compra directa de un solo producto — ver confirmarPedido().
   *
   * @param {Array} [ofertasCheckout] - ofertas que el visitante aceptó en el
   *   checkout (order bumps / combos). Van como líneas PROPIAS del pedido,
   *   no reemplazando la oferta del producto principal: antes el bump se
   *   pasaba en el lugar de `oferta` y el backend terminaba cobrando el
   *   producto entero al precio promocional del bump.
   */
  function comprarAhora(item, variante, oferta, cantidad, precio, datosFormulario, ofertasCheckout = []) {
    const itemCarrito = {
      clave: claveCarrito(item, variante?.id, oferta?.id),
      tipo: item.tipo,
      contentId: item.content_id,
      nombre: item.nombre,
      varianteId: variante?.id || null,
      varianteNombre: variante?.nombre || null,
      ofertaId: oferta?.id || null,
      ofertaNombre: oferta?.nombre || null,
      precio,
      cantidad,
      imagen: item.imagenes?.[0] || item.imagen || null,
      stockMax: variante ? variante.stock : (oferta ? null : item.stock),
    };

    // El precio que se arma acá es solo para el tracking y el mensaje de
    // WhatsApp: el backend vuelve a resolver cada línea por oferta_id y
    // decide cuál de los dos precios de la oferta corresponde cobrar.
    const lineasOferta = (ofertasCheckout || []).map(of => ({
      clave: claveCarrito(item, null, of.id),
      tipo: item.tipo,
      contentId: item.content_id,
      nombre: item.nombre,
      varianteId: null,
      varianteNombre: null,
      ofertaId: of.id,
      ofertaNombre: of.nombre,
      precio: of.precio_efectivo ?? of.precio_order_bump ?? of.precio_normal ?? of.precio ?? 0,
      cantidad: 1,
      imagen: of.producto_complementario?.imagen || item.imagen || null,
      stockMax: null,
    }));

    return confirmarPedido(datosFormulario, [itemCarrito, ...lineasOferta]);
  }

  function contactar(item) {
    const eventId = generarEventId();
    const { fbc, fbp } = leerCookiesFacebook();
    const customData = {
      content_ids: [item.content_id],
      content_name: item.nombre,
      content_type: item.tipo === 'combo' ? 'product_group' : 'product',
      value: item.precio || 0,
      currency: 'PYG',
      num_items: 1,
    };

    trackearEvento('Contact', eventId, customData);
    trackearEventoGA('contact_whatsapp', { producto: item.nombre });
    trackearEventoTikTok('Contact', { content_id: item.content_id, content_name: item.nombre });

    // Se manda siempre, tenga o no Meta CAPI configurado: el backend igual
    // registra el evento en LandingEvento (ver landing.service.js) — es la
    // única fuente de las Estadísticas de la landing.
    registrarEventoLanding(slug, {
      event_name: 'Contact',
      event_id: eventId,
      event_source_url: window.location.href,
      fbc,
      fbp,
      custom_data: customData,
      items: [{
        content_id: item.content_id,
        nombre: item.nombre,
        cantidad: 1,
        precio: item.precio,
      }],
    });
  }

  const categorias = useMemo(() => data ? [...new Set(data.items.map(i => i.categoria).filter(Boolean))] : [], [data]);
  const marcas = useMemo(() => data ? [...new Set(data.items.map(i => i.marca).filter(Boolean))] : [], [data]);

  // Imagen de cada categoría para LandingCategoryStrip: la primera foto
  // disponible entre los items curados de ESTA landing en esa categoría —
  // no un campo propio (Categoria no tiene imagen, es un modelo global).
  const categoriaImagen = useMemo(() => {
    const mapa = new Map();
    if (!data) return mapa;
    data.items.forEach(i => {
      if (i.categoria && i.imagen && !mapa.has(i.categoria)) mapa.set(i.categoria, i.imagen);
    });
    return mapa;
  }, [data]);

  // Etiquetas agrupadas case-insensitive: "Ofertas" y "ofertas " son el mismo filtro.
  const etiquetas = useMemo(() => {
    if (!data) return [];
    const mapa = new Map();
    data.items.forEach(i => {
      if (i.etiqueta) {
        i.etiqueta.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => {
          const clave = tag.toLowerCase();
          if (!mapa.has(clave)) mapa.set(clave, tag);
        });
      }
    });
    return Array.from(mapa.values());
  }, [data]);

  // Producto.destacado ya existe en el catálogo (lo marca la dueña en el
  // picker de la landing) — ver LandingFeatured.jsx.
  const itemsDestacados = useMemo(() => data ? data.items.filter(i => i.destacado) : [], [data]);

  const itemsFiltrados = useMemo(() => {
    if (!data) return [];
    let arr = data.items;
    if (filtroCategoria) arr = arr.filter(i => i.categoria === filtroCategoria);
    if (filtroMarca) arr = arr.filter(i => i.marca === filtroMarca);
    if (filtroEtiqueta) {
      const filtroL = filtroEtiqueta.toLowerCase();
      arr = arr.filter(i => i.etiqueta && i.etiqueta.split(',').map(s => s.trim().toLowerCase()).includes(filtroL));
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter(i => i.nombre.toLowerCase().includes(q));
    }
    if (orden === 'asc') arr = [...arr].sort((a, b) => a.precio - b.precio);
    if (orden === 'desc') arr = [...arr].sort((a, b) => b.precio - a.precio);
    return arr;
  }, [data, filtroCategoria, filtroMarca, filtroEtiqueta, busqueda, orden]);

  if (estado === 'cargando') {
    return <div className="lp-status-page"><div className="lp-spinner" /></div>;
  }

  if (estado === 'no-encontrada' || estado === 'no-disponible') {
    return (
      <div className="lp-status-page">
        <h1>Esta vidriera no está disponible</h1>
        <p>El link puede haber cambiado o el catálogo ya no está activo.</p>
      </div>
    );
  }

  // LIENZO EN BLANCO — la landing es el HTML/CSS/JS que escribió el
  // comercio (ver pages/landing-simple/). Nada de lo que viene abajo
  // aplica: no hay secciones, ni carrito, ni checkout, ni páginas de
  // producto. Va lo más arriba posible, apenas pasan los estados de
  // carga, justamente porque no comparte NADA con los otros modos.
  if (data?.template?.kind === 'codigo') {
    return (
      <LandingCodigoPublica
        codigo={data.content?.codigo}
        titulo={data.seo?.titulo || data.titulo || data.tienda?.nombre}
      />
    );
  }

  function handleAgregarRapido(e, item) {
    e.stopPropagation();
    const tieneOfertasNormales = (item.ofertas || []).some(o => o.estrategia === 'normal');
    if (item.variantes?.length > 0 || tieneOfertasNormales) {
      navigate(slug ? `/l/${slug}/${item.content_id}` : `/${item.content_id}`);
      return;
    }
    agregarAlCarrito({
      item,
      variante: null,
      oferta: null,
      cantidad: 1,
      precio: item.precio,
    });
    setAgregadoRapido(item.content_id);
    setTimeout(() => setAgregadoRapido(null), 1400);
  }

  function limpiarFiltros() {
    setFiltroCategoria('');
    setFiltroMarca('');
    setFiltroEtiqueta('');
    setBusqueda('');
    setOrden('');
  }

  const { filtros, contacto, banner } = data;
  const hayFiltrosVisibles = filtros.categoria || filtros.marca || filtros.etiqueta || filtros.buscador || filtros.orden_precio;
  const hayFiltroActivo = !!(filtroCategoria || filtroMarca || filtroEtiqueta || busqueda.trim() || orden);
  // Sin link, el botón lleva a la grilla de productos de esta misma página.
  const bannerLinkEsExterno = banner?.boton_link && /^https?:\/\//i.test(banner.boton_link);

  const totalItems = data.items.length;
  const conteo = hayFiltroActivo && itemsFiltrados.length !== totalItems
    ? `${itemsFiltrados.length} de ${totalItems} productos`
    : `${totalItems} producto${totalItems === 1 ? '' : 's'}`;

  const cantidadOpiniones = data.testimonios?.length || 0;
  const ratingPromedio = cantidadOpiniones > 0
    ? data.testimonios.reduce((s, t) => s + t.calificacion, 0) / cantidadOpiniones
    : 0;

  function seleccionarCategoria(cat) {
    setFiltroCategoria(cat);
    document.getElementById('lp-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const isProductView = Boolean(productId);
  // En un funnel la landing ES la página del producto: no hay :productId en
  // la URL, el único item que trae el DTO es su producto (ver
  // landing.service.js#obtenerPublica). Sin esto el bloque product_detail
  // recibía item=null y mostraba "Producto no encontrado".
  // OJO: no alcanza con tipo_pagina==='funnel' — la landing rígida de la
  // tienda también lo usa (ver landingSimple.service.js#crear). El
  // discriminador real de un embudo es el kind de su template.
  const esFunnel = data?.template?.kind === 'funnel';
  const itemSeleccionado = isProductView
    ? catalogoCompleto.find(i => String(i.content_id) === String(productId) || String(i.id) === String(productId))
    : (esFunnel ? data?.items?.[0] || null : null);

  // EMBUDO — una sola página, un solo producto, una sola decisión. Módulo
  // propio (pages/funnel/), estructura fija. No usa CartDrawer como paso
  // obligatorio: "Comprar ahora" va directo al checkout de una pantalla,
  // porque en venta directa el carrito es un paso de fuga.
  if (esFunnel) {
    const datosFunnel = mapPublicDtoToFunnelData(data);
    const temaFunnel = {
      fondo: datosFunnel.tema.fondo || '#FFFFFF',
      texto: datosFunnel.tema.texto || '#111827',
      acento: datosFunnel.tema.acento || '#111827',
    };

    return (
      <>
        <VentaDirectaTemplate
          data={datosFunnel}
          isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
          linkWhatsapp={itemSeleccionado && data.contacto?.whatsapp
            ? armarLinkWhatsapp(data.contacto, itemSeleccionado)
            : null}
          onContactar={() => itemSeleccionado && contactar(itemSeleccionado)}
          onComprarAhora={({ variante, precio }) => setCompraFunnel({ variante, precio })}
          onAgregarCarrito={({ variante, precio }) => {
            if (!itemSeleccionado) return;
            agregarAlCarrito({ item: itemSeleccionado, variante, oferta: null, cantidad: 1, precio });
            setCarritoAbierto(true);
          }}
        />

        <FunnelCheckout
          abierto={!!compraFunnel}
          onCerrar={() => setCompraFunnel(null)}
          tema={temaFunnel}
          resumen={compraFunnel && itemSeleccionado ? {
            nombre: itemSeleccionado.nombre,
            variante: compraFunnel.variante?.nombre || null,
            precio: compraFunnel.precio,
            imagen: datosFunnel.producto?.imagenes?.[0] || null,
          } : null}
          ofertasLanding={data?.content?.ofertas_producto_vista || []}
          itemOriginal={itemSeleccionado}
          onConfirmar={(form, ofertasCheckout = []) => comprarAhora(
            itemSeleccionado,
            compraFunnel.variante,
            null,
            1,
            compraFunnel.precio,
            form,
            ofertasCheckout,
          )}
        />

        {/* El carrito sigue existiendo para quien use la acción secundaria,
            pero nunca es parte del camino principal del embudo. */}
        <CartDrawer
          items={Array.from(carrito.values())}
          sugerencias={[]}
          onAgregarSugerencia={agregarSugerencia}
          abierto={carritoAbierto}
          onAbrir={() => setCarritoAbierto(true)}
          onCerrar={() => setCarritoAbierto(false)}
          onCantidad={cambiarCantidadCarrito}
          onQuitar={quitarDelCarrito}
          onConfirmarPedido={confirmarPedido}
        />
      </>
    );
  }

  // Landing de uno de los 3 templates rígidos (Fitness/Beauty/Tech/Básico)
  // — ver pages/landing-simple/. Estructura fija, pero SÍ comparte carrito/
  // checkout/order-bump con el sistema flexible (son genéricos sobre
  // data.items, no dependen de secciones) — por eso esta rama vive acá,
  // después de que carrito/agregarAlCarrito/CartDrawer ya están listos,
  // en vez de cortar el render antes de tocarlos.
  if (data?.template?.kind === 'rigido') {
    const cartDrawerProps = {
      items: Array.from(carrito.values()),
      sugerencias: sugerenciasCarrito,
      onAgregarSugerencia: agregarSugerencia,
      abierto: carritoAbierto,
      onAbrir: () => setCarritoAbierto(true),
      onCerrar: () => setCarritoAbierto(false),
      onCantidad: cambiarCantidadCarrito,
      onQuitar: quitarDelCarrito,
      onConfirmarPedido: confirmarPedido,
    };

    // Armar el objeto `tema` compatible con calcularEstiloLanding a partir
    // del tema resuelto del template rígido (acento → primario). Sin este
    // wrapper, el CartDrawer no tiene acceso a --l-primary/--l-modal-bg/etc.
    // y cae en los fallbacks hardcodeados del CSS (verde genérico, fondo
    // oscuro genérico), ignorando por completo el diseño del template.
    const datosRigidosBase = mapPublicDtoToTemplateData(data);
    const temaRigidoResuelto = resolverTemaPorSlug(datosRigidosBase.tema, data?.template?.slug);
    // Los templates rígidos no usan data.diseno (radio/fuente) — pasamos
    // valores neutros para no afectar su propio sistema de estilos.
    const cssVarsRigido = calcularEstiloLanding({
      tema: {
        primario: temaRigidoResuelto.acento,
        fondo:    temaRigidoResuelto.fondo,
        texto:    temaRigidoResuelto.texto,
        // El modo lo inferimos: si el fondo es claro usamos 'claro', si es
        // oscuro usamos 'oscuro'. Lo determinamos por la luminancia del fondo.
        modo: (temaRigidoResuelto.fondo || '#000').toLowerCase().match(/#([0-9a-f]{6})/)?.[1]
          ? (() => {
              const h = (temaRigidoResuelto.fondo || '#000').replace('#', '');
              const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
              return (0.2126*r + 0.7152*g + 0.0722*b) > 0.5 ? 'claro' : 'oscuro';
            })()
          : 'oscuro',
      },
      diseno: {},
    });

    if (isProductView) {
      if (!itemSeleccionado) {
        return <div className="lp-status-page"><h1>Producto no encontrado</h1></div>;
      }
      // El tema crudo de la landing (dto.tema) suele venir con
      // fondo/texto/acento en null si el comercio nunca los personalizó —
      // acá se resuelve contra el default del template ACTIVO (cada uno
      // tiene el suyo: Fitness oscuro/naranja, Beauty pastel, Tech
      // oscuro/celeste), no un genérico blanco/negro. Antes se pasaba el
      // dto crudo y la página de producto quedaba con los colores por
      // defecto de landingPublica.css (verde/negro), sin relación con el
      // template real de la landing.
      const datosProductoPublico = mapPublicDtoToTemplateData(data);
      const temaResuelto = resolverTemaPorSlug(datosProductoPublico.tema, data?.template?.slug);

      // Fitness estrena la ficha de producto rediseñada (12 secciones
      // editables). Es el MISMO componente que dibuja el preview del
      // armador, no una copia: ver FitnessProductPage.jsx. Los otros tres
      // templates rígidos siguen con la ficha genérica de abajo hasta que
      // se adapten.
      const linkInicio = slug ? `/l/${slug}` : '/';
      const linkCatalogo = slug ? `/l/${slug}/catalogo` : '/catalogo';
      const linkContacto = slug ? `/l/${slug}/contacto` : '/contacto';
      const headerProps = {
        templateSlug: data?.template?.slug,
        nombreComercio: datosProductoPublico.nombreComercio,
        logo: datosProductoPublico.logo,
        tema: temaResuelto,
        cantidadCarrito: getItemsCount(),
        onAbrirCarrito: () => setIsCartOpen(true),
        linkInicio,
        linkCatalogo,
        linkContacto,
        previewMode: false
      };

      if (data.template.slug === 'fitness-suplementos') {
        return (
          <div style={cssVarsRigido}>
            <StoreHeader {...headerProps} />
            <FitnessProductPagePublica
              item={itemSeleccionado}
              landingConfig={data.content || {}}
              tema={temaResuelto}
              contacto={datosProductoPublico.contacto}
              nombreComercio={datosProductoPublico.nombreComercio}
              relacionados={data?.relacionados}
              onComprarAhora={comprarAhora}
              onVolver={() => navigate(slug ? `/l/${slug}` : '/')}
              onClickRelacionado={(rel) => navigate(slug ? `/l/${slug}/${rel.slug}` : `/${rel.slug}`)}
            />
            <CartDrawer {...cartDrawerProps} />
          </div>
        );
      }

      return (
        <div style={cssVarsRigido}>
          <StoreHeader {...headerProps} />
          <ProductPagePublica
            item={itemSeleccionado}
            onAgregar={agregarAlCarrito}
            onComprarAhora={comprarAhora}
            contacto={datosProductoPublico.contacto}
            tema={temaResuelto}
            landingConfig={data.content || {}}
            nombreComercio={datosProductoPublico.nombreComercio}
            onContactar={contactar}
            slug={slug}
            relacionados={data?.relacionados}
            onClickRelacionado={(rel) => navigate(slug ? `/l/${slug}/${rel.slug}` : `/${rel.slug}`)}
          />
          <CartDrawer {...cartDrawerProps} />
        </div>
      );
    }

    const ComponenteRigido = getComponenteTemplate(data.template.slug);
    if (!ComponenteRigido) {
      return <div className="lp-status-page"><h1>Esta vidriera no está disponible</h1></div>;
    }
    const cantidadCarritoRigida = Array.from(carrito.values()).reduce((s, it) => s + it.cantidad, 0);
    const datosRigidos = mapPublicDtoToTemplateData(data);
    // Las tarjetas del template reciben la forma reducida de TemplateData
    // ({id, nombre, precio, ...}), pero el carrito/tracking necesitan el
    // item COMPLETO del DTO (content_id, variantes, ofertas) — se resuelve
    // por content_id, que es justamente el `id` que usa el template.
    const itemPorContentId = (contentId) => catalogoCompleto.find(i => i.content_id === contentId);

    return (
      <div style={cssVarsRigido}>
        <ComponenteRigido
          data={datosRigidos}
          onClickProducto={(p) => navigate(slug ? `/l/${slug}/${p.id}` : `/${p.id}`)}
          cantidadCarrito={cantidadCarritoRigida}
          onAbrirCarrito={() => setCarritoAbierto(true)}
          // Mismo agregarAlCarrito que la página de producto y el checkout
          // (incluye el tracking de AddToCart a Pixel/CAPI/TikTok/GA).
          onAgregarProducto={(p) => {
            const item = itemPorContentId(p.id);
            if (!item) return;
            agregarAlCarrito({ item, variante: null, oferta: null, cantidad: 1, precio: item.precio });
            setCarritoAbierto(true);
          }}
          linkWhatsappProducto={(p) => {
            const item = itemPorContentId(p.id);
            return item ? armarLinkWhatsapp(datosRigidos.contacto, item) : null;
          }}
          onContactarProducto={(p) => {
            const item = itemPorContentId(p.id);
            if (item) contactar(item);
          }}
        />
        <CartDrawer {...cartDrawerProps} />
      </div>
    );
  }

  const seccionesActivas = isProductView && data.secciones_producto?.length > 0
    ? data.secciones_producto
    : data.secciones;

  const renderContext = {
    theme: data.tema || {},
    page: {
      ...data,
      secciones: seccionesActivas,
    },
    data: {
      categorias,
      marcas,
      etiquetas,
      itemsDestacados,
      itemsFiltrados,
      categoriaImagen,
      totalItems,
      cantidadOpiniones,
      ratingPromedio,
      cantidadCarrito: Array.from(carrito.values()).reduce((s, it) => s + it.cantidad, 0),
      hayFiltroActivo,
      conteo,
      itemAbierto,
      item: itemSeleccionado,
    },
    actions: {
      abrirCarrito: () => setCarritoAbierto(true),
      seleccionarCategoria,
      toggleWishlist,
      agregarRapido: handleAgregarRapido,
      setItemAbierto,
      contactar,
      setBusqueda,
      setFiltroCategoria,
      setFiltroMarca,
      setFiltroEtiqueta,
      setOrden,
      limpiarFiltros,
      navigate,
      comprarAhora,
    },
    state: {
      wishlist,
      agregadoRapido,
      busqueda,
      filtroCategoria,
      filtroMarca,
      filtroEtiqueta,
      orden,
    },
    env: { mode: 'public' },
  };

  return (
    <div
      className={`lp-page ${data.tema.modo === 'claro' ? 'claro' : ''}`}
      style={{ ...calcularEstiloLanding({ tema: data.tema, diseno: data.diseno }), display: 'flex', flexDirection: 'column' }}
    >
      <PageRenderer context={renderContext} />

      {/* El camino flexible (landing general y funnel) nunca agregaba el
          pie de copyright/links legales — el sistema de landing rígida sí
          lo tiene (ver ProductPagePublica.jsx). marginTop:auto alcanza
          porque el contenedor .lp-page ya es flex-column + min-height:100vh. */}
      <StoreFooterLegal
        tema={data.tema}
        nombreComercio={data?.titulo || data?.tienda?.nombre}
        bordeSuave={hexToRgba(data.tema?.texto, 0.1)}
        style={{ marginTop: 'auto' }}
      />

      <CartDrawer
        items={Array.from(carrito.values())}
        sugerencias={sugerenciasCarrito}
        onAgregarSugerencia={agregarSugerencia}
        abierto={carritoAbierto}
        onAbrir={() => setCarritoAbierto(true)}
        onCerrar={() => setCarritoAbierto(false)}
        onCantidad={cambiarCantidadCarrito}
        onQuitar={quitarDelCarrito}
        onConfirmarPedido={confirmarPedido}
      />
    </div>
  );
}
