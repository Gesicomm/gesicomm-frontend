/**
 * Se serializa dentro del iframe; no debe depender de imports ni de closures.
 * El JS generado puede recalcular badges desde un MutationObserver del mismo
 * árbol. textContent = textoActual reemplaza el nodo de texto incluso cuando
 * no cambia el valor, y dispara una cadena infinita de microtareas que impide
 * pintar o hacer clic (también puede realimentarse entre varios observers).
 *
 * Solo se omiten reemplazos de texto idéntico. Se conservan cambios de texto,
 * elementos, atributos y la API nativa: observe, disconnect y takeRecords.
 */
export function protegerObservadoresCodigo() {
  const ObservadorNativo = window.MutationObserver;
  if (!ObservadorNativo) return;

  function textoReemplazado(nodos) {
    let texto = '';
    for (let i = 0; i < nodos.length; i++) {
      if (nodos[i].nodeType !== 3) return null;
      texto += nodos[i].data;
    }
    return texto;
  }

  window.MutationObserver = class extends ObservadorNativo {
    constructor(callback) {
      // Conservar la validación del constructor nativo.
      if (typeof callback !== 'function') { super(callback); return; }
      super(function (registros, observador) {
        const cambios = registros.filter(registro => {
          if (registro.type !== 'childList') return true;
          const antes = textoReemplazado(registro.removedNodes);
          const despues = textoReemplazado(registro.addedNodes);
          return antes === null || despues === null || antes !== despues;
        });
        if (cambios.length) callback.call(observador, cambios, observador);
      });
    }
  };
}
