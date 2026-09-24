/**
 * Utilidades puras para resolver el selector de variantes tipo Shopify
 * (Opciones + Valores) contra el DTO público de un producto
 * (`item.opciones`, `item.variantes[].valoresOpcion`).
 *
 * Productos legacy (sin `item.opciones`, variantes con solo `nombre` de
 * texto libre) siguen funcionando: se arma un único grupo sintético con los
 * nombres de variante, igual que el selector plano de siempre.
 */

function normalizar(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * @returns {Array<{nombre: string, valores: string[]}>}
 */
export function agruparOpciones(item) {
  if (Array.isArray(item?.opciones) && item.opciones.length > 0) {
    return item.opciones
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map(o => ({ nombre: o.nombre, valores: o.valores || [] }));
  }

  const variantes = item?.variantes || [];
  if (variantes.length === 0) return [];

  // Legacy: una sola opción sintética con cada nombre de variante como valor.
  return [{
    nombre: item?.variantes_etiqueta || 'Variante',
    valores: variantes.map(v => v.nombre),
  }];
}

/**
 * Dado un objeto de selección `{ "Color": "Negro", "RAM": "16 GB" }`, busca
 * la variante de `item.variantes` cuyo set de valores coincide exactamente.
 * En modo legacy compara directo contra `variante.nombre`.
 */
export function resolverVariante(item, seleccion) {
  const variantes = item?.variantes || [];
  if (variantes.length === 0) return null;

  const esLegacy = !(Array.isArray(item?.opciones) && item.opciones.length > 0);
  const valoresSeleccionados = Object.entries(seleccion || {}).filter(([, v]) => v);

  if (esLegacy) {
    const [, valorUnico] = valoresSeleccionados[0] || [];
    if (!valorUnico) return null;
    return variantes.find(v => normalizar(v.nombre) === normalizar(valorUnico)) || null;
  }

  if (valoresSeleccionados.length === 0) return null;

  return variantes.find(v => {
    const propios = v.valoresOpcion || [];
    if (propios.length !== valoresSeleccionados.length) return false;
    return valoresSeleccionados.every(([opcion, valor]) =>
      propios.some(p => normalizar(p.opcion) === normalizar(opcion) && normalizar(p.valor) === normalizar(valor))
    );
  }) || null;
}

/**
 * Arma el objeto de selección `{ Color: "Negro", RAM: "16 GB" }` a partir de
 * una variante ya resuelta (ej: para preseleccionar la primera con stock).
 * En modo legacy usa el nombre de la variante contra el grupo sintético.
 */
export function seleccionDeVariante(item, variante) {
  if (!variante) return {};
  const esLegacy = !(Array.isArray(item?.opciones) && item.opciones.length > 0);
  if (esLegacy) {
    const [grupo] = agruparOpciones(item);
    return grupo ? { [grupo.nombre]: variante.nombre } : {};
  }
  return Object.fromEntries((variante.valoresOpcion || []).map(vo => [vo.opcion, vo.valor]));
}

/**
 * La variante que arranca elegida al abrir la ficha: la primera con stock,
 * o la primera a secas si están todas agotadas.
 */
export function seleccionInicial(item) {
  const variantes = item?.variantes || [];
  if (variantes.length === 0) return {};
  const conStock = variantes.find(v => v.stock == null || v.stock > 0);
  return seleccionDeVariante(item, conStock || variantes[0]);
}

/** `stock` null/undefined = no se controla (preview sin datos): no cuenta como agotada. */
export function varianteAgotada(variante) {
  return !!variante && variante.stock != null && variante.stock <= 0;
}

/**
 * Estado de un botón de valor dentro del selector:
 * - 'disponible': hay una variante con stock para esa combinación.
 * - 'agotado': la combinación existe pero sin stock. Se puede elegir igual
 *   (para ver su foto, como en Shopify); lo que se bloquea es la compra.
 * - 'inexistente': esa combinación nunca se cargó. Botón deshabilitado.
 */
export function estadoValor(item, opcionNombre, valor, seleccionActual) {
  if (valorDisponible(item, opcionNombre, valor, seleccionActual)) return 'disponible';

  const variantes = item?.variantes || [];
  const esLegacy = !(Array.isArray(item?.opciones) && item.opciones.length > 0);
  if (esLegacy) {
    return variantes.some(x => normalizar(x.nombre) === normalizar(valor)) ? 'agotado' : 'inexistente';
  }

  const combinacionDeseada = Object.entries({ ...seleccionActual, [opcionNombre]: valor })
    .filter(([, v]) => v);
  const existe = variantes.some(v => {
    const propios = v.valoresOpcion || [];
    return combinacionDeseada.every(([op, val]) =>
      propios.some(p => normalizar(p.opcion) === normalizar(op) && normalizar(p.valor) === normalizar(val))
    );
  });
  return existe ? 'agotado' : 'inexistente';
}

/**
 * Si hay alguna variante con stock que contenga `valor` de `opcionNombre`
 * junto con el resto de la selección actual. A propósito NO exige que la
 * selección esté completa (a diferencia de resolverVariante): sirve para
 * habilitar/deshabilitar botones durante una selección progresiva (elegir
 * Color antes que RAM), donde todavía puede faltar el resto de las
 * opciones. Deshabilita combinaciones que nunca existieron o sin stock.
 */
export function valorDisponible(item, opcionNombre, valor, seleccionActual) {
  const variantes = item?.variantes || [];
  if (variantes.length === 0) return false;

  const esLegacy = !(Array.isArray(item?.opciones) && item.opciones.length > 0);
  if (esLegacy) {
    const v = variantes.find(x => normalizar(x.nombre) === normalizar(valor));
    return !!v && (v.stock == null || v.stock > 0);
  }

  const combinacionDeseada = Object.entries({ ...seleccionActual, [opcionNombre]: valor })
    .filter(([, v]) => v);

  return variantes.some(v => {
    const propios = v.valoresOpcion || [];
    const cumple = combinacionDeseada.every(([op, val]) =>
      propios.some(p => normalizar(p.opcion) === normalizar(op) && normalizar(p.valor) === normalizar(val))
    );
    return cumple && (v.stock == null || v.stock > 0);
  });
}
