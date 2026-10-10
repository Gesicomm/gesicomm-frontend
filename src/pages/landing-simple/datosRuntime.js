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

export function slugCategoria(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function urlCategoria(slug, categoria) {
  const s = slugCategoria(categoria);
  return slug ? `/l/${slug}/categoria/${s}` : `/categoria/${s}`;
}

export function urlCheckout(slug) {
  return slug ? `/l/${slug}/checkout` : '/checkout';
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

export const PAYMENT_LOGOS_DEFAULT = [
  { clave: 'deposito_bancario', grupo: 'bancario', nombre: 'Deposito bancario', logo_url: '/payment-logos/deposito-bancario.webp', orden: 10 },
  { clave: 'transferencia_bancaria', grupo: 'bancario', nombre: 'Transferencia bancaria', logo_url: '/payment-logos/transferencia-bancaria.webp', orden: 20 },
  { clave: 'visa', grupo: 'tarjetas', nombre: 'Visa', logo_url: '/payment-logos/visa.webp', orden: 100 },
  { clave: 'mastercard', grupo: 'tarjetas', nombre: 'Mastercard', logo_url: '/payment-logos/mastercard.webp', orden: 110 },
  { clave: 'american_express', grupo: 'tarjetas', nombre: 'American Express', logo_url: '/payment-logos/american-express.webp', orden: 120 },
  { clave: 'diners_club', grupo: 'tarjetas', nombre: 'Diners Club', logo_url: '/payment-logos/diners-club.webp', orden: 130 },
  { clave: 'bancard', grupo: 'tarjetas', nombre: 'Bancard', logo_url: '/payment-logos/bancard.webp', orden: 140 },
  { clave: 'credicheck', grupo: 'bocas', nombre: 'Credicheck', logo_url: '/payment-logos/credicheck.webp', orden: 200 },
  { clave: 'cabal', grupo: 'tarjetas', nombre: 'Cabal', logo_url: '/payment-logos/cabal.webp', orden: 210 },
  { clave: 'panal', grupo: 'bocas', nombre: 'Panal', logo_url: '/payment-logos/panal.webp', orden: 220 },
  { clave: 'discover', grupo: 'tarjetas', nombre: 'Discover', logo_url: '/payment-logos/discover.webp', orden: 230 },
  { clave: 'jcb', grupo: 'tarjetas', nombre: 'JCB', logo_url: '/payment-logos/jcb.webp', orden: 240 },
];

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
  return {
    ...Object.fromEntries(Object.keys(PAGINAS_TIENDA).map(p => [p, urlPaginaTienda(slug, p)])),
    checkout: urlCheckout(slug),
  };
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

const FICHA_BLOQUES_DEFAULT = {
  galeria: true,
  encabezado: true,
  nombre_comercial: true,
  resenas_comerciales: true,
  precio: true,
  badge_precio: true,
  descripcion: true,
  info_compra: true,
  urgencia: true,
  oferta: true,
  oferta_encabezado: true,
  oferta_nombre: true,
  oferta_texto: true,
  oferta_duracion: true,
  beneficios: true,
  confianza: true,
  compra: true,
  promociones_pago: true,
  contacto_pago: true,
  incluye: true,
  recomendados: true,
  opiniones: true,
  preguntas: true,
  portada: true,
  textos: true,
};
const FICHA_ORDEN_MOBILE_DEFAULT = [
  'galeria',
  'encabezado',
  'nombre_comercial',
  'resenas_comerciales',
  'precio',
  'badge_precio',
  'oferta',
  'descripcion',
  'beneficios',
  'contacto_pago',
  'promociones_pago',
  'incluye',
  'confianza',
  'recomendados',
  'opiniones',
  'preguntas',
];
const FICHA_BLOQUES_ALIAS = {
  urgencia: ['oferta'],
  oferta_encabezado: ['oferta'],
  oferta_nombre: ['oferta'],
  oferta_texto: ['oferta'],
  oferta_duracion: ['oferta'],
};
function normalizarOrdenMobileFicha(orden) {
  const vistos = new Set();
  const limpio = [];
  (Array.isArray(orden) ? orden : []).forEach(clave => {
    const claves = FICHA_BLOQUES_ALIAS[clave] || [clave];
    claves.forEach(claveReal => {
      if (!FICHA_ORDEN_MOBILE_DEFAULT.includes(claveReal) || vistos.has(claveReal)) return;
      vistos.add(claveReal);
      limpio.push(claveReal);
    });
  });
  return [...limpio, ...FICHA_ORDEN_MOBILE_DEFAULT.filter(clave => !vistos.has(clave))];
}

const PRESENTACION_PRODUCTO_DEFAULT = {
  resenas_texto: '',
  resenas_calificacion: 4.9,
  insignia_principal: '',
  cta_texto: 'Comprar con pago anticipado',
  cta_descuento_pct: '',
  agregar_carrito_texto: 'Agregar al carrito',
  beneficios_kicker: 'Por qué elegirlo',
  beneficios_titulo: 'Beneficios que se entienden rápido.',
  beneficios_subtitulo: 'Usá estos ejemplos como guía y ajustalos a lo que realmente ofrece tu producto.',
  urgencia_kicker: 'Oferta por tiempo limitado',
  urgencia_titulo: 'Reservá esta condición antes de que termine.',
  urgencia_texto: 'La fecha real se configura en Gesicomm; el contador se actualiza solo.',
  urgencia_horas: 1,
  urgencia_minutos: 59,
  urgencia_segundos: 58,
  opiniones_kicker: 'Opiniones',
  opiniones_titulo: 'Personas que ya lo probaron.',
  opiniones_subtitulo: '',
  preguntas_kicker: 'Resolvemos tus dudas',
  preguntas_titulo: 'Preguntas frecuentes',
  preguntas_subtitulo: '',
  beneficios: [
    { titulo: 'Compra simple', texto: 'Elegí la opción ideal y completá tu pedido en pocos pasos.' },
    { titulo: 'Atención cercana', texto: 'Podés consultar antes de comprar y recibir ayuda con tu pedido.' },
    { titulo: 'Producto seleccionado', texto: 'Una presentación clara para mostrar lo mejor de este producto.' },
  ],
  botones_pago: [
    { label: 'Pago contra entrega', tipo: 'checkout', valor: 'efectivo' },
  ],
  botones_contacto: [
    { label: 'Consultar por WhatsApp', tipo: 'whatsapp', valor: '' },
  ],
  metodos_pago: [
    { texto: 'Pago contra entrega' },
    { texto: 'Transferencia bancaria' },
  ],
  incluye_pedido: [
    { texto: '1 unidad del producto seleccionado' },
    { texto: 'Coordinación de entrega' },
    { texto: 'Soporte de la tienda para tu compra' },
  ],
  opiniones: [
    { nombre: 'Cliente verificado', comentario: 'La compra fue simple y la atención me ayudó a elegir mejor.', detalle: 'Ejemplo editable', calificacion: 5, foto: '' },
    { nombre: 'María P.', comentario: 'Me gustó poder ver la información clara antes de hacer el pedido.', detalle: 'Ejemplo editable', calificacion: 5, foto: '' },
  ],
  preguntas: [
    { pregunta: '¿Cómo confirmo que este producto es para mí?', respuesta: 'Revisá las características y las imágenes. Si tenés alguna duda sobre compatibilidad o uso, consultanos antes de realizar el pedido.' },
    { pregunta: '¿Cuánto cuesta el envío y cuándo llega?', respuesta: 'La cobertura, el costo y el plazo se confirman según tu dirección antes de cerrar la compra.' },
    { pregunta: '¿Puedo pagar contra entrega o pedir un cambio?', respuesta: 'Las opciones disponibles dependen de tu ciudad y de las políticas de la tienda. Podés consultarnos antes de comprar.' },
  ],
};

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

function textoLimpio(valor) {
  return String(valor ?? '').trim();
}

function normalizarCalificacion(valor, fallback = 5) {
  const crudo = String(valor ?? '').replace(',', '.').trim();
  const n = Number(crudo);
  const base = Number.isFinite(n) ? n : Number(fallback);
  return Math.max(1, Math.min(5, Math.round((Number.isFinite(base) ? base : 5) * 10) / 10));
}

function primeraListaConDatos(...opciones) {
  return opciones.find(opcion => Array.isArray(opcion) && opcion.length) || [];
}

function normalizarBeneficio(b) {
  if (typeof b === 'string') return { titulo: textoLimpio(b), texto: '', icono: null };
  return {
    titulo: textoLimpio(b?.titulo || b?.title || b?.texto || b?.text),
    texto: textoLimpio(b?.texto || b?.text || b?.descripcion || b?.description),
    icono: b?.icono || b?.icon || null,
  };
}

function normalizarConfianza(c) {
  if (typeof c === 'string') return { icono: '', titulo: textoLimpio(c), texto: '' };
  const titulo = textoLimpio(c?.titulo || c?.title || c?.texto || c?.text);
  const texto = textoLimpio(c?.texto || c?.text || c?.subtitulo || c?.subtitle || c?.descripcion || c?.description);
  return {
    icono: textoLimpio(c?.icono || c?.icon),
    titulo,
    texto: texto && texto !== titulo ? texto : '',
  };
}

function normalizarPregunta(f) {
  return {
    pregunta: textoLimpio(f?.pregunta || f?.question),
    respuesta: textoLimpio(f?.respuesta || f?.answer),
  };
}

function normalizarOpinion(o) {
  return {
    nombre: textoLimpio(o?.nombre || o?.name || o?.author) || 'Cliente verificado',
    comentario: textoLimpio(o?.comentario || o?.comment || o?.text || o?.review),
    detalle: textoLimpio(o?.detalle || o?.source || o?.subtitle),
    calificacion: normalizarCalificacion(o?.calificacion || o?.rating || o?.stars, 5),
    foto: media(o?.foto || o?.photo || o?.image || o?.avatar),
  };
}

function opinionesDeFichaDatos(fichaDatos = {}) {
  return primeraListaConDatos(
    fichaDatos.product_page_opiniones,
    fichaDatos.opiniones,
    fichaDatos.reviews,
    fichaDatos.testimonials,
    fichaDatos.fitness_opiniones,
  );
}

function normalizarPaymentLogo(logo) {
  if (!logo || typeof logo !== 'object' || logo.activo === false) return null;
  const logoUrl = logo.logo_url || logo.imagen || '';
  if (!logoUrl) return null;
  return {
    clave: String(logo.clave || logo.nombre || '').trim(),
    grupo: String(logo.grupo || 'otros').trim(),
    nombre: String(logo.nombre || logo.clave || 'Metodo de pago').trim(),
    logo_url: logoUrl,
    imagen: logoUrl,
    orden: Number.isFinite(Number(logo.orden)) ? Number(logo.orden) : 0,
  };
}

function logosPagoDesdeVenta(venta) {
  if (Array.isArray(venta?.payment_logos)) {
    return venta.payment_logos
      .map(normalizarPaymentLogo)
      .filter(Boolean)
      .sort((a, b) => a.orden - b.orden);
  }
  const legacy = venta?.pago_logos || {};
  const tieneLegacy = legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0;
  return PAYMENT_LOGOS_DEFAULT
    .filter(logo => (tieneLegacy ? (Object.prototype.hasOwnProperty.call(legacy, logo.grupo) && legacy[logo.grupo] !== false) : true))
    .map(normalizarPaymentLogo)
    .filter(Boolean);
}

/** Textos de bloque propios del producto (los carga el JSON de la IA en Productos). */
export function presentacionDelProducto(fichaDatos) {
  const p = fichaDatos?.presentacion;
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}

export function presentacionComercial(item, venta) {
  const key = `${item.tipo || 'producto'}:${item.referencia_id ?? item.id}`;
  const fuente = venta?.presentacion_productos?.[key] || item;
  const fichaDatos = { ...(item.ficha_datos || {}), ...(fuente.ficha_datos || {}) };
  // Textos de bloque cargados en el producto (ficha_datos.presentacion, p. ej.
  // desde el JSON de la IA): valen en todas sus landings mientras la landing
  // no escriba los suyos. Mismos nombres de campo que presentacion_productos.
  const delProducto = presentacionDelProducto(fichaDatos);
  const texto = campo => String(fuente[campo] || delProducto[campo] || PRESENTACION_PRODUCTO_DEFAULT[campo] || '').trim();
  const lista = (campo) => [fuente[campo], delProducto[campo]].find(l => Array.isArray(l) && l.length) || PRESENTACION_PRODUCTO_DEFAULT[campo];
  const beneficiosFuente = primeraListaConDatos(fuente.beneficios, item.beneficios, fichaDatos.beneficios_rapidos) || PRESENTACION_PRODUCTO_DEFAULT.beneficios;
  const beneficios = (beneficiosFuente.length ? beneficiosFuente : PRESENTACION_PRODUCTO_DEFAULT.beneficios)
    .map(normalizarBeneficio)
    .filter(b => b.titulo || b.texto);
  const confianza = primeraListaConDatos(fuente.confianza, item.confianza, fichaDatos.confianza, fichaDatos.trust_items)
    .map(normalizarConfianza)
    .filter(c => c.titulo || c.texto);
  const preguntasFuente = primeraListaConDatos(
    fuente.preguntas,
    fuente.faq,
    fuente.faqs,
    fuente.preguntas_frecuentes,
    item.preguntas,
    item.faq,
    item.faqs,
    item.preguntas_frecuentes,
  );
  const preguntas = (preguntasFuente.length ? preguntasFuente : PRESENTACION_PRODUCTO_DEFAULT.preguntas)
    .map(normalizarPregunta)
    .filter(f => f.pregunta && f.respuesta);
  const opinionesFuente = Array.isArray(fuente.opiniones)
    ? fuente.opiniones
    : primeraListaConDatos(item.opiniones, opinionesDeFichaDatos(fichaDatos));
  const opinionesBase = Array.isArray(fuente.opiniones)
    ? opinionesFuente
    : (opinionesFuente.length ? opinionesFuente : PRESENTACION_PRODUCTO_DEFAULT.opiniones);
  const opiniones = opinionesBase
    .map(normalizarOpinion)
    .filter(o => o.comentario);
  // Reseñas debajo del título: si el comercio no escribió el texto a mano,
  // se arma con las opiniones REALES del producto (nunca con las de ejemplo).
  const opinionesReales = opinionesFuente.map(normalizarOpinion).filter(o => o.comentario);
  const promedio = opinionesReales.length
    ? opinionesReales.reduce((s, o) => s + (Number(o.calificacion) || 5), 0) / opinionesReales.length
    : 0;
  const resenasAuto = opinionesReales.length
    ? `${promedio.toLocaleString('es-PY', { maximumFractionDigits: 1 })} de 5 · ${opinionesReales.length} ${opinionesReales.length === 1 ? 'opinión' : 'opiniones'}`
    : '';
  const resenasCalificacion = normalizarCalificacion(
    fuente.resenas_calificacion ?? fuente.rating_comercial ?? fuente.estrellas_comerciales,
    promedio || PRESENTACION_PRODUCTO_DEFAULT.resenas_calificacion,
  );
  const paymentLogos = logosPagoDesdeVenta(venta);
  const pagoLogoTarjetas = paymentLogos.some(logo => logo.grupo === 'tarjetas');
  const pagoLogoBocas = paymentLogos.some(logo => logo.grupo === 'bocas');
  const pagoLogoBilletera = paymentLogos.some(logo => logo.grupo === 'billetera');
  const bloquesCrudos = fuente.ficha_bloques || {};
  const bloquesCompatibles = { ...FICHA_BLOQUES_DEFAULT, ...bloquesCrudos };
  if (bloquesCrudos.portada === false && bloquesCrudos.galeria === undefined) bloquesCompatibles.galeria = false;
  if (bloquesCrudos.encabezado === false) {
    if (bloquesCrudos.nombre_comercial === undefined) bloquesCompatibles.nombre_comercial = false;
    if (bloquesCrudos.resenas_comerciales === undefined) bloquesCompatibles.resenas_comerciales = false;
  }
  if (bloquesCrudos.precio === false && bloquesCrudos.badge_precio === undefined) bloquesCompatibles.badge_precio = false;
  if (bloquesCrudos.urgencia === false) {
    if (bloquesCrudos.oferta === undefined) bloquesCompatibles.oferta = false;
    ['oferta_encabezado', 'oferta_nombre', 'oferta_texto', 'oferta_duracion'].forEach(clave => {
      if (bloquesCrudos[clave] === undefined) bloquesCompatibles[clave] = false;
    });
  }
  if (bloquesCrudos.textos === false) {
    if (bloquesCrudos.encabezado === undefined) bloquesCompatibles.encabezado = false;
    if (bloquesCrudos.nombre_comercial === undefined) bloquesCompatibles.nombre_comercial = false;
    if (bloquesCrudos.resenas_comerciales === undefined) bloquesCompatibles.resenas_comerciales = false;
    if (bloquesCrudos.precio === undefined) bloquesCompatibles.precio = false;
    if (bloquesCrudos.descripcion === undefined) bloquesCompatibles.descripcion = false;
  }
  if (bloquesCrudos.compra === false) {
    if (bloquesCrudos.info_compra === undefined) bloquesCompatibles.info_compra = false;
    if (bloquesCrudos.contacto_pago === undefined) bloquesCompatibles.contacto_pago = false;
    if (bloquesCrudos.promociones_pago === undefined) bloquesCompatibles.promociones_pago = false;
  }

  return {
    ...Object.fromEntries(['titulo_comercial', 'mensaje_comercial', 'insignia_principal', 'insignia_secundaria', 'cta_texto', 'cta_descuento_pct', 'agregar_carrito_texto', 'beneficios_kicker', 'beneficios_titulo', 'beneficios_subtitulo', 'urgencia_kicker', 'urgencia_titulo', 'urgencia_texto', 'urgencia_horas', 'urgencia_minutos', 'urgencia_segundos', 'opiniones_kicker', 'opiniones_titulo', 'opiniones_subtitulo', 'preguntas_kicker', 'preguntas_titulo', 'preguntas_subtitulo'].map(campo => [campo, texto(campo)])),
    resenas_texto: texto('resenas_texto') || resenasAuto,
    resenas_calificacion: resenasCalificacion,
    ficha_bloques: bloquesCompatibles,
    ficha_orden_mobile: normalizarOrdenMobileFicha(fuente.ficha_orden_mobile),
    beneficios,
    confianza,
    botones_pago: lista('botones_pago'),
    // Vacía = el comercio desmarcó todos los métodos: no se rellena con ejemplos.
    metodos_pago: Array.isArray(fuente.metodos_pago) ? fuente.metodos_pago : PRESENTACION_PRODUCTO_DEFAULT.metodos_pago,
    incluye_pedido: lista('incluye_pedido'),
    botones_contacto: Array.isArray(fuente.botones_contacto) ? fuente.botones_contacto : PRESENTACION_PRODUCTO_DEFAULT.botones_contacto,
    opiniones,
    preguntas,
    pago_logo_tarjetas: pagoLogoTarjetas,
    pago_logo_bocas: pagoLogoBocas,
    pago_logo_billetera: pagoLogoBilletera,
    pago_logos_activo: paymentLogos.length > 0,
    payment_logos: paymentLogos,
  };
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
    categoria_url: item.categoria ? urlCategoria(slug, item.categoria) : '',
    marca: typeof item.marca === 'object' ? item.marca?.nombre || null : item.marca || null,
    // La etiqueta de la landing manda; si no hay, el badge del producto
    // (ficha_datos.insignia, el "badge" del JSON de la IA).
    etiqueta: item.etiqueta || String(item.ficha_datos?.insignia || '').trim() || null,
    mostrar_en_inicio: item.mostrar_en_inicio !== false,
    envio_incluido: item.envio_incluido === true,
    stock: item.stock ?? null,
    // Para la lista "productos_novedades" del runtime (ver runtimeGesicomm.js).
    creado: item.creado || null,
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
    ...presentacionComercial(item, venta),
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
  const fichaDatos = item.ficha_datos || {};
  const beneficios = primeraListaConDatos(item.beneficios, fichaDatos.beneficios_rapidos)
    .map(normalizarBeneficio)
    .filter(b => b.titulo || b.texto);
  const confianza = primeraListaConDatos(item.confianza, fichaDatos.confianza, fichaDatos.trust_items)
    .map(normalizarConfianza)
    .filter(c => c.titulo || c.texto);
  const preguntas = primeraListaConDatos(item.preguntas, item.faq, item.faqs, item.preguntas_frecuentes)
    .map(normalizarPregunta)
    .filter(f => f.pregunta && f.respuesta);
  const opiniones = opinionesDeFichaDatos(fichaDatos).map(normalizarOpinion).filter(o => o.comentario);
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
    // Texto principal de la ficha, debajo del nombre y antes de las reseñas:
    // la descripción completa, o la corta si el producto no tiene otra. Así
    // la ficha nunca queda sin descripción.
    descripcion_ficha: String(item.descripcion_larga || '').trim() || String(item.descripcion || '').trim() || null,
    sobre: String(item.sobre_este_producto || '').trim() || null,
    beneficios,
    confianza,
    preguntas,
    opiniones,
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
    categoria_url: item.categoria ? urlCategoria(null, item.categoria) : '',
    marca: typeof item.marca === 'object' ? item.marca?.nombre || null : item.marca || null,
    // La etiqueta de la landing manda; si no hay, el badge del producto
    // (ficha_datos.insignia, el "badge" del JSON de la IA).
    etiqueta: item.etiqueta || String(item.ficha_datos?.insignia || '').trim() || null,
    mostrar_en_inicio: item.mostrar_en_inicio !== false,
    envio_incluido: item.envio_incluido === true,
    stock: item.stock ?? null,
    creado: item.created_at || item.createdAt || null,
    agotado: agotado(item.stock, []),
    // El catálogo del panel no trae variantes ni ofertas: el preview de la
    // ficha las muestra vacías y la landing publicada las trae reales.
    variantes: [],
    ofertas: ofertas.map(o => ofertaPanelARuntime(o, imagenDeProducto)),
    productos_incluidos: item.productos_incluidos || null,
    combo_productos: item.tipo === 'combo' ? (item.productos_combo || []).map(p => Number(p.id)) : [],
    ...contenidoFicha({ ...item, precio, precio_antes: precioAntes }),
    ...presentacionComercial(item, venta),
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
    mensaje: t.mensaje || data?.tienda?.mensaje_contacto || '',
    // Consultas sin producto (inicio, categorías) — ver mensajeConsultaGeneral.
    mensaje_general: t.mensaje_general || data?.tienda?.mensaje_consulta_general || '',
    canal_contacto: c.canal_contacto || t.canal_contacto || data?.tienda?.canal_contacto || data?.canal_contacto || 'whatsapp',
    incluir_precio: !!t.incluir_precio,
    incluir_url: !!t.incluir_url,
    telefono: c.telefono || t.telefono || '',
    email: c.email || t.email || '',
    direccion: [c.direccion || t.direccion, c.ciudad].filter(Boolean).join(', '),
    horarios: c.horarios || '',
    nombre_contacto: c.nombre || '',
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
  const inicio = venta.inicio || venta.inicio_comercial || {};
  const normalizarBanner = banner => ({
    ...banner,
    imagen: media(banner.imagen) || '',
  });
  const productoId = productoPreferido?.id || primerProductoId(catalogo);
  const urgencia = venta.urgencia
    ? {
      ...venta.urgencia,
      producto_id: venta.urgencia.producto_id || venta.urgencia.content_id || null,
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
    inicio: {
      ...inicio,
      banners: (Array.isArray(inicio.banners) ? inicio.banners : []).filter(Boolean).map(normalizarBanner),
      banners_intermedios: (Array.isArray(inicio.banners_intermedios) ? inicio.banners_intermedios : []).filter(Boolean).map(normalizarBanner),
    },
    recomendados_kicker: venta.recomendados?.kicker || '',
    recomendados_titulo: venta.recomendados?.titulo || '',
    recomendados_subtitulo: venta.recomendados?.subtitulo || '',
    recomendados_cta: venta.recomendados?.cta_texto || '',
    checkout_recomendados: venta.checkout_recomendados || {},
    paquetes: venta.paquetes || {},
    catalogo_filtros: venta.catalogo_filtros || {},
    urgencia,
    prueba_social: pruebaSocial,
  };
}

/** Datos del runtime para la landing publicada (inicio o ficha). */
function categoriaPorSlug(catalogo, categorySlug) {
  if (!categorySlug) return null;
  return catalogo.map(i => i.categoria).filter(Boolean).find(c => slugCategoria(c) === categorySlug) || null;
}

function resumenCarritoRuntime(carrito = []) {
  const items = Array.isArray(carrito) ? carrito : [];
  const subtotal = items.reduce((s, it) => s + (Number(it.precio) || 0) * (Number(it.cantidad) || 0), 0);
  return {
    items: items.map(it => ({
      ...it,
      id: it.clave,
      nombre: it.ofertaNombre || it.nombre,
      variante: it.componenteVarianteNombre || it.varianteNombre || '',
      precio_unitario: it.precio,
      subtotal: (Number(it.precio) || 0) * (Number(it.cantidad) || 0),
      // El carrito guarda la imagen como la trae la oferta o el producto
      // (a veces una key relativa del bucket): sin resolverla, el <img> del
      // resumen quedaba roto, el runtime lo ocultaba y la fila se desarmaba.
      imagen: media(it.imagen) || '',
    })),
    cantidad: items.reduce((s, it) => s + (Number(it.cantidad) || 0), 0),
    subtotal,
    total: subtotal,
  };
}

/**
 * Lo que el checkout propio ofrece además del carrito: los order bumps de
 * los productos que ya están en el pedido (y que todavía no se sumaron) y
 * otros productos de la landing para agregar. Mismo criterio que el carrito
 * lateral (useStoreCart): el bump sale de las ofertas del producto que se
 * está comprando, nunca de uno que no está en el pedido.
 */
function extrasCheckoutRuntime(catalogo, carrito = [], venta = null) {
  const items = Array.isArray(carrito) ? carrito : [];
  if (!items.length) return { bumps: [], recomendados: [] };
  const enCarrito = new Set(items.map(it => it.contentId));
  const ofertasEnCarrito = new Set(items.map(it => it.ofertaId).filter(Boolean).map(Number));
  // Si el bump ya está en el pedido, el resumen lo confirma. Repetirlo como
  // oferta grande en el checkout duplicaba información y ensuciaba la compra.
  const bumps = [];
  items.forEach(it => {
    const producto = catalogo.find(p => p.id === it.contentId);
    (producto?.ofertas || [])
      .filter(o => o.estrategia === 'order_bump')
      .forEach(o => {
        if (bumps.length >= 2 || bumps.some(b => b.id === o.id)) return;
        if (ofertasEnCarrito.has(Number(o.id))) return;
        bumps.push({ ...o, content_id: producto.id, precio_antes: o.precio_normal || null, en_pedido: ofertasEnCarrito.has(Number(o.id)) });
      });
  });
  const checkoutReco = venta?.checkout_recomendados || {};
  if (checkoutReco.activo === false) return { bumps, recomendados: [] };
  const max = Math.max(1, Math.min(12, Number(checkoutReco.max) || 4));
  const itemsManuales = Array.isArray(checkoutReco.items) ? checkoutReco.items : [];
  const idsManuales = itemsManuales
    .map(item => (typeof item === 'object' ? (item.id || item.content_id || item.contentId) : item))
    .filter(Boolean)
    .map(String);
  const preciosAntes = checkoutReco.precio_antes && typeof checkoutReco.precio_antes === 'object' ? checkoutReco.precio_antes : {};
  if (idsManuales.length) {
    const porId = new Map(catalogo.map(p => [String(p.id), p]));
    const recomendados = idsManuales
      .map(id => porId.get(String(id)))
      .filter(p => p && p.tipo === 'producto' && !enCarrito.has(p.id) && !p.agotado)
      .map(p => {
        const precioAntes = Number(preciosAntes[p.id]) || Number(p.precio_antes) || null;
        const precio = Number(p.precio) || 0;
        return precioAntes && precioAntes > precio
          ? { ...p, precio_antes: precioAntes, descuento_pct: Math.round((1 - precio / precioAntes) * 100) }
          : p;
      })
      .slice(0, max);
    return { bumps, recomendados };
  }

  const categorias = new Set(items.map(it => catalogo.find(p => p.id === it.contentId)?.categoria).filter(Boolean));
  const candidatos = catalogo.filter(p => p.tipo === 'producto' && !enCarrito.has(p.id) && !p.agotado);
  const recomendados = [
    ...candidatos.filter(p => categorias.has(p.categoria)),
    ...candidatos.filter(p => !categorias.has(p.categoria)),
  ].slice(0, max);
  return { bumps, recomendados };
}

export function datosRuntimePublico(data, slug, productoPublico, opciones = {}) {
  const venta = data?.content?.venta || null;
  const catalogo = (data?.catalogo_items || data?.items || []).map(i => itemPublicoARuntime(i, slug, venta));
  const producto = productoPublico
    ? (catalogo.find(i => i.id === productoPublico.content_id) || itemPublicoARuntime(productoPublico, slug, venta))
    : null;
  const categoriaActual = opciones.categoria || categoriaPorSlug(catalogo, opciones.categorySlug);
  const meta = data?.content?.catalogo || {};
  const paginacion = data?.paginacion || {};
  const totalCatalogo = paginacion.total ?? meta.total ?? catalogo.length;
  const porPaginaCatalogo = paginacion.porPagina ?? paginacion.por_pagina ?? meta.porPagina ?? meta.por_pagina ?? 20;
  const totalPaginasCatalogo = paginacion.totalPaginas ?? paginacion.total_paginas ?? meta.totalPaginas ?? meta.total_paginas ?? 1;
  const extrasCheckout = opciones.vista === 'checkout'
    ? extrasCheckoutRuntime(catalogo, opciones.carrito, venta)
    : { bumps: [], recomendados: [] };
  return {
    vista: opciones.vista || (producto ? 'producto' : (categoriaActual ? 'categoria' : 'inicio')),
    categoria: categoriaActual ? { nombre: categoriaActual, slug: slugCategoria(categoriaActual), url: urlCategoria(slug, categoriaActual) } : null,
    tienda: tiendaRuntime(data),
    venta: ventaRuntime(venta, catalogo, producto),
    // paginado: la respuesta trae solo la primera página; el resto lo pide
    // el runtime (ver onCatalogo en LandingCodigoPublica).
    catalogo: {
      total: totalCatalogo,
      por_pagina: porPaginaCatalogo,
      paginado: !!(meta.paginado || paginacion.total != null || totalPaginasCatalogo > 1 || totalCatalogo > porPaginaCatalogo),
    },
    paginas: paginasDeTienda(slug),
    productos: catalogo,
    producto,
    carrito: resumenCarritoRuntime(opciones.carrito || []),
    checkout_estado: opciones.checkoutEstado || null,
    checkout_bumps: extrasCheckout.bumps,
    checkout_recomendados: extrasCheckout.recomendados,
    recomendados: recomendadosVista(catalogo, producto, venta),
    // Departamentos/ciudades de Paraguay para el checkout propio (ver
    // data-gesicomm-geografia). Se pide una sola vez en LandingCodigoPublica,
    // no por vista — por eso llega entero o vacío, nunca a medio cargar.
    geografia: Array.isArray(opciones.geografia) ? opciones.geografia : [],
  };
}

/** Sentinel para "todas las categorías" en el preview del panel de categorías. */
export const TODAS_CATEGORIAS = '__todas__';

function coloresTiendaPreview(tienda, landing = null) {
  const colores = tienda?.colores || {};
  return {
    primario: landing?.color_primario || tienda?.color_primario || colores.primario || null,
    secundario: landing?.color_texto || tienda?.color_secundario || colores.secundario || colores.texto || null,
    fondo: landing?.color_fondo || tienda?.color_fondo || colores.fondo || null,
  };
}

/** Datos del runtime para el preview del editor, con el catálogo del panel. */
export function datosRuntimePreview({ productos = [], tienda, landing = null, venta, vista, productoId, categoria = null, ofertas = [], geografia = [] }) {
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
  const carritoPreview = catalogo[0] ? [{
    clave: 'preview',
    tipo: catalogo[0].tipo,
    contentId: catalogo[0].id,
    nombre: catalogo[0].nombre,
    precio: catalogo[0].precio,
    cantidad: 1,
    imagen: catalogo[0].imagen,
  }] : [];
  const extrasCheckout = vista === 'checkout'
    ? extrasCheckoutRuntime(catalogo, carritoPreview, venta)
    : { bumps: [], recomendados: [] };
  return {
    vista: producto ? 'producto' : vista || 'inicio',
    categoria: vista === 'categoria'
      ? (categoria === TODAS_CATEGORIAS
        ? { nombre: '', slug: '', url: '#' }
        : { nombre: categoria || catalogo.find(i => i.categoria)?.categoria || 'Categoría', slug: slugCategoria(categoria || catalogo.find(i => i.categoria)?.categoria || 'categoria'), url: '#' })
      : null,
    tienda: {
      nombre: tienda?.nombre || '',
      logo: media(tienda?.logo_imagen),
      colores: coloresTiendaPreview(tienda, landing),
      whatsapp: tienda?.whatsapp || tienda?.telefono || '',
      mensaje: tienda?.mensaje_contacto || '',
      mensaje_general: tienda?.mensaje_consulta_general || '',
      canal_contacto: tienda?.canal_contacto || 'whatsapp',
      telefono: tienda?.telefono || '',
      email: tienda?.email || '',
      direccion: [tienda?.direccion, tienda?.ciudad].filter(Boolean).join(', '),
      horarios: tienda?.horario_atencion || '',
      nombre_contacto: tienda?.nombre_contacto || '',
      instagram: tienda?.instagram || '',
      facebook: tienda?.facebook || '',
      tiktok: tienda?.tiktok || '',
      youtube: tienda?.youtube || '',
      twitter: tienda?.twitter || '',
    },
    venta: ventaRuntime(venta, catalogo, producto),
    // En el editor está toda la selección en memoria: filtra y ordena el
    // propio runtime, sin servidor.
    catalogo: { total: catalogo.length, por_pagina: 20, paginado: false },
    paginas: { checkout: '#' },
    productos: catalogo,
    producto,
    carrito: resumenCarritoRuntime(carritoPreview),
    checkout_estado: null,
    checkout_bumps: extrasCheckout.bumps,
    checkout_recomendados: extrasCheckout.recomendados,
    recomendados: recomendadosVista(catalogo, producto, venta),
    geografia: Array.isArray(geografia) ? geografia : [],
  };
}


