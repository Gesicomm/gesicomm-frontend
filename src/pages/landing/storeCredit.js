// Firma propia de Gesicom: no toma el acento configurable del comercio.
export const CREDITO_GESICOM_CONTENIDO = `<span>Gesicom</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M48.27 24.31 A18.9 18.9 0 1 0 49.49 35.93 L37 35.93" fill="none" stroke="currentColor" stroke-width="8.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="49" cy="48.5" r="6.5" fill="currentColor"/></svg>`;

export const CREDITO_GESICOM_HTML = `<a data-gesicomm-credit href="https://gesicomm.com" target="_blank" rel="noopener noreferrer">${CREDITO_GESICOM_CONTENIDO}</a>`;

export const CREDITO_GESICOM_CSS = `
a[data-gesicomm-credit] { display: inline-flex !important; align-items: center !important; gap: 6px !important; vertical-align: middle; white-space: nowrap; color: #ff5c45 !important; font-weight: 900 !important; opacity: 1 !important; text-decoration: none; }
a[data-gesicomm-credit] > span { color: inherit !important; font: inherit !important; }
a[data-gesicomm-credit] > svg { display: block !important; width: 24px !important; height: 24px !important; flex: 0 0 24px !important; color: inherit !important; }
a[data-gesicomm-credit]:hover { text-decoration: underline; text-underline-offset: 3px; }
a[data-gesicomm-credit]:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 3px; }
`;

// Se serializa en el iframe: no debe depender de imports ni del módulo.
// Actualiza también las firmas de plantillas guardadas antes de esta versión.
export function actualizarCreditosGesicom(contenido) {
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
}
