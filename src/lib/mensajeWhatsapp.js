/**
 * Construcción del link de WhatsApp — un solo lugar para las dos formas de
 * llegar ahí desde la landing pública: "Consultar" en una tarjeta (un solo
 * producto) y "Finalizar pedido" desde el carrito (varios). Comparten la
 * misma plantilla configurable (Tienda.mensaje_contacto, placeholder
 * {producto}) para que el comportamiento sea predecible en los dos casos.
 */

function formatPrecio(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

/** @param {{whatsapp, mensaje, incluir_precio, incluir_url}} contacto @param {{nombre, precio}} item */
export function armarLinkWhatsapp(contacto, item) {
  if (!contacto?.whatsapp) return null;
  const plantilla = contacto.mensaje || 'Hola, me interesa {producto}';
  let mensaje = plantilla.replace('{producto}', item.nombre);
  if (contacto.incluir_precio) mensaje += `\nPrecio: ${formatPrecio(item.precio)}`;
  if (contacto.incluir_url) mensaje += `\n${window.location.href}`;
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

  if (contacto.incluir_precio) {
    const total = items.reduce((suma, it) => suma + it.precio * it.cantidad, 0);
    mensaje += `\nTotal: ${formatPrecio(total)}`;
  }
  if (contacto.incluir_url) mensaje += `\n${window.location.href}`;

  return `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export { formatPrecio };
