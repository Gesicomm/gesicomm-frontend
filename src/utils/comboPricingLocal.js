/**
 * Motor de cálculo de rentabilidad de combos — versión Frontend.
 *
 * Mirror del motor backend (src/utils/comboPricing.js).
 * Propósito: feedback inmediato en la UI sin requests al servidor.
 *
 * IMPORTANTE:
 * - Este módulo SOLO se usa para UX local (actualizar números mientras el
 *   admin escribe o cambia descuentos).
 * - El backend SIEMPRE recalcula y revalida al guardar. Esta versión
 *   no es la fuente de verdad — solo mejora la experiencia de usuario.
 * - Mantener sincronizado con el backend cuando cambie la lógica de negocio.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function div(a, b) {
  if (!b || b === 0) return 0;
  return a / b;
}

function divNull(a, b) {
  if (!b || b === 0) return null;
  return a / b;
}

function r2(n) { return Math.round((n || 0) * 100) / 100; }
function r4(n) { return Math.round((n || 0) * 10000) / 10000; }

// ─── Principal ────────────────────────────────────────────────────────────────

export function calcularPrincipal(principal, costs) {
  const costo = principal.cost || 0;
  const precio = principal.salePrice || 0;
  const cpaMax = r2(precio * (costs.cpaPercentage / 100));
  const paymentCommissionCost = r2(precio * ((costs.paymentCommissionPercentage || 0) / 100));
  const totalCosts = r2(costo + cpaMax + paymentCommissionCost + costs.shipping + costs.confirmation + costs.packaging);
  const profit = r2(precio - totalCosts);
  const margin = r4(div(profit, precio));
  return { cpaMax, paymentCommissionCost, totalCosts, profit, margin };
}

export function simularDescuentosPrincipal(salePrice, totalCosts, scenarios = [0, 10, 20, 30, 40]) {
  return scenarios.map(pct => {
    const finalPrice = r2(salePrice * (1 - pct / 100));
    const profit = r2(finalPrice - totalCosts);
    const margin = r4(div(profit, finalPrice));
    return { discountPercentage: pct, finalPrice, profit, margin };
  });
}

// ─── Upsells ──────────────────────────────────────────────────────────────────

export function calcularUpsell(upsell) {
  const precio = upsell.salePrice || 0;
  const costo = upsell.cost || 0;
  const descPct = upsell.discountPercentage || 0;
  const discountAmount = r2(precio * (descPct / 100));
  const finalPrice = r2(precio * (1 - descPct / 100));
  const profit = r2(finalPrice - costo);
  const margin = r4(div(profit, finalPrice));
  return { productId: upsell.id, originalPrice: r2(precio), cost: r2(costo), discountAmount, discountPercentage: descPct, finalPrice, profit, margin };
}

// ─── Combo ────────────────────────────────────────────────────────────────────

export function calcularCombo(principal, upsellResults, principalTotalCosts) {
  const precioOriginalPrincipal = principal.salePrice || 0;
  const sumaOriginalUpsells = upsellResults.reduce((a, u) => a + u.originalPrice, 0);
  const sumaFinalUpsells = upsellResults.reduce((a, u) => a + u.finalPrice, 0);
  const sumaCostosUpsells = upsellResults.reduce((a, u) => a + u.cost, 0);
  const originalPrice = r2(precioOriginalPrincipal + sumaOriginalUpsells);
  const finalPrice = r2(precioOriginalPrincipal + sumaFinalUpsells);
  const discountAmount = r2(originalPrice - finalPrice);
  const discountPercentage = r4(div(discountAmount, originalPrice));
  const upsellCosts = r2(sumaCostosUpsells);
  const totalCost = r2(principalTotalCosts + upsellCosts);
  const profit = r2(finalPrice - totalCost);
  const margin = r4(div(profit, finalPrice));
  return { originalPrice, finalPrice, discountAmount, discountPercentage, upsellCosts, totalCost, profit, margin, ticket: finalPrice };
}

// ─── Clasificaciones ──────────────────────────────────────────────────────────

export function clasificarOferta(diffPct, threshold = 50) {
  if (diffPct === null || diffPct === undefined) return 'REVISAR';
  if (diffPct > threshold) return 'EXCELENTE';
  if (diffPct > 0) return 'BUENA';
  return 'REVISAR';
}

export function clasificarRentabilidad(margin, minimumMargin = 0.10) {
  if (margin <= 0) return 'NO_RENTABLE';
  if (margin < minimumMargin) return 'MARGEN_BAJO';
  return 'SALUDABLE';
}

// ─── Comparativa ─────────────────────────────────────────────────────────────

export function calcularComparativa(standaloneProfit, comboProfit, excellentThreshold = 50, minimumMarginDecimal = 0.10, comboMargin = 0) {
  const profitDifference = r2(comboProfit - standaloneProfit);
  const profitDifferencePercentage = standaloneProfit > 0
    ? r4(divNull(profitDifference, standaloneProfit) * 100)
    : null;
  return {
    standaloneProfit: r2(standaloneProfit),
    comboProfit: r2(comboProfit),
    profitDifference,
    profitDifferencePercentage,
    offerStatus: clasificarOferta(profitDifferencePercentage, excellentThreshold),
    profitabilityStatus: clasificarRentabilidad(comboMargin, minimumMarginDecimal),
  };
}

// ─── Recomendaciones ─────────────────────────────────────────────────────────

export function calcularRecomendaciones(totalCost, targetMargins = [15, 30, 45]) {
  return targetMargins.map(pct => {
    const d = pct / 100;
    const suggestedPrice = d < 1 ? r2(totalCost / (1 - d)) : null;
    return { targetMargin: pct, suggestedPrice, estimatedProfit: suggestedPrice !== null ? r2(suggestedPrice - totalCost) : null };
  });
}

export function calcularPrecioMinimo(totalCost) { return r2(totalCost); }

export function calcularDescuentoMaximo(totalCost, originalPrice, minimumMarginPct = 10) {
  if (!originalPrice) return null;
  const d = minimumMarginPct / 100;
  if (d >= 1) return null;
  const precioMin = r2(totalCost / (1 - d));
  const maxDiscount = r4(1 - div(precioMin, originalPrice));
  return maxDiscount < 0 ? null : r4(maxDiscount * 100);
}

export function calcularSensibilidad(comboData, scenarios = [0, 5, 10, 15, 20, 25, 30, 35], thresholds = { minimumMargin: 0.10 }) {
  return scenarios.map(descPct => {
    const price = r2(comboData.finalPrice * (1 - descPct / 100));
    const profit = r2(price - comboData.totalCost);
    const margin = r4(div(profit, price));
    return { discountPercentage: descPct, price, profit, margin, status: clasificarRentabilidad(margin, thresholds.minimumMargin) };
  });
}

// ─── Función principal ────────────────────────────────────────────────────────

export function calcular(input) {
  const {
    principal, upsells = [],
    costs = { cpaPercentage: 20, shipping: 0, confirmation: 0, packaging: 0, paymentCommissionPercentage: 0 },
    targetMargins = [15, 30, 45],
    minimumMargin = 10,
    excellentThreshold = 50,
    discountScenarios = [0, 5, 10, 15, 20, 25, 30, 35],
  } = input;

  const warnings = [];
  const principalResult = calcularPrincipal(principal, costs);
  const discountSimulation = simularDescuentosPrincipal(principal.salePrice, principalResult.totalCosts, [0, 10, 20, 30, 40]);
  const upsellResults = upsells.map(u => calcularUpsell(u));
  const comboResult = calcularCombo(principal, upsellResults, principalResult.totalCosts);
  const minimumMarginDecimal = minimumMargin / 100;
  const comparativaResult = calcularComparativa(principalResult.profit, comboResult.profit, excellentThreshold, minimumMarginDecimal, comboResult.margin);

  upsellResults.forEach((u, i) => {
    if (u.profit < 0) warnings.push(`El upsell "${upsells[i].name}" genera pérdida (margen ${(u.margin * 100).toFixed(2)}%).`);
  });

  if (comboResult.margin > 0 && comboResult.margin < minimumMarginDecimal) {
    warnings.push(`El margen del combo (${(comboResult.margin * 100).toFixed(2)}%) está por debajo del objetivo mínimo (${minimumMargin}%).`);
  }
  if (comboResult.margin <= 0) warnings.push('El combo no genera rentabilidad con la configuración actual.');

  const recommendations = calcularRecomendaciones(comboResult.totalCost, targetMargins);
  const minimumPrice = calcularPrecioMinimo(comboResult.totalCost);
  const maximumDiscountPercentage = calcularDescuentoMaximo(comboResult.totalCost, comboResult.originalPrice, minimumMargin);
  const sensitivity = calcularSensibilidad({ finalPrice: comboResult.finalPrice, totalCost: comboResult.totalCost }, discountScenarios, { minimumMargin: minimumMarginDecimal });

  return {
    principal: { ...principalResult, discountSimulation },
    upsells: upsellResults,
    combo: comboResult,
    comparison: comparativaResult,
    recommendations,
    minimumPrice,
    maximumDiscountPercentage,
    sensitivity,
    warnings,
  };
}
