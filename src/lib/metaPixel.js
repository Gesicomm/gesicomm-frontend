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

const pixelesInicializados = new Set();

/**
 * Pixel propio de gesicomm.com (el sitio institucional y el panel), no el de
 * una tienda de cliente. Se inicializa una sola vez a nivel App — ver
 * InicializarPixelPlataforma en App.jsx — para que quede activo entre rutas
 * (landing, login, planes, checkout) sin depender de por dónde entró la
 * visita.
 */
export const PIXEL_ID_GESICOMM = '3636737413142726';

/**
 * Pixel de la TIENDA que se está viendo, si hay uno. Los eventos de una
 * landing son de ese pixel y de ninguno más.
 *
 * Por qué hace falta: fbq('track', …) dispara el evento en TODOS los pixels
 * inicializados. En el dominio propio de una tienda no pasa nada porque el
 * de plataforma no se carga (ver App.jsx), pero entrando por /l/:slug en
 * gesicomm.com —que es como se comparte una landing antes de tener dominio—
 * conviven los dos: cada compra de un cliente se le contaba también al pixel
 * de Gesicomm, y los PageView del panel al de la tienda. Con trackSingle el
 * evento va sólo a donde corresponde, sin depender de qué más esté cargado.
 */
let pixelDeTienda = null;

export function inicializarPixel(pixelId, opts = {}) {
  const { trackPageView = true } = opts;
  const id = String(pixelId || '').trim();
  if (!id || typeof window === 'undefined') return;
  // Antes de cualquier navegación interna, que saca el fbclid de la URL.
  capturarFbclid();

  if (!window.fbq) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
  }

  if (id !== PIXEL_ID_GESICOMM) pixelDeTienda = id;

  if (pixelesInicializados.has(id)) return;

  window.fbq('init', id);
  pixelesInicializados.add(id);
  // trackSingle: el PageView es de ESTE pixel. Con track, al inicializar el
  // segundo pixel se le mandaba una visita también al primero.
  if (trackPageView) window.fbq('trackSingle', id, 'PageView');
}

/** UUID para deduplicar Pixel+CAPI — crypto.randomUUID con fallback para navegadores viejos/HTTP. */
export function generarEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Respaldo del clic del anuncio. El Pixel crea la cookie _fbc solo si llega a
 * cargar mientras el fbclid sigue en la URL: con un bloqueador no la crea
 * nunca, y los primeros eventos de la visita salen antes de que cargue. Se
 * guarda el fbclid en el formato de _fbc (fb.1.<ms>.<fbclid>) y dura lo mismo
 * que esa cookie, 90 días.
 */
const CLAVE_FBC = 'gesicomm-fbc';
const DURACION_FBC_MS = 90 * 24 * 60 * 60 * 1000;

function capturarFbclid() {
  try {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (!fbclid) return;
    const guardado = JSON.parse(localStorage.getItem(CLAVE_FBC) || 'null');
    // Mismo clic (recarga de la página): se conserva la hora del primero.
    if (guardado?.fbclid === fbclid) return;
    localStorage.setItem(CLAVE_FBC, JSON.stringify({ fbclid, fbc: `fb.1.${Date.now()}.${fbclid}`, ts: Date.now() }));
  } catch { /* sin storage: queda la cookie del Pixel, si la crea */ }
}

function fbcGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_FBC) || 'null');
    if (!guardado?.fbc || !(Date.now() - guardado.ts < DURACION_FBC_MS)) return null;
    return guardado.fbc;
  } catch {
    return null;
  }
}

/** Cookies que pone el propio Pixel al cargar (_fbc solo si llegó con fbclid). */
export function leerCookiesFacebook() {
  if (typeof document === 'undefined') return { fbc: null, fbp: null };
  capturarFbclid();
  const obtener = (nombre) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };
  return { fbc: obtener('_fbc') || fbcGuardado(), fbp: obtener('_fbp') };
}

/**
 * Como leerCookiesFacebook, pero si _fbp todavía no existe espera a que el
 * Pixel termine de cargar y la cree (hasta `maxMs`). Es para los eventos que
 * salen apenas abre la página (PageView, ViewContent): sin esto la Conversions
 * API los recibía sin fbp en cada primera visita. Con un bloqueador el Pixel
 * no carga nunca y se resuelve con lo que haya al vencer el plazo.
 */
export function esperarCookiesFacebook(maxMs = 1000) {
  const inicial = leerCookiesFacebook();
  if (inicial.fbp || typeof window === 'undefined' || !window.fbq) return Promise.resolve(inicial);
  return new Promise((resolve) => {
    const inicio = Date.now();
    const revisar = () => {
      const cookies = leerCookiesFacebook();
      if (cookies.fbp || Date.now() - inicio >= maxMs) resolve(cookies);
      else setTimeout(revisar, 100);
    };
    setTimeout(revisar, 100);
  });
}

/**
 * Dispara un evento por Pixel (si está cargado) — el llamador es
 * responsable de mandar el mismo event_id a metaCapi vía
 * registrarEventoLanding, ver landingPublicaService.js.
 *
 * Sin test_event_code: ese dato es de depuración de la dueña de la tienda y
 * ya no viaja al navegador (era legible por cualquier visitante en el JSON
 * público de la landing). Los eventos de prueba los sigue etiquetando el
 * backend en su llamada a la Graph API — ver metaCapi.service.js.
 */
export function trackearEvento(eventName, eventId, params, pixelId = pixelDeTienda) {
  if (typeof window === 'undefined' || !window.fbq) return;
  // trackSingle = sólo ese pixel. track (sin id) le pega a todos los
  // inicializados, que es lo que mezclaba los eventos entre tiendas y la
  // plataforma. Sin pixel de tienda —el panel de Gesicomm— se usa track.
  if (pixelId) window.fbq('trackSingle', pixelId, eventName, params, { eventID: eventId });
  else window.fbq('track', eventName, params, { eventID: eventId });
}

/**
 * Igual que trackearEvento pero para eventos que no son del catálogo
 * estándar de Meta (p. ej. "Login", que Meta no define como evento
 * estándar). Usa trackCustom en vez de track para que no aparezca como
 * "evento estándar desconocido" en el Events Manager.
 */
export function trackearEventoPersonalizado(eventName, eventId, params, pixelId = pixelDeTienda) {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (pixelId) window.fbq('trackSingleCustom', pixelId, eventName, params, { eventID: eventId });
  else window.fbq('trackCustom', eventName, params, { eventID: eventId });
}
