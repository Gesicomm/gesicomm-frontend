/**
 * Secciones que Gesicom agrega a una landing de "Lienzo en blanco" cuando
 * el código del comercio no las trae: productos, contacto/redes y footer
 * legal.
 *
 * Van DENTRO del documento del iframe (ver construirDocumentoCodigo), no
 * debajo del iframe en la página contenedora. Afuera quedaban con un
 * segundo scroll, pintadas con el color de fondo de la tienda (oscuro por
 * defecto) aunque la landing fuera blanca. Adentro heredan el fondo, la
 * tipografía y el color de texto de la propia landing, y toman el acento de
 * la variable --gc-primario que define el prompt de generación.
 *
 * Todo el texto viene de datos del comercio: se escapa acá, porque este
 * HTML se concatena al documento sin pasar por el sanitizador del backend.
 */

function htmlTieneSelector(html, selector) {
  return new RegExp(`(?:id|class)=["'][^"']*\\b${selector}\\b[^"']*["']`, 'i').test(html);
}

// Reconocen tanto el formato viejo (ids/clases, data-gesicomm-checkout) como
// el contrato del runtime (data-gesicomm-lista, -comprar, -form, -link): si
// la landing ya tiene la sección, Gesicom no agrega otra.
export function codigoTieneProductos(codigo) {
  const html = codigo?.html || '';
  return htmlTieneSelector(html, 'productos')
    || htmlTieneSelector(html, 'productos-grid')
    || /data-gesicomm-(checkout|comprar|agregar)\b/i.test(html)
    || /data-gesicomm-lista=["'](catalogo|productos|combos)["']/i.test(html);
}

export function codigoTieneContacto(codigo) {
  const html = codigo?.html || '';
  return htmlTieneSelector(html, 'contacto')
    || /data-gesicomm-form=["']contacto["']/i.test(html)
    || /data-gesicomm-whatsapp\b/i.test(html)
    || /data-gesicomm-redes\b/i.test(html);
}

export function codigoTieneFooter(codigo) {
  const html = codigo?.html || '';
  return /<footer(?:\s|>)/i.test(html) || htmlTieneSelector(html, 'footer')
    || /data-gesicomm-link=["']politica-privacidad["']/i.test(html);
}

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hrefSeguro(url) {
  return /^(https?:|mailto:|tel:)/i.test(url) ? esc(url) : null;
}

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })} Gs`;
}

const REDES = [
  // Número local paraguayo (0981…) → formato internacional que pide wa.me.
  { key: 'whatsapp', label: 'WhatsApp', href: v => `https://wa.me/${v.replace(/\D/g, '').replace(/^0/, '595')}`, icon: '<path d="M3 21l1.3-4.2A8.5 8.5 0 1 1 8 19.7L3 21z"></path><path d="M8.7 9.3c0 3.4 2.9 6.2 6.2 6.2.6 0 .9-.3.9-.9v-1c0-.3-.2-.5-.5-.6l-1.8-.5c-.3-.1-.5 0-.7.2l-.4.5a5 5 0 0 1-2.4-2.4l.5-.4c.2-.2.3-.4.2-.7l-.5-1.8c-.1-.3-.3-.5-.6-.5h-1c-.6 0-.9.4-.9.9z"></path>' },
  { key: 'instagram', label: 'Instagram', href: v => (/^https?:/i.test(v) ? v : `https://instagram.com/${v.replace(/^@/, '')}`), icon: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>' },
  { key: 'facebook', label: 'Facebook', href: v => (/^https?:/i.test(v) ? v : `https://facebook.com/${v.replace(/^@/, '')}`), icon: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>' },
  { key: 'tiktok', label: 'TikTok', href: v => (/^https?:/i.test(v) ? v : `https://tiktok.com/@${v.replace(/^@/, '')}`), icon: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>' },
  { key: 'youtube', label: 'YouTube', href: v => (/^https?:/i.test(v) ? v : `https://youtube.com/@${v.replace(/^@/, '')}`), icon: '<rect x="2" y="5" width="20" height="14" rx="4"></rect><path d="M10 9.5v5l4.5-2.5-4.5-2.5z" fill="currentColor" stroke="none"></path>' },
  { key: 'twitter', label: 'X', href: v => (/^https?:/i.test(v) ? v : `https://x.com/${v.replace(/^@/, '')}`), icon: '<path d="M4 4l7.5 9.5L4.5 20H7l5.8-6.4L17.5 20H20l-8-10L19 4h-2.5l-5.2 5.8L7 4H4z" fill="currentColor" stroke="none"></path>' },
];

function iconoRedSvg(red) {
  return `<svg class="gcx-chip-icon" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${red.icon}</svg>`;
}

/** true si hay al menos un dato de contacto para mostrar. */
export function contactoTieneDatos(contacto) {
  if (!contacto) return false;
  return ['telefono', 'email', 'direccion', 'horarios', ...REDES.map(r => r.key)]
    .some(k => String(contacto[k] || '').trim());
}

function productosHtml(productos) {
  if (!productos?.length) return '';
  const cards = productos.map(p => {
    const precio = formatearGs(p.precio);
    const img = p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">` : '';
    return `<article class="gcx-card">${img}<h3>${esc(p.nombre)}</h3>${precio ? `<strong>${precio}</strong>` : ''}`
      + `<button type="button" class="gcx-btn" data-gesicomm-checkout="${esc(p.tipo)}:${esc(p.referencia_id)}">Comprar ahora</button></article>`;
  }).join('');
  return `<section class="gcx-section" id="productos-seleccionados"><div class="gcx-wrap">`
    + `<h2>Nuestros productos</h2><div class="gcx-grid">${cards}</div></div></section>`;
}

function contactoHtml(contacto) {
  if (!contactoTieneDatos(contacto)) return '';
  const redes = REDES
    .filter(r => String(contacto[r.key] || '').trim())
    .map(r => {
      const href = hrefSeguro(r.href(String(contacto[r.key]).trim()));
      return href ? `<a class="gcx-chip" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${esc(r.label)}" title="${esc(r.label)}">${iconoRedSvg(r)}<span>${esc(r.label)}</span></a>` : '';
    })
    .join('');
  const datos = [
    contacto.telefono && `<li><span>Teléfono</span><a href="tel:${esc(String(contacto.telefono).replace(/[^\d+]/g, ''))}">${esc(contacto.telefono)}</a></li>`,
    contacto.email && `<li><span>Email</span><a href="mailto:${esc(contacto.email)}">${esc(contacto.email)}</a></li>`,
    (contacto.direccion || contacto.ciudad) && `<li><span>Dirección</span>${esc([contacto.direccion, contacto.ciudad, contacto.pais].filter(Boolean).join(', '))}</li>`,
    contacto.horarios && `<li><span>Horarios</span>${esc(contacto.horarios)}</li>`,
  ].filter(Boolean).join('');
  return `<section class="gcx-section" id="contacto"><div class="gcx-wrap gcx-contacto">`
    + `<div><h2>Contacto</h2><p>¿Tenés dudas antes de comprar? Escribinos.</p></div>`
    + `<div>${datos ? `<ul class="gcx-datos">${datos}</ul>` : ''}${redes ? `<div class="gcx-redes">${redes}</div>` : ''}</div>`
    + `</div></section>`;
}

/**
 * Estructura fija: marca + redes arriba a la izquierda, columna "Políticas"
 * y columna "Contactos" (datos de Mi Tienda) al centro/derecha, y abajo del
 * todo una barra separada con el nombre del comercio y "Tecnología de
 * Gesicom" — esa barra no es un dato de Mi Tienda ni el comercio puede
 * editarla desde el código: solo se agrega cuando el código NO trae su
 * propio <footer> (ver codigoTieneFooter), así que la única forma de
 * sacarla es que el comercio escriba la suya propia.
 */
function footerHtml(nombreComercio, basePath, contacto) {
  const redesIconos = REDES
    .filter(r => String(contacto?.[r.key] || '').trim())
    .map(r => {
      const href = hrefSeguro(r.href(String(contacto[r.key]).trim()));
      return href ? `<a class="gcx-footer-social" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${esc(r.label)}" title="${esc(r.label)}">${iconoRedSvg(r)}</a>` : '';
    })
    .join('');

  const enlacesPoliticas = [
    ['contacto', 'Contacto'],
    ['politica-privacidad', 'Política de Privacidad'],
    ['politica-reembolso', 'Política de Reembolso'],
    ['terminos-servicio', 'Términos del Servicio'],
    ['politica-envio', 'Política de Envío'],
    ['aviso-legal', 'Aviso Legal'],
  ].map(([to, label]) => `<li><a href="${esc(`${basePath}/${to}`)}">${label}</a></li>`).join('');

  const datosContacto = [
    contacto?.nombre_contacto && `<li><span>Atiende:</span> ${esc(contacto.nombre_contacto)}</li>`,
    contacto?.whatsapp && `<li><span>WhatsApp:</span> <a href="https://wa.me/${esc(String(contacto.whatsapp).replace(/\D/g, '').replace(/^0/, '595'))}" target="_blank" rel="noopener noreferrer">${esc(contacto.whatsapp)}</a></li>`,
    contacto?.telefono && `<li><span>Tel:</span> <a href="tel:${esc(String(contacto.telefono).replace(/[^\d+]/g, ''))}">${esc(contacto.telefono)}</a></li>`,
    contacto?.email && `<li><span>Email:</span> <a href="mailto:${esc(contacto.email)}">${esc(contacto.email)}</a></li>`,
    (contacto?.direccion || contacto?.ciudad) && `<li><span>Dirección:</span> ${esc([contacto?.direccion, contacto?.ciudad, contacto?.pais].filter(Boolean).join(', '))}</li>`,
    contacto?.horarios && `<li><span>Horario:</span> ${esc(contacto.horarios)}</li>`,
  ].filter(Boolean).join('');

  return `<footer class="gcx-footer">`
    + `<div class="gcx-footer-top">`
    + `<div class="gcx-footer-brand"><strong class="gcx-footer-name">${esc(nombreComercio)}</strong>`
    + (redesIconos ? `<div class="gcx-footer-social-row">${redesIconos}</div>` : '')
    + `</div>`
    + `<div class="gcx-footer-col"><h3>Políticas</h3><ul>${enlacesPoliticas}</ul></div>`
    + (datosContacto ? `<div class="gcx-footer-col"><h3>Contactos</h3><ul class="gcx-footer-datos">${datosContacto}</ul></div>` : '')
    + `</div>`
    + `<div class="gcx-footer-bottom"><p>${esc(nombreComercio)} · Tecnología de <a href="https://gesicomm.com" target="_blank" rel="noopener noreferrer">Gesicom</a></p></div>`
    + `</footer>`;
}

/**
 * Sin fondo ni color de texto propios: heredan los del <body> de la
 * landing. Los bordes usan currentColor para funcionar igual sobre fondo
 * claro u oscuro, y el acento sale de --gc-primario (con el del tema de la
 * tienda como respaldo si el código no lo define).
 */
function css(acentoFallback) {
  const acento = `var(--gc-primario, ${acentoFallback || '#2563eb'})`;
  const sobreAcento = 'var(--gc-texto-sobre-primario, #ffffff)';
  return `
.gcx-section, .gcx-footer { color: inherit; font: inherit; border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.gcx-section { padding: 56px 20px; }
.gcx-wrap { max-width: 1080px; margin: 0 auto; }
.gcx-section h2 { margin: 0 0 8px; font-size: clamp(24px, 3.4vw, 34px); line-height: 1.1; }
.gcx-section p { margin: 0; opacity: .72; line-height: 1.5; }
.gcx-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-top: 24px; }
.gcx-card { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; border: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.gcx-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; border-radius: 10px; background: #fff; }
.gcx-card h3 { margin: 0; font-size: 16px; line-height: 1.3; }
.gcx-card strong { margin-top: auto; font-size: 18px; }
.gcx-btn { border: 0; border-radius: 10px; padding: 12px 14px; background: ${acento}; color: ${sobreAcento}; font: inherit; font-weight: 700; cursor: pointer; }
.gcx-contacto { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 32px; align-items: start; }
.gcx-datos { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 10px; }
.gcx-datos li { display: flex; flex-direction: column; gap: 2px; font-size: 15px; }
.gcx-datos span { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; opacity: .6; }
.gcx-datos a { color: inherit; }
.gcx-redes { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.gcx-chip { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1.5px solid color-mix(in srgb, currentColor 24%, transparent); color: inherit; text-decoration: none; transition: transform .16s ease, background .16s ease, border-color .16s ease, color .16s ease; }
.gcx-chip span { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.gcx-chip-icon { display: block; }
.gcx-chip:hover { transform: translateY(-1px); color: ${acento}; border-color: color-mix(in srgb, ${acento} 72%, currentColor 28%); background: color-mix(in srgb, ${acento} 12%, transparent); }
.gcx-footer { padding: 56px 20px 0; font-size: 14px; }
.gcx-footer a { color: inherit; text-decoration: none; }
.gcx-footer a:hover { opacity: 1; text-decoration: underline; }
.gcx-footer-top { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 36px; align-items: start; padding-bottom: 40px; }
.gcx-footer-brand { display: flex; flex-direction: column; gap: 20px; }
.gcx-footer-name { font-size: clamp(24px, 2.8vw, 32px); font-weight: 900; line-height: 1.1; }
.gcx-footer-social-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
.gcx-footer-social { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1.5px solid color-mix(in srgb, currentColor 24%, transparent); color: inherit; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
.gcx-footer-social:hover { transform: translateY(-1px); text-decoration: none; opacity: 1; border-color: currentColor; }
.gcx-footer-col h3 { margin: 0 0 16px; font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; opacity: .9; }
.gcx-footer-col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.gcx-footer-col a { opacity: .9; }
.gcx-footer-datos li { display: flex; gap: 6px; flex-wrap: wrap; opacity: .9; }
.gcx-footer-datos span { font-weight: 600; opacity: 1; }
.gcx-footer-datos a { opacity: 1; }
.gcx-footer-bottom { border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent); padding: 20px 0 26px; text-align: center; }
.gcx-footer-bottom p { margin: 0; opacity: .65; }
.gcx-footer-bottom a { opacity: 1; font-weight: 600; }
@media (max-width: 640px) { .gcx-contacto { grid-template-columns: 1fr; gap: 16px; } .gcx-section { padding: 40px 16px; } .gcx-footer-top { grid-template-columns: 1fr; gap: 28px; padding: 44px 0 32px; text-align: left; } }
`;
}

/**
 * `productos[].imagen` tiene que llegar ya resuelta a URL absoluta
 * (getMediaUrl): el iframe tiene origen opaco y no resuelve rutas relativas
 * contra /uploads.
 *
 * El contacto solo se agrega si tiene al menos un dato: antes se pintaba
 * el título "Redes sociales" aunque la lista quedara vacía.
 * @returns {{html: string, css: string}}
 */
export function armarSeccionesSistema({
  mostrarProductos, mostrarContacto, mostrarFooter,
  productos = [], contacto = null, nombreComercio = 'Tienda', basePath = '', acento = null,
}) {
  const html = [
    mostrarProductos ? productosHtml(productos) : '',
    mostrarContacto ? contactoHtml(contacto) : '',
    mostrarFooter ? footerHtml(nombreComercio, basePath, contacto) : '',
  ].filter(Boolean).join('\n');
  return { html, css: html ? css(acento) : '' };
}
