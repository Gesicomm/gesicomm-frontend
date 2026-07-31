/**
 * Cliente dedicado para la landing pública — a propósito NO usa la
 * instancia axios de services/api.js: esa instancia tiene un interceptor
 * que redirige a /login ante cualquier 401, lo cual no tiene sentido en
 * una página sin autenticación y podría romperla de formas raras.
 * fetch simple, sin credentials (no hace falta cookie para un GET público).
 *
 * IMPORTANTE: a diferencia del resto del frontend (que pega contra
 * VITE_API_URL, un backend fijo), esto usa rutas RELATIVAS al origen
 * actual. La tienda se resuelve en el backend por el hostname de la
 * request (middleware/resolverTienda) — si esto pegara contra una URL de
 * backend fija, todas las tiendas terminarían resolviendo al mismo
 * hostname en vez de al propio. En producción, `/api` en el hostname de
 * la tienda tiene que enrutar al backend (reverse proxy / mismo Express
 * sirviendo todo). En dev local sin ese proxy armado, esto pega contra el
 * propio Vite dev server — ver vite.config.js para el proxy de /api.
 */

/**
 * @param {string|undefined} slug - undefined → landing es_home de la tienda actual
 * @returns {null} el slug nunca existió (404 real)
 * @returns {{disponible:false}} existe pero no está publicada / dueño inactivo
 * @returns {{disponible:true, ...}} landing lista para renderizar
 */
export async function obtenerLandingPublica(slug) {
  const path = slug ? `/api/l/${encodeURIComponent(slug)}` : '/api/l/';
  const res = await fetch(path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('No se pudo cargar la landing.');
  return res.json();
}
