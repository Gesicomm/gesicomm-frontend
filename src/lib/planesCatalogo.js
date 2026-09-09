/**
 * Catálogo de planes — mismo patrón que pages/landing/landingTemplates.js:
 * los planes viven en el frontend, no hay tabla ni endpoint detrás.
 *
 * ⚠️ PROVISIONAL. Dos cosas que hay que saber antes de tocar esto:
 *
 * 1. Los precios y las features de PLANES_DEFAULT son **placeholders**.
 *    Nadie los validó comercialmente — están para poder maquetar y decidir
 *    el contenido real. Reemplazalos antes de mostrar esto a un cliente.
 *
 * 2. Lo que el admin edita se guarda en localStorage, así que vive solo en
 *    SU navegador: no lo ve ningún otro usuario ni sobrevive a un cambio de
 *    equipo. Cuando exista el endpoint, `cargarPlanes`/`guardarPlanes` son
 *    los dos únicos puntos que hay que reemplazar por llamadas al backend;
 *    el resto de las pantallas no se entera.
 *
 * El `plan` real de la cuenta sigue siendo el de siempre: Usuario.plan, que
 * el backend solo acepta como 'free' | 'pago' (PLANES_VALIDOS en
 * tienda.service.js). Por eso cada plan del catálogo declara `equivale`:
 * a cuál de esos dos estados corresponde. Contratar todavía no cambia nada
 * — no hay pasarela de suscripciones.
 */

const STORAGE_KEY = 'gesicomm.planes.catalogo.v1';

export const PERIODICIDAD = 'por mes';

/** Placeholders — reemplazar por los planes reales. */
export const PLANES_DEFAULT = [
  {
    id: 'starter',
    codigo: 'starter',
    equivale: 'pago',
    moneda: 'USD',
    nombre: 'Starter',
    precio: 47,
    resumen: 'Para activar tu primera tienda online con catálogo, landing y pedidos desde el primer día.',
    destacado: true,
    etiqueta: 'Para empezar',
    cta: 'Activar Starter',
    features: [
      'Tienda y catálogo online',
      'Landing con ficha seleccionable',
      'Selección de productos desde Gesicomm',
      'Pedidos y contactos desde el panel',
    ],
  },
  {
    id: 'growth',
    codigo: 'growth',
    equivale: 'pago',
    moneda: 'USD',
    nombre: 'Growth',
    precio: 97,
    resumen: 'Para tiendas que quieren más landings, más medición y una operación comercial más completa.',
    destacado: false,
    etiqueta: 'Más elegido',
    cta: 'Activar Growth',
    features: [
      'Todo lo del plan Starter',
      'Landings y embudos adicionales',
      'Configuración avanzada de productos',
      'Analítica comercial y píxeles',
    ],
  },
  {
    id: 'scale',
    codigo: 'scale',
    equivale: 'pago',
    moneda: 'USD',
    nombre: 'Scale',
    precio: 197,
    resumen: 'Para operaciones con catálogo grande, equipo y automatización comercial.',
    destacado: false,
    etiqueta: '',
    cta: 'Activar Scale',
    features: [
      'Todo lo del plan Growth',
      'Productos y pedidos sin límite operativo',
      'Automatizaciones y canales de venta',
      'Soporte prioritario',
    ],
  },
];

/** Campos que el editor del admin puede tocar, en el orden en que se muestran. */
export const CAMPOS_EDITABLES = [
  { campo: 'nombre', label: 'Nombre del plan', tipo: 'texto' },
  { campo: 'precio', label: 'Precio mensual', tipo: 'numero' },
  { campo: 'etiqueta', label: 'Etiqueta', tipo: 'texto', ayuda: 'Cinta sobre la tarjeta. Vacío = sin cinta.' },
  { campo: 'resumen', label: 'Resumen', tipo: 'area' },
  { campo: 'cta', label: 'Texto del botón', tipo: 'texto' },
];

function esPlanValido(p) {
  return p
    && typeof p === 'object'
    && typeof p.id === 'string'
    && typeof p.nombre === 'string'
    && Array.isArray(p.features);
}

/**
 * Planes a mostrar. Si el admin guardó una versión propia se usa esa; si no
 * (o si lo guardado quedó corrupto), el catálogo por defecto.
 */
export function cargarPlanes() {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return PLANES_DEFAULT;
    const parseado = JSON.parse(crudo);
    if (!Array.isArray(parseado) || !parseado.length || !parseado.every(esPlanValido)) {
      return PLANES_DEFAULT;
    }
    return parseado;
  } catch {
    // localStorage puede fallar entero (modo privado, cookies bloqueadas).
    return PLANES_DEFAULT;
  }
}

/** @returns {boolean} si se pudo persistir. */
export function guardarPlanes(planes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planes));
    return true;
  } catch {
    return false;
  }
}

/** Vuelve al catálogo por defecto y borra lo guardado. */
export function restablecerPlanes() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que hacer: igual se devuelve el default
  }
  return PLANES_DEFAULT;
}

/** ¿Hay una versión editada por el admin pisando el catálogo por defecto? */
export function hayPersonalizacion() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
