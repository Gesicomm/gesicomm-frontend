/**
 * Formateo de monedas para paneles administrativos y pagos de suscripciones.
 * No altera el helper de Finanzas/Comercial (`src/utils/currency.js`).
 */

export function formatearMontoMoneda(valor, moneda = 'USD') {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  const codigo = String(moneda || 'USD').trim().toUpperCase();
  if (codigo === 'USD') {
    return `USD ${numero.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (codigo === 'EUR') {
    return `€ ${numero.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (codigo === 'PYG') {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(numero);
  }
  return `${codigo} ${numero.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Formatea un bloque de resumen financiero (`totales` o un item de `tipos`)
 * separando cada moneda cuando existe `por_moneda`, sin sumar monedas distintas.
 */
export function formatearResumenMonedas(bloque, estado = 'PAID', campo = 'bruto', fallbackMoneda = 'USD') {
  if (!bloque) return '—';
  if (Array.isArray(bloque.por_moneda) && bloque.por_moneda.length > 0) {
    const conMovimiento = bloque.por_moneda.filter((item) => (
      Number(item.estados?.[estado]?.[campo] || 0) > 0
      || Number(item.estados?.[estado]?.cantidad || 0) > 0
    ));
    const lista = conMovimiento.length > 0 ? conMovimiento : [bloque.por_moneda[0]];
    return lista
      .map((item) => formatearMontoMoneda(item.estados?.[estado]?.[campo] ?? 0, item.moneda))
      .join(' · ');
  }
  const moneda = bloque.moneda && bloque.moneda !== 'MULTI' ? bloque.moneda : fallbackMoneda;
  return formatearMontoMoneda(bloque.estados?.[estado]?.[campo] ?? 0, moneda);
}
