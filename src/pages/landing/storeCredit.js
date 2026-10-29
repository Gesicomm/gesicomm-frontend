// Firma propia de Gesicom: no toma el acento configurable del comercio.
export const CREDITO_GESICOM_CONTENIDO = `<span>Gesicom</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M62 17 A35 35 0 1 0 81 48" fill="none" stroke="currentColor" stroke-width="13"/><path d="M26 52 L42 68 L77 31" fill="none" stroke="#22b573" stroke-width="13" stroke-linecap="square" stroke-linejoin="miter"/><circle cx="83" cy="18" r="8" fill="#22b573"/></svg>`;

export const CREDITO_GESICOM_HTML = `<a data-gesicomm-credit href="https://gesicomm.com" target="_blank" rel="noopener noreferrer">${CREDITO_GESICOM_CONTENIDO}</a>`;

export const CREDITO_GESICOM_CSS = `
a[data-gesicomm-credit] { display: inline-flex !important; align-items: center !important; gap: 6px !important; vertical-align: middle; white-space: nowrap; color: var(--gesicom-credit-accent, #087d4b) !important; font-weight: 900 !important; opacity: 1 !important; text-decoration: none; }
a[data-gesicomm-credit] > span { color: inherit !important; font: inherit !important; }
a[data-gesicomm-credit] > svg { display: block !important; width: 24px !important; height: 24px !important; flex: 0 0 24px !important; color: var(--gesicom-credit-logo, #0b0f0e) !important; }
a[data-gesicomm-credit]:hover { text-decoration: underline; text-underline-offset: 3px; }
a[data-gesicomm-credit]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 3px; }
`;

// Se serializa también dentro del iframe. Calcula el fondo compuesto real,
// incluidos contenedores transparentes, y sigue los cambios de tema/estilos.
export function adaptarLogosGesicom(root) {
  root = root || document;
  var links = Array.from(root.querySelectorAll('[data-gesicomm-credit]'));
  if (!links.length) return function () {};
  var canvas;
  function rgba(value) {
    if (value === 'transparent') return [0, 0, 0, 0];
    var match = value.match(/^rgba?\(([^)]+)\)$/);
    if (match) {
      var parts = match[1].split(/[,\s/]+/).map(Number);
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
    }
    canvas = canvas || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    canvas.clearRect(0, 0, 1, 1);
    canvas.fillStyle = value;
    canvas.fillRect(0, 0, 1, 1);
    var pixel = canvas.getImageData(0, 0, 1, 1).data;
    return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
  }
  function luminance(rgb) {
    return rgb.reduce(function (sum, channel, i) {
      var c = channel / 255;
      return sum + (c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)) * [.2126, .7152, .0722][i];
    }, 0);
  }
  function contrast(a, b) { return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
  function update() {
    links.forEach(function (link) {
      var chain = [];
      for (var el = link; el; el = el.parentElement) chain.unshift(el);
      var bg = [255, 255, 255];
      chain.forEach(function (node) {
        var front = rgba(getComputedStyle(node).backgroundColor);
        bg = bg.map(function (channel, i) { return front[i] * front[3] + channel * (1 - front[3]); });
      });
      var lum = luminance(bg);
      var color = contrast(luminance([250, 252, 251]), lum) > contrast(luminance([11, 15, 14]), lum) ? '#fafcfb' : '#0b0f0e';
      if (link.style.getPropertyValue('--gesicom-credit-logo') !== color) link.style.setProperty('--gesicom-credit-logo', color);
      var accent = color === '#fafcfb' ? '#53d99b' : '#087d4b';
      if (link.style.getPropertyValue('--gesicom-credit-accent') !== accent) link.style.setProperty('--gesicom-credit-accent', accent);
    });
  }
  var frame = 0;
  function schedule() {
    if (!frame) frame = requestAnimationFrame(function () { frame = 0; update(); });
  }
  var observer = new MutationObserver(schedule);
  var ancestors = new Set();
  links.forEach(function (link) {
    for (var el = link; el; el = el.parentElement) ancestors.add(el);
  });
  ancestors.forEach(function (el) { observer.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] }); });
  if (document.head) observer.observe(document.head, { subtree: true, childList: true, characterData: true, attributes: true });
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('transitionend', schedule);
  update();
  schedule(); // El JavaScript de la tienda puede aplicar su fondo después.
  return function () {
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('load', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('transitionend', schedule);
  };
}

// Se serializa en el iframe: no debe depender de imports ni del módulo.
// Actualiza también las firmas de plantillas guardadas antes de esta versión.
export function actualizarCreditosGesicom(contenido, adaptar = adaptarLogosGesicom) {
  document.querySelectorAll('footer a[href], .footer-bottom a[href], .gcx-footer-bottom a[href]').forEach(function (link) {
    var url;
    try { url = new URL(link.getAttribute('href'), document.baseURI); } catch (_) { return; }
    if (!/^(www\.)?gesicomm\.com$/i.test(url.hostname)) return;
    if (!/^Gesicomm?$/i.test(link.textContent.trim())) return;
    link.setAttribute('data-gesicomm-credit', '');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.innerHTML = contenido;
  });
  return adaptar(document);
}
