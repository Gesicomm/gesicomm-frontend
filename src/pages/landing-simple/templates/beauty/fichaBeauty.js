/**
 * Ficha de producto del template "Beauty & Skin Care" — modelo de datos.
 *
 * Diseño de página de producto de e-commerce de skincare (2026-10-02):
 * galería + columna de compra con tamaños y cantidad, franja de beneficios,
 * historia, ingredientes, ritual en pasos, antes/después deslizante,
 * detalles en acordeón, reseñas y sellos de confianza.
 *
 * Mismo motor que Fitness y Tecnología (ver ../fichaComun.js): cuatro capas
 * de herencia, normalización defensiva y un adaptador único de datos.
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 *   content.ficha_beauty                   → defaults de la landing
 *   content.productos["<id>"].ficha_beauty → lo que ese producto pisa
 *   Producto.ficha_datos                   → lo cargado en Mis Productos
 *     (beauty_ingredientes, beauty_resultados, beauty_pasos), que sirve en
 *     todas las landings de ese producto sin recargarlo.
 *
 * ── Afirmaciones ───────────────────────────────────────────────────────
 * Los TÍTULOS de sección llevan texto de fábrica (son estructura). El
 * CONTENIDO (beneficios, ingredientes, reseñas, fotos de resultados) sale
 * del producto o lo escribe el comercio: inventarlo pondría en su landing
 * afirmaciones sobre su producto que nadie escribió. Por eso las secciones
 * de contenido vienen apagadas hasta que tienen algo.
 */

import {
  crearResolver, clonarSeccionResuelta as clonarComun,
  esObjeto, lista, numeroEntre,
} from '../fichaComun';
import { URGENCIA_DEFAULT, normalizarUrgencia } from '../contadorUrgencia';

export { ETIQUETA_FUENTE, fuenteDeSeccion, seccionEsPropia } from '../fichaComun';

/**
 * Orden EXACTO en que aparecen las cosas en la página, de arriba hacia
 * abajo. El panel las muestra agrupadas (GRUPOS_PANEL_BEAUTY) pero nunca en
 * otro orden.
 */
export const SECCIONES_BEAUTY = [
  { key: 'urgencia',       label: 'Contador de urgencia',    ambito: 'landing',  ayuda: 'Franja de arriba de todo con la cuenta regresiva de la oferta.' },
  { key: 'barra_superior', label: 'Cinta de beneficios',     ambito: 'landing',  ayuda: 'Franja animada de arriba: envío, compra segura, garantía.' },
  { key: 'migas',          label: 'Ruta de navegación',      ambito: 'landing',  ayuda: 'Inicio / categoría / producto, arriba de la foto.' },
  { key: 'hero',           label: 'Título y promesa',        ambito: 'producto', ayuda: 'Cintillo de la foto, línea superior, título y promesa.' },
  { key: 'prueba_social',  label: 'Calificación',            ambito: 'landing',  ayuda: 'Estrellas y cantidad de reseñas, debajo de la promesa.' },
  { key: 'precio',         label: 'Precio',                  ambito: 'producto', ayuda: 'Precio, precio anterior, descuento y la nota de cuotas o envío.' },
  { key: 'opciones',       label: 'Tamaños y packs',         ambito: 'producto', ayuda: 'Las variantes del producto y los paquetes de Ofertas, como botones.' },
  { key: 'compra',         label: 'Cantidad y botón',        ambito: 'producto', ayuda: 'Selector de cantidad, botón de compra y notas debajo.' },
  { key: 'beneficios',     label: 'Franja de beneficios',    ambito: 'producto', ayuda: 'Hasta cuatro beneficios numerados, en una franja de color.' },
  { key: 'historia',       label: 'Por qué te va a encantar',ambito: 'producto', ayuda: 'Texto con lista de puntos y una foto.' },
  { key: 'ingredientes',   label: 'Ingredientes',            ambito: 'producto', ayuda: 'Tarjetas de activos: ícono, nombre y qué hace.' },
  { key: 'como_funciona',  label: 'Ritual de uso',           ambito: 'producto', ayuda: 'Los pasos de la rutina, numerados.' },
  { key: 'antes_despues',  label: 'Antes y después',         ambito: 'producto', ayuda: 'Comparador deslizante: se arrastra la línea para ver antes y después.' },
  { key: 'faq',            label: 'Detalles del producto',   ambito: 'producto', ayuda: 'Preguntas y respuestas en acordeón.' },
  { key: 'resenas',        label: 'Reseñas',                 ambito: 'producto', ayuda: 'Tarjetas con estrellas, comentario y nombre.' },
  { key: 'upsells',        label: 'Complementá tu rutina',   ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'garantias',      label: 'Sellos de confianza',     ambito: 'landing',  ayuda: 'Tres recuadros con ícono: compra protegida, envío, etc.' },
  { key: 'cta_final',      label: 'Pie de la ficha',         ambito: 'landing',  ayuda: 'Marca y frase final, en la franja oscura de abajo.' },
];

export const CLAVES_SECCIONES = SECCIONES_BEAUTY.map(s => s.key);

/**
 * Cómo se agrupan en el panel. Todo el primer bloque del producto (lo que
 * se ve junto a la foto) es un solo ítem, en el orden de la página.
 */
export const GRUPOS_PANEL_BEAUTY = [
  { key: 'urgencia', label: 'Contador de urgencia', keys: ['urgencia'] },
  { key: 'barra_superior', label: 'Cinta de beneficios', keys: ['barra_superior'] },
  {
    key: 'encabezado_compra',
    label: 'Encabezado y compra',
    keys: ['migas', 'hero', 'prueba_social', 'precio', 'opciones', 'compra'],
    ayuda: 'Todo lo que aparece junto a la foto: ruta, título, calificación, precio, tamaños, cantidad y botón.',
  },
  {
    key: 'beneficios_historia',
    label: 'Beneficios y promesa',
    keys: ['beneficios', 'historia'],
    ayuda: 'La franja rápida y el bloque narrativo donde se explica por qué el producto vale la pena.',
  },
  {
    key: 'formula_uso',
    label: 'Fórmula y uso',
    keys: ['ingredientes', 'como_funciona'],
    ayuda: 'Activos, ingredientes y ritual de aplicación. Van juntos porque responden qué tiene y cómo se usa.',
  },
  {
    key: 'resultados_prueba',
    label: 'Resultados y reseñas',
    keys: ['antes_despues', 'resenas'],
    ayuda: 'Comparador, fotos y testimonios. Todo lo que valida el resultado queda en un mismo bloque.',
  },
  { key: 'faq', label: 'Detalles del producto', keys: ['faq'] },
  {
    key: 'cierre_confianza',
    label: 'Complementos y confianza',
    keys: ['upsells', 'garantias', 'cta_final'],
    ayuda: 'Productos relacionados, sellos y pie final para cerrar la ficha sin alargar el panel.',
  },
].map((g, i) => ({ ...g, numero: i + 1 }));

/** Número con el que el panel muestra una sección ("la sección 6"). */
export function numeroDeSeccion(key) {
  return GRUPOS_PANEL_BEAUTY.find(g => g.keys.includes(key))?.numero ?? '';
}

export const DEFAULTS_BEAUTY = {
  // Viene prendido, como en todas las fichas; el comercio lo apaga si no
  // lo quiere.
  urgencia: { ...URGENCIA_DEFAULT },

  barra_superior: {
    activo: true,
    animado: true,
    velocidad: 28,
    separador: '✦',
    items: [
      { icono: 'truck',  texto: 'Envío a todo el país' },
      { icono: 'shield', texto: 'Compra 100% segura' },
      { icono: 'check',  texto: 'Garantía de satisfacción' },
    ],
    cta_texto: '',
  },

  migas: {
    activo: true,
    inicio: 'Inicio',
  },

  hero: {
    activo: true,
    etiqueta: '',   // cintillo sobre la foto, ej. "Best seller"
    eyebrow: '',    // vacío = la categoría del producto
    titulo: '',     // vacío = el nombre del producto
    lead: '',       // vacío = la descripción del producto
  },

  prueba_social: {
    activo: false,
    calificacion: 4.9,
    resenas_texto: '',   // "(2.400 reseñas)"
  },

  precio: {
    activo: true,
    mostrar_descuento: true,
    nota: '',            // "Hasta 3 cuotas sin interés · Envío gratis incluido"
  },

  opciones: {
    activo: true,
    titulo: 'Elegí tu tamaño',
    // { "<id de variante>": { nota } } — "Ideal para probar", "Mejor valor"
    variantes: {},
    titulo_packs: 'Elegí tu pack',
    etiqueta_individual: '1 unidad',
    nota_individual: '',
    // { "<id de oferta>": { nota } }
    packs: {},
    texto_ahorro: 'Ahorrás',
  },

  compra: {
    activo: true,
    mostrar_cantidad: true,
    etiqueta_cantidad: 'Cantidad',
    cta_texto: 'Agregar al carrito',
    cta_agregado: 'Agregado al carrito',
    // Vacío = el "color de botones" de la tienda (Colores → Primario).
    cta_color: '',
    notas: [
      { icono: 'shield', texto: 'Compra segura y protegida' },
      { icono: 'truck',  texto: 'Envío a todo el país' },
    ],
  },

  beneficios: {
    activo: true,
    items: [],      // [{titulo, texto}] — numerados 01..04
  },

  historia: {
    activo: false,
    eyebrow: 'Por qué te va a encantar',
    titulo: '',
    texto: '',
    puntos: [],
    imagen: '',     // vacía = una foto del producto
  },

  ingredientes: {
    activo: false,
    eyebrow: 'Lo que hay adentro',
    titulo: 'Activos que trabajan',
    titulo_destacado: 'con tu piel.',
    subtitulo: '',
    items: [],      // [{icono, nombre, descripcion}]
  },

  como_funciona: {
    activo: false,
    eyebrow: 'Tu ritual',
    titulo: 'Fácil de usar.',
    titulo_destacado: 'Fácil de sostener.',
    pasos: [],      // [{icono, titulo, descripcion}]
  },

  antes_despues: {
    activo: false,
    eyebrow: 'Resultados',
    titulo: 'Tu piel,',
    titulo_destacado: 'con el tiempo.',
    texto: 'Deslizá para comparar. Los resultados pueden variar según cada piel y la constancia de uso.',
    imagen_antes: '',
    imagen_despues: '',
    // Una foto que ya trae las dos juntas: manda sobre las de arriba y va
    // fija, sin deslizador.
    imagen_combinada: '',
    etiqueta_antes: 'Antes',
    etiqueta_despues: 'Después',
  },

  faq: {
    activo: true,
    eyebrow: 'Detalles del producto',
    titulo: 'Todo lo que necesitás saber.',
  },

  resenas: {
    activo: false,
    eyebrow: 'Reseñas verificadas',
    titulo: 'Lo dicen quienes ya lo probaron.',
    items: [],      // [{nombre, calificacion, comentario, detalle, foto?}]
  },

  upsells: {
    activo: true,
    titulo: 'Complementá tu rutina',
    cta_texto: 'Agregar',
  },

  garantias: {
    activo: true,
    items: [
      { icono: 'shield', titulo: 'Compra protegida', texto: 'Tu pago y tus datos están seguros.' },
      { icono: 'truck',  titulo: 'Envío a todo el país', texto: 'Con seguimiento de tu pedido.' },
    ],
  },

  cta_final: {
    activo: true,
    marca: '',      // vacío = el nombre de la tienda
    texto: '',
  },
};

export const LIMITES = {
  barra_superior_items: 6,
  compra_notas: 4,
  beneficios_items: 4,
  historia_puntos: 6,
  ingredientes_items: 6,
  como_funciona_pasos: 4,
  resenas_items: 9,
  garantias_items: 3,
};

function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  // En las listas se normaliza el TIPO, nunca el contenido: filtrar acá lo
  // que está a medio escribir hace desaparecer la fila que el comercio
  // acaba de agregar. Lo incompleto se descarta al dibujar.
  switch (key) {
    case 'urgencia':
      return normalizarUrgencia(base);
    case 'barra_superior':
      return {
        ...base,
        items: lista(base.items, LIMITES.barra_superior_items).filter(esObjeto),
        velocidad: numeroEntre(base.velocidad, 8, 120, 28),
      };
    case 'prueba_social':
      return { ...base, calificacion: numeroEntre(base.calificacion, 0, 5, 5) };
    case 'opciones':
      return {
        ...base,
        variantes: esObjeto(base.variantes) ? base.variantes : {},
        packs: esObjeto(base.packs) ? base.packs : {},
      };
    case 'compra':
      return { ...base, notas: lista(base.notas, LIMITES.compra_notas).filter(esObjeto) };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items).filter(esObjeto) };
    case 'historia':
      return { ...base, puntos: lista(base.puntos, LIMITES.historia_puntos).filter(t => typeof t === 'string') };
    case 'ingredientes':
      return { ...base, items: lista(base.items, LIMITES.ingredientes_items).filter(esObjeto) };
    case 'como_funciona':
      return { ...base, pasos: lista(base.pasos, LIMITES.como_funciona_pasos).filter(esObjeto) };
    case 'resenas':
      return {
        ...base,
        items: lista(base.items, LIMITES.resenas_items).filter(esObjeto).map(x => ({
          ...x,
          calificacion: numeroEntre(x?.calificacion, 0, 5, 5),
        })),
      };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items).filter(esObjeto) };
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
 * Lo que la ficha arma sola con lo ya cargado EN EL PRODUCTO (Vista del
 * producto + ficha_datos del rubro Beauty). Solo devuelve las claves con
 * contenido real: una lista vacía no debe pisar el default de la landing.
 */
export function fichaBeautyDesdeProducto(producto) {
  if (!producto) return {};
  const ficha = {};
  const datos = esObjeto(producto.ficha_datos) ? producto.ficha_datos : {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const beneficiosRapidos = (datos.beneficios_rapidos || []).filter(t => typeof t === 'string' && t.trim());
  const ctaPrincipal = (datos.cta_principal_texto || '').trim();

  if (promesa) ficha.hero = { lead: promesa };
  if (ctaPrincipal) ficha.compra = { cta_texto: ctaPrincipal };

  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({ titulo: b.titulo.trim(), texto: (b.texto || '').trim() })),
    };
  }

  // "Por qué te va a encantar": solo los puntos salen del producto. El
  // texto NO sale de sobre_este_producto: ese campo es de la ficha Básico
  // (Mis Productos solo lo muestra en ese rubro) y la landing publicada lo
  // recibe pisado por la descripción del producto en esa landing, así que
  // repetía la promesa. El texto se escribe en el panel de la ficha.
  if (beneficiosRapidos.length) ficha.historia = { puntos: beneficiosRapidos.map(t => t.trim()) };

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
  const txt = (v) => (typeof v === 'string' ? v.trim() : '');
  const obj = (v) => (esObjeto(v) ? v : {});

  const historia = obj(datos.beauty_historia);
  if (txt(historia.titulo) || txt(historia.texto) || txt(historia.imagen)) {
    ficha.historia = { ...(ficha.historia || {}) };
    if (txt(historia.titulo)) ficha.historia.titulo = txt(historia.titulo);
    if (txt(historia.texto)) ficha.historia.texto = txt(historia.texto);
    if (txt(historia.imagen)) ficha.historia.imagen = txt(historia.imagen);
    if (ficha.historia.titulo || ficha.historia.texto) ficha.historia.activo = true;
  }

  const notasVariantes = Object.entries(obj(datos.beauty_notas_variantes)).filter(([, n]) => txt(n));
  if (notasVariantes.length) {
    ficha.opciones = { variantes: Object.fromEntries(notasVariantes.map(([id, n]) => [id, { nota: txt(n) }])) };
  }

  const notasCompra = (datos.beauty_notas_compra || []).map(txt).filter(Boolean);
  if (notasCompra.length) {
    ficha.compra = { ...(ficha.compra || {}), notas: notasCompra.map(texto => ({ icono: 'check', texto })) };
  }

  const ingredientes = (datos.beauty_ingredientes || []).filter(i => i?.nombre?.trim());
  if (ingredientes.length) {
    ficha.ingredientes = {
      activo: true,
      items: ingredientes.map(i => ({
        // En Mis Productos el ícono puede ser un emoji ("💧"); el renderer
        // lo dibuja tal cual si no es una clave del catálogo de íconos.
        icono: (i.icono || '').trim(),
        nombre: i.nombre.trim(),
        descripcion: (i.descripcion || '').trim(),
        imagen: (i.imagen || '').trim(),
      })),
    };
  }

  const pasos = (datos.beauty_pasos || []).filter(p => p?.titulo?.trim());
  if (pasos.length) {
    ficha.como_funciona = {
      activo: true,
      pasos: pasos.map(p => ({
        icono: '',
        titulo: p.titulo.trim(),
        descripcion: (p.descripcion || '').trim(),
        imagen: (p.imagen || '').trim(),
      })),
    };
  }

  const resultados = (datos.beauty_resultados || []).filter(x => x?.nombre?.trim() || x?.testimonio?.trim());
  if (resultados.length) {
    ficha.resenas = {
      activo: true,
      items: resultados
        .filter(x => x.testimonio?.trim())
        .map(x => ({
          nombre: (x.nombre || '').trim(),
          comentario: x.testimonio.trim(),
          calificacion: numeroEntre(x.calificacion, 0, 5, 5),
          detalle: '',
          foto: (x.foto || '').trim(),
        })),
    };
    // El primer testimonio con las dos fotos alimenta el comparador, salvo
    // que el producto tenga su propio antes y después (ver abajo).
    const conFotos = resultados.find(x => x.antes?.trim() && x.despues?.trim());
    if (conFotos && !esObjeto(datos.beauty_antes_despues)) {
      ficha.antes_despues = {
        activo: true,
        imagen_antes: conFotos.antes.trim(),
        imagen_despues: conFotos.despues.trim(),
      };
    }
  }

  const ad = esObjeto(datos.beauty_antes_despues) ? datos.beauty_antes_despues : {};
  const antes = (ad.imagen_antes || '').trim();
  const despues = (ad.imagen_despues || '').trim();
  const combinada = (ad.imagen_combinada || '').trim();
  if (antes || despues || combinada) {
    ficha.antes_despues = { activo: true, imagen_antes: antes, imagen_despues: despues, imagen_combinada: combinada };
  } else {
    // Sin fotos propias, el testimonio con antes y después (si hay).
    const conFotos = (datos.beauty_resultados || []).find(x => x?.antes?.trim() && x?.despues?.trim());
    if (conFotos && !ficha.antes_despues) {
      ficha.antes_despues = { activo: true, imagen_antes: conFotos.antes.trim(), imagen_despues: conFotos.despues.trim() };
    }
  }

  return ficha;
}

/**
 * Fichas guardadas con el diseño anterior de Beauty (hasta 2026-10-01):
 * el botón vivía en `hero`, los paquetes y los sellos en `precio`, y las
 * reseñas en `resultados`. Se traducen al leer, sin tocar lo guardado; el
 * primer Guardar ya escribe la forma nueva.
 */
export function migrarFichaVieja(ficha) {
  if (!esObjeto(ficha)) return ficha;
  let salida = ficha;

  const hero = ficha.hero;
  if (esObjeto(hero) && !esObjeto(ficha.compra) && hero.cta_texto !== undefined) {
    salida = { ...salida, compra: { cta_texto: hero.cta_texto } };
  }

  const precio = ficha.precio;
  if (esObjeto(precio)) {
    if (!esObjeto(ficha.opciones) && (esObjeto(precio.packs) || precio.etiqueta_individual !== undefined)) {
      const packs = {};
      Object.entries(precio.packs || {}).forEach(([id, conf]) => {
        if (esObjeto(conf)) packs[id] = { nota: conf.subtitulo || conf.badge || '' };
      });
      salida = {
        ...salida,
        opciones: {
          packs,
          ...(precio.etiqueta_individual !== undefined ? { etiqueta_individual: precio.etiqueta_individual } : {}),
        },
      };
    }
    if (Array.isArray(precio.confianza) && !Array.isArray(ficha.compra?.notas)) {
      salida = {
        ...salida,
        compra: { ...(salida.compra || {}), notas: precio.confianza.filter(esObjeto).map(c => ({ icono: c.icono || 'shield', texto: c.texto || '' })) },
      };
    }
  }

  if (esObjeto(ficha.resultados) && !esObjeto(ficha.resenas)) {
    const r = ficha.resultados;
    salida = {
      ...salida,
      resenas: {
        ...(r.activo !== undefined ? { activo: r.activo } : {}),
        ...(Array.isArray(r.items) ? {
          items: r.items.filter(esObjeto).map(x => ({
            nombre: x.nombre || '',
            comentario: x.testimonio || '',
            calificacion: x.calificacion ?? 5,
            detalle: '',
          })),
        } : {}),
      },
    };
  }

  return salida;
}

const resolverBase = crearResolver({
  defaults: DEFAULTS_BEAUTY,
  claves: CLAVES_SECCIONES,
  normalizar: normalizarSeccion,
});

export function resolverFichaBeauty(fichaProducto, fichaLanding, fichaDelProducto) {
  return resolverBase(migrarFichaVieja(fichaProducto), migrarFichaVieja(fichaLanding), fichaDelProducto);
}

export function clonarSeccionResuelta(fichaResuelta, key) {
  return clonarComun(fichaResuelta, key, DEFAULTS_BEAUTY);
}

// Nombre anterior, mantenido para no romper importaciones existentes.
export const clonarFichaBeauty = clonarSeccionResuelta;
