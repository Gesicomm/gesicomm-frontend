// Se serializa dentro del iframe. El código del comercio conserva el mismo sandbox.
export function instalarCodigoBloquesFicha() {
  var originales = {}, aplicados = {}, limpiezas = {}, firmas = {};
  function selector(clave) { return '[data-gesicomm-ficha-bloque="' + clave + '"]'; }
  function cssLocal(css, clave) {
    var prefijo = selector(clave);
    var nombres = Array.from(String(css || '').matchAll(/@(?:-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)/g)).map(function (m) { return m[1]; });
    nombres.forEach(function (nombre) { css = css.replace(new RegExp('\\b' + nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), 'gc-' + clave + '-' + nombre); });
    var temporal = document.createElement('style'); temporal.textContent = css || ''; document.head.appendChild(temporal);
    var hoja = temporal.sheet;
    if (!hoja) { temporal.remove(); return ''; }
    function reglas(lista) {
      return Array.from(lista).map(function (regla) {
        if (regla.type === 1) {
          // :is admite comas internas (por ejemplo :not(.a,.b)).
          var sel = regla.selectorText;
          return prefijo + ':is(' + sel + '),' + prefijo + ' :is(' + sel + '){' + regla.style.cssText + '}';
        }
        if (regla.type === 4 || regla.type === 12) return regla.cssText.slice(0, regla.cssText.indexOf('{') + 1) + reglas(regla.cssRules) + '}';
        if (regla.type === 7) return regla.cssText;
        return '';
      }).join('\n');
    }
    try { return reglas(hoja.cssRules); } finally { temporal.remove(); }
  }
  function limpiar(clave) {
    if (typeof limpiezas[clave] === 'function') { try { limpiezas[clave](); } catch (_) {} }
    var nodo = firmas[clave]?.nodo;
    nodo?.__gcAtributosCodigo?.forEach(function (nombre) { nodo.removeAttribute(nombre); });
    if (nodo) delete nodo.__gcAtributosCodigo;
    delete limpiezas[clave]; delete firmas[clave];
    document.querySelector('[data-gc-estilo-bloque="' + clave + '"]')?.remove();
  }
  window.__gcCodigoBloques = {
    preparar: function (producto) {
      var codigos = producto?.codigo_bloques || {};
      var combo = !!document.querySelector('.cmb-root');
      Object.keys(Object.assign({}, aplicados, codigos)).forEach(function (clave) {
        if (!/^[a-z_0-9]{1,50}$/.test(clave)) return;
        var codigo = codigos[clave], nodos = Array.from(document.querySelectorAll(selector(clave))), nodo = nodos[0];
        if (combo) return;
        if (!originales[clave] && nodo) originales[clave] = nodos.map(function (n) { return n.outerHTML; }).join('');
        var firma = JSON.stringify(codigo || null);
        if (aplicados[clave] === firma) return;
        limpiar(clave);
        if (nodo && (codigo?.html || originales[clave])) {
          var template = document.createElement('template');
          template.innerHTML = codigo?.html || originales[clave];
          var nuevo = template.content.firstElementChild;
          if (nuevo?.getAttribute('data-gesicomm-ficha-bloque') === clave) {
            for (var i = 1; i < nodos.length; i++) nodos[i].remove();
            nodo.replaceWith(template.content);
          }
        }
        aplicados[clave] = firma;
      });
    },
    montar: function (producto) {
      var codigos = producto?.codigo_bloques || {};
      Object.keys(firmas).forEach(function (clave) { if (!codigos[clave]) limpiar(clave); });
      Object.keys(codigos).forEach(function (clave) {
        if (!/^[a-z_0-9]{1,50}$/.test(clave)) return;
        var codigo = codigos[clave], nodo = document.querySelector(selector(clave));
        if (!nodo) { limpiar(clave); return; }
        var firma = JSON.stringify(codigo);
        if (firmas[clave]?.codigo === firma && firmas[clave]?.nodo === nodo) return;
        limpiar(clave); firmas[clave] = { codigo: firma, nodo: nodo };
        var estilo = document.createElement('style');
        estilo.setAttribute('data-gc-estilo-bloque', clave); estilo.textContent = cssLocal(codigo.css, clave); document.head.appendChild(estilo);
        if (codigo.js?.trim()) {
          var script = document.createElement('script');
          script.textContent = 'window.__gcCodigoBloques.ejecutar(' + JSON.stringify(clave) + ', function(bloque,datos){\n' + codigo.js + '\n});';
          document.body.appendChild(script); script.remove();
        }
      });
    },
    ejecutar: function (clave, fn) {
      var nodo = document.querySelector(selector(clave));
      if (nodo) { try {
        var antes = new Set(Array.from(nodo.attributes).map(function (a) { return a.name; }));
        limpiezas[clave] = fn(nodo, window.Gesicomm);
        nodo.__gcAtributosCodigo = new Set(Array.from(nodo.attributes).map(function (a) { return a.name; }).filter(function (nombre) { return !antes.has(nombre); }));
      } catch (e) { console.error('Bloque ' + clave + ':', e); } }
    },
  };
}
