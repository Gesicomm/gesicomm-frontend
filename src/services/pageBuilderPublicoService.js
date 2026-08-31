import API from './api';

/**
 * Lectura PÚBLICA del Page Builder (/api/pb). Sin sesión.
 *
 * Devuelve siempre la versión PUBLICADA. El borrador solo se sirve por
 * /api/pb/preview/:id y exige la cookie del dueño — ver
 * builderPublicPage.service.js del backend.
 *
 * Tres formas de pedir una página, según cómo se llegó a ella:
 *
 *   sin slugs          → por HOSTNAME (calcula.gesicomm.com). El backend
 *                        resuelve el Host contra builder_domains.
 *   pageSlug           → fallback /p/<slug> en el host de la app
 *   funnelSlug[+page]  → fallback /f/<funnel>/<pagina>
 */

/**
 * @param {{pageSlug?: string, funnelSlug?: string}} params
 */
export function obtenerPaginaPublica({ pageSlug, funnelSlug } = {}) {
  if (funnelSlug) {
    const path = pageSlug ? `/pb/f/${funnelSlug}/${pageSlug}` : `/pb/f/${funnelSlug}`;
    return API.get(path).then(r => r.data);
  }
  if (pageSlug) {
    return API.get(`/pb/p/${pageSlug}`).then(r => r.data);
  }
  // Raíz de un hostname propio: el backend resuelve por Host.
  return API.get('/pb/').then(r => r.data);
}

/** El borrador, solo para el dueño autenticado. */
export function obtenerPreviewPagina(paginaId) {
  return API.get(`/pb/preview/${paginaId}`).then(r => r.data);
}
