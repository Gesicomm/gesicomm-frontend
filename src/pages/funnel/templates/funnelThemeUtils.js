import { resolverTema } from '../../landing-simple/templates/themeUtils';

/**
 * Default de tema por TIPO de embudo — mismo criterio que
 * landing-simple/templates/themeUtils.js#DEFAULT_TEMA_POR_TEMPLATE, pero
 * para templates legacy de funnel (kind='funnel'). Se conserva para que
 * páginas ya publicadas mantengan su paleta.
 */
const DEFAULT_TEMA_POR_FUNNEL = {
  'venta-directa': { fondo: '#FFFFFF', texto: '#111827', acento: '#111827' },
};

export function resolverTemaFunnel(temaOverride, templateSlug) {
  const defaults = DEFAULT_TEMA_POR_FUNNEL[templateSlug] || DEFAULT_TEMA_POR_FUNNEL['venta-directa'];
  return resolverTema(temaOverride, defaults);
}
