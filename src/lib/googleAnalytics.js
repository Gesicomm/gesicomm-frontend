/**
 * Google Analytics 4 (gtag.js) para landings públicas — measurement ID
 * propio de cada tienda (Tienda.google_analytics_id). Solo lado navegador:
 * a diferencia de Meta, no hay Conversions API server-side acá — GA no
 * tiene una integración server-to-server que este proyecto implemente.
 *
 * Carga una sola vez por sesión de página, mismo criterio que metaPixel.js.
 */

let cargado = false;

export function inicializarGA(measurementId) {
  if (!measurementId || cargado || typeof window === 'undefined') return;
  if (window.gtag) { cargado = true; return; }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  cargado = true;
}

/** Evento custom de GA4 — nombres en snake_case, como espera gtag. */
export function trackearEventoGA(nombreEvento, params) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', nombreEvento, params);
}
