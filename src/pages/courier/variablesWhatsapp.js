/**
 * Resolución de variables para la VISTA PREVIA del editor de flujos.
 *
 * Espeja a propósito, carácter por carácter, el reemplazo que hace
 * `services/seguimiento/plantillaResolver.service.js` en el backend:
 * primero `{{variable}}` y después `{variable}`, y una variable desconocida
 * se deja tal cual en vez de romper el mensaje.
 *
 * El catálogo (qué variables existen, su descripción, su grupo y su valor de
 * ejemplo) NO se define acá: llega del backend por GET /seguimiento/variables.
 * Así la previsualización no puede mostrar un formato distinto al del mensaje
 * que de verdad se manda, ni ofrecer una variable que el resolver no conoce
 * (eso ya pasó una vez con {courier_nombre}).
 */

/** Las mismas dos pasadas que hace el backend, en el mismo orden. */
export function resolverConEjemplos(mensaje, variables) {
  const porClave = new Map((variables || []).map((v) => [v.key, v.ejemplo ?? '']));
  const reemplazar = (match, clave) => (porClave.has(clave) ? String(porClave.get(clave)) : match);
  return String(mensaje || '')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, reemplazar)
    .replace(/\{\s*(\w+)\s*\}/g, reemplazar);
}

/**
 * Parte el mensaje en texto y variables, para poder pintar las variables
 * distinto del texto normal sin tocar lo que se guarda.
 *
 * Cada tramo es { tipo: 'texto' | 'variable', valor, clave?, conocida? }.
 * `conocida: false` marca una variable que el resolver NO va a reemplazar:
 * el usuario necesita verlo ANTES de mandarle a un cliente un mensaje que
 * diga "Hola {cliente_nombe}".
 */
export function partirMensaje(mensaje, variables) {
  const claves = new Set((variables || []).map((v) => v.key));
  const texto = String(mensaje || '');
  const patron = /\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g;
  const tramos = [];
  let ultimo = 0;
  let m;

  while ((m = patron.exec(texto)) !== null) {
    if (m.index > ultimo) {
      tramos.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) });
    }
    const clave = m[1] ?? m[2];
    tramos.push({ tipo: 'variable', valor: m[0], clave, conocida: claves.has(clave) });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) {
    tramos.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  }
  return tramos;
}

/** Las variables mal escritas del mensaje, para avisar en el editor. */
export function variablesDesconocidas(mensaje, variables) {
  return [...new Set(
    partirMensaje(mensaje, variables)
      .filter((t) => t.tipo === 'variable' && !t.conocida)
      .map((t) => t.clave),
  )];
}

/** Agrupa el catálogo para el selector de variables, respetando el orden que llegó. */
export function agruparVariables(variables) {
  const grupos = [];
  for (const v of variables || []) {
    const nombre = v.grupo || 'Otros';
    let grupo = grupos.find((g) => g.nombre === nombre);
    if (!grupo) {
      grupo = { nombre, variables: [] };
      grupos.push(grupo);
    }
    grupo.variables.push(v);
  }
  return grupos;
}

/** Nombres sugeridos por posición: el número ya comunica el orden. */
export const NOMBRES_SUGERIDOS = [
  'Primer contacto',
  'Recordatorio',
  'Segundo intento',
  'Último intento',
];

export function nombreSugerido(indice) {
  return NOMBRES_SUGERIDOS[indice] || `Seguimiento ${indice + 1}`;
}

const UNIDADES = [
  { key: 'minutos', singular: 'minuto', plural: 'minutos', factor: 1 },
  { key: 'horas', singular: 'hora', plural: 'horas', factor: 60 },
  { key: 'dias', singular: 'día', plural: 'días', factor: 1440 },
];

export { UNIDADES };

/** Minutos → { valor, unidad }, eligiendo la unidad más legible. */
export function desarmarEspera(minutos) {
  const m = Number(minutos) || 0;
  if (m === 0) return { valor: 0, unidad: 'horas' };
  if (m % 1440 === 0) return { valor: m / 1440, unidad: 'dias' };
  if (m % 60 === 0) return { valor: m / 60, unidad: 'horas' };
  return { valor: m, unidad: 'minutos' };
}

/** "4 horas", "1 día", "inmediata". */
export function formatEspera(minutos) {
  const m = Number(minutos) || 0;
  if (m === 0) return 'inmediata';
  const { valor, unidad } = desarmarEspera(m);
  const u = UNIDADES.find((x) => x.key === unidad) || UNIDADES[0];
  return `${valor} ${valor === 1 ? u.singular : u.plural}`;
}

/** Hora simulada para la burbuja del preview, en formato 24 h como WhatsApp. */
export function horaSimulada() {
  return new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
}
