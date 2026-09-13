/**
 * Catálogo de planes — fallback local para cuando /api/planes no responde.
 * La configuración publicada vive en el backend; estos valores solo permiten
 * renderizar la pantalla si el servidor no está disponible durante desarrollo.
 */

const STORAGE_KEY = 'gesicomm.planes.catalogo.v1';

export const PERIODICIDAD = 'por mes';

/** Placeholders — reemplazar por los planes reales. */
export const PLANES_DEFAULT = [
  {
    id: 'founders',
    codigo: 'founders',
    equivale: 'pago',
    moneda: 'USD',
    nombre: 'Miembros Fundadores',
    precio: 47,
    resumen: 'Oferta limitada para los primeros 300 clientes pagos en Paraguay, con precio fundador protegido mientras la suscripción permanezca activa.',
    destacado: true,
    activo: true,
    etiqueta: '300 cupos',
    cta: 'Ser Fundador',
    features: [
      'Precio Fundador protegido de USD 47/mes',
      'Acceso al ecosistema Gesicom y mejoras del nivel Fundador',
      'Onboarding, Academia, Biblioteca Operativa y comunidad privada',
      'Programa de Afiliados con 40% recurrente sobre suscripciones elegibles',
      '50% OFF para Gesicom Certified Partner',
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
    activo: false,
    etiqueta: 'Más elegido',
    cta: 'Activar Growth',
    features: [
      'Todo lo del plan Fundador',
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
    activo: false,
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

const ACTIVO_DEFAULT_POR_CODIGO = PLANES_DEFAULT.reduce((acc, plan) => ({
  ...acc,
  [plan.codigo]: plan.activo !== false,
}), {});

function normalizarPlanGuardado(plan) {
  const codigo = plan.codigo || plan.id;
  const activoDefault = ACTIVO_DEFAULT_POR_CODIGO[codigo];
  return {
    ...plan,
    codigo,
    activo: plan.activo !== undefined ? !!plan.activo : activoDefault !== false,
  };
}

/** Campos que el editor del admin puede tocar, en el orden en que se muestran. */
export const CAMPOS_EDITABLES = [
  { campo: 'nombre', label: 'Nombre del plan', tipo: 'texto' },
  { campo: 'precio', label: 'Precio mensual', tipo: 'numero' },
  { campo: 'moneda', label: 'Moneda', tipo: 'select', opciones: [
    { value: 'PYG', label: 'Guaraníes (PYG)' },
    { value: 'USD', label: 'Dólares (USD)' },
  ] },
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
    return parseado.map(normalizarPlanGuardado);
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

/** Borra la copia local cuando el catálogo ya quedó publicado en el servidor. */
export function limpiarPlanesLocales() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No bloquea el guardado real.
  }
}
