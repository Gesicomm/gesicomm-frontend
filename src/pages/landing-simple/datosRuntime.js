import { getMediaUrl } from '../../services/api';
import { ofertaCheckoutPublicable, detalleOfertaCheckout } from '../landing/ofertasCheckout';

/**
 * Traduce el catálogo (el público de /api/l o el del panel en el editor)
 * al formato que lee el runtime del iframe (window.Gesicomm, ver
 * runtimeGesicomm.js). Es el único lugar que conoce las dos formas: la
 * landing publicada y el preview del editor pasan por acá, así que el HTML
 * que funciona en uno funciona en el otro.
 *
 * El `id` de cada producto es el content_id público (slug del producto o
 * "combo-ID"): es lo que el comercio escribe en data-gesicomm-comprar y lo
 * que aparece en la URL de la ficha.
 */

export function urlProducto(slug, contentId) {
  return slug ? `/l/${slug}/${contentId}` : `/${contentId}`;
}

export const PAGINAS_TIENDA = {
  contacto: 'Contacto',
  catalogo: 'Catálogo',
  'politica-privacidad': 'Política de privacidad',
  'politica-reembolso': 'Política de reembolso',
  'terminos-servicio': 'Términos del servicio',
  'politica-envio': 'Política de envío',
  'aviso-legal': 'Aviso legal',
};

/**
 * URL de una página de la tienda (legales, contacto, catálogo). Mismo
 * criterio que usan esas páginas para sus propios links: en el subdominio
 * de la tienda cuelgan de la raíz (/contacto); vista por /l/:slug (el panel,
 * o local), de /l/:slug/contacto — en la raíz de otro dominio no existen.
 */
export function urlPaginaTienda(slug, pagina) {
  const porRutaL = typeof window !== 'undefined' && window.location.pathname.startsWith('/l/');
  return porRutaL && slug ? `/l/${slug}/${pagina}` : `/${pagina}`;
}

function paginasDeTienda(slug) {
  return Object.fromEntries(Object.keys(PAGINAS_TIENDA).map(p => [p, urlPaginaTienda(slug, p)]));
}

function media(url) {
  if (!url) return null;
  const crudo = typeof url === 'string' ? url : url.url;
  return crudo ? getMediaUrl(crudo) : null;
}

function agotado(stock, variantes) {
  if (stock === null || stock === undefined) return false;
  if (Number(stock) > 0) return false;
  return !(variantes || []).some(v => Number(v.stock) > 0);
}

/**
 * Qué ventas cruzadas (order bump / upsell) muestra esta landing: SOLO las
 * que el comercio marcó en "Configurar venta". Antes, sin marcar ninguna se
 * mostraban todas las de los productos, y aparecían ofertas que nadie había
 * elegido para esta landing. Una landing que nunca pasó por ese paso (sin
 * venta configurada) conserva el comportamiento viejo: todas. Los paquetes
 * (estrategia normal) no pasan por acá: son presentaciones del producto.
 */
export function ofertaCruzadaVisible(oferta, venta) {
  if (!venta?.configurado) return true;
  const cross = venta.cross_sell;
  if (cross?.activo === false) return false;
  return (cross?.ofertas || []).map(Number).includes(Number(oferta.id));
}

/** Ahorro y % de descuento de una oferta — lo que muestran "Ahorrás Gs X" y el "-30%". */
function conAhorro(oferta) {
  const antes = Number(oferta.precio_normal) || 0;
  const ahora = Number(oferta.precio_efectivo) || 0;
  const ahorro = antes > ahora && ahora > 0 ? antes - ahora : 0;
  return { ...oferta, ahorro, descuento_pct: ahorro ? Math.round((ahorro / antes) * 100) : 0 };
}

/** Ofertas que el HTML puede mostrar en la ficha: packs (normal) y ventas cruzadas publicables. */
function ofertasRuntime(item, venta) {
  return (item.ofertas || [])
    .filter(o => o.estrategia === 'normal' || (ofertaCheckoutPublicable(o) && ofertaCruzadaVisible(o, venta)))
    .map(o => {
      const detalle = detalleOfertaCheckout(o);
      return conAhorro({
        id: o.id,
        nombre: o.nombre,
        estrategia: o.estrategia,
        descripcion: o.descripcion || null,
        precio_efectivo: detalle.precioFinal || o.precio_efectivo || o.precio,
        precio_normal: detalle.precioNormal && detalle.precioNormal > detalle.precioFinal ? detalle.precioNormal : null,
        imagen: media(detalle.imagen) || media(item.imagen),
        unidades: o.unidades || null,
      });
    });
}

/** Item de /api/l (landing pública) → item del runtime. */
export function itemPublicoARuntime(item, slug, venta = null) {
  const imagenes = (item.imagenes || [])
    .filter(m => typeof m === 'string' || m?.tipo !== 'video')
    .map(media)
    .filter(Boolean);
  return {
    id: item.content_id,
    referencia_id: item.referencia_id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion || null,
    descripcion_larga: item.descripcion_larga || null,
    precio: item.precio,
    precio_antes: item.precio_antes || null,
    descuento_pct: item.descuento_pct || 0,
    imagen: media(item.imagen) || imagenes[0] || null,
    imagenes_url: imagenes,
    categoria: item.categoria || null,
    etiqueta: item.etiqueta || null,
    stock: item.stock ?? null,
    agotado: agotado(item.stock, item.variantes),
    // Los productos de una página pedida al servidor vienen livianos: sin
    // la lista de variantes, solo el aviso de que existen.
    tiene_variantes: !!item.tiene_variantes || (item.variantes || []).length > 0,
    variantes: (item.variantes || []).map(v => ({
      id: v.id,
      nombre: v.nombre,
      stock: v.stock ?? null,
      precio_efectivo: v.precio_efectivo ?? null,
    })),
    ofertas: ofertasRuntime(item, venta),
    productos_incluidos: item.productos_incluidos || null,
    url: urlProducto(slug, item.content_id),
  };
}

/** El content_id público de un item del catálogo del panel — misma regla que obtenerPublica en el backend. */
export function contentIdPanel(item) {
  return item.tipo === 'combo' ? `combo-${item.id}` : (item.slug || `producto-${item.id}`);
}

/**
 * Oferta del panel (GET /api/ofertas) → oferta del runtime, para el preview.
 * Mismas reglas que el DTO público: bump y upsell se cobran al precio
 * promocional (precio_order_bump) si lo tienen, y sin imagen propia se
 * muestra la del producto que suma la oferta (su primer componente), que es
 * lo que el cliente reconoce.
 */
function ofertaPanelARuntime(o, imagenDeProducto = () => null) {
  const normal = Number(o.precio_normal) || 0;
  const bump = o.precio_order_bump != null ? Number(o.precio_order_bump) : null;
  const efectivo = ['order_bump', 'upsell'].includes(o.estrategia) && bump ? bump : normal;
  const componente = (o.componentes || [])[0] || null;
  const imgsComponente = componente?.producto?.imagenes || [];
  const imagenComponente = (imgsComponente.find(i => i.es_principal) || imgsComponente[0])?.url
    || imagenDeProducto(componente?.producto_id ?? componente?.producto?.id);
  return conAhorro({
    id: o.id,
    nombre: o.nombre,
    estrategia: o.estrategia,
    descripcion: o.descripcion || null,
    precio_efectivo: efectivo,
    precio_normal: normal > efectivo ? normal : null,
    imagen: media(o.imagen_url || o.imagen || imagenComponente),
  });
}

/** Item del catálogo del panel (vitrina) → item del runtime, para el preview del editor. */
export function itemPanelARuntime(item, ofertas = [], imagenDeProducto) {
  const contentId = contentIdPanel(item);
  const precio = item.precio_efectivo ?? item.precio_usuario ?? item.precio_base ?? item.precio ?? 0;
  const imagenes = (item.imagenes || []).map(media).filter(Boolean);
  const precioAntes = item.precio_tachado && item.precio_tachado > precio ? item.precio_tachado : null;
  return {
    id: contentId,
    referencia_id: item.id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion || null,
    descripcion_larga: item.descripcion_larga || null,
    precio,
    precio_antes: precioAntes,
    descuento_pct: precioAntes ? Math.round((1 - precio / precioAntes) * 100) : 0,
    imagen: media(item.imagen) || imagenes[0] || null,
    imagenes_url: imagenes.length ? imagenes : [media(item.imagen)].filter(Boolean),
    categoria: item.categoria || null,
    etiqueta: null,
    stock: item.stock ?? null,
    agotado: agotado(item.stock, []),
    // El catálogo del panel no trae variantes ni ofertas: el preview de la
    // ficha las muestra vacías y la landing publicada las trae reales.
    variantes: [],
    ofertas: ofertas.map(o => ofertaPanelARuntime(o, imagenDeProducto)),
    productos_incluidos: item.productos_incluidos || null,
    url: '#',
  };
}

/**
 * Recomendados para una ficha: la lista manual de la configuración de venta
 * si la hay; si no, misma categoría; si no alcanza, el resto del catálogo.
 * En el inicio (sin producto) son los primeros del catálogo.
 */
export function calcularRecomendados(catalogo, producto, venta) {
  const reco = venta?.recomendados || {};
  if (reco.activo === false) return [];
  const max = reco.max || 4;
  const candidatos = catalogo.filter(i => !producto || i.id !== producto.id);

  if (reco.modo === 'manual' && reco.items?.length) {
    const porId = new Map(candidatos.map(i => [i.id, i]));
    return reco.items.map(id => porId.get(id)).filter(Boolean).slice(0, max);
  }
  if (!producto) return candidatos.slice(0, max);
  const mismaCategoria = candidatos.filter(i => i.categoria && i.categoria === producto.categoria);
  const resto = candidatos.filter(i => !mismaCategoria.includes(i));
  return [...mismaCategoria, ...resto].slice(0, max);
}

/**
 * Recomendados de la vista: en la ficha, los del producto; en el inicio de
 * un "Producto estrella", los complementos (todo menos el principal).
 */
function recomendadosVista(catalogo, producto, venta) {
  if (!producto && venta?.tipo === 'producto_unico') return calcularRecomendados(catalogo.slice(1), null, venta);
  return calcularRecomendados(catalogo, producto, venta);
}

function tiendaRuntime(data) {
  const c = data?.contacto_landing || {};
  const t = data?.contacto || {};
  return {
    nombre: data?.tienda?.nombre || data?.titulo || '',
    logo: media(data?.logo_imagen || data?.tienda?.logo_imagen),
    whatsapp: c.whatsapp || t.whatsapp || data?.contacto_whatsapp || '',
    telefono: c.telefono || t.telefono || '',
    email: c.email || t.email || '',
    direccion: [c.direccion || t.direccion, c.ciudad].filter(Boolean).join(', '),
    horarios: c.horarios || '',
    instagram: c.instagram || t.instagram || '',
    facebook: c.facebook || t.facebook || '',
    tiktok: c.tiktok || t.tiktok || '',
  };
}

/** Datos del runtime para la landing publicada (inicio o ficha). */
export function datosRuntimePublico(data, slug, productoPublico) {
  const venta = data?.content?.venta || null;
  const catalogo = (data?.catalogo_items || data?.items || []).map(i => itemPublicoARuntime(i, slug, venta));
  const producto = productoPublico
    ? (catalogo.find(i => i.id === productoPublico.content_id) || itemPublicoARuntime(productoPublico, slug, venta))
    : null;
  const meta = data?.content?.catalogo || {};
  return {
    vista: producto ? 'producto' : 'inicio',
    tienda: tiendaRuntime(data),
    venta: venta ? { tipo: venta.tipo, recomendados_titulo: venta.recomendados?.titulo || '' } : null,
    // paginado: la respuesta trae solo la primera página; el resto lo pide
    // el runtime (ver onCatalogo en LandingCodigoPublica).
    catalogo: {
      total: meta.total ?? catalogo.length,
      por_pagina: meta.por_pagina || 24,
      paginado: !!meta.paginado,
    },
    paginas: paginasDeTienda(slug),
    productos: catalogo,
    producto,
    recomendados: recomendadosVista(catalogo, producto, venta),
  };
}

/** Datos del runtime para el preview del editor, con el catálogo del panel. */
export function datosRuntimePreview({ productos = [], tienda, venta, vista, productoId, ofertas = [] }) {
  // Ofertas de la tienda (panel) agrupadas por su producto, ya filtradas
  // con la misma regla que la landing publicada.
  const porProducto = new Map();
  ofertas
    .filter(o => ['order_bump', 'upsell'].includes(o.estrategia) && ofertaCruzadaVisible(o, venta))
    .forEach(o => {
      const k = Number(o.producto_ancla_id);
      porProducto.set(k, [...(porProducto.get(k) || []), o]);
    });
  const imagenPorProducto = new Map(productos.filter(p => p.tipo === 'producto').map(p => [Number(p.id), p.imagen]));
  const imagenDeProducto = id => imagenPorProducto.get(Number(id)) || null;
  const catalogo = productos.map(p => itemPanelARuntime(p, p.tipo === 'producto' ? (porProducto.get(Number(p.id)) || []) : [], imagenDeProducto));
  const producto = vista === 'producto'
    ? (catalogo.find(i => i.id === productoId) || catalogo[0] || null)
    : null;
  return {
    vista: producto ? 'producto' : 'inicio',
    tienda: {
      nombre: tienda?.nombre || '',
      logo: media(tienda?.logo_imagen),
      whatsapp: tienda?.whatsapp || tienda?.telefono || '',
      telefono: tienda?.telefono || '',
      email: tienda?.email || '',
      direccion: [tienda?.direccion, tienda?.ciudad].filter(Boolean).join(', '),
      horarios: '',
      instagram: tienda?.instagram || '',
      facebook: tienda?.facebook || '',
      tiktok: tienda?.tiktok || '',
    },
    venta: venta ? { tipo: venta.tipo, recomendados_titulo: venta.recomendados?.titulo || '' } : null,
    // En el editor está toda la selección en memoria: filtra y ordena el
    // propio runtime, sin servidor.
    catalogo: { total: catalogo.length, por_pagina: 24, paginado: false },
    productos: catalogo,
    producto,
    recomendados: recomendadosVista(catalogo, producto, venta),
  };
}
