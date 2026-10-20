// Se aplica después de combinar precios y presentación para que ninguna
// fuente vuelva a introducir el descuento de una campaña vencida.
export function sinOfertaFlashVencida(item, urgencia, ahora = Date.now()) {
  if (!urgencia?.activo || urgencia.renovar_cada_visita === true) return item;
  const fin = Date.parse(urgencia.fin_at);
  if (!Number.isFinite(fin) || fin > ahora) return item;
  const ids = urgencia.productos?.length ? urgencia.productos : [urgencia.producto_id || urgencia.content_id].filter(Boolean);
  if (ids.length && !ids.some(id => [item.id, item.content_id, `${item.tipo || 'producto'}-${item.referencia_id}`].some(valor => String(id) === String(valor)))) return item;
  const limpio = { ...item, precio_antes: null, descuento_pct: 0, ahorro: 0 };
  limpio.etiqueta = String(item.etiqueta || '').split(',').filter(t => t.trim().toLowerCase() !== 'oferta').join(',').trim() || null;
  for (const campo of ['insignia_principal', 'insignia_secundaria']) {
    if (/^(oferta|oferta flash|descuento|promoción|promocion|\d+%\s*(off|de descuento)?)$/i.test(String(item[campo] || '').trim())) limpio[campo] = '';
  }
  return limpio;
}
