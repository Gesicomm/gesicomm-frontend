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

export function codigoTieneProductos(codigo) {
  const html = codigo?.html || '';
  return htmlTieneSelector(html, 'productos')
    || htmlTieneSelector(html, 'productos-grid')
    || /data-gesicomm-checkout/i.test(html);
}

export function codigoTieneContacto(codigo) {
  return htmlTieneSelector(codigo?.html || '', 'contacto');
}

export function codigoTieneFooter(codigo) {
  const html = codigo?.html || '';
  return /<footer(?:\s|>)/i.test(html) || htmlTieneSelector(html, 'footer');
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
  { key: 'whatsapp', label: 'WhatsApp', href: v => `https://wa.me/${v.replace(/\D/g, '').replace(/^0/, '595')}` },
  { key: 'instagram', label: 'Instagram', href: v => (/^https?:/i.test(v) ? v : `https://instagram.com/${v.replace(/^@/, '')}`) },
  { key: 'facebook', label: 'Facebook', href: v => (/^https?:/i.test(v) ? v : `https://facebook.com/${v.replace(/^@/, '')}`) },
  { key: 'tiktok', label: 'TikTok', href: v => (/^https?:/i.test(v) ? v : `https://tiktok.com/@${v.replace(/^@/, '')}`) },
  { key: 'youtube', label: 'YouTube', href: v => (/^https?:/i.test(v) ? v : `https://youtube.com/@${v.replace(/^@/, '')}`) },
  { key: 'twitter', label: 'X', href: v => (/^https?:/i.test(v) ? v : `https://x.com/${v.replace(/^@/, '')}`) },
];

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
      return href ? `<a class="gcx-chip" href="${href}" target="_blank" rel="noopener noreferrer">${r.label}</a>` : '';
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

function footerHtml(nombreComercio, basePath) {
  const enlaces = [
    ['politica-privacidad', 'Política de Privacidad'],
    ['politica-reembolso', 'Política de Reembolso'],
    ['terminos-servicio', 'Términos del Servicio'],
    ['politica-envio', 'Política de Envío'],
    ['contacto', 'Información de Contacto'],
    ['aviso-legal', 'Aviso Legal'],
  ].map(([to, label]) => `<a href="${esc(`${basePath}/${to}`)}">${label}</a>`).join('');
  return `<footer class="gcx-footer"><nav>${enlaces}</nav>`
    + `<p>© ${new Date().getFullYear()} ${esc(nombreComercio)} · Tecnología de <a href="https://gesicomm.com" target="_blank" rel="noopener noreferrer">Gesicom</a></p></footer>`;
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
.gcx-redes { display: flex; flex-wrap: wrap; gap: 8px; }
.gcx-chip { display: inline-flex; align-items: center; padding: 8px 14px; border-radius: 999px; border: 1.5px solid ${acento}; color: inherit; font-size: 14px; font-weight: 600; text-decoration: none; }
.gcx-chip:hover { background: color-mix(in srgb, ${acento} 12%, transparent); }
.gcx-footer { padding: 28px 20px 32px; text-align: center; font-size: 13px; }
.gcx-footer nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 18px; margin-bottom: 12px; }
.gcx-footer a { color: inherit; opacity: .78; text-decoration: none; }
.gcx-footer a:hover { opacity: 1; text-decoration: underline; }
.gcx-footer p { margin: 0; opacity: .7; }
@media (max-width: 640px) { .gcx-contacto { grid-template-columns: 1fr; gap: 16px; } .gcx-section { padding: 40px 16px; } }
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
    mostrarFooter ? footerHtml(nombreComercio, basePath) : '',
  ].filter(Boolean).join('\n');
  return { html, css: html ? css(acento) : '' };
}
