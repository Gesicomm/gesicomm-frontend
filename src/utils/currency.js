/**
 * Formateo de moneda para el módulo de Finanzas. Mismo formato que
 * formatPrecio() de lib/mensajeWhatsapp.js (es-PY, sin decimales, sufijo
 * "Gs") — se duplica acá en vez de importarla para no acoplar Finanzas al
 * módulo de landing/WhatsApp.
 */
export function formatMoneda(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}
