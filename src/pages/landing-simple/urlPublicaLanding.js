/**
 * A dónde apunta "Ver landing pública" desde el editor.
 *
 * En producción la landing vive en la RAÍZ del subdominio de la tienda
 * (es_home=true, ver landingSimple.service.js#crear), no en "/l/:slug" —
 * ese path quedó como fallback.
 *
 * Pero en desarrollo ese link mandaba igual a https://<sub>.gesicomm.com:
 * te sacaba del entorno local y te dejaba mirando la landing que hay
 * DESPLEGADA, no la que acabás de guardar. Confuso hasta el ridículo
 * cuando el backend local escribe contra la misma base que producción: la
 * landing existe, pero el build de allá todavía no sabe renderizarla.
 *
 * Por eso acá el hostname manda: si estamos en local, se usa "/l/:slug"
 * contra la app que se está corriendo (resolverTienda.js trata "localhost"
 * como app principal y el controller público resuelve la tienda por el
 * slug de la landing).
 */

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

export function esEntornoLocal(hostname = window.location.hostname) {
  return HOSTS_LOCALES.has(hostname) || hostname.endsWith('.localhost');
}

/**
 * @param {{subdominio?: string}|null} tienda
 * @param {{slug?: string, es_home?: boolean}|null} landing
 * @returns {string} URL absoluta en producción, path relativo en local
 */
export function urlPublicaLanding(tienda, landing) {
  const slug = landing?.slug || '';
  if (esEntornoLocal() || !tienda?.subdominio) return `/l/${slug}`;
  const base = tienda?.dominio_propio_verificado 
    ? `https://${tienda.dominio_propio}`
    : `https://${tienda.subdominio}.gesicomm.com`;
  return landing?.es_home ? base : `${base}/l/${slug}`;
}
