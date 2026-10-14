// Nombres, precios e imágenes se recuperan del catálogo en el servidor.
// Los valores por defecto y el orden consecutivo se reconstruyen al guardar.
export function compactarItemsLanding(items) {
  if (!Array.isArray(items)) return items;
  return items.map((item, indice) => ({
    tipo: item.tipo,
    referencia_id: item.referencia_id,
    ...(item.etiqueta ? { etiqueta: item.etiqueta } : {}),
    ...(item.precio_ancla != null ? { precio_ancla: item.precio_ancla } : {}),
    ...(item.envio_incluido === true ? { envio_incluido: true } : {}),
    ...(item.mostrar_en_inicio === false ? { mostrar_en_inicio: false } : {}),
    ...(item.orden != null && Number(item.orden) !== indice ? { orden: item.orden } : {}),
  }));
}
