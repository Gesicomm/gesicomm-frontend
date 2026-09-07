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

export function cantidadItemsDelivery(items) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  return total > 0 ? total : 1;
}

export function resolverReglaDelivery(opcion, { items = [], paymentMethod = 'efectivo' } = {}) {
  if (!opcion) return null;
  const reglas = Array.isArray(opcion.reglas) && opcion.reglas.length ? opcion.reglas : [opcion];
  const tipoPago = String(paymentMethod || 'efectivo').toLowerCase() === 'efectivo' ? 'Al Recibir' : 'Anticipado';
  const cantidad = cantidadItemsDelivery(items);
  const ordenadas = [...reglas].sort((a, b) => (Number(a.costo) || 0) - (Number(b.costo) || 0));
  const enRango = (regla) => {
    const min = Number(regla.rango_min) || 0;
    const max = regla.rango_max === null || regla.rango_max === undefined || regla.rango_max === '' ? Infinity : Number(regla.rango_max);
    return cantidad >= min && cantidad <= max;
  };
  const pagoCompatible = (regla) => regla.tipo_pago === 'Ambos' || regla.tipo_pago === tipoPago;
  return ordenadas.find(regla => pagoCompatible(regla) && enRango(regla))
    || ordenadas.find(pagoCompatible)
    || ordenadas[0]
    || null;
}

export function descripcionDelivery(opcion, envioIncluido, formatPrecio, contexto = {}) {
  if (envioIncluido) return 'Envío incluido en el producto';
  const regla = resolverReglaDelivery(opcion, contexto);
  if (!regla) return null;
  const costo = Number(regla.costo) || 0;
  const costoLabel = costo > 0 ? formatPrecio(costo) : 'Sin costo';
  return [costoLabel, regla.tiempo_entrega_hs].filter(Boolean).join(' · ');
}
