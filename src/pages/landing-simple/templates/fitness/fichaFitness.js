/**
 * Ficha de producto del template "Fitness & Suplementos" — modelo de datos.
 *
 * Un solo lugar define QUÉ secciones tiene la ficha, cuáles son sus valores
 * por defecto y cómo se resuelve la herencia. Lo consumen tres lados:
 *
 *   - FitnessProductPage.jsx  → la dibuja (mismo componente en preview y en
 *     la landing publicada, ver la nota de arquitectura ahí).
 *   - panels/FichaFitnessPanel.jsx → la edita.
 *   - LandingPublica.jsx / LandingSimpleEditor.jsx → arman el `item`.
 *
 * ── Dónde se guarda ────────────────────────────────────────────────────
 * Todo vive en la columna JSON `Landing.content`, que ya existe y ya está
 * en el whitelist de escritura de landingSimple.service.js. No hay tabla ni
 * columna nueva:
 *
 *   content.ficha_fitness              → valores por defecto de la landing
 *   content.productos["<id>"].ficha    → lo que ese producto pisa
 *
 * ── De dónde sale cada sección ─────────────────────────────────────────
 * Cuatro capas, de menor a mayor prioridad:
 *
 *   1. Defaults de fábrica (DEFAULTS_FICHA, acá abajo).
 *   2. Defaults de la landing (content.ficha_fitness) — lo que el comercio
 *      carga una vez en el armador y vale para todas sus fichas.
 *   3. Marketing del PRODUCTO (pestaña "Marketing & Embudo" de la carga de
 *      productos: propuesta_valor, beneficios, confianza, sobre_este_
 *      producto). Es la fuente natural: ese contenido ya se carga ahí para
 *      el embudo, no tiene sentido volver a escribirlo en cada landing.
 *   4. Lo que el comercio escribió para ESTE producto EN ESTA landing
 *      (content.productos[id].ficha).
 *
 * O sea: la landing toma lo del producto, y si el producto no tiene nada
 * cargado se completa desde el armador. Ver fichaDesdeMarketing().
 *
 * La herencia se marca por SECCIÓN, no por campo: el panel muestra "esta
 * sección la heredo" o "esta la escribí yo", sin estados intermedios
 * imposibles de explicar. Al personalizar se clona la sección ya resuelta
 * (ver clonarSeccionResuelta), así el comercio arranca de lo que estaba
 * viendo y nunca de un formulario en blanco.
 */

/** Orden de render y numeración de la ficha. La numeración se muestra en el editor. */
export const SECCIONES_FICHA = [
  { key: 'anuncio',      numero: 1,  label: 'Barra de anuncio',      ambito: 'landing',  ayuda: 'Franja fija arriba de todo: envío, garantía y pago seguro.' },
  { key: 'hero',         numero: 2,  label: 'Encabezado',            ambito: 'producto', ayuda: 'Título, promesa, lista de beneficios rápidos y botón principal.' },
  { key: 'prueba_social',numero: 3,  label: 'Prueba social rápida',  ambito: 'landing',  ayuda: 'Calificación, cantidad de reseñas y clientes satisfechos.' },
  { key: 'ofertas',      numero: 4,  label: 'Ofertas y paquetes',    ambito: 'producto', ayuda: 'Usa los paquetes que ya cargaste en "Checkout y Ofertas".' },
  { key: 'beneficios',   numero: 5,  label: 'Beneficios clave',      ambito: 'producto', ayuda: 'Cuatro beneficios con ícono.' },
  { key: 'ingredientes', numero: 6,  label: 'Ingredientes y ciencia',ambito: 'producto', ayuda: 'Ingrediente, dosis y para qué sirve.' },
  { key: 'opiniones',    numero: 7,  label: 'Opiniones de clientes', ambito: 'producto', ayuda: 'Testimonios con estrellas y nombre.' },
  { key: 'como_funciona',numero: 8,  label: 'Cómo funciona',         ambito: 'landing',  ayuda: 'Los pasos desde que lo toma hasta que ve resultados.' },
  { key: 'garantias',    numero: 9,  label: 'Garantías y confianza',ambito: 'landing',  ayuda: 'Devolución, fabricación, pago seguro.' },
  { key: 'faq',          numero: 10, label: 'Preguntas frecuentes',  ambito: 'producto', ayuda: 'Las preguntas se cargan en la pestaña "Detalles".' },
  { key: 'upsells',      numero: 11, label: 'Productos complementarios', ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'cta_final',    numero: 12, label: 'Cierre y urgencia',     ambito: 'landing',  ayuda: 'Último llamado a la acción con contador.' },
];

export const CLAVES_SECCIONES = SECCIONES_FICHA.map(s => s.key);

/**
 * Contenido inicial de la ficha. No es "contenido fantasma": es lo que el
 * comercio ve en el panel desde el minuto cero y puede reescribir entero.
 * Todo lo que aparece acá aparece también como campo editable.
 */
export const DEFAULTS_FICHA = {
  anuncio: {
    activo: true,
    items: [
      { icono: 'truck',  texto: 'Envío gratis en todos los pedidos' },
      { icono: 'shield', texto: 'Garantía de 60 días' },
      { icono: 'lock',   texto: 'Pago 100% seguro' },
    ],
    cta_texto: 'Comprar ahora',
  },

  hero: {
    activo: true,
    eyebrow: '',
    titulo: '',            // vacío = usa el nombre del producto
    titulo_destacado: '',  // segunda línea, se pinta con el color de acento
    lead: '',              // vacío = usa la descripción del producto
    checklist: [],
    cta_texto: 'Comprar ahora con descuento',
    microcopy: 'Pago seguro · Envío gratis · Sin compromiso',
  },

  prueba_social: {
    activo: false,
    etiqueta: 'Excelente',
    calificacion: 4.8,
    resenas_texto: '',
    clientes_texto: '',
    avatares: [],
  },

  ofertas: {
    activo: true,
    titulo: 'Elegí tu oferta especial',
    etiqueta_individual: 'Individual',
    badge_individual: '',
    nota_pack: 'Compra única',
    // { "<id de oferta>": { badge, destacado, subtitulo } }
    packs: {},
    suscripcion: { activo: false, titulo: '', detalle: '' },
  },

  beneficios: {
    activo: true,
    titulo: '',   // vacío = sin encabezado, la franja va suelta
    items: [],
  },

  ingredientes: {
    activo: false,
    titulo: 'Ingredientes clave y dosis',
    items: [],
  },

  opiniones: {
    activo: false,
    titulo: 'Lo que dicen nuestros clientes',
    items: [],
  },

  como_funciona: {
    activo: false,
    titulo: 'Cómo funciona',
    pasos: [],
  },

  garantias: {
    activo: true,
    items: [
      { icono: 'badge',  titulo: 'Garantía de 60 días', texto: 'Devolución sin preguntas' },
      { icono: 'leaf',   titulo: 'Ingredientes naturales', texto: 'Sin aditivos innecesarios' },
      { icono: 'lock',   titulo: 'Pago 100% seguro',    texto: 'Tus datos siempre protegidos' },
      { icono: 'truck',  titulo: 'Envío a todo el país', texto: 'Seguimiento de tu pedido' },
    ],
  },

  faq: {
    activo: true,
    titulo: 'Preguntas frecuentes',
  },

  upsells: {
    activo: true,
    titulo: 'Complementá tu rutina y obtené mejores resultados',
    cta_texto: 'Agregar',
  },

  cta_final: {
    activo: true,
    etiqueta: 'Oferta por tiempo limitado',
    titulo: 'No pierdas esta oferta especial',
    texto: 'Descuento aplicado automáticamente · Stock limitado',
    cta_texto: 'Comprar ahora',
    cta_nota: 'Envío gratis',
    contador: { activo: true, horas: 2, minutos: 45, segundos: 30 },
  },
};

/** Cuántos elementos admite cada lista repetible. Lo usa el panel para cortar el botón "Agregar". */
export const LIMITES = {
  anuncio_items: 4,
  hero_checklist: 6,
  prueba_social_avatares: 5,
  beneficios_items: 6,
  ingredientes_items: 8,
  opiniones_items: 9,
  como_funciona_pasos: 5,
  garantias_items: 4,
};

function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function lista(valor, max) {
  if (!Array.isArray(valor)) return [];
  return max ? valor.slice(0, max) : valor;
}

function numeroEntre(valor, min, max, porDefecto) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, n));
}

/**
 * Deja cada sección con la forma que el renderer espera, pase lo que pase
 * en el JSON guardado. La ficha es contenido libre en una columna JSON: un
 * guardado viejo, un import o una edición a mano pueden traer una clave con
 * el tipo equivocado, y el renderer no debe romper la landing por eso.
 */
function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'anuncio':
      return { ...base, items: lista(base.items, LIMITES.anuncio_items), cta_texto: base.cta_texto || '' };
    case 'hero':
      return { ...base, checklist: lista(base.checklist, LIMITES.hero_checklist).filter(t => typeof t === 'string') };
    case 'prueba_social':
      return {
        ...base,
        calificacion: numeroEntre(base.calificacion, 0, 5, 5),
        avatares: lista(base.avatares, LIMITES.prueba_social_avatares),
      };
    case 'ofertas':
      return {
        ...base,
        packs: esObjeto(base.packs) ? base.packs : {},
        suscripcion: { ...DEFAULTS_FICHA.ofertas.suscripcion, ...(esObjeto(base.suscripcion) ? base.suscripcion : {}) },
      };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items) };
    case 'ingredientes':
      return { ...base, items: lista(base.items, LIMITES.ingredientes_items) };
    case 'opiniones':
      return {
        ...base,
        items: lista(base.items, LIMITES.opiniones_items).map(o => ({
          ...o,
          calificacion: numeroEntre(o?.calificacion, 1, 5, 5),
        })),
      };
    case 'como_funciona':
      return { ...base, pasos: lista(base.pasos, LIMITES.como_funciona_pasos) };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items) };
    case 'cta_final':
      return {
        ...base,
        contador: {
          ...DEFAULTS_FICHA.cta_final.contador,
          ...(esObjeto(base.contador) ? base.contador : {}),
        },
      };
    default:
      return base;
  }
}

/**
 * Los íconos de "Confianza (Garantías)" de la carga de productos se guardan
 * con el nombre del componente de lucide ("ShieldCheck"), no con la clave
 * del catálogo compartido ("shield"). Se traducen acá en vez de cambiar el
 * formulario de productos: esos valores ya están guardados en producción.
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
 * Lo que la ficha puede armar sola a partir de la pestaña "Marketing &
 * Embudo" del producto. Solo devuelve las claves que realmente tiene
 * contenido: una lista vacía no debe pisar el default de la landing con
 * nada.
 *
 * @param {object|null} producto con propuesta_valor / sobre_este_producto /
 *   beneficios [{titulo,texto}] / confianza [{texto,icono}], tal cual los
 *   guarda ProductForm.jsx y los publica landing.service.js.
 */
export function fichaDesdeMarketing(producto) {
  if (!producto) return {};
  const ficha = {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const sobre = (producto.sobre_este_producto || '').trim();

  if (promesa || sobre || beneficios.length) {
    ficha.hero = {};
    // propuesta_valor es la frase corta que en el embudo va debajo del
    // nombre; sobre_este_producto es el texto largo. Si están las dos, la
    // frase corta encabeza y la larga queda para la descripción de abajo.
    if (promesa || sobre) ficha.hero.lead = promesa || sobre;
    // El diseño repite los beneficios como checklist del encabezado — es la
    // misma información y no se le pide al comercio cargarla dos veces.
    if (beneficios.length) ficha.hero.checklist = beneficios.map(b => b.titulo.trim());
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

  return ficha;
}

/**
 * ¿Esta sección la escribió el comercio para este producto en esta landing,
 * o la hereda? El panel lo usa para mostrar el estado y el botón de
 * personalizar. `undefined` = heredada; un objeto = propia.
 */
export function seccionEsPropia(fichaProducto, key) {
  return esObjeto(fichaProducto) && esObjeto(fichaProducto[key]);
}

/**
 * De dónde viene lo que se está viendo en una sección. Solo informativo
 * (el panel lo muestra como etiqueta), no cambia el render.
 * @returns {'landing-producto'|'marketing'|'landing'|'fabrica'}
 */
export function fuenteDeSeccion(key, { fichaProducto, fichaLanding, fichaMarketing }) {
  if (seccionEsPropia(fichaProducto, key)) return 'landing-producto';
  if (esObjeto(fichaMarketing) && esObjeto(fichaMarketing[key])) return 'marketing';
  if (esObjeto(fichaLanding) && esObjeto(fichaLanding[key])) return 'landing';
  return 'fabrica';
}

export const ETIQUETA_FUENTE = {
  'landing-producto': 'Escrito para este producto acá',
  'marketing': 'Tomado de Marketing & Embudo del producto',
  'landing': 'Heredado de la landing',
  'fabrica': 'Texto sugerido — todavía sin cargar',
};

/**
 * Las cuatro capas, resueltas. Ver la nota de arriba para el orden.
 *
 * @param {object|null} fichaProducto  content.productos["<id>"].ficha
 * @param {object|null} fichaLanding   content.ficha_fitness
 * @param {object|null} fichaMarketing salida de fichaDesdeMarketing()
 */
export function resolverFichaFitness(fichaProducto, fichaLanding, fichaMarketing) {
  const capa = (fuente, key) => (esObjeto(fuente) && esObjeto(fuente[key]) ? fuente[key] : null);
  const resultado = {};
  for (const key of CLAVES_SECCIONES) {
    resultado[key] = normalizarSeccion(key, {
      ...DEFAULTS_FICHA[key],
      ...capa(fichaLanding, key),
      ...capa(fichaMarketing, key),
      ...capa(fichaProducto, key),
    });
  }
  return resultado;
}

/** Copia lista para editar de la sección resuelta — el "Personalizar" del panel. */
export function clonarSeccionResuelta(fichaResuelta, key) {
  return JSON.parse(JSON.stringify(fichaResuelta[key] ?? DEFAULTS_FICHA[key]));
}

/**
 * Ahorro de un paquete contra lo que costarían esas unidades sueltas.
 * Es el mismo criterio que ya usa ProductCheckoutOfertas al crearlo:
 * informativo, nunca impone el precio. null si no se puede calcular o si
 * el paquete no ahorra nada (no se inventa un "-0%").
 */
export function ahorroDePack(pack, precioUnitario) {
  const unidades = Number(pack?.unidades) || 0;
  const unitario = Number(precioUnitario) || 0;
  const precioPack = Number(pack?.precio_efectivo ?? pack?.precio) || 0;
  if (unidades < 2 || unitario <= 0 || precioPack <= 0) return null;
  const pct = Math.round((1 - precioPack / (unitario * unidades)) * 100);
  return pct > 0 ? pct : null;
}

/** Precio por unidad de un paquete — lo que se muestra grande en la tarjeta. */
export function precioUnitarioDePack(pack) {
  const unidades = Math.max(1, Number(pack?.unidades) || 1);
  const total = Number(pack?.precio_efectivo ?? pack?.precio) || 0;
  return total / unidades;
}

/**
 * Iniciales para el avatar de una opinión sin foto ("María González" → "MG").
 * Se calcula en vez de pedirla en el panel: es dato derivado del nombre.
 */
export function inicialesDe(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Adaptador único de datos de la ficha.
 *
 * La razón de que exista: el preview del editor y la landing publicada
 * llegaban a la página de producto con dos formas de datos distintas y por
 * eso se dibujaban con dos componentes distintos, que se fueron
 * desincronizando (lo que veías en el editor no era lo que se publicaba).
 * Ahora los dos lados pasan por acá y de acá sale UNA sola forma, que
 * FitnessProductPage sabe dibujar. Si algún día aparece un tercer lugar
 * donde se muestre la ficha, se agrega un llamado a esta función, nunca
 * otro componente.
 *
 * @returns {{nombre, categoria, descripcion, precio, precioAntes, descuentoPct,
 *            imagenes: string[], packs: object[], faq: object[], faqTitulo,
 *            relacionados: object[], relacionadosTitulo}}
 */
export function armarItemFicha({
  nombre,
  categoria = null,
  descripcion = '',
  precio = null,
  precioAntes = null,
  imagenes = [],
  ofertas = [],
  faq = [],
  faqTitulo = '',
  relacionados = [],
  relacionadosTitulo = '',
}) {
  const precioNum = precio == null ? null : Number(precio);
  const anteriorNum = precioAntes == null ? null : Number(precioAntes);
  const hayDescuento = precioNum != null && anteriorNum != null && anteriorNum > precioNum;

  return {
    nombre: nombre || '',
    categoria,
    descripcion: descripcion || '',
    precio: precioNum,
    precioAntes: hayDescuento ? anteriorNum : null,
    descuentoPct: hayDescuento ? Math.round((1 - precioNum / anteriorNum) * 100) : 0,
    imagenes: (imagenes || []).filter(Boolean),
    // Solo paquetes del mismo producto. Los order bump son otra cosa y se
    // ofrecen dentro del checkout, no acá (ver ProductCheckoutOfertas.jsx).
    packs: (ofertas || []).filter(o => o.estrategia === 'normal' && o.tipo_contenido !== 'combo'),
    faq: (faq || []).filter(f => f?.pregunta),
    faqTitulo: faqTitulo || '',
    relacionados: relacionados || [],
    relacionadosTitulo: relacionadosTitulo || '',
  };
}
