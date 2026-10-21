import { plantillaLegalPara, esPlantillaLegalGenerica } from './plantillasLegalesCodigo';

const TAGS = new Set(['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG']);

// Pegar desde Word o un sitio conserva el texto y su formato básico.
export function limpiarTextoFooter(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,svg,math,template').forEach(node => node.remove());
  for (const node of [...doc.body.querySelectorAll('*')].reverse()) {
    if (!TAGS.has(node.tagName) && node.tagName !== 'SPAN') {
      node.replaceWith(...node.childNodes);
      continue;
    }
    const href = node.getAttribute('href');
    const src = node.getAttribute('src');
    const alt = node.getAttribute('alt');
    const style = node.getAttribute('style') || '';
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    if (node.tagName === 'IMG') {
      if (!src || !/^(https?:\/\/|\/(?!\/))/i.test(src.trim())) { node.remove(); continue; }
      node.setAttribute('src', src.trim());
      node.setAttribute('alt', alt || '');
      continue;
    }
    if (node.tagName === 'A' && href && /^(https?:|mailto:|tel:|\/(?!\/)|#)/i.test(href.trim())) node.setAttribute('href', href.trim());
    // Algunos portapapeles y navegadores expresan el formato con estilos.
    for (const [regex, tag] of [[/font-weight\s*:\s*(bold|[6-9]00)/i, 'strong'], [/font-style\s*:\s*italic/i, 'em'], [/text-decoration[^:]*:\s*[^;]*underline/i, 'u']]) {
      if (regex.test(style)) {
        const wrapper = doc.createElement(tag);
        wrapper.append(...node.childNodes);
        node.append(wrapper);
      }
    }
    if (node.tagName === 'SPAN') node.replaceWith(...node.childNodes);
  }
  return doc.body.innerHTML;
}

export function textoInicialFooter(tipo, tienda, existente) {
  const codigo = existente?.html && !esPlantillaLegalGenerica(existente) ? existente : plantillaLegalPara(tipo, tienda);
  const doc = new DOMParser().parseFromString(codigo.html, 'text/html');
  doc.querySelectorAll('.legal-back, .legal-kicker, .legal-updated, header, footer, nav').forEach(node => node.remove());
  return limpiarTextoFooter((doc.querySelector('.footer-edited-content') || doc.querySelector('main') || doc.body).innerHTML);
}

export function codigoFooterDesdeTexto(tipo, html, tienda = {}) {
  const plantilla = plantillaLegalPara(tipo, tienda);
  plantilla.css += '\n.footer-edited-content img { display: block; max-width: 100%; height: auto; margin: 16px 0; }';
  return {
    ...plantilla,
    html: `<main class="legal-page"><a class="legal-back" href="./">Volver a la tienda</a><div class="footer-edited-content">${limpiarTextoFooter(html)}</div></main>`,
    css: `${plantilla.css}\n.footer-edited-content { overflow-wrap: anywhere; line-height: 1.75; } .footer-edited-content p { margin: 0 0 1em; } .footer-edited-content h1 { font-size: clamp(28px, 5vw, 48px); line-height: 1.2; font-weight: 700; margin: 0 0 1em; } .footer-edited-content h2 { font-size: 24px; font-weight: 700; margin: 1.5em 0 .5em; } .footer-edited-content h3 { font-size: 20px; font-weight: 700; } .footer-edited-content ul { list-style: disc; padding-left: 1.5em; } .footer-edited-content ol { list-style: decimal; padding-left: 1.5em; } .footer-edited-content a { text-decoration: underline; }`,
  };
}
