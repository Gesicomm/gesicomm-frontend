/**
 * TikTok Pixel (lado navegador) para landings públicas — pixel_id propio
 * de cada tienda (Tienda.tiktok_pixel_id). Solo Pixel: a diferencia de
 * Meta, este proyecto NO implementa la Events API server-side de TikTok
 * (es una integración aparte, con su propio flujo de auth) — ver el
 * límite documentado al usuario. Si en algún momento se necesita
 * deduplicar Pixel+API server-side, agregar acá el mismo patrón de
 * generarEventId() que ya usa metaPixel.js.
 *
 * Carga una sola vez por sesión de página, mismo criterio que metaPixel.js.
 */

let cargado = false;

export function inicializarTikTokPixel(pixelId) {
  if (!pixelId || cargado || typeof window === 'undefined') return;
  if (window.ttq) { cargado = true; return; }

  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < e.length; n++) ttq.setAndDefer(e, e[n]); return e };
    ttq.load = function (e, n) {
      var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
      ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = r, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {};
      var s = d.createElement("script"); s.type = "text/javascript"; s.async = !0; s.src = r + "?sdkid=" + e + "&lib=" + t;
      var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(s, a)
    };
    ttq.load(pixelId);
    ttq.page();
  }(window, document, 'ttq');
  /* eslint-enable */

  cargado = true;
}

export function trackearEventoTikTok(nombreEvento, params) {
  if (typeof window === 'undefined' || !window.ttq) return;
  window.ttq.track(nombreEvento, params);
}
