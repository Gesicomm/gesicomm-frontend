/**
 * Meta Pixel (lado navegador) para landings públicas — cada tienda tiene
 * su propio pixel_id (Tienda.meta_pixel_id), no hay uno de plataforma
 * compartido. Complementa a metaCapi.service.js del backend: mismo
 * event_id de los dos lados para que Meta deduplique como un solo evento
 * en vez de contarlo dos veces (uno por Pixel, otro por CAPI).
 *
 * Carga oficial de Meta (fbevents.js) — se inyecta una sola vez por
 * sesión de página aunque este módulo se importe/monte más de una vez
 * (StrictMode en dev invoca efectos dos veces).
 */

let cargado = false;

export function inicializarPixel(pixelId, testEventCode) {
  if (!pixelId || cargado || typeof window === 'undefined') return;
  if (window.fbq) { cargado = true; return; } // ya lo cargó otra instancia

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
  const options = testEventCode ? { test_event_code: testEventCode } : undefined;
  window.fbq('track', 'PageView', {}, options);
  cargado = true;
}

/** UUID para deduplicar Pixel+CAPI — crypto.randomUUID con fallback para navegadores viejos/HTTP. */
export function generarEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Cookies que pone el propio Pixel al cargar (_fbc solo si llegó con fbclid). */
export function leerCookiesFacebook() {
  const obtener = (nombre) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  return { fbc: obtener('_fbc'), fbp: obtener('_fbp') };
}

/**
 * Dispara un evento por Pixel (si está cargado) — el llamador es
 * responsable de mandar el mismo event_id a metaCapi vía
 * registrarEventoLanding, ver landingPublicaService.js.
 */
export function trackearEvento(eventName, eventId, params, testEventCode) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const options = { eventID: eventId };
  if (testEventCode) options.test_event_code = testEventCode;
  window.fbq('track', eventName, params, options);
}
