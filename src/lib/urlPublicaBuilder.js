/**
 * A dónde apunta "Ver página" desde el editor del Page Builder.
 *
 * Una página publicada vive en SU PROPIO hostname
 * (calcula.gesicomm.com, o el dominio propio del usuario). Ese hostname
 * lo devuelve la API en `url_publica` cuando la página ya tiene uno
 * asignado — no se arma acá, porque acá no se sabe.
 *
 * Mientras no tenga hostname, o en desarrollo (en localhost no hay
 * subdominios que resolver), se usa el path de fallback contra la app que
 * se está corriendo:
 *
 *   /p/<slug>                       página suelta
 *   /f/<funnel-slug>/<pagina-slug>  paso de un funnel
 *
 * Mismo criterio que urlPublicaLanding.js: si estamos en local, el link
 * tiene que apuntar a lo que acabamos de guardar y no a lo que hay
 * desplegado en producción.
 */

import { esEntornoLocal } from '../pages/landing-simple/urlPublicaLanding';

/**
 * @param {{slug: string, funnel_id?: number|null}} pagina
 * @param {{slug: string}|null} funnel
 * @returns {string} path relativo
 */
export function pathPublicoBuilder(pagina, funnel = null) {
  if (!pagina?.slug) return '/';
  if (pagina.funnel_id && funnel?.slug) return `/f/${funnel.slug}/${pagina.slug}`;
  return `/p/${pagina.slug}`;
}

/**
 * @param {{slug: string, funnel_id?: number|null}} pagina
 * @param {{slug: string}|null} funnel
 * @param {string|null} urlPublica la que devolvió la API (hostname propio)
 * @returns {string} URL absoluta si hay hostname, path relativo si no
 */
export function urlPublicaBuilder(pagina, funnel = null, urlPublica = null) {
  // En local el hostname real no resuelve: siempre el fallback.
  if (urlPublica && !esEntornoLocal()) return urlPublica;
  return pathPublicoBuilder(pagina, funnel);
}
