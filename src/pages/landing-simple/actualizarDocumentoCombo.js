// Se ejecuta dentro del sandbox. Solo se actualiza el contenido generado del
// combo; header, footer y scripts del ecommerce mantienen su documento y estado.
export function actualizarDocumentoCombo(html, css) {
  var actual = document.querySelector('.cmb-root');
  var plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  var nuevo = plantilla.content.querySelector('.cmb-root');
  if (!actual || !nuevo) return;

  function clave(nodo) {
    if (nodo.nodeType !== 1) return null;
    var atributos = ['id', 'data-combo-bloque', 'data-combo-sub-bloque', 'data-combo-estructura', 'data-combo-media-panel', 'data-combo-imagen', 'data-combo-pregunta'];
    for (var i = 0; i < atributos.length; i++) {
      if (nodo.hasAttribute(atributos[i])) return nodo.tagName + ':' + atributos[i] + ':' + nodo.getAttribute(atributos[i]) + ':' + (nodo.getAttribute('data-combo-orden') || '');
    }
    return null;
  }
  function sincronizar(destino, fuente) {
    if (destino.isEqualNode(fuente)) return;
    if (destino.nodeType !== fuente.nodeType || destino.nodeName !== fuente.nodeName) {
      destino.replaceWith(fuente.cloneNode(true));
      return;
    }
    if (destino.nodeType !== 1) { destino.nodeValue = fuente.nodeValue; return; }
    // Conservar la cuenta en curso cuando solo cambian textos u orden.
    Array.from(destino.attributes).forEach(function (a) {
      if (!fuente.hasAttribute(a.name) && !a.name.startsWith('data-gesicomm-countdown-') && !destino.__gcAtributosCodigo?.has(a.name)) destino.removeAttribute(a.name);
    });
    Array.from(fuente.attributes).forEach(function (a) {
      if (destino.getAttribute(a.name) !== a.value) destino.setAttribute(a.name, a.value);
    });
    if (destino.hasAttribute('data-gesicomm-countdown')) return;
    var anteriores = Array.from(destino.childNodes);
    var usados = new Set();
    var conClave = new Map();
    anteriores.forEach(function (n) { var k = clave(n); if (k && !conClave.has(k)) conClave.set(k, n); });
    Array.from(fuente.childNodes).forEach(function (n, i) {
      var k = clave(n);
      var candidato = k ? conClave.get(k) : anteriores[i];
      if (candidato && (usados.has(candidato) || (!k && (clave(candidato) || candidato.nodeName !== n.nodeName)))) candidato = null;
      if (!candidato) candidato = n.cloneNode(true);
      usados.add(candidato);
      if (destino.childNodes[i] !== candidato) destino.insertBefore(candidato, destino.childNodes[i] || null);
      sincronizar(candidato, n);
    });
    anteriores.forEach(function (n) { if (!usados.has(n) && n.parentNode === destino) n.remove(); });
  }

  var preguntas = new Set(Array.from(actual.querySelectorAll('[data-combo-pregunta][aria-expanded="true"]')).map(function (n) {
    return n.getAttribute('data-combo-pregunta');
  }));
  var medio = actual.querySelector('[data-combo-media-panel]:not([hidden])');
  var indiceMedio = medio && medio.getAttribute('data-combo-media-panel');
  var y = window.scrollY;
  sincronizar(actual, nuevo);
  actual.querySelectorAll('[data-combo-pregunta]').forEach(function (n) {
    var abierto = preguntas.has(n.getAttribute('data-combo-pregunta'));
    n.setAttribute('aria-expanded', String(abierto));
    n.parentElement.classList.toggle('abierta', abierto);
    var respuesta = n.parentElement.querySelector('.cmb-faq-answer');
    if (respuesta) respuesta.hidden = !abierto;
  });
  if (indiceMedio != null && actual.querySelector('[data-combo-media-panel="' + indiceMedio + '"]')) {
    actual.querySelectorAll('[data-combo-media-panel]').forEach(function (n) { n.hidden = n.getAttribute('data-combo-media-panel') !== indiceMedio; });
    actual.querySelectorAll('[data-combo-imagen]').forEach(function (n) { n.classList.toggle('activa', n.getAttribute('data-combo-imagen') === indiceMedio); });
  }
  var estilo = document.querySelector('style[data-gesicomm-estilos-codigo]');
  if (estilo && estilo.textContent !== css) estilo.textContent = css;
  // El scroll solo se ajusta si el cambio de altura movió el punto visible.
  if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' });
}
