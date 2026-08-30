/**
 * Ficha de producto del template "Beauty & Skin Care" — modelo de datos.
 *
 * Mismo motor que Fitness y Tecnología (ver ../fichaComun.js): cuatro capas
 * de herencia, normalización defensiva y un adaptador único de datos. Lo que
 * cambia son las secciones — acá mandan los ingredientes, los resultados
 * antes/después y la rutina de uso.
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 *   content.ficha_beauty                  → defaults de la landing
 *   content.productos["<id>"].ficha_beauty → lo que ese producto pisa
 *   Producto.ficha_datos                   → lo cargado en Mis Productos
 *     (beauty_ingredientes, beauty_resultados, beauty_pasos), que sirve en
 *     todas las landings de ese producto sin recargarlo.
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

/** Orden de render y numeración — la misma de la guía de referencia. */
export const SECCIONES_BEAUTY = [
  { key: 'barra_superior', numero: 1,  label: 'Barra superior',        ambito: 'landing',  ayuda: 'Franja fija arriba: envío, garantía y pago seguro.' },
  { key: 'hero',           numero: 2,  label: 'Encabezado',            ambito: 'producto', ayuda: 'Título, promesa, beneficios clave y CTA principal.' },
  { key: 'prueba_social',  numero: 3,  label: 'Prueba social',         ambito: 'landing',  ayuda: 'Calificación, reseñas verificadas y clientas satisfechas.' },
  // La clave sigue siendo `precio` por compatibilidad con lo ya guardado;
  // el rótulo es lo que ve el comercio.
  { key: 'precio',         numero: 4,  label: 'Ofertas y opciones',    ambito: 'producto', ayuda: 'Los paquetes que cargaste en Ofertas, con su cintillo y la suscripción.' },
  { key: 'beneficios',     numero: 5,  label: 'Beneficios clave',      ambito: 'producto', ayuda: 'Beneficios con ícono y texto corto.' },
  { key: 'ingredientes',   numero: 6,  label: 'Ingredientes premium',  ambito: 'producto', ayuda: 'Ingrediente y qué le aporta a la piel. Se cargan en Mis Productos.' },
  { key: 'resultados',     numero: 7,  label: 'Resultados de clientas',ambito: 'producto', ayuda: 'Testimonios con foto de antes y después.' },
  { key: 'como_funciona',  numero: 8,  label: 'Cómo funciona',         ambito: 'producto', ayuda: 'La rutina paso a paso. Se carga en Mis Productos.' },
  { key: 'garantias',      numero: 9,  label: 'Garantías y confianza', ambito: 'landing',  ayuda: 'Devolución, testeo dermatológico, cruelty free.' },
  { key: 'faq',            numero: 10, label: 'Preguntas frecuentes',  ambito: 'producto', ayuda: 'Las preguntas se cargan en la pestaña "Detalles".' },
  { key: 'upsells',        numero: 11, label: 'Complementa tu rutina', ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'cta_final',      numero: 12, label: 'Cierre y urgencia',     ambito: 'landing',  ayuda: 'Último llamado a la acción con contador.' },
];

export const CLAVES_SECCIONES = SECCIONES_BEAUTY.map(s => s.key);

/**
 * Contenido inicial.
 *
 * ── La regla ───────────────────────────────────────────────────────────
 * Hay dos cosas distintas acá y conviene no mezclarlas:
 *
 *  - El TÍTULO de una sección es estructura, no contenido del comercio:
 *    es el rótulo que hace que la ficha se lea como la guía de referencia
 *    (los encabezados numerados 1..12). Lleva default siempre. Sin él el
 *    encabezado no se dibuja y la página pierde su forma.
 *  - El CONTENIDO (beneficios, ingredientes, testimonios, pasos) sale del
 *    PRODUCTO — de "Marketing & Embudo" y de `ficha_datos` en Mis
 *    Productos. Va vacío acá: inventarlo sería poner en la landing de un
 *    comercio afirmaciones sobre su producto que nadie escribió.
 *
 * Los textos que sí aparecen son indicadores de qué va en cada campo, y el
 * comercio los reescribe enteros.
 */
export const DEFAULTS_BEAUTY = {
  barra_superior: {
    activo: true,
    animado: true,
    velocidad: 28,
    separador: '✦',
    items: [
      { icono: 'truck',  texto: 'Envío gratis en todos los pedidos' },
      { icono: 'shield', texto: 'Garantía 60 días' },
      { icono: 'lock',   texto: 'Pago seguro SSL' },
    ],
    cta_texto: 'Comprar ahora',
  },

  hero: {
    activo: true,
    etiqueta: '',            // badge sobre la foto, ej. "Más vendido"
    eyebrow: '',             // vacío = la categoría del producto
    titulo: '',              // vacío = el nombre del producto
    subtitulo: '',           // la línea fina bajo el título
    lead: '',                // vacío = la descripción del producto
    caracteristicas: [],     // vacío = los beneficios del producto
    cta_texto: 'Comprar ahora — envío gratis',
    garantia_texto: 'Garantía 60 días o te devolvemos tu dinero',
  },

  prueba_social: {
    activo: false,
    etiqueta: 'Excelente',
    calificacion: 4.8,
    resenas_texto: '',
    clientes_texto: '',
    avatares: [],
  },

  precio: {
    activo: true,
    titulo: 'Elegí tu oferta especial',
    etiqueta_individual: '1 unidad',
    nota_pack: 'Compra única',
    cta_pack: 'Agregar al carrito',
    // { "<id de oferta>": { badge, subtitulo } }
    packs: {},
    suscripcion: { activo: false, titulo: '', detalle: '' },
    // La franja de tres sellos debajo de las tarjetas.
    confianza: [
      { icono: 'truck',  texto: 'Envío gratis a todo el país' },
      { icono: 'lock',   texto: 'Pagos seguros y protegidos' },
      { icono: 'rotate', texto: 'Garantía de devolución 60 días' },
    ],
  },

  beneficios: {
    activo: true,
    titulo: 'Beneficios que vas a amar',
    items: [],
  },

  ingredientes: {
    activo: true,
    titulo: 'Ingredientes premium que marcan la diferencia',
    items: [],   // [{icono, nombre, descripcion}] — de Mis Productos
  },

  resultados: {
    activo: true,
    titulo: 'Resultados reales de nuestras clientas',
    items: [],   // [{nombre, testimonio, calificacion, antes, despues}]
  },

  como_funciona: {
    activo: true,
    titulo: 'Cómo funciona',
    pasos: [],   // [{paso, titulo, descripcion}] — de Mis Productos
  },

  garantias: {
    activo: true,
    items: [
      { icono: 'badge',  titulo: 'Garantía 60 días',   texto: 'Devolución sin preguntas' },
      { icono: 'leaf',   titulo: 'Libre de crueldad',  texto: 'No testeado en animales' },
      { icono: 'shield', titulo: 'Dermatológicamente probado', texto: 'Probado y aprobado' },
      { icono: 'heart',  titulo: 'Ingredientes seguros', texto: 'Fórmula natural y efectiva' },
      { icono: 'lock',   titulo: 'Pago 100% seguro',   texto: 'Encriptación SSL' },
    ],
  },

  faq: {
    activo: true,
    titulo: 'Preguntas frecuentes',
  },

  upsells: {
    activo: true,
    titulo: 'Complementá tu rutina y potenciá resultados',
    cta_texto: 'Agregar',
  },

  cta_final: {
    activo: true,
    etiqueta: 'Oferta por tiempo limitado',
    titulo: 'No pierdas esta oferta especial',
    texto: 'El descuento se aplica automáticamente',
    cta_texto: 'Comprar ahora',
    cta_nota: 'Envío gratis',
    contador: { activo: true, horas: 2, minutos: 47, segundos: 39 },
  },
};

export const LIMITES = {
  barra_superior_items: 4,
  hero_caracteristicas: 6,
  prueba_social_avatares: 5,
  beneficios_items: 6,
  ingredientes_items: 6,
  resultados_items: 4,
  como_funciona_pasos: 4,
  garantias_items: 5,
  precio_confianza: 3,
};

const CONTADOR_DEFAULT = DEFAULTS_BEAUTY.cta_final.contador;

function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'barra_superior':
      return {
        ...base,
        items: lista(base.items, LIMITES.barra_superior_items),
        velocidad: numeroEntre(base.velocidad, 8, 120, 28),
      };
    case 'hero':
      return {
        ...base,
        caracteristicas: lista(base.caracteristicas, LIMITES.hero_caracteristicas)
          .filter(t => typeof t === 'string'),
      };
    case 'prueba_social':
      return {
        ...base,
        calificacion: numeroEntre(base.calificacion, 0, 5, 5),
        avatares: lista(base.avatares, LIMITES.prueba_social_avatares).filter(esObjeto),
      };
    case 'precio':
      return {
        ...base,
        packs: esObjeto(base.packs) ? base.packs : {},
        suscripcion: { ...DEFAULTS_BEAUTY.precio.suscripcion, ...(esObjeto(base.suscripcion) ? base.suscripcion : {}) },
        confianza: lista(base.confianza, LIMITES.precio_confianza).filter(esObjeto),
      };
    // En todas las listas de abajo se normaliza el TIPO, nunca el contenido:
    // filtrar acá lo que está a medio escribir hace desaparecer la fila que
    // el comercio acaba de agregar. Lo incompleto se descarta al dibujar.
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items).filter(esObjeto) };
    case 'ingredientes':
      return { ...base, items: lista(base.items, LIMITES.ingredientes_items).filter(esObjeto) };
    case 'resultados':
      return {
        ...base,
        items: lista(base.items, LIMITES.resultados_items).filter(esObjeto).map(x => ({
          ...x,
          calificacion: numeroEntre(x?.calificacion, 1, 5, 5),
        })),
      };
    case 'como_funciona':
      return { ...base, pasos: lista(base.pasos, LIMITES.como_funciona_pasos).filter(esObjeto) };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items).filter(esObjeto) };
    case 'cta_final':
      return { ...base, contador: { ...CONTADOR_DEFAULT, ...(esObjeto(base.contador) ? base.contador : {}) } };
    default:
      return base;
  }
}

/**
 * Los íconos de "Confianza (Garantías)" de Mis Productos se guardan con el
 * nombre del componente de lucide ("ShieldCheck"), no con la clave del
 * catálogo compartido ("shield"). Se traducen acá en vez de cambiar el
 * formulario: esos valores ya están guardados.
 */
const ICONO_CONFIANZA_A_CATALOGO = {
  ShieldCheck: 'shield',
  Truck: 'truck',
  RotateCcw: 'rotate',
  Headphones: 'headphones',
  CheckCircle2: 'badge',
  Star: 'star',
};

/**
 * Lo que la ficha arma sola con lo ya cargado EN EL PRODUCTO: la pestaña
 * "Marketing & Embudo" y `ficha_datos` del rubro Beauty (ingredientes,
 * resultados y pasos) que se carga en Mis Productos.
 *
 * Solo devuelve las claves con contenido real: una lista vacía no debe
 * pisar el default de la landing con nada.
 */
export function fichaBeautyDesdeProducto(producto) {
  if (!producto) return {};
  const ficha = {};
  const datos = esObjeto(producto.ficha_datos) ? producto.ficha_datos : {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const sobre = (producto.sobre_este_producto || '').trim();

  if (promesa || sobre || beneficios.length) {
    ficha.hero = {};
    // La propuesta de valor es el LEAD, no el título: el título es el
    // nombre del producto (o lo que el comercio escriba). Pisarlo con la
    // promesa dejaba la ficha sin decir qué producto es.
    if (promesa || sobre) ficha.hero.lead = promesa || sobre;
    // El diseño repite los beneficios como checklist del encabezado: es la
    // misma información, no se pide cargarla dos veces.
    if (beneficios.length) ficha.hero.caracteristicas = beneficios.map(b => b.titulo.trim());
  }

  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({
        icono: b.icono || 'sparkles',
        titulo: b.titulo.trim(),
        texto: (b.texto || '').trim(),
      })),
    };
  }

  if (confianza.length) {
    ficha.garantias = {
      items: confianza.map(c => ({
        icono: ICONO_CONFIANZA_A_CATALOGO[c.icono] || 'shield',
        titulo: c.texto.trim(),
        texto: '',
      })),
    };
  }

  // ── Propio del rubro Beauty (Producto.ficha_datos) ──────────────────
  const ingredientes = (datos.beauty_ingredientes || []).filter(i => i?.nombre?.trim());
  if (ingredientes.length) {
    ficha.ingredientes = {
      activo: true,
      items: ingredientes.map(i => ({
        icono: (i.icono || '').trim(),
        nombre: i.nombre.trim(),
        descripcion: (i.descripcion || '').trim(),
      })),
    };
  }

  const resultados = (datos.beauty_resultados || []).filter(x => x?.nombre?.trim() || x?.testimonio?.trim());
  if (resultados.length) {
    ficha.resultados = {
      activo: true,
      items: resultados.map(x => ({
        nombre: (x.nombre || '').trim(),
        testimonio: (x.testimonio || '').trim(),
        calificacion: numeroEntre(x.calificacion, 1, 5, 5),
        antes: (x.antes || '').trim(),
        despues: (x.despues || '').trim(),
      })),
    };
  }

  const pasos = (datos.beauty_pasos || []).filter(p => p?.titulo?.trim());
  if (pasos.length) {
    ficha.como_funciona = {
      activo: true,
      pasos: pasos.map((p, i) => ({
        paso: (p.paso || String(i + 1)).trim(),
        titulo: p.titulo.trim(),
        descripcion: (p.descripcion || '').trim(),
      })),
    };
  }

  return ficha;
}

export const resolverFichaBeauty = crearResolver({
  defaults: DEFAULTS_BEAUTY,
  claves: CLAVES_SECCIONES,
  normalizar: normalizarSeccion,
});

export function clonarSeccionResuelta(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_BEAUTY);
}

// Nombre anterior, mantenido para no romper importaciones existentes.
export const clonarFichaBeauty = clonarSeccionResuelta;
