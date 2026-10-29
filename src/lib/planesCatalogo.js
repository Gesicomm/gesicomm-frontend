/**
 * Catálogo de planes — fallback local para cuando /api/planes no responde.
 * La configuración publicada vive en el backend; estos valores solo permiten
 * renderizar la pantalla si el servidor no está disponible durante desarrollo.
 */

const STORAGE_KEY = 'gesicomm.planes.catalogo.v1';

export const PERIODICIDAD = 'por mes';

/** Los cuatro planes comerciales. El servidor conserva los precios publicados. */
export const PLANES_DEFAULT = [
  ['una-ruta-mensual','Una ruta mensual','elegir','mensual',297000],
  ['una-ruta-anual','Una ruta anual','elegir','anual',2970000],
  ['ambas-rutas-mensual','Ambas rutas mensual','ambas','mensual',397000],
  ['ambas-rutas-anual','Ambas rutas anual','ambas','anual',3970000],
].map(([codigo,nombre,acceso_rutas,periodicidad,precio],index)=>({
  id:codigo,codigo,nombre,acceso_rutas,periodicidad,precio,moneda:'PYG',equivale:'pago',
  resumen:acceso_rutas==='elegir'?'Elegí Gestión de E-commerce o Marca personal.':'Gestión de E-commerce y Marca personal en una misma cuenta.',
  features:[acceso_rutas==='elegir'?'Una ruta a elección':'Las dos rutas incluidas','Tutoriales por sección','Soporte técnico por WhatsApp en horario laboral'],
  etiqueta:'',cta:'Contratar plan',destacado:codigo==='ambas-rutas-mensual',activo:true,orden:index+1,
}));

export function normalizarCatalogoPlanes(catalogo) {
  const planes=Array.isArray(catalogo)?catalogo:[];
  return PLANES_DEFAULT.map(base=>{
    const guardado=planes.find(plan=>(plan.codigo||plan.id)===base.codigo);
    return {...base,...guardado,id:base.codigo,codigo:base.codigo,nombre:base.nombre,
      acceso_rutas:base.acceso_rutas,periodicidad:base.periodicidad,equivale:'pago',
      features:Array.isArray(guardado?.features)?[...guardado.features]:[...base.features]};
  });
}

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
  { campo: 'precio', label: 'Precio del plan', tipo: 'numero' },
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
    if (!crudo) return normalizarCatalogoPlanes([]);
    const parseado = JSON.parse(crudo);
    if (!Array.isArray(parseado) || !parseado.length || !parseado.every(esPlanValido)) {
      return normalizarCatalogoPlanes([]);
    }
    return normalizarCatalogoPlanes(parseado.map(normalizarPlanGuardado));
  } catch {
    // localStorage puede fallar entero (modo privado, cookies bloqueadas).
    return normalizarCatalogoPlanes([]);
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
  return normalizarCatalogoPlanes([]);
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
