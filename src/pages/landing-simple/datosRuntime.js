import { getMediaUrl } from '../../services/api';
import { ofertaCheckoutPublicable, detalleOfertaCheckout, precioVentaProducto } from '../landing/ofertasCheckout';

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
 * que el comercio marcó en "Configurar venta" o en el wizard de IA. Antes,
 * sin marcar ninguna se mostraban todas las de los productos, y aparecían
 * ofertas que nadie había elegido para esta landing. Una landing que nunca
 * pasó por ese paso (sin venta configurada) conserva el comportamiento viejo:
 * todas.
 */
export function ofertaCruzadaVisible(oferta, venta) {
  if (!venta?.configurado) return true;
  const cross = venta.cross_sell;
  if (cross?.activo === false) return false;
  return (cross?.ofertas || []).map(Number).includes(Number(oferta.id));
}

function paqueteVisible(oferta, venta) {
  if (oferta?.estrategia !== 'normal') return false;
  const conf = venta?.paquetes?.[String(oferta.id)] || venta?.paquetes?.[Number(oferta.id)];
  return conf?.activo !== false;
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
    .filter(o => (o.estrategia === 'normal' ? paqueteVisible(o, venta) : (ofertaCruzadaVisible(o, venta) && ofertaCheckoutPublicable(o))))
    .map(o => {
      const detalle = detalleOfertaCheckout(o);
      const precioOferta = detalle.precioFinal || o.precio_efectivo || o.precio;
      // Paquete ("3 AdelFit por Gs 300.000"): el ancla es lo que costarían
      // las mismas unidades sueltas (3 × precio del producto).
      const sueltas = o.estrategia === 'normal' && Number(o.unidades) > 1 ? Number(o.unidades) * (Number(item.precio) || 0) : 0;
      return conAhorro({
        id: o.id,
        nombre: o.nombre,
        estrategia: o.estrategia,
        descripcion: o.descripcion || null,
        precio_efectivo: precioOferta,
        precio_normal: sueltas > precioOferta
          ? sueltas
          : (detalle.precioNormal && detalle.precioNormal > detalle.precioFinal ? detalle.precioNormal : null),
        imagen: media(detalle.imagen) || media(item.imagen),
        unidades: o.unidades || null,
      });
    });
}

export function presentacionComercial(item, venta) {
  const key = `${item.tipo || 'producto'}:${item.referencia_id ?? item.id}`;
  const fuente = venta?.presentacion_productos?.[key] || item;
  return Object.fromEntries(['titulo_comercial', 'mensaje_comercial', 'insignia_principal', 'insignia_secundaria'].map(campo => [campo, String(fuente[campo] || '').trim()]));
}

export function imagenesParaLanding(item, venta = null) {
  const key = `${item.tipo || 'producto'}:${item.referencia_id ?? item.id}`;
  const propia = venta?.presentacion_productos?.[key]?.imagenes_landing ?? item.imagenes_landing;
  // Una lista vacía significa que el comercio quitó TODAS las fotos en esta landing.
  const fotos = Array.isArray(propia) ? propia : [item.imagen, ...(item.imagenes || []).filter(i => typeof i === 'string' || i?.tipo !== 'video')];
  return [...new Set(fotos.map(media).filter(Boolean))];
}

/** Item de /api/l (landing pública) → item del runtime. */
export function itemPublicoARuntime(item, slug, venta = null) {
  const imagenes = imagenesParaLanding(item, venta);
  return {
    ...presentacionComercial(item, venta),
    id: item.content_id,
    referencia_id: item.referencia_id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion || null,
    descripcion_larga: item.descripcion_larga || null,
    precio: item.precio,
    precio_antes: item.precio_antes || null,
    descuento_pct: item.descuento_pct || 0,
    imagen: imagenes[0] || null,
    imagenes_url: imagenes,
    categoria: item.categoria || null,
    marca: typeof item.marca === 'object' ? item.marca?.nombre || null : item.marca || null,
    etiqueta: item.etiqueta || null,
    mostrar_en_inicio: item.mostrar_en_inicio !== false,
    envio_incluido: item.envio_incluido === true,
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
    // Ids de los productos del combo (principal + complementarios): la
    // ficha de cada producto muestra "Llevalo en combo" con estos.
    combo_productos: item.tipo === 'combo' ? (item.productos_combo || []).map(p => Number(p.id)) : [],
    ...contenidoFicha(item),
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
  const normalBase = Number(o.precio_normal ?? o.precio) || 0;
  const bump = o.precio_order_bump != null ? Number(o.precio_order_bump) : null;
  const componente = (o.componentes || [])[0] || null;
  const esCheckout = ['order_bump', 'upsell'].includes(o.estrategia);
  const precioComponente = precioVentaProducto(componente?.producto);
  const normal = esCheckout && precioComponente > 0 ? precioComponente : normalBase;
  const efectivo = esCheckout && bump ? bump : normal;
  const imgsComponente = componente?.producto?.imagenes || [];
  const imagenComponente = (imgsComponente.find(i => i.es_principal) || imgsComponente[0])?.url
    || imagenDeProducto(componente?.producto_id ?? componente?.producto?.id);
  // Paquete: cuántas unidades del mismo producto trae (componente ancla).
  const ancla = (o.componentes || []).find(c => Number(c.producto_id) === Number(o.producto_ancla_id));
  return conAhorro({
    id: o.id,
    nombre: o.nombre,
    estrategia: o.estrategia,
    descripcion: o.descripcion || null,
    unidades: o.estrategia === 'normal' ? (Number(ancla?.cantidad) || null) : null,
    precio_efectivo: efectivo,
    precio_normal: normal > efectivo ? normal : null,
    imagen: media(o.imagen_url || o.imagen || imagenComponente),
  });
}

/**
 * Lo que la ficha necesita para vender, cargado en Productos → "Vista del
 * producto": propuesta de valor, beneficios, garantías y preguntas. Solo
 * datos reales: si el producto no los tiene, la sección se oculta sola.
 * En un combo, además, qué trae y cuánto costaría por separado (el ancla
 * del ahorro).
 */
export function contenidoFicha(item) {
  const beneficios = (Array.isArray(item.beneficios) ? item.beneficios : [])
    .filter(b => String(b?.titulo || '').trim())
    .map(b => ({ titulo: String(b.titulo).trim(), texto: String(b.texto || '').trim() || null, icono: b.icono || null }));
  const confianza = (Array.isArray(item.confianza) ? item.confianza : [])
    .map(c => ({ texto: String(c?.texto || c?.titulo || '').trim(), icono: c?.icono || null }))
    .filter(c => c.texto);
  const preguntas = (Array.isArray(item.preguntas_frecuentes) ? item.preguntas_frecuentes : [])
    .filter(f => String(f?.pregunta || '').trim() && String(f?.respuesta || '').trim())
    .map(f => ({ pregunta: String(f.pregunta).trim(), respuesta: String(f.respuesta).trim() }));
  const comboIncluye = item.tipo === 'combo'
    ? (item.productos_combo || []).map(p => ({
      id: Number(p.id),
      nombre: p.nombre,
      imagen: media(p.imagen),
      precio: Number(p.precio) || null,
      cantidad: Number(p.cantidad) > 1 ? `x${Number(p.cantidad)}` : null,
      content_id: p.slug || null,
    }))
    : [];
  const separado = comboIncluye.reduce((s, p, i) => s + (Number(item.productos_combo[i]?.precio) || 0) * (Number(item.productos_combo[i]?.cantidad) || 1), 0);
  const precio = Number(item.precio) || 0;
  const antes = Number(item.precio_antes) || (separado > precio ? separado : 0);
  return {
    propuesta_valor: String(item.propuesta_valor || '').trim() || null,
    sobre: String(item.sobre_este_producto || '').trim() || null,
    beneficios,
    confianza,
    preguntas,
    combo_incluye: comboIncluye,
    precio_separado: item.tipo === 'combo' && separado > precio ? separado : null,
    // Ahorro del producto o combo: lo usan los binds "ahorro" y "ahorro_texto".
    ahorro: antes > precio && precio > 0 ? antes - precio : 0,
    precio_antes: antes > precio ? antes : (item.precio_antes || null),
    descuento_pct: antes > precio && precio > 0 ? Math.round((1 - precio / antes) * 100) : (item.descuento_pct || 0),
  };
}

/** Item del catálogo del panel (vitrina) → item del runtime, para el preview del editor. */
export function itemPanelARuntime(item, ofertas = [], imagenDeProducto, venta = null) {
  const contentId = contentIdPanel(item);
  const precio = item.precio_efectivo ?? item.precio_usuario ?? item.precio_base ?? item.precio ?? 0;
  const imagenes = imagenesParaLanding(item, venta);
  const ancla = Number(item.precio_ancla ?? item.precio_tachado);
  const precioAntes = ancla > Number(precio) ? ancla : null;
  return {
    ...presentacionComercial(item, venta),
    id: contentId,
    referencia_id: item.id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion || null,
    descripcion_larga: item.descripcion_larga || null,
    precio,
    precio_antes: precioAntes,
    descuento_pct: precioAntes ? Math.round((1 - precio / precioAntes) * 100) : 0,
    imagen: imagenes[0] || null,
    imagenes_url: imagenes,
    categoria: item.categoria || null,
    marca: typeof item.marca === 'object' ? item.marca?.nombre || null : item.marca || null,
    etiqueta: item.etiqueta || null,
    mostrar_en_inicio: item.mostrar_en_inicio !== false,
    envio_incluido: item.envio_incluido === true,
    stock: item.stock ?? null,
    agotado: agotado(item.stock, []),
    // El catálogo del panel no trae variantes ni ofertas: el preview de la
    // ficha las muestra vacías y la landing publicada las trae reales.
    variantes: [],
    ofertas: ofertas.map(o => ofertaPanelARuntime(o, imagenDeProducto)),
    productos_incluidos: item.productos_incluidos || null,
    combo_productos: item.tipo === 'combo' ? (item.productos_combo || []).map(p => Number(p.id)) : [],
    ...contenidoFicha({ ...item, precio, precio_antes: precioAntes }),
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
    // Branding de Mi Tienda → variables --tienda-* (construirDocumentoCodigo).
    colores: data?.tienda?.colores || {
      primario: data?.tema?.primario || null,
      secundario: data?.tema?.secundario || null,
      fondo: null,
    },
    whatsapp: c.whatsapp || t.whatsapp || data?.contacto_whatsapp || '',
    mensaje: t.mensaje || '',
    incluir_precio: !!t.incluir_precio,
    incluir_url: !!t.incluir_url,
    telefono: c.telefono || t.telefono || '',
    email: c.email || t.email || '',
    direccion: [c.direccion || t.direccion, c.ciudad].filter(Boolean).join(', '),
    horarios: c.horarios || '',
    instagram: c.instagram || t.instagram || '',
    facebook: c.facebook || t.facebook || '',
    tiktok: c.tiktok || t.tiktok || '',
    youtube: c.youtube || t.youtube || '',
    twitter: c.twitter || t.twitter || '',
  };
}

function primerProductoId(catalogo = []) {
  return (catalogo.find(i => i.tipo === 'producto') || catalogo[0] || null)?.id || null;
}

function ventaRuntime(venta, catalogo = [], productoPreferido = null) {
  if (!venta) return null;
  const productoId = productoPreferido?.id || primerProductoId(catalogo);
  const urgencia = venta.urgencia
    ? {
      ...venta.urgencia,
      producto_id: venta.urgencia.producto_id || venta.urgencia.content_id || productoId || null,
    }
    : null;
  const pruebaSocial = venta.prueba_social
    ? {
      ...venta.prueba_social,
      producto_id: venta.prueba_social.producto_id || venta.prueba_social.content_id || productoId || null,
    }
    : null;
  return {
    tipo: venta.tipo,
    destacados: venta.destacados || [],
    recomendados_titulo: venta.recomendados?.titulo || '',
    paquetes: venta.paquetes || {},
    catalogo_filtros: venta.catalogo_filtros || {},
    urgencia,
    prueba_social: pruebaSocial,
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
    venta: ventaRuntime(venta, catalogo, producto),
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
    .filter(o => (o.estrategia === 'normal' && paqueteVisible(o, venta)) || (['order_bump', 'upsell'].includes(o.estrategia) && ofertaCruzadaVisible(o, venta)))
    .forEach(o => {
      const k = Number(o.producto_ancla_id);
      porProducto.set(k, [...(porProducto.get(k) || []), o]);
    });
  const imagenPorProducto = new Map(productos.filter(p => p.tipo === 'producto').map(p => [Number(p.id), p.imagen]));
  const imagenDeProducto = id => imagenPorProducto.get(Number(id)) || null;
  const catalogo = productos.map(p => itemPanelARuntime(p, p.tipo === 'producto' ? (porProducto.get(Number(p.id)) || []) : [], imagenDeProducto, venta));
  const producto = vista === 'producto'
    ? (catalogo.find(i => i.id === productoId) || catalogo[0] || null)
    : null;
  return {
    vista: producto ? 'producto' : 'inicio',
    tienda: {
      nombre: tienda?.nombre || '',
      logo: media(tienda?.logo_imagen),
      colores: {
        primario: tienda?.color_primario || null,
        secundario: tienda?.color_secundario || null,
        fondo: tienda?.color_fondo || null,
      },
      whatsapp: tienda?.whatsapp || tienda?.telefono || '',
      telefono: tienda?.telefono || '',
      email: tienda?.email || '',
      direccion: [tienda?.direccion, tienda?.ciudad].filter(Boolean).join(', '),
      horarios: '',
      instagram: tienda?.instagram || '',
      facebook: tienda?.facebook || '',
      tiktok: tienda?.tiktok || '',
      youtube: tienda?.youtube || '',
      twitter: tienda?.twitter || '',
    },
    venta: ventaRuntime(venta, catalogo, producto),
    // En el editor está toda la selección en memoria: filtra y ordena el
    // propio runtime, sin servidor.
    catalogo: { total: catalogo.length, por_pagina: 24, paginado: false },
    productos: catalogo,
    producto,
    recomendados: recomendadosVista(catalogo, producto, venta),
  };
}
