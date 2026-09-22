/**
 * Traducción del modelo a lenguaje de operación.
 *
 * Las columnas de la base hablan de `rango_min`, `tipo_pago` y `alcance`.
 * Nada de eso significa algo para quien administra la red, así que la UI
 * nunca muestra esos nombres ni los ids: se traducen acá, en un solo lugar,
 * para que no aparezcan tres redacciones distintas de la misma idea.
 */

/** Los rangos son de CANTIDAD de unidades. Nunca de monto. */
export function etiquetaRango(min, max) {
  const desde = Number(min) || 0;
  if (max === null || max === undefined) return `${desde} unidades o más`;
  return `${desde} a ${Number(max)} unidades`;
}

export function etiquetaTipoPago(tipoPago) {
  switch (tipoPago) {
    case 'Anticipado': return 'Pago anticipado';
    case 'Al Recibir': return 'Pago contra entrega';
    default: return 'Cualquier método';
  }
}

export function etiquetaCobertura(tipo) {
  switch (tipo) {
    case 'RESTO_DEPARTAMENTO': return 'Resto del departamento';
    case 'RESTO_PAIS': return 'Resto del país';
    default: return 'Tarifa específica';
  }
}

export function formatGs(valor) {
  if (valor === null || valor === undefined) return '—';
  return `Gs. ${Math.max(0, Math.round(Number(valor) || 0)).toLocaleString('es-PY')}`;
}

/** Sin datos numéricos no se inventa un plazo: se muestra un guion. */
export function etiquetaTiempo(minHs, maxHs) {
  if (minHs == null && maxHs == null) return null;
  if (minHs != null && maxHs != null && maxHs !== minHs) return `${minHs}–${maxHs} h`;
  return `${minHs ?? maxHs} h`;
}
