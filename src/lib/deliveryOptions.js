export function normalizarDeliveryTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function etiquetaDelivery(opcion) {
  return [opcion?.ciudad, opcion?.departamento].filter(Boolean).join(' - ');
}

export function prepararOpcionesDelivery(opciones) {
  return (Array.isArray(opciones) ? opciones : [])
    .filter(op => op?.ciudad)
    .map((op, index) => ({
      ...op,
      id: `${normalizarDeliveryTexto(op.departamento)}::${normalizarDeliveryTexto(op.ciudad)}::${index}`,
      label: etiquetaDelivery(op),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function buscarOpcionDelivery(opciones, valor) {
  const buscado = normalizarDeliveryTexto(valor);
  if (!buscado) return null;
  return opciones.find(op => normalizarDeliveryTexto(op.label) === buscado) || null;
}

export function descripcionDelivery(opcion, envioIncluido, formatPrecio) {
  if (envioIncluido) return 'Envío incluido en el producto';
  if (!opcion) return null;
  const costo = Number(opcion.costo) || 0;
  const costoLabel = costo > 0 ? formatPrecio(costo) : 'Sin costo';
  return [costoLabel, opcion.tiempo_entrega_hs].filter(Boolean).join(' · ');
}
