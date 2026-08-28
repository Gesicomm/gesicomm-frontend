/**
 * Motor compartido de las fichas de producto de los templates rígidos.
 *
 * Cada template rígido tiene su propia página de producto (estructura y
 * diseño propios), pero todas resuelven su contenido igual: cuatro capas
 * de herencia, normalización defensiva de lo que venga guardado en JSON, y
 * un único adaptador que traduce los datos del editor y los de la landing
 * publicada a la misma forma. Eso vive acá, una sola vez.
 *
 * Lo que NO vive acá: qué secciones tiene cada ficha y cómo se dibujan.
 * Eso es propio de cada template (ver tech/fichaTech.js).
 *
 * NOTA: fitness/fichaFitness.js todavía tiene su propia copia de estos
 * helpers — es anterior a este archivo y ya está validado en producción,
 * así que no se tocó. Cuando haya que modificarlo, conviene hacerle usar
 * este módulo y borrar la copia.
 */

export function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Array recortado al máximo permitido. Cualquier cosa que no sea array → []. */
export function lista(valor, max) {
  if (!Array.isArray(valor)) return [];
  return max ? valor.slice(0, max) : valor;
}

export function numeroEntre(valor, min, max, porDefecto) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, n));
}

/**
 * ¿Esta sección la escribió el comercio para este producto en esta landing,
 * o la hereda? `undefined` = heredada; un objeto = propia.
 */
export function seccionEsPropia(fichaProducto, key) {
  return esObjeto(fichaProducto) && esObjeto(fichaProducto[key]);
}

/**
 * De dónde viene lo que se está viendo en una sección. Solo informativo:
 * el panel lo muestra como etiqueta, no cambia el render.
 * @returns {'landing-producto'|'producto'|'landing'|'fabrica'}
 */
export function fuenteDeSeccion(key, { fichaProducto, fichaLanding, fichaDelProducto }) {
  if (seccionEsPropia(fichaProducto, key)) return 'landing-producto';
  if (esObjeto(fichaDelProducto) && esObjeto(fichaDelProducto[key])) return 'producto';
  if (esObjeto(fichaLanding) && esObjeto(fichaLanding[key])) return 'landing';
  return 'fabrica';
}

export const ETIQUETA_FUENTE = {
  'landing-producto': 'Escrito para este producto acá',
  'producto': 'Tomado de la ficha del producto',
  'landing': 'Heredado de la landing',
  'fabrica': 'Texto sugerido — todavía sin cargar',
};

/**
 * Arma el resolvedor de una ficha concreta.
 *
 * Las cuatro capas, de menor a mayor prioridad:
 *   1. defaults de fábrica
 *   2. defaults de la landing (content.ficha_<template>)
 *   3. datos del PRODUCTO (marketing + ficha_datos de Mis Productos)
 *   4. lo escrito para ese producto EN esa landing
 *
 * @param {object} defaults  DEFAULTS_* del template
 * @param {string[]} claves  orden de secciones
 * @param {(key: string, seccion: object) => object} normalizar
 */
export function crearResolver({ defaults, claves, normalizar }) {
  return function resolver(fichaProducto, fichaLanding, fichaDelProducto) {
    const capa = (fuente, key) => (esObjeto(fuente) && esObjeto(fuente[key]) ? fuente[key] : null);
    const resultado = {};
    for (const key of claves) {
      resultado[key] = normalizar(key, {
        ...defaults[key],
        ...capa(fichaLanding, key),
        ...capa(fichaDelProducto, key),
        ...capa(fichaProducto, key),
      });
    }
    return resultado;
  };
}

/** Copia lista para editar de la sección ya resuelta — el "Personalizar" del panel. */
export function clonarSeccionResuelta(fichaResuelta, key, defaults) {
  return JSON.parse(JSON.stringify(fichaResuelta[key] ?? defaults[key]));
}

/**
 * Ahorro de un paquete contra lo que costarían esas unidades sueltas.
 * Informativo, nunca impone el precio. null si no se puede calcular o si el
 * paquete no ahorra nada (no se inventa un "-0%").
 */
export function ahorroDePack(pack, precioUnitario) {
  const unidades = Number(pack?.unidades) || 0;
  const unitario = Number(precioUnitario) || 0;
  const precioPack = Number(pack?.precio_efectivo ?? pack?.precio) || 0;
  if (unidades < 2 || unitario <= 0 || precioPack <= 0) return null;
  const pct = Math.round((1 - precioPack / (unitario * unidades)) * 100);
  return pct > 0 ? pct : null;
}

/** Precio por unidad de un paquete. */
export function precioUnitarioDePack(pack) {
  const unidades = Math.max(1, Number(pack?.unidades) || 1);
  const total = Number(pack?.precio_efectivo ?? pack?.precio) || 0;
  return total / unidades;
}

/** "María González" → "MG". Dato derivado del nombre, no se pide en el panel. */
export function inicialesDe(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Adaptador único de datos de la ficha.
 *
 * La razón de que exista: el preview del editor y la landing publicada
 * llegan con dos formas de datos distintas. Si cada lado dibujara con su
 * propio componente se desincronizan (ya pasó). Los dos pasan por acá y de
 * acá sale UNA forma que el renderer del template sabe dibujar.
 */
export function armarItemFicha({
  nombre,
  categoria = null,
  descripcion = '',
  precio = null,
  precioAntes = null,
  imagenes = [],
  ofertas = [],
  variantes = [],
  faq = [],
  faqTitulo = '',
  relacionados = [],
  relacionadosTitulo = '',
}) {
  const precioNum = precio == null ? null : Number(precio);
  const anteriorNum = precioAntes == null ? null : Number(precioAntes);
  const hayDescuento = precioNum != null && anteriorNum != null && anteriorNum > precioNum;

  return {
    nombre: nombre || '',
    categoria,
    descripcion: descripcion || '',
    precio: precioNum,
    precioAntes: hayDescuento ? anteriorNum : null,
    descuentoPct: hayDescuento ? Math.round((1 - precioNum / anteriorNum) * 100) : 0,
    ahorroAbsoluto: hayDescuento ? anteriorNum - precioNum : 0,
    imagenes: (imagenes || []).filter(Boolean),
    // Solo paquetes del mismo producto. Los order bump son otra cosa y se
    // ofrecen dentro del checkout, no en la ficha.
    packs: (ofertas || []).filter(o => o.estrategia === 'normal' && o.tipo_contenido !== 'combo'),
    variantes: variantes || [],
    faq: (faq || []).filter(f => f?.pregunta),
    faqTitulo: faqTitulo || '',
    relacionados: relacionados || [],
    relacionadosTitulo: relacionadosTitulo || '',
  };
}
