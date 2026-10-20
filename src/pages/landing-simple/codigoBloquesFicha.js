import { dividirCodigoPegado } from './dividirCodigoPegado';

export const atributoBloque = 'data-gesicomm-ficha-bloque';
const parse = html => new DOMParser().parseFromString(html || '', 'text/html');
export function extraerBloqueFicha(html, clave) {
  const doc = parse(html), nodos = [...doc.querySelectorAll(`[${atributoBloque}="${clave}"]`)];
  if (nodos.length < 2) return nodos[0]?.outerHTML || '';
  const raiz = doc.createElement('div'); raiz.setAttribute(atributoBloque, clave); raiz.className = 'gc-ficha-codigo-grupo';
  for (const nodo of nodos) { nodo.removeAttribute(atributoBloque); raiz.appendChild(nodo); }
  return raiz.outerHTML;
}

// Los fragmentos de combo conservan referencias al HTML que genera su renderer.
// Las listas usan un template: agregar/quitar tarjetas no congela el diseño.
export function prepararMoldeCombo(html) {
  const doc = parse(html), raiz = doc.body.firstElementChild;
  if (!raiz) return '';
  function selector(el, limite) {
    if (el === limite) return ':scope';
    const clases = [...el.classList].filter(c => /^[a-zA-Z_][\w-]*$/.test(c) && c !== 'abierta');
    let parte = el.tagName.toLowerCase() + clases.map(c => `.${c}`).join('');
    if (!clases.length) parte += `:nth-of-type(${[...el.parentElement.children].filter(n => n.tagName === el.tagName).indexOf(el) + 1})`;
    return el.parentElement === limite ? `:scope > ${parte}` : `${selector(el.parentElement, limite)} > ${parte}`;
  }
  function marcar(contenedor) {
    const nodos = [...contenedor.querySelectorAll('*')];
    for (const el of [contenedor, ...nodos]) {
      el.setAttribute('data-gc-ref', selector(el, contenedor));
      if (!el.children.length || el.classList.contains('cmb-icono-libre') || ['svg', 'P', 'H1', 'H2', 'H3', 'H4'].includes(el.tagName)) el.setAttribute('data-gc-valor', '');
    }
  }
  marcar(raiz);
  for (const lista of raiz.querySelectorAll('.cmb-why-grid,.cmb-trust-grid,.cmb-reviews-grid,.cmb-faq-list,.cmb-products-grid')) {
    const fila = lista.firstElementChild;
    if (!fila) continue;
    const molde = doc.createElement('template');
    molde.setAttribute('data-gc-filas', '');
    const copia = fila.cloneNode(true); marcar(copia); molde.content.appendChild(copia);
    lista.setAttribute('data-gc-lista', lista.getAttribute('data-gc-ref'));
    lista.replaceChildren(molde);
  }
  return raiz.outerHTML;
}

export function completarMoldeCombo(molde, fuente) {
  const doc = parse(molde), raiz = doc.body.firstElementChild, origen = parse(fuente).body.firstElementChild;
  if (!raiz || !origen) return fuente;
  function buscar(base, sel) { try { return sel === ':scope' ? base : base.querySelector(sel); } catch { return null; } }
  function completar(nodo, base) {
    const sel = nodo.getAttribute('data-gc-ref');
    const dato = sel ? buscar(base, sel) : null;
    if (sel && !dato) { nodo.remove(); return; }
    if (dato) {
      for (const attr of [...nodo.attributes]) if (/^(src|srcset|alt|href|hidden|aria-expanded|data-combo-pregunta|data-combo-imagen|data-combo-media-panel)$/.test(attr.name) && !dato.hasAttribute(attr.name)) nodo.removeAttribute(attr.name);
      for (const attr of dato.attributes) if (/^(src|srcset|alt|href|hidden|aria-expanded|data-combo-pregunta|data-combo-imagen|data-combo-media-panel)$/.test(attr.name)) nodo.setAttribute(attr.name, attr.value);
      if (nodo.hasAttribute('data-gc-valor')) { nodo.innerHTML = dato.innerHTML; return; }
    }
    if (nodo.hasAttribute('data-gc-lista')) {
      const lista = buscar(base, nodo.getAttribute('data-gc-lista'));
      const template = nodo.querySelector('template[data-gc-filas]');
      if (!template) return;
      for (const fila of [...(lista?.children || [])]) {
        const copia = template.content.firstElementChild.cloneNode(true);
        completar(copia, fila); nodo.appendChild(copia);
      }
      template.remove(); return;
    }
    for (const hijo of [...nodo.children]) completar(hijo, base);
  }
  completar(raiz, origen);
  return raiz.outerHTML;
}

export function validarRespuestaBloque(texto, clave, base, combo = false) {
  const codigo = dividirCodigoPegado(texto);
  if (!codigo.html?.trim()) throw new Error('Pegá el HTML completo del bloque, con su CSS y JavaScript.');
  if (/<\/?(?:html|head|body)\b|<!doctype/i.test(codigo.html)) throw new Error('Pegá solamente el bloque, sin <html>, <head> ni <body>.');
  const doc = parse(codigo.html), hijos = [...doc.body.children];
  if (hijos.length !== 1 || hijos[0].getAttribute(atributoBloque) !== clave) throw new Error(`La respuesta debe tener un único bloque raíz con ${atributoBloque}="${clave}".`);
  if (doc.querySelector('script,style,iframe[src],link[rel="stylesheet"]')) throw new Error('Incluí estilos y scripts dentro de <style> y <script>, sin archivos externos.');
  const anterior = parse(base.html);
  const bloquesPermitidos = new Set([clave, ...[...anterior.querySelectorAll(`[${atributoBloque}]`)].map(el => el.getAttribute(atributoBloque))]);
  if ([...doc.querySelectorAll(`[${atributoBloque}]`)].some(el => !bloquesPermitidos.has(el.getAttribute(atributoBloque)))) throw new Error('La respuesta agrega otro bloque de la página. Pegá únicamente el bloque que estás editando.');
  const attrs = ['data-gesicomm-bind', 'data-gesicomm-lista', 'data-gesicomm-comprar', 'data-gesicomm-agregar', 'data-gesicomm-countdown', 'data-gesicomm-countdown-parte', 'data-combo-pregunta', 'data-combo-imagen', 'data-combo-media-panel', ...(combo ? ['data-gc-ref', 'data-gc-lista', 'data-gc-valor', 'data-gc-filas'] : [])];
  function inventario(documento) {
    const elementos = [];
    function recorrer(raiz) { for (const el of raiz.children) { elementos.push(el); recorrer(el.tagName === 'TEMPLATE' ? el.content : el); } }
    recorrer(documento.body); return elementos;
  }
  const originales = inventario(anterior), nuevos = inventario(doc);
  for (const attr of attrs) {
    const valores = [...new Set(originales.filter(el => el.hasAttribute(attr)).map(el => el.getAttribute(attr)))];
    for (const valor of valores) if (!nuevos.some(el => el.getAttribute(attr) === valor && el.hasAttribute(attr))) throw new Error(`Falta una conexión con los datos: ${attr}="${valor}". Pedile a la IA que la conserve.`);
  }
  if (codigo.js?.trim()) {
    try { new Function('bloque', 'datos', codigo.js); } catch (e) { throw new Error(`El JavaScript no se puede interpretar: ${e.message}`); }
  }
  return { html: doc.body.innerHTML, css: codigo.css ?? '', js: codigo.js ?? '' };
}

export function armarPromptBloqueFicha({ clave, titulo, tipo, base, contexto }) {
  return `Vas a editar SOLO el bloque «${titulo}» de la vista de ${tipo} de Gesicomm.
Si no te expliqué qué cambiar, preguntame el estilo y el cambio deseado antes de generar código.
Abajo están el HTML, CSS y JavaScript completos actuales, más los datos reales. No inventes precios, testimonios ni condiciones.
Devolvé UN bloque html completo con <style> y <script> incluidos, o tres bloques separados html, css y javascript. Sin omitir código ni usar «igual que antes».
Conservá un único elemento raíz ${atributoBloque}="${clave}". No agregues header, footer, otras secciones ni un documento completo.
Conservá TODOS los atributos data-gesicomm-* y data-combo-* que conectan datos y acciones.
${tipo === 'combo' ? 'Conservá cada data-gc-ref y data-gc-valor: Gesicomm actualiza ese contenido con los campos del editor. Conservá los data-gc-lista y sus <template data-gc-filas>: se repiten por cada tarjeta/pregunta/producto real. No conviertas listas en contenido fijo. Podés cambiar clases y envoltorios, pero mantené estas conexiones.' : 'Los data-gesicomm-bind y las listas con <template> reciben los datos del producto automáticamente. Conservá los botones y sus acciones comerciales. No programes otro checkout ni otro contador.'}
CSS: usá clases nuevas con un prefijo propio y variables de la tienda (--tienda-primario, --tienda-fondo, --tienda-texto, --tienda-superficie) o las --cmb-* existentes del combo. El CSS se limita automáticamente a este bloque. Diseño responsive y accesible.
JavaScript: se ejecuta con las variables bloque (elemento raíz) y datos (window.Gesicomm). Buscá elementos con bloque.querySelector. Devolvé una función de limpieza si agregás listeners o timers. No accedas a la ventana contenedora, red o almacenamiento. El runtime mantiene carrito, precios, galería, preguntas y cuenta regresiva. No dupliques el JavaScript del motor: está disponible en la página.
DATOS REALES (solo contexto; las conexiones del HTML deben seguir funcionando):
\`\`\`json
${JSON.stringify(contexto || {}, null, 2)}
\`\`\`
HTML COMPLETO DEL BLOQUE:
\`\`\`html
${base.html}
\`\`\`
CSS COMPLETO ACTUAL (incluye estilos compartidos como referencia; devolvé únicamente los estilos de este bloque):
\`\`\`css
${base.css || ''}
\`\`\`
JAVASCRIPT COMPLETO PERSONALIZADO DEL BLOQUE (el motor comercial ya está cargado):
\`\`\`javascript
${base.js || '// Sin JavaScript personalizado. El motor de Gesicomm maneja las interacciones existentes.'}
\`\`\`
JAVASCRIPT COMPARTIDO ACTUAL DE LA VISTA (referencia completa; YA está cargado, no lo vuelvas a incluir en tu respuesta):
\`\`\`javascript
${base.motor || '// Esta vista usa el runtime de datos, carrito, listas, FAQ, galería y countdown de Gesicomm.'}
\`\`\``;
}
