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
    id: 'free',
    equivale: 'free',
    nombre: 'Free',
    precio: 0,
    resumen: 'Para empezar a vender y probar la plataforma sin costo.',
    destacado: false,
    etiqueta: '',
    cta: 'Tu plan actual',
    features: [
      'Catálogo público con tu subdominio de Gesicomm',
      '1 landing publicada',
      'Pedidos por WhatsApp',
      'Hasta 30 productos',
    ],
  },
  {
    id: 'pro',
    equivale: 'pago',
    nombre: 'Pro',
    precio: 250000,
    resumen: 'Para la tienda que ya vende todos los días y necesita medir.',
    destacado: true,
    etiqueta: 'El más elegido',
    cta: 'Pasar a Pro',
    features: [
      'Todo lo del plan Free',
      'Landings ilimitadas y embudos de venta',
      'Dominio propio con certificado',
      'Cobros online con pasarela',
      'Meta Pixel, CAPI, Google Analytics y TikTok',
      'Armador de combos con cálculo de rentabilidad',
    ],
  },
  {
    id: 'negocio',
    equivale: 'pago',
    nombre: 'Negocio',
    precio: 450000,
    resumen: 'Para operaciones con equipo, catálogo grande y automatizaciones.',
    destacado: false,
    etiqueta: '',
    cta: 'Pasar a Negocio',
    features: [
      'Todo lo del plan Pro',
      'Productos y pedidos sin límite',
      'Automatizaciones y canales de venta',
      'Vitrina B2B para revendedores',
      'Reportes avanzados de ventas',
      'Soporte prioritario',
    ],
  },
];

/** Campos que el editor del admin puede tocar, en el orden en que se muestran. */
export const CAMPOS_EDITABLES = [
  { campo: 'nombre', label: 'Nombre del plan', tipo: 'texto' },
  { campo: 'precio', label: 'Precio mensual (Gs)', tipo: 'numero' },
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
