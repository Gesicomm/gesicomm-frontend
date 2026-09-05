/**
 * Ficha de producto del template "Básico" — modelo de datos.
 *
 * Mismo motor que Fitness, Tecnología y Beauty (ver ../fichaComun.js):
 * cuatro capas de herencia, normalización defensiva y un adaptador único de
 * datos. Lo que cambia son las secciones: esta ficha no asume rubro, así que
 * en vez de ingredientes o especificaciones tiene descripción, usos y
 * comparación — cosas que sirven para cualquier producto.
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 *   content.ficha_basico                    → defaults de la landing
 *   content.productos["<id>"].ficha_basico  → lo que ese producto pisa
 *   Producto (Vista del producto)           → propuesta de valor,
 *                                             CTA, beneficios rápidos,
 *                                             beneficios y confianza
 *
 * ── La regla de los defaults ───────────────────────────────────────────
 * El TÍTULO de una sección es estructura (el rótulo numerado que le da
 * forma a la página) y lleva default siempre. El CONTENIDO sale del
 * producto y va vacío acá: inventarlo sería poner en la landing de un
 * comercio afirmaciones sobre su producto que nadie escribió.
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

/** Orden de render y numeración. */
export const SECCIONES_BASICO = [
  { key: 'barra_superior', numero: 1,  label: 'Barra superior',        ambito: 'landing',  ayuda: 'Franja fija arriba: envío, garantía y pago seguro.' },
  { key: 'hero',           numero: 2,  label: 'Encabezado',            ambito: 'producto', ayuda: 'Título, promesa, puntos clave y botón principal.' },
  { key: 'precio',         numero: 3,  label: 'Oferta y precio',       ambito: 'producto', ayuda: 'Precio, descuento y texto de urgencia.' },
  { key: 'opciones',       numero: 4,  label: 'Opciones de compra',    ambito: 'producto', ayuda: 'Los paquetes que cargaste en "Ofertas", con su cintillo.' },
  { key: 'beneficios',     numero: 5,  label: 'Beneficios clave',      ambito: 'producto', ayuda: 'Beneficios con ícono y texto corto.' },
  { key: 'descripcion',    numero: 6,  label: 'Descripción',           ambito: 'producto', ayuda: 'El texto largo del producto y sus puntos destacados.' },
  { key: 'usos',           numero: 7,  label: 'Usos y aplicaciones',   ambito: 'producto', ayuda: 'Los pasos de uso, en orden.' },
  { key: 'prueba_social',  numero: 8,  label: 'Prueba social',         ambito: 'landing',  ayuda: 'Calificación, reseñas y clientes satisfechos.' },
  { key: 'comparacion',    numero: 9,  label: 'Comparación',           ambito: 'producto', ayuda: 'Por qué elegir este producto frente a otras opciones.' },
  { key: 'faq',            numero: 10, label: 'Preguntas frecuentes',  ambito: 'producto', ayuda: 'Las preguntas se cargan en "Vista del producto".' },
  { key: 'relacionados',   numero: 11, label: 'Productos relacionados',ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'garantias',      numero: 12, label: 'Garantía y devoluciones',ambito: 'landing', ayuda: 'Sellos de confianza y la política de devolución.' },
  { key: 'cta_final',      numero: 13, label: 'Cierre y urgencia',     ambito: 'landing',  ayuda: 'Último llamado a la acción con contador.' },
];

export const CLAVES_SECCIONES = SECCIONES_BASICO.map(s => s.key);

export const DEFAULTS_BASICO = {
  barra_superior: {
    activo: true,
    animado: true,
    velocidad: 28,
    separador: '·',
    items: [
      { icono: 'truck',  texto: 'Envío gratis' },
      { icono: 'shield', texto: 'Garantía 30 días' },
      { icono: 'lock',   texto: 'Pago seguro' },
    ],
    cta_texto: 'Comprar ahora',
  },

  hero: {
    activo: true,
    etiqueta: '',            // badge sobre la foto, ej. "Más vendido"
    eyebrow: '',             // vacío = la categoría del producto
    titulo: '',              // vacío = el nombre del producto
    titulo_destacado: '',    // segunda línea, en color de acento
    lead: '',                // vacío = la descripción del producto
    caracteristicas: [],     // vacío = los beneficios del producto
    cta_texto: 'Comprar ahora — envío gratis',
  },

  precio: {
    activo: true,
    titulo: 'Oferta y precio',
    nota: 'Elegí la opción que mejor se adapta a vos',
    etiqueta_oferta: 'Oferta por tiempo limitado',
  },

  opciones: {
    activo: true,
    titulo: 'Opciones de compra',
    etiqueta_individual: '1 unidad',
    nota_pack: 'Compra única',
    cta_pack: 'Agregar al carrito',
    // { "<id de oferta>": { badge, subtitulo } }
    packs: {},
  },

  beneficios: {
    activo: true,
    titulo: 'Beneficios clave',
    items: [],
  },

  descripcion: {
    activo: true,
    titulo: 'Descripción del producto',
    encabezado: '',   // el titular dentro de la tarjeta
    texto: '',
    destacados: [],   // los ✓ de abajo
  },

  usos: {
    activo: true,
    titulo: 'Usos y aplicaciones',
    pasos: [],        // [{titulo, texto}]
  },

  prueba_social: {
    activo: false,
    etiqueta: 'Excelente',
    calificacion: 4.8,
    resenas_texto: '',
    clientes_texto: '',
  },

  comparacion: {
    activo: false,
    titulo: '¿Por qué elegir este producto?',
    nosotros: 'Nuestro producto',
    otros: 'Otras opciones',
    imagen_nosotros: '',   // vacío = la foto principal del producto
    imagen_otros: '',
    items: [],             // [{caracteristica, nosotros: bool, otros: bool}]
  },

  faq: {
    activo: true,
    titulo: 'Preguntas frecuentes',
  },

  relacionados: {
    activo: true,
    titulo: 'Productos relacionados',
    cta_texto: 'Agregar',
  },

  garantias: {
    activo: true,
    titulo: 'Garantía y devoluciones',
    encabezado: 'Comprá con total tranquilidad',
    texto: '',
    items: [
      { icono: 'badge',      titulo: 'Garantía 30 días', texto: 'Compra sin riesgos' },
      { icono: 'truck',      titulo: 'Envío gratis',     texto: 'En todos los pedidos' },
      { icono: 'star',       titulo: 'Calidad verificada', texto: 'Producto seleccionado' },
      { icono: 'headphones', titulo: 'Soporte',          texto: 'Estamos para ayudarte' },
      { icono: 'lock',       titulo: 'Pago seguro',      texto: 'SSL protegido' },
    ],
  },

  cta_final: {
    activo: true,
    etiqueta: 'Oferta por tiempo limitado',
    titulo: 'No pierdas esta oferta',
    texto: 'Stock limitado · envío gratis',
    cta_texto: 'Comprar ahora',
    cta_nota: 'Garantía 30 días',
    contador: { activo: true, horas: 2, minutos: 47, segundos: 39 },
  },
};

export const LIMITES = {
  barra_superior_items: 4,
  hero_caracteristicas: 6,
  beneficios_items: 6,
  descripcion_destacados: 4,
  usos_pasos: 4,
  comparacion_items: 8,
  garantias_items: 5,
};

const CONTADOR_DEFAULT = DEFAULTS_BASICO.cta_final.contador;

/**
 * Deja cada sección con la forma que espera el renderer. Se normaliza el
 * TIPO, nunca el contenido: filtrar acá lo que está a medio escribir hace
 * desaparecer la fila que el comercio acaba de agregar. Lo incompleto se
 * descarta al DIBUJAR.
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
        caracteristicas: lista(base.caracteristicas, LIMITES.hero_caracteristicas)
          .filter(t => typeof t === 'string'),
      };
    case 'opciones':
      return { ...base, packs: esObjeto(base.packs) ? base.packs : {} };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items).filter(esObjeto) };
    case 'descripcion':
      return {
        ...base,
        destacados: lista(base.destacados, LIMITES.descripcion_destacados)
          .filter(t => typeof t === 'string'),
      };
    case 'usos':
      return { ...base, pasos: lista(base.pasos, LIMITES.usos_pasos).filter(esObjeto) };
    case 'prueba_social':
      return { ...base, calificacion: numeroEntre(base.calificacion, 0, 5, 5) };
    case 'comparacion':
      return {
        ...base,
        items: lista(base.items, LIMITES.comparacion_items).filter(esObjeto).map(i => ({
          caracteristica: i?.caracteristica || '',
          // Por defecto: nosotros sí, los otros no. Es el sentido de la
          // sección; al revés no habría comparación que mostrar.
          nosotros: i?.nosotros !== false,
          otros: i?.otros === true,
        })),
      };
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
 * Lo que la ficha arma sola con lo ya cargado EN EL PRODUCTO, en la pestaña
 * "Vista del producto". Para la ficha básica también toma `ficha_datos`:
 * descripción, usos, comparación, beneficios rápidos y CTA del encabezado.
 *
 * Solo devuelve las claves con contenido real: una lista vacía no debe
 * pisar el default de la landing con nada.
 */
export function fichaBasicoDesdeProducto(producto) {
  if (!producto) return {};
  const ficha = {};
  const datos = esObjeto(producto.ficha_datos) ? producto.ficha_datos : {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const sobre = (producto.sobre_este_producto || '').trim();
  const beneficiosRapidos = (datos.beneficios_rapidos || []).filter(t => typeof t === 'string' && t.trim());
  const ctaPrincipal = (datos.cta_principal_texto || '').trim();

  if (promesa || beneficiosRapidos.length || ctaPrincipal) {
    ficha.hero = {};
    if (promesa) ficha.hero.lead = promesa;
    if (beneficiosRapidos.length) ficha.hero.caracteristicas = beneficiosRapidos.map(t => t.trim());
    if (ctaPrincipal) ficha.hero.cta_texto = ctaPrincipal;
  }

  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({
        icono: b.icono || 'star',
        titulo: b.titulo.trim(),
        texto: (b.texto || '').trim(),
      })),
    };
  }

  const descripcionTexto = (datos.basico_descripcion_texto || '').trim();
  const descripcionEncabezado = (datos.basico_descripcion_encabezado || '').trim();
  const destacados = (datos.basico_descripcion_destacados || []).filter(t => typeof t === 'string' && t.trim());
  const textoDescripcion = sobre || descripcionTexto;
  if (textoDescripcion || descripcionEncabezado || destacados.length) {
    ficha.descripcion = {
      ...(ficha.descripcion || {}),
      ...(descripcionEncabezado ? { encabezado: descripcionEncabezado } : {}),
      ...(textoDescripcion ? { texto: textoDescripcion } : {}),
      ...(destacados.length ? { destacados: destacados.map(t => t.trim()) } : {}),
    };
  }

  const usos = (datos.basico_usos || []).filter(p => p?.titulo?.trim());
  if (usos.length) {
    ficha.usos = {
      activo: true,
      pasos: usos.map((p, i) => ({
        paso: (p.paso || String(i + 1)).trim(),
        titulo: p.titulo.trim(),
        texto: (p.texto || '').trim(),
      })),
    };
  }

  const comparacion = (datos.basico_comparacion || []).filter(c => c?.caracteristica?.trim());
  const imagenNosotros = (datos.basico_comparacion_imagen_nosotros || '').trim();
  const imagenOtros = (datos.basico_comparacion_imagen_otros || '').trim();
  if (comparacion.length || imagenNosotros || imagenOtros) {
    ficha.comparacion = {
      activo: true,
      ...(imagenNosotros ? { imagen_nosotros: imagenNosotros } : {}),
      ...(imagenOtros ? { imagen_otros: imagenOtros } : {}),
      items: comparacion.map(c => ({
        caracteristica: c.caracteristica.trim(),
        nosotros: c.nosotros !== false,
        otros: c.otros === true,
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

  return ficha;
}

export const resolverFichaBasico = crearResolver({
  defaults: DEFAULTS_BASICO,
  claves: CLAVES_SECCIONES,
  normalizar: normalizarSeccion,
});

export function clonarSeccionResuelta(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_BASICO);
}
