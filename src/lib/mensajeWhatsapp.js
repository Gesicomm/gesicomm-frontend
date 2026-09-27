/**
 * Construcción del link de WhatsApp.
 *
 * La plantilla editable de Mi tienda (Tienda.mensaje_contacto) se usa para
 * consultas comerciales desde la landing: botones "Consultar", ficha de
 * producto y CTAs de contacto. El checkout/pedido arma su propio mensaje con
 * contexto de pedido para no mezclarlo con textos de seguimiento o courier.
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

/**
 * Mensaje de contacto genérico para botones de WhatsApp que no están atados
 * a un producto puntual. Usa la plantilla editable, pero si esa plantilla
 * pide {producto} cae a una consulta neutral para no dejar variables raras.
 */
export function armarLinkWhatsappContacto(contacto, texto = '') {
  if (!contacto?.whatsapp) return null;
  const plantilla = texto || contacto.mensaje || 'Hola, quiero hacer una consulta.';
  const mensaje = aplicarPlantilla(plantilla, {
    nombre: 'este producto',
    precio: null,
    url: urlActual(),
  }).replace(/\{precio\}/gi, '').trim();
  return `https://wa.me/${soloDigitos(contacto.whatsapp)}?text=${encodeURIComponent(mensaje)}`;
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
  const datos = {
    nombre: 'Chomba Lacoste Clásica',
    precio: 150000,
    url: 'sommix.gesicomm.com',
  };
  let msg = aplicarPlantilla(plantilla || 'Hola, me interesa {producto}', datos);

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
