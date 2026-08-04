/**
 * Espejo en el frontend de middleware/resolverTienda.js del backend: decide
 * si el hostname actual es "la app principal" (dashboard/login/marketing)
 * o el subdominio/dominio propio de una tienda. Mismos valores por
 * defecto que el backend — si BASE_DOMAIN/APP_HOSTNAME cambian ahí, hay
 * que reflejarlo acá también (VITE_BASE_DOMAIN/VITE_APP_HOSTNAME, ver
 * .env — son build-time, no runtime, así que un cambio requiere rebuild).
 */

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'gesicomm.com';
const APP_HOSTNAME = import.meta.env.VITE_APP_HOSTNAME || BASE_DOMAIN;

export function esHostnameDeTienda() {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const esAppPrincipal = hostname === 'localhost'
    || hostname === BASE_DOMAIN
    || hostname === `www.${BASE_DOMAIN}`
    || hostname === APP_HOSTNAME;
  return !esAppPrincipal;
}
