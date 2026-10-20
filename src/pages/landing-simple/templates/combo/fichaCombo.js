import { NOMBRES_BLOQUES_FICHA } from '../../nombresBloquesFicha';
/**
 * Ficha de producto del "Combo" — modelo de datos.
 *
 * Mismo motor que Básico/Fitness/Tecnología/Beauty (ver ../fichaComun.js):
 * cuatro capas de herencia, normalización defensiva y un adaptador único de
 * datos. Lo que cambia son las secciones: un combo no es un producto con
 * rubro, es un bundle de varios productos, así que en vez de
 * ingredientes/especificaciones tiene "Qué incluye", "Valor del combo" y
 * "Detalle de cada producto" — todas armadas con los productos reales que
 * componen el combo (ver landing.service.js, campo `productos_combo`).
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 *   content.ficha_combo                    → defaults de la landing
 *   content.combos["<id>"].ficha_combo     → lo que ese combo pisa
 *   ProductoCombo (Vista del combo)        → propuesta de valor,
 *                                            beneficios y confianza
 *
 * ── La regla de los defaults ───────────────────────────────────────────
 * El TÍTULO de una sección es estructura y lleva default siempre. El
 * CONTENIDO sale del combo y va vacío acá: inventarlo sería poner en la
 * landing de un comercio afirmaciones sobre su combo que nadie escribió.
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

/** Orden de render y numeración — sigue el orden pedido para la landing de combo. */
export const SECCIONES_COMBO = [
  { key: 'barra_superior',     numero: 1, label: 'Barra superior',           ambito: 'landing',  ayuda: 'Franja fija arriba: envío, garantía y pago seguro.' },
  { key: 'hero',                numero: 2, label: 'Encabezado',               ambito: 'producto', ayuda: 'Título, promesa, puntos clave y botón principal del combo.' },
  { key: 'incluye',             numero: 3, label: '¿Qué incluye?',            ambito: 'producto', ayuda: 'Grilla con los productos del combo (se arma sola).' },
  { key: 'valor',                numero: 4, label: 'Valor del combo',         ambito: 'producto', ayuda: 'Precio por separado vs. precio del combo (se arma sola).' },
  { key: 'beneficio_principal', numero: 5, label: '¿Por qué este combo?',     ambito: 'producto', ayuda: 'El beneficio principal, con bullets cortos.' },
  { key: 'prueba_social',       numero: 7, label: NOMBRES_BLOQUES_FICHA.opiniones,         ambito: 'landing',  ayuda: 'Calificación y reseñas de clientes.' },
  { key: 'confianza',           numero: 8, label: NOMBRES_BLOQUES_FICHA.confianza,     ambito: 'landing',  ayuda: 'Envío, pago seguro, garantía y soporte.' },
  { key: 'faq',                  numero: 9, label: 'Preguntas frecuentes',    ambito: 'producto', ayuda: 'Las preguntas se cargan en "Vista del combo".' },
];

export const CLAVES_SECCIONES = SECCIONES_COMBO.map(s => s.key);

export const DEFAULTS_COMBO = {
  barra_superior: {
    activo: true,
    animado: true,
    velocidad: 28,
    separador: '·',
    items: [],
    cta_texto: 'Comprar ahora',
  },

  hero: {
    activo: true,
    etiqueta_oferta: '',
    contador: { activo: false, horas: 2, minutos: 45, segundos: 57 },
    eyebrow: '',              // vacío = la categoría del combo
    titulo: '',                // vacío = el nombre del combo
    titulo_destacado: '',
    lead: '',                  // vacío = la propuesta de valor / descripción del combo
    etiqueta: '',
    caracteristicas: [],
    rating_activo: false,
    rating_valor: 4.8,
    cta_texto: 'Comprar ahora',
    nota_stock: '',
    nota_envio: '',
    nota_garantia: '',
    rotulo_combo: 'Combo armado',
    rotulo_precio: 'Hoy llevás el combo por',
    rotulo_precio_anterior: 'Valor por separado',
  },

  incluye: {
    activo: true,
    eyebrow: 'Todo lo que recibís',
    titulo: '¿Qué incluye?',
    subtitulo: '',
  },

  valor: {
    activo: true,
    eyebrow: 'Más valor en un solo combo',
    encabezado: 'El valor del combo',
    rotulo_total: 'Valor por separado',
    cta_texto: 'Quiero este combo',
    titulo: 'Precio por separado',
    titulo_combo: 'Precio combo',
    nota_ahorro: '',
  },

  beneficio_principal: {
    activo: true,
    eyebrow: 'Elegidos para complementarse',
    titulo: '¿Por qué este combo?',
    texto: '',
    // [{icono, titulo, texto}] — se pisa con lo cargado en Vista del combo
    // (beneficios) en cuanto el comercio carga alguno.
    items: [],
  },

  detalle_productos: {
    activo: true,
    eyebrow: 'Detalles de tu compra',
    titulo: 'Conocé lo que recibís',
  },

  prueba_social: {
    activo: false,
    eyebrow: 'Experiencias reales',
    rotulo_verificada: 'Compra verificada',
    titulo: 'Opiniones reales',
    calificacion: 4.8,
    testimonios: [],  // [{nombre, comentario, calificacion}]
  },

  confianza: {
    activo: true,
    eyebrow: 'Comprá tranquilo',
    titulo: 'Comprá con confianza',
    items: [],
  },

  faq: {
    activo: true,
    eyebrow: 'Resolvemos tus dudas',
    titulo: 'Preguntas frecuentes',
  },

  cta_final: {
    activo: true,
    etiqueta: '',
    titulo: '',       // vacío = el nombre del combo
    cta_texto: 'Comprar ahora',
    contador: { activo: false, horas: 2, minutos: 45, segundos: 57 },
  },
};

export const LIMITES = {
  barra_superior_items: 4,
  hero_caracteristicas: 6,
  beneficio_principal_items: 6,
  prueba_social_testimonios: 6,
  confianza_items: 6,
};

const CONTADOR_DEFAULT_HERO = DEFAULTS_COMBO.hero.contador;
const CONTADOR_DEFAULT_CIERRE = DEFAULTS_COMBO.cta_final.contador;

/**
 * Deja cada sección con la forma que espera el renderer. Se normaliza el
 * TIPO, nunca el contenido.
 */
function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'barra_superior':
      return {
        ...base,
        items: lista(base.items, LIMITES.barra_superior_items).filter(esObjeto),
        velocidad: numeroEntre(base.velocidad, 8, 120, 28),
      };
    case 'hero':
      return {
        ...base,
        rating_valor: numeroEntre(base.rating_valor, 0, 5, 5),
        caracteristicas: lista(base.caracteristicas, LIMITES.hero_caracteristicas)
          .map(x => String(x || '')),
        contador: { ...CONTADOR_DEFAULT_HERO, ...(esObjeto(base.contador) ? base.contador : {}) },
      };
    case 'beneficio_principal':
      return { ...base, items: lista(base.items, LIMITES.beneficio_principal_items).filter(esObjeto) };
    case 'prueba_social':
      return {
        ...base,
        calificacion: numeroEntre(base.calificacion, 0, 5, 5),
        testimonios: lista(base.testimonios, LIMITES.prueba_social_testimonios).filter(esObjeto),
      };
    case 'confianza':
      return { ...base, items: lista(base.items, LIMITES.confianza_items).filter(esObjeto) };
    case 'cta_final':
      return { ...base, contador: { ...CONTADOR_DEFAULT_CIERRE, ...(esObjeto(base.contador) ? base.contador : {}) } };
    default:
      return base;
  }
}

/**
 * Lo que la ficha arma sola con lo ya cargado EN EL COMBO, en la pestaña
 * "Vista del combo" (ComboEditor.jsx). Solo devuelve claves con contenido
 * real: una lista vacía no debe pisar el default de la landing con nada.
 */
export function fichaComboDesdeProducto(combo) {
  if (!combo) return {};
  const ficha = esObjeto(combo.ficha_datos) ? { ...combo.ficha_datos } : {};

  // El valor heredado se carga en el campo. Un string vacío escrito por el
  // comercio es una eliminación, nunca una señal para recuperar el original.
  ficha.hero = {
    titulo: combo.nombre || '',
    eyebrow: typeof combo.categoria === 'string' ? combo.categoria : combo.categoria?.nombre || '',
    lead: combo.propuesta_valor || combo.descripcion_larga || combo.descripcion || '',
    ...(esObjeto(ficha.hero) ? ficha.hero : {}),
  };
  const preguntas = combo.faq ?? combo.preguntas_frecuentes;
  ficha.faq = { ...(preguntas?.length ? { items: preguntas } : {}),
    ...(combo.faq_titulo != null ? { titulo: combo.faq_titulo } : {}), ...ficha.faq };

  const beneficios = (combo.beneficios || []).filter(b => b?.titulo?.trim());
  if (beneficios.length && !ficha.beneficio_principal?.items?.length) {
    ficha.beneficio_principal = {
      ...(esObjeto(ficha.beneficio_principal) ? ficha.beneficio_principal : {}),
      items: beneficios.map(b => ({ icono: b.icono || 'star', titulo: b.titulo.trim(), texto: (b.texto || '').trim() })),
    };
  }

  const confianza = (combo.confianza || []).filter(c => c?.texto?.trim() || c?.titulo?.trim());
  if (confianza.length && !ficha.confianza?.items?.length) {
    ficha.confianza = {
      ...(esObjeto(ficha.confianza) ? ficha.confianza : {}),
      items: confianza.map(c => ({ icono: mapearIconoConfianza(c.icono), titulo: (c.titulo || c.texto).trim(), texto: c.titulo ? (c.texto || '').trim() : '' })),
    };
  }

  return ficha;
}

/**
 * Los íconos de "Confianza" en Mis Productos/Vista del combo se guardan con
 * el nombre del componente de lucide ("ShieldCheck"), no con la clave del
 * catálogo compartido ("shield") que usa el renderer de la ficha.
 */
const ICONO_CONFIANZA_A_CATALOGO = {
  ShieldCheck: 'shield',
  Truck: 'truck',
  RotateCcw: 'rotate',
  Headphones: 'headphones',
  CheckCircle2: 'badge',
  Star: 'star',
};
function mapearIconoConfianza(icono) {
  return ICONO_CONFIANZA_A_CATALOGO[icono] || String(icono || '').trim();
}

export const resolverFichaCombo = crearResolver({
  defaults: DEFAULTS_COMBO,
  claves: CLAVES_SECCIONES,
  normalizar: normalizarSeccion,
});

export function clonarSeccionResuelta(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_COMBO);
}
