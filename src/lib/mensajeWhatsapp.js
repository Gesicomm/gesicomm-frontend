/**
 * Construcción del link de WhatsApp.
 *
 * Mi tienda tiene dos plantillas editables:
 * - Tienda.mensaje_contacto: consulta de PRODUCTO (botón "Consultar" de la
 *   ficha o de la tarjeta). Variables {producto}, {precio}, {url}.
 * - Tienda.mensaje_consulta_general: consulta sin producto (inicio,
 *   categorías, contacto). Solo {url}.
 * El checkout/pedido arma su propio mensaje con contexto de pedido para no
 * mezclarlo con textos de seguimiento o courier.
 */

function formatPrecio(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

/**
 * Reemplaza todos los placeholders conocidos en la plantilla de mensaje.
 * @param {string} plantilla - Texto con variables como {producto}, {precio}, {url}
 * @param {object} datos - { nombre, precio, url }
 */
function aplicarPlantilla(plantilla, datos) {
  let msg = plantilla;
  if (datos.nombre != null)  msg = msg.replace(/\{producto\}/gi, datos.nombre);
  if (datos.precio != null)  msg = msg.replace(/\{precio\}/gi, formatPrecio(datos.precio));
  if (datos.url != null)     msg = msg.replace(/\{url\}/gi, datos.url);
  return msg;
}

/**
 * wa.me solo acepta dígitos: un número guardado como "+595 981 000 111"
 * (formato natural que carga el comercio) generaba una URL con espacios y
 * "+" que WhatsApp rechazaba. Se normaliza siempre acá, en un solo lugar.
 */
function soloDigitos(tel) {
  return String(tel || '').replace(/\D/g, '');
}

function urlActual() {
  return typeof window !== 'undefined' ? window.location.href : '';
}

/** @param {{whatsapp, mensaje, incluir_precio, incluir_url}} contacto @param {{nombre, precio}} item */
export function armarLinkWhatsapp(contacto, item) {
  if (!contacto?.whatsapp) return null;
  const plantilla = contacto.mensaje || 'Hola, me interesa {producto}';
  const tieneInlinePrecio = /\{precio\}/i.test(plantilla);
  const tieneInlineUrl    = /\{url\}/i.test(plantilla);

  let mensaje = aplicarPlantilla(plantilla, {
    nombre: item.nombre,
    precio: item.precio,
    url: urlActual(),
  });

  // Solo append si el flag booleano está activo Y la variable no está inline
  if (contacto.incluir_precio && !tieneInlinePrecio) {
    mensaje += `\nPrecio: ${formatPrecio(item.precio)}`;
  }
  if (contacto.incluir_url && !tieneInlineUrl) {
    mensaje += `\n${window.location.href}`;
  }
  return `https://wa.me/${soloDigitos(contacto.whatsapp)}?text=${encodeURIComponent(mensaje)}`;
}

const MENSAJE_GENERAL_DEFAULT = 'Hola, quiero hacer una consulta.';

/**
 * Consulta general (inicio, categorías, contacto): plantilla
 * Tienda.mensaje_consulta_general, que solo admite {url}. Si igual trae
 * {producto}/{precio} no quedan variables sueltas en el chat. Misma regla
 * que mensajeConsultaGeneral() en runtimeGesicomm.js (lienzo HTML).
 */
function aplicarPlantillaGeneral(plantilla, url) {
  return String(plantilla || MENSAJE_GENERAL_DEFAULT)
    .replace(/\{producto\}/gi, 'sus productos')
    .replace(/\{precio\}/gi, '')
    .replace(/\{url\}/gi, url)
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * Link de WhatsApp para botones que no están atados a un producto puntual.
 * `texto` = texto propio del botón, si el comercio le cargó uno.
 */
export function armarLinkWhatsappContacto(contacto, texto = '') {
  if (!contacto?.whatsapp) return null;
  const mensaje = aplicarPlantillaGeneral(texto || contacto.mensaje_general, urlActual());
  return `https://wa.me/${soloDigitos(contacto.whatsapp)}?text=${encodeURIComponent(mensaje)}`;
}

/** Preview de la consulta general en /mi-tienda. */
export function generarPreviewMensajeGeneral(plantilla, opciones = {}) {
  return aplicarPlantillaGeneral(plantilla, opciones.url || 'tu-tienda.gesicomm.com');
}

/**
 * @param {{whatsapp, incluir_precio, incluir_url}} contacto
 * @param {Array<{nombre, varianteNombre, cantidad, precio}>} items
 * @param {{numero_pedido?: number|string, pedido_id?: number|string}} pedido
 */
export function armarLinkWhatsappCarrito(contacto, items, pedido = {}) {
  if (!contacto?.whatsapp || items.length === 0) return null;

  const resumen = items.map(it => {
    const variante = it.varianteNombre ? ` (${it.varianteNombre})` : '';
    const precio = contacto.incluir_precio ? ` — ${formatPrecio(it.precio)} c/u` : '';
    return `• ${it.cantidad}x ${it.nombre}${variante}${precio}`;
  }).join('\n');

  const total = items.reduce((suma, it) => suma + it.precio * it.cantidad, 0);
  const numero = pedido.numero_pedido || pedido.pedido_id;
  const encabezado = numero
    ? `Hola, hice el pedido #${numero}.`
    : 'Hola, quiero confirmar este pedido.';
  let mensaje = `${encabezado}\n\nProductos:\n${resumen}\nTotal: ${formatPrecio(total)}`;

  if (contacto.incluir_url) mensaje += `\n${urlActual()}`;

  return `https://wa.me/${soloDigitos(contacto.whatsapp)}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Genera un preview del mensaje de WhatsApp con datos de ejemplo.
 * Usado por el builder en /mi-tienda para mostrar cómo se va a ver.
 */
export function generarPreviewMensaje(plantilla, opciones = {}) {
  const url = opciones.url || 'tu-tienda.gesicomm.com';
  const datos = {
    nombre: 'Chomba Lacoste Clásica',
    precio: 150000,
    url,
  };
  // El lienzo (runtimeGesicomm.js → formatoPrecio) manda el precio como
  // "Gs 150.000": el preview lo muestra igual, no con formatPrecio.
  const precioComoEnWhatsapp = 'Gs ' + datos.precio.toLocaleString('es-PY', { maximumFractionDigits: 0 });
  let msg = aplicarPlantilla(
    (plantilla || 'Hola, me interesa {producto}').replace(/\{precio\}/gi, precioComoEnWhatsapp),
    datos,
  );

  const tieneInlinePrecio = /\{precio\}/i.test(plantilla || '');
  const tieneInlineUrl = /\{url\}/i.test(plantilla || '');

  if (opciones.incluir_precio && !tieneInlinePrecio) {
    msg += `\nPrecio: ${formatPrecio(datos.precio)}`;
  }
  if (opciones.incluir_url && !tieneInlineUrl) {
    msg += `\n${datos.url}`;
  }
  return msg;
}

export { formatPrecio };
