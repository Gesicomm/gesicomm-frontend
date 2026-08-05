/**
 * Construcción del link de WhatsApp — un solo lugar para las dos formas de
 * llegar ahí desde la landing pública: "Consultar" en una tarjeta (un solo
 * producto) y "Finalizar pedido" desde el carrito (varios). Comparten la
 * misma plantilla configurable (Tienda.mensaje_contacto, placeholders
 * {producto}, {precio}, {url}) para que el comportamiento sea predecible
 * en los dos casos.
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

/** @param {{whatsapp, mensaje, incluir_precio, incluir_url}} contacto @param {{nombre, precio}} item */
export function armarLinkWhatsapp(contacto, item) {
  if (!contacto?.whatsapp) return null;
  const plantilla = contacto.mensaje || 'Hola, me interesa {producto}';
  const tieneInlinePrecio = /\{precio\}/i.test(plantilla);
  const tieneInlineUrl    = /\{url\}/i.test(plantilla);

  let mensaje = aplicarPlantilla(plantilla, {
    nombre: item.nombre,
    precio: item.precio,
    url: typeof window !== 'undefined' ? window.location.href : '',
  });

  // Solo append si el flag booleano está activo Y la variable no está inline
  if (contacto.incluir_precio && !tieneInlinePrecio) {
    mensaje += `\nPrecio: ${formatPrecio(item.precio)}`;
  }
  if (contacto.incluir_url && !tieneInlineUrl) {
    mensaje += `\n${window.location.href}`;
  }
  return `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * @param {{whatsapp, mensaje, incluir_precio, incluir_url}} contacto
 * @param {Array<{nombre, varianteNombre, cantidad, precio}>} items
 */
export function armarLinkWhatsappCarrito(contacto, items) {
  if (!contacto?.whatsapp || items.length === 0) return null;

  const resumen = items.map(it => {
    const variante = it.varianteNombre ? ` (${it.varianteNombre})` : '';
    const precio = contacto.incluir_precio ? ` — ${formatPrecio(it.precio)} c/u` : '';
    return `• ${it.cantidad}x ${it.nombre}${variante}${precio}`;
  }).join('\n');

  const plantilla = contacto.mensaje || 'Hola, me interesa {producto}';
  // La plantilla se pensó para UN producto ({producto} = nombre). Con
  // varios, el placeholder pasa a introducir la lista en vez de un nombre
  // suelto — mismo mecanismo, sin pedirle a la usuaria una plantilla aparte
  // para el carrito.
  let mensaje = plantilla.includes('{producto}')
    ? plantilla.replace('{producto}', `estos productos:\n${resumen}`)
    : `${plantilla}\n${resumen}`;

  // {precio} en carrito → total
  const total = items.reduce((suma, it) => suma + it.precio * it.cantidad, 0);
  const tieneInlinePrecio = /\{precio\}/i.test(mensaje);
  if (tieneInlinePrecio) {
    mensaje = mensaje.replace(/\{precio\}/gi, `Total: ${formatPrecio(total)}`);
  }
  // {url} inline
  const tieneInlineUrl = /\{url\}/i.test(mensaje);
  if (tieneInlineUrl) {
    mensaje = mensaje.replace(/\{url\}/gi, window.location.href);
  }

  if (contacto.incluir_precio && !tieneInlinePrecio) {
    mensaje += `\nTotal: ${formatPrecio(total)}`;
  }
  if (contacto.incluir_url && !tieneInlineUrl) {
    mensaje += `\n${window.location.href}`;
  }

  return `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
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
