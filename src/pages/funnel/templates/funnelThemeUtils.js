import { resolverTema } from '../../landing-simple/templates/themeUtils';

/**
 * Default de tema por TIPO de embudo — mismo criterio que
 * landing-simple/templates/themeUtils.js#DEFAULT_TEMA_POR_TEMPLATE, pero
 * para los templates de funnel (kind='funnel'), que viven en su propio
 * módulo. Si mañana hay más de un tipo de embudo con paleta propia, cada
 * uno entra acá — sin esto, elegir un tipo de embudo distinto nunca
 * cambiaba el look hasta que el comercio tocaba "Colores" a mano, porque
 * el template quedaba con un default hardcodeado ajeno a su propio
 * design_tokens.
 */
const DEFAULT_TEMA_POR_FUNNEL = {
  'venta-directa': { fondo: '#FFFFFF', texto: '#111827', acento: '#111827' },
};

export function resolverTemaFunnel(temaOverride, templateSlug) {
  const defaults = DEFAULT_TEMA_POR_FUNNEL[templateSlug] || DEFAULT_TEMA_POR_FUNNEL['venta-directa'];
  return resolverTema(temaOverride, defaults);
}
