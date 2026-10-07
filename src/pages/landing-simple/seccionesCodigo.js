/**
 * Utilidades para editar "Bloques del Inicio" uno por uno en vez de todo el
 * documento junto (ver EditorCodigoSeccion.jsx).
 *
 * El HTML de Inicio ya marca cada bloque con data-gesicomm-bloque="tipo"
 * (plantillasBaseCodigo.js). El CSS, al ser un único blob, usa comentarios
 * /* @gc-seccion:tipo *\/ como separador liviano (sobreviven a limpiarCss()
 * del backend porque no matchean el blocklist). Un tramo sin marcador propio
 * o compartido entre bloques (botones, tarjetas de producto) se guarda bajo
 * "__global" y no se expone en el editor de ninguna sección puntual.
 */

const MARCADOR_CSS_RE = /\/\*\s*@gc-seccion:([a-zA-Z0-9_]+)[^*]*\*\//g;

function segmentarCss(cssCompleto) {
  const texto = String(cssCompleto || '');
  MARCADOR_CSS_RE.lastIndex = 0;
  const marcas = [...texto.matchAll(MARCADOR_CSS_RE)];
  if (!marcas.length) {
    return [{ tipo: '__global', marcador: '', cuerpo: texto }];
  }
  const segmentos = [];
  if (marcas[0].index > 0) {
    segmentos.push({ tipo: '__global', marcador: '', cuerpo: texto.slice(0, marcas[0].index) });
  }
  marcas.forEach((m, i) => {
    const inicioCuerpo = m.index + m[0].length;
    const finCuerpo = i + 1 < marcas.length ? marcas[i + 1].index : texto.length;
    segmentos.push({ tipo: m[1], marcador: m[0], cuerpo: texto.slice(inicioCuerpo, finCuerpo) });
  });
  return segmentos;
}

/** CSS propio de una sección (concatena todos los tramos marcados con ese tipo). */
export function extraerSeccionCss(cssCompleto, tipo) {
  return segmentarCss(cssCompleto)
    .filter(s => s.tipo === tipo)
    .map(s => s.cuerpo.trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Reemplaza el CSS de una sección sin tocar el resto del documento. Si la
 * sección tenía varios tramos marcados (no debería pasar salvo ediciones
 * manuales previas), el nuevo CSS queda en el primero y los demás se vacían
 * para no duplicar reglas.
 */
export function reemplazarSeccionCss(cssCompleto, tipo, nuevoCss) {
  const segmentos = segmentarCss(cssCompleto);
  const limpio = String(nuevoCss || '').trim();
  const tieneTipo = segmentos.some(s => s.tipo === tipo);
  if (!tieneTipo) {
    const base = String(cssCompleto || '').replace(/\s+$/, '');
    return `${base}\n\n/* @gc-seccion:${tipo} */\n${limpio}\n`;
  }
  let yaEscrito = false;
  return segmentos
    .map(s => {
      if (s.tipo !== tipo) return `${s.marcador}${s.cuerpo}`;
      if (yaEscrito) return `${s.marcador}\n`;
      yaEscrito = true;
      return `${s.marcador}\n${limpio}\n`;
    })
    .join('');
}

function parser(htmlCompleto) {
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(String(htmlCompleto || ''), 'text/html');
}

/** HTML completo del elemento data-gesicomm-bloque="tipo" (vacío si no existe). */
export function extraerFragmentoHtml(htmlCompleto, tipo) {
  const doc = parser(htmlCompleto);
  const nodo = doc?.body?.querySelector(`[data-gesicomm-bloque="${tipo}"]`);
  return nodo ? nodo.outerHTML : '';
}

/** Reemplaza ese elemento por el fragmento nuevo; si no existe o el fragmento no parsea, devuelve el documento sin tocar. */
export function reemplazarFragmentoHtml(htmlCompleto, tipo, nuevoFragmento) {
  const doc = parser(htmlCompleto);
  const nodo = doc?.body?.querySelector(`[data-gesicomm-bloque="${tipo}"]`);
  if (!doc || !nodo) return htmlCompleto;
  const plantilla = doc.createElement('template');
  plantilla.innerHTML = String(nuevoFragmento || '').trim();
  const nuevoNodo = plantilla.content.firstElementChild;
  if (!nuevoNodo) return htmlCompleto;
  nodo.replaceWith(nuevoNodo);
  return doc.body.innerHTML;
}

/** Multiset de valores data-gesicomm-tienda="..." presentes en un fragmento (logo, nombre, etc.). */
export function bindsDeTiendaEn(fragmentoHtml) {
  const texto = String(fragmentoHtml || '');
  const re = /data-gesicomm-tienda\s*=\s*["']([^"']+)["']/g;
  const conteo = new Map();
  let match;
  while ((match = re.exec(texto))) {
    conteo.set(match[1], (conteo.get(match[1]) || 0) + 1);
  }
  return conteo;
}

/** Valores data-gesicomm-tienda que estaban antes y bajaron de cantidad (logo/nombre borrados, por ejemplo). */
export function bindsDeTiendaPerdidos(fragmentoAnterior, fragmentoNuevo) {
  const antes = bindsDeTiendaEn(fragmentoAnterior);
  const despues = bindsDeTiendaEn(fragmentoNuevo);
  const perdidos = [];
  for (const [clave, cantidad] of antes) {
    if ((despues.get(clave) || 0) < cantidad) perdidos.push(clave);
  }
  return perdidos;
}
