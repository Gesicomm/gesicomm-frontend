/**
 * Ficha de producto del template "Electrónica & Tecnología" — modelo de datos.
 *
 * Mismo criterio que la ficha de Fitness (ver fitness/fichaFitness.js), con
 * OTRAS secciones: acá no hay ingredientes ni dosis, hay especificaciones
 * técnicas, "en la caja", variantes y una comparativa contra otras marcas.
 * Esa es justamente la razón de que un producto tenga rubro
 * (Producto.ficha_rubro): los campos a llenar no son los mismos.
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 *   content.ficha_tech               → defaults de la landing
 *   content.productos["<id>"].ficha_tech → lo que ese producto pisa acá
 *   Producto.ficha_datos             → lo cargado en Mis Productos (specs,
 *                                      en la caja, comparativa). Es del
 *                                      producto, así que sirve en todas
 *                                      sus landings sin recargarlo.
 *
 * ── De dónde sale cada sección ─────────────────────────────────────────
 * Cuatro capas, de menor a mayor prioridad (ver fichaComun.crearResolver):
 *   1. Defaults de fábrica            (DEFAULTS_TECH, acá abajo)
 *   2. Defaults de la landing         (content.ficha_tech)
 *   3. El PRODUCTO                    (Marketing & Embudo + ficha_datos)
 *   4. Ese producto en esta landing   (content.productos[id].ficha_tech)
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

/** Orden de render y numeración — la misma de la guía de referencia. */
export const SECCIONES_TECH = [
  { key: 'barra_superior',  numero: 1,  label: 'Barra superior',            ambito: 'landing',  ayuda: 'Franja fija arriba: envío, garantía, devoluciones y soporte.' },
  { key: 'hero',            numero: 2,  label: 'Encabezado',                ambito: 'producto', ayuda: 'Título, propuesta de valor, características clave y CTA principal.' },
  { key: 'prueba_social',   numero: 3,  label: 'Prueba social',             ambito: 'landing',  ayuda: 'Calificación con estrellas, reseñas y clientes satisfechos.' },
  { key: 'precio',          numero: 4,  label: 'Precio, oferta y contador', ambito: 'producto', ayuda: 'Precio, descuento, cuotas y contador de oferta limitada.' },
  { key: 'variantes',       numero: 5,  label: 'Variantes y opciones',      ambito: 'producto', ayuda: 'Color, versión o capacidad. Usa las variantes del producto.' },
  { key: 'beneficios',      numero: 6,  label: 'Beneficios clave',          ambito: 'producto', ayuda: 'Beneficios con ícono y texto corto.' },
  { key: 'especificaciones',numero: 7,  label: 'Especificaciones técnicas',  ambito: 'producto', ayuda: 'Tabla de specs y qué trae la caja. Se cargan en Mis Productos.' },
  { key: 'multimedia',      numero: 8,  label: 'Contenido visual',          ambito: 'producto', ayuda: 'Imágenes y videos adicionales del producto.' },
  { key: 'comparativa',     numero: 9,  label: 'Comparación',               ambito: 'producto', ayuda: 'Por qué es mejor que otras marcas.' },
  { key: 'resenas',         numero: 10, label: 'Reseñas y testimonios',     ambito: 'producto', ayuda: 'Opiniones reales de clientes.' },
  { key: 'faq',             numero: 11, label: 'Preguntas frecuentes',      ambito: 'producto', ayuda: 'Las preguntas se cargan en la pestaña "Detalles".' },
  { key: 'upsells',         numero: 12, label: 'Complementa tu compra',     ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'garantias',       numero: 13, label: 'Garantía y devoluciones',   ambito: 'landing',  ayuda: 'Garantía, devoluciones, envío, soporte y pago seguro.' },
  { key: 'cta_final',       numero: 14, label: 'Cierre y urgencia',         ambito: 'landing',  ayuda: 'Último llamado a la acción con contador.' },
];

export const CLAVES_SECCIONES = SECCIONES_TECH.map(s => s.key);

/**
 * Contenido inicial. Todo lo que aparece acá aparece también como campo
 * editable en el panel — no hay contenido que el comercio no pueda tocar.
 */
export const DEFAULTS_TECH = {
  barra_superior: {
    activo: true,
    // La cinta se desplaza de derecha a izquierda. Se puede apagar y queda
    // la barra centrada de siempre (ver BarraMarquee.jsx).
    animado: true,
    velocidad: 28,
    separador: '✦',
    items: [
      { icono: 'truck',  texto: 'Envío gratis en todos los pedidos' },
      { icono: 'shield', texto: 'Garantía 2 años' },
      { icono: 'rotate', texto: 'Devoluciones 30 días' },
      { icono: 'headphones', texto: 'Soporte 24/7' },
    ],
    cta_texto: 'Comprar ahora',
  },

  hero: {
    activo: true,
    eyebrow: '',            // vacío = la categoría del producto
    etiqueta: 'Nuevo',      // el badge sobre la foto
    titulo: '',             // vacío = el nombre del producto
    titulo_destacado: '',
    lead: '',               // vacío = la descripción del producto
    caracteristicas: [],
    cta_texto: 'Añadir al carrito',
    cta_secundario: 'Comprar ahora',
  },

  prueba_social: {
    activo: false,
    calificacion: 4.8,
    resenas_texto: '',
    clientes_texto: '',
  },

  precio: {
    activo: true,
    etiqueta: 'Oferta por tiempo limitado',
    // Las cuotas son un texto libre: el checkout no las procesa, es la
    // misma comunicación que hace cualquier tienda ("o 3 cuotas de X").
    cuotas_texto: '',
    contador: { activo: true, dias: 2, horas: 14, minutos: 37, segundos: 52 },
  },

  variantes: {
    activo: true,
    titulo: 'Elegí tu opción',
    // Las variantes reales salen del producto (ProductoVariante). Acá solo
    // se configura cómo se presentan.
    etiqueta_grupo: 'Versión',
  },

  beneficios: {
    activo: true,
    titulo: '',
    items: [],
  },

  especificaciones: {
    activo: true,
    titulo: 'Especificaciones técnicas',
    items: [],              // [{clave, valor}] — se cargan en Mis Productos
    caja_titulo: 'En la caja',
    en_la_caja: [],
  },

  multimedia: {
    activo: false,
    titulo: 'Contenido visual',
    items: [],              // [{titulo, imagen}]
  },

  comparativa: {
    activo: false,
    titulo: '¿Por qué elegirnos?',
    nosotros: 'Nuestro producto',
    otros: 'Otras marcas',
    items: [],              // [{caracteristica, nosotros: bool, otros: bool}]
  },

  resenas: {
    activo: false,
    titulo: 'Lo que dicen nuestros clientes',
    items: [],
  },

  faq: {
    activo: true,
    titulo: 'Preguntas frecuentes',
  },

  upsells: {
    activo: true,
    titulo: 'Complementá tu compra',
    cta_texto: 'Añadir',
  },

  garantias: {
    activo: true,
    items: [
      { icono: 'badge',      titulo: 'Garantía 2 años',     texto: 'Cobertura completa' },
      { icono: 'rotate',     titulo: 'Devoluciones 30 días', texto: 'Sin preguntas' },
      { icono: 'truck',      titulo: 'Envío gratis',         texto: 'En todos los pedidos' },
      { icono: 'headphones', titulo: 'Soporte 24/7',         texto: 'Siempre disponible' },
      { icono: 'lock',       titulo: 'Pago seguro',          texto: 'SSL encriptado' },
    ],
  },

  cta_final: {
    activo: true,
    etiqueta: '¡Oferta por tiempo limitado!',
    texto: 'No te pierdas esta oferta exclusiva',
    cta_texto: 'Comprar ahora',
    cta_nota: 'Envío gratis · Garantía 2 años',
    contador: { activo: true, dias: 2, horas: 14, minutos: 37, segundos: 52 },
  },
};

export const LIMITES = {
  barra_superior_items: 4,
  hero_caracteristicas: 6,
  beneficios_items: 6,
  especificaciones_items: 14,
  en_la_caja: 10,
  multimedia_items: 6,
  comparativa_items: 8,
  resenas_items: 9,
  garantias_items: 5,
};

const CONTADOR_DEFAULT = DEFAULTS_TECH.cta_final.contador;

function normalizarContador(valor) {
  return { ...CONTADOR_DEFAULT, ...(esObjeto(valor) ? valor : {}) };
}

/**
 * Deja cada sección con la forma que espera el renderer, pase lo que pase
 * en el JSON guardado: es contenido libre en una columna JSON y un guardado
 * viejo o una edición a mano pueden traer una clave con el tipo equivocado.
 * La landing no se puede romper por eso.
 */
function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'barra_superior':
      return {
        ...base,
        items: lista(base.items, LIMITES.barra_superior_items),
        // Fuera de rango no se lee o parece trabada; ver BarraMarquee.
        velocidad: numeroEntre(base.velocidad, 8, 120, 28),
      };
    case 'hero':
      return {
        ...base,
        caracteristicas: lista(base.caracteristicas, LIMITES.hero_caracteristicas).filter(t => typeof t === 'string'),
      };
    case 'prueba_social':
      return { ...base, calificacion: numeroEntre(base.calificacion, 0, 5, 5) };
    case 'precio':
      return { ...base, contador: normalizarContador(base.contador) };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items) };
    case 'especificaciones':
      return {
        ...base,
        items: lista(base.items, LIMITES.especificaciones_items).filter(i => esObjeto(i) && i.clave),
        en_la_caja: lista(base.en_la_caja, LIMITES.en_la_caja).filter(t => typeof t === 'string' && t.trim()),
      };
    case 'multimedia':
      return { ...base, items: lista(base.items, LIMITES.multimedia_items) };
    case 'comparativa':
      return {
        ...base,
        items: lista(base.items, LIMITES.comparativa_items).map(i => ({
          caracteristica: i?.caracteristica || '',
          // Por defecto: nosotros sí, los otros no. Es el sentido de la
          // sección; si fuera al revés no habría comparativa que mostrar.
          nosotros: i?.nosotros !== false,
          otros: i?.otros === true,
        })),
      };
    case 'resenas':
      return {
        ...base,
        items: lista(base.items, LIMITES.resenas_items).map(o => ({
          ...o,
          calificacion: numeroEntre(o?.calificacion, 1, 5, 5),
        })),
      };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items) };
    case 'cta_final':
      return { ...base, contador: normalizarContador(base.contador) };
    default:
      return base;
  }
}

/**
 * Los íconos de "Confianza (Garantías)" de Mis Productos se guardan con el
 * nombre del componente de lucide ("ShieldCheck"), no con la clave del
 * catálogo compartido ("shield"). Se traducen acá en vez de cambiar el
 * formulario: esos valores ya están guardados en producción.
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
 * Lo que la ficha arma sola con lo que ya está cargado EN EL PRODUCTO:
 * la pestaña "Marketing & Embudo" (propuesta_valor, beneficios, confianza)
 * y `ficha_datos` del rubro Tecnología (especificaciones, en la caja,
 * comparativa) que se carga en Mis Productos.
 *
 * Solo devuelve las claves que realmente tienen contenido: una lista vacía
 * no debe pisar el default de la landing con nada.
 */
export function fichaTechDesdeProducto(producto) {
  if (!producto) return {};
  const ficha = {};
  const datos = esObjeto(producto.ficha_datos) ? producto.ficha_datos : {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const sobre = (producto.sobre_este_producto || '').trim();

  if (promesa || sobre || beneficios.length) {
    ficha.hero = {};
    if (promesa || sobre) ficha.hero.lead = promesa || sobre;
    // El diseño repite los beneficios como lista de características del
    // encabezado — es la misma información, no se pide cargarla dos veces.
    if (beneficios.length) ficha.hero.caracteristicas = beneficios.map(b => b.titulo.trim());
  }

  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({
        icono: b.icono || null,
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

  // ── Propio del rubro Tecnología (Producto.ficha_datos) ──────────────
  const specs = (datos.especificaciones || []).filter(e => e?.clave?.trim());
  const caja = (datos.en_la_caja || []).filter(t => typeof t === 'string' && t.trim());
  if (specs.length || caja.length) {
    ficha.especificaciones = {};
    if (specs.length) {
      ficha.especificaciones.items = specs.map(e => ({
        clave: e.clave.trim(),
        valor: (e.valor || '').trim(),
      }));
    }
    if (caja.length) ficha.especificaciones.en_la_caja = caja.map(t => t.trim());
  }

  const comparativa = (datos.comparativa || []).filter(c => c?.caracteristica?.trim());
  if (comparativa.length) {
    ficha.comparativa = {
      items: comparativa.map(c => ({
        caracteristica: c.caracteristica.trim(),
        nosotros: c.nosotros !== false,
        otros: c.otros === true,
      })),
    };
  }

  return ficha;
}

/** Las cuatro capas, resueltas. */
export const resolverFichaTech = crearResolver({
  defaults: DEFAULTS_TECH,
  claves: CLAVES_SECCIONES,
  normalizar: normalizarSeccion,
});

export function clonarSeccionResuelta(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_TECH);
}
