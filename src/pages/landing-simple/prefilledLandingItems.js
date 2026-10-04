const KEY = 'gesicomm:prefilledLandingItems';

export function leerItemsPrefill() {
  try {
    const items = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function limpiarItemsPrefill() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage no disponible */ }
}

export function unirItemsPrefill(actuales = [], nuevos = []) {
  const items = [...actuales];
  const claves = new Set(items.map(i => `${i.tipo}:${Number(i.referencia_id)}`));
  nuevos.forEach(i => {
    const clave = `${i.tipo}:${Number(i.referencia_id)}`;
    if (claves.has(clave)) return;
    claves.add(clave);
    items.push({
      tipo: i.tipo, referencia_id: i.referencia_id, etiqueta: '', orden: items.length,
      precio_ancla: null, envio_incluido: false, mostrar_en_inicio: true,
    });
  });
  return items;
}
