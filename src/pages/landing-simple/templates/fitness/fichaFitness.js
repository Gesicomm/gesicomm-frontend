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
 * Las imágenes propias de la ficha (antes/después, ingredientes, la foto de
 * "resultados" o de "por qué elegirnos") se suben con el endpoint de
 * imágenes de sección de /mis-landings y acá se guarda solo la URL.
 *
 * ── De dónde sale cada sección ─────────────────────────────────────────
 * Cuatro capas, de menor a mayor prioridad:
 *
 *   1. Defaults de fábrica (DEFAULTS_FICHA, acá abajo).
 *   2. Defaults de la landing (content.ficha_fitness) — lo que el comercio
 *      carga una vez en el armador y vale para todas sus fichas.
 *   3. Vista del producto (propuesta_valor, CTA, beneficios rápidos,
 *      beneficios, confianza y ficha_datos). Es la fuente natural: ese
 *      contenido ya se carga ahí y no tiene sentido volver a escribirlo en
 *      cada landing.
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
 *
 * ── Afirmaciones de salud ──────────────────────────────────────────────
 * Las secciones que muestran resultados (proceso, estadísticas, antes y
 * después, opiniones) vienen APAGADAS y sin cifras de fábrica. Un
 * porcentaje o un "menos hinchazón" inventado por la plataforma terminaría
 * publicado como si fuera del comercio; tiene que escribirlo él.
 */

/**
 * Orden interno de render de la ficha: es EXACTAMENTE el orden en que
 * aparecen las piezas en la página. El panel usa GRUPOS_PANEL_FICHA para
 * numerarlas de forma más humana, sin cambiar estas claves ni el JSON
 * guardado.
 */
export const SECCIONES_FICHA = [
  { key: 'urgencia',         label: 'Contador superior',         ambito: 'landing',  ayuda: 'Franja de arriba de todo con la cuenta regresiva de la oferta.' },
  { key: 'anuncio',          label: 'Cinta de beneficios',       ambito: 'landing',  ayuda: 'Franja animada con envío, garantía y pago seguro.' },
  { key: 'prueba_social',    label: 'Calificación',              ambito: 'landing',  ayuda: 'Estrellas y cantidad de clientes, arriba del título.' },
  { key: 'hero',             label: 'Título y promesa',          ambito: 'producto', ayuda: 'Rótulo, título y promesa del producto.' },
  { key: 'beneficios',       label: 'Beneficios con ícono',      ambito: 'producto', ayuda: 'Grilla de beneficios debajo de la promesa.' },
  { key: 'ofertas',          label: 'Packs',                     ambito: 'producto', ayuda: 'Usa los paquetes que ya cargaste en "Venta".' },
  { key: 'compra',           label: 'Botón de compra',           ambito: 'producto', ayuda: 'El botón principal, debajo de los packs.' },
  { key: 'garantias',        label: 'Sellos bajo el botón',      ambito: 'landing',  ayuda: 'Compra segura, envío, ingredientes certificados.' },
  { key: 'galeria_clientes', label: 'Fotos de clientes',         ambito: 'producto', ayuda: '"Ellos ya lo probaron…": las opiniones con foto, debajo del botón.' },
  { key: 'como_funciona',    label: 'Proceso y resultados',      ambito: 'producto', ayuda: 'Línea de tiempo con foto, sobre fondo de color.' },
  { key: 'ingredientes',     label: 'Ingredientes',              ambito: 'producto', ayuda: 'Pestañas con foto y descripción de cada ingrediente.' },
  { key: 'estadisticas',     label: 'Por qué elegirnos',         ambito: 'producto', ayuda: 'Cifras destacadas con foto. Solo datos reales y con su fuente.' },
  { key: 'antes_despues',    label: 'Antes y después',           ambito: 'producto', ayuda: 'Comparador deslizante: el cliente arrastra la línea para ver el antes y el después.' },
  { key: 'comparativa',      label: 'Tabla comparativa',         ambito: 'producto', ayuda: 'Tu producto contra otras marcas, fila por fila.' },
  { key: 'opiniones',        label: 'Opiniones de clientes',     ambito: 'producto', ayuda: 'Las opiniones (con su foto) y la sección de comentarios.' },
  { key: 'faq',              label: 'Preguntas frecuentes',      ambito: 'producto', ayuda: 'Preguntas propias de este producto en esta landing.' },
  { key: 'upsells',          label: 'Productos complementarios', ambito: 'producto', ayuda: 'Los productos se eligen en la pestaña "Relacionados".' },
  { key: 'cta_final',        label: 'Franja de cierre',          ambito: 'landing',  ayuda: 'Frase final y sellos, al pie de la ficha.' },
].map((s, i) => ({ ...s, numero: i + 1 }));

export const CLAVES_SECCIONES = SECCIONES_FICHA.map(s => s.key);

export const GRUPOS_PANEL_FICHA = [
  { key: 'urgencia', label: 'Contador superior', keys: ['urgencia'] },
  { key: 'anuncio', label: 'Cinta de beneficios', keys: ['anuncio'] },
  {
    key: 'encabezado_compra',
    label: 'Encabezado y compra',
    keys: ['prueba_social', 'hero', 'beneficios', 'ofertas', 'compra', 'garantias', 'galeria_clientes'],
    ayuda: 'Todo lo que aparece en el primer bloque del producto: prueba social, promesa, beneficios, packs, botón, sellos y fotos de clientes.',
  },
  { key: 'como_funciona', label: 'Proceso y resultados', keys: ['como_funciona'] },
  { key: 'ingredientes', label: 'Ingredientes', keys: ['ingredientes'] },
  { key: 'estadisticas', label: 'Por qué elegirnos', keys: ['estadisticas'] },
  { key: 'antes_despues', label: 'Antes y después', keys: ['antes_despues'] },
  { key: 'comparativa', label: 'Tabla comparativa', keys: ['comparativa'] },
  { key: 'opiniones', label: 'Opiniones de clientes', keys: ['opiniones'] },
  { key: 'faq', label: 'Preguntas frecuentes', keys: ['faq'] },
  { key: 'upsells', label: 'Productos complementarios', keys: ['upsells'] },
  { key: 'cta_final', label: 'Franja de cierre', keys: ['cta_final'] },
].map((s, i) => ({ ...s, numero: i + 1 }));

/** Número con el que el panel muestra una sección ("la sección 10"). */
export function numeroDeSeccion(key) {
  return GRUPOS_PANEL_FICHA.find(s => s.keys.includes(key))?.numero
    ?? SECCIONES_FICHA.find(s => s.key === key)?.numero
    ?? '';
}

/**
 * Contenido inicial de la ficha. No es "contenido fantasma": es lo que el
 * comercio ve en el panel desde el minuto cero y puede reescribir entero.
 * Todo lo que aparece acá aparece también como campo editable.
 */
export const DEFAULTS_FICHA = {
  urgencia: {
    activo: true,
    texto: 'Tu descuento termina en:',
    horas: 0,
    minutos: 15,
    segundos: 0,
    rotulo_horas: 'HRS',
    rotulo_minutos: 'MIN',
    rotulo_segundos: 'SEG',
  },

  anuncio: {
    activo: true,
    // La cinta se desplaza de derecha a izquierda. Se puede apagar y queda
    // la barra centrada de siempre (ver BarraMarquee.jsx).
    animado: true,
    velocidad: 28,
    separador: '✦',
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
    titulo_destacado: '',  // se pinta en negrita y con el color de acento
    lead_resaltado: '',    // arranque de la promesa, con fondo de color
    lead: '',              // vacío = usa la descripción del producto
  },

  compra: {
    activo: true,
    cta_texto: 'Comprar ahora',
    microcopy: 'Envío a todo el país',
    // Vacío = el "color de botones" de la tienda (Colores → Primario), que
    // es lo que el comercio espera que tenga cualquier botón. Solo se llena
    // si quiere que ESTE botón se despegue del resto.
    cta_color: '',
  },

  prueba_social: {
    activo: false,
    calificacion: 4.8,
    resenas_texto: '',
  },

  beneficios: {
    activo: true,
    items: [],
  },

  ofertas: {
    activo: true,
    titulo: 'Elegí tu pack y ahorrá',
    etiqueta_individual: 'Pack Inicio',
    subtitulo_individual: '1 unidad',
    badge_individual: '',
    // Va delante del porcentaje en cada pack: "Ahorrás 26%". Vacío = "-26%".
    texto_ahorro: 'Ahorrás',
    // { "<id de oferta>": { badge, subtitulo } }
    packs: {},
    suscripcion: { activo: false, titulo: '', detalle: '' },
  },

  garantias: {
    activo: true,
    items: [
      { icono: 'shield', titulo: 'Compra segura' },
      { icono: 'truck',  titulo: 'Envío a todo el país' },
    ],
  },

  como_funciona: {
    activo: false,
    eyebrow: 'Tu proceso',
    titulo: 'Pequeños hábitos.',
    titulo_destacado: 'Grandes cambios.',
    imagen: '',            // vacía = la foto principal del producto
    pasos: [],             // [{titulo, texto}]
  },

  ingredientes: {
    activo: false,
    eyebrow: 'Lo que hace por vos',
    titulo: 'Ingredientes con',
    titulo_destacado: 'propósito',
    subtitulo: '',
    frase: '',
    items: [],             // [{nombre, dosis, texto, imagen, icono}]
  },

  estadisticas: {
    activo: false,
    eyebrow: 'Por qué elegirnos',
    titulo: 'Una fórmula que se siente',
    titulo_destacado: 'honesta.',
    texto: '',
    imagen: '',
    items: [],             // [{valor: '94%', texto}]
    nota: '',              // de dónde salen las cifras
  },

  antes_despues: {
    activo: false,
    eyebrow: 'Historias de clientes',
    titulo: 'Antes y después,',
    titulo_destacado: 'sin promesas vacías.',
    subtitulo: '',
    bloque_titulo: '',
    texto: 'Los resultados pueden variar según cada persona.',
    puntos: [],
    // Dos fotos lado a lado, o una sola que ya trae las dos juntas (manda
    // la combinada si está cargada).
    imagen_antes: '',
    imagen_despues: '',
    imagen_combinada: '',
    etiqueta_antes: 'Antes',
    etiqueta_despues: 'Después',
  },

  comparativa: {
    activo: false,
    eyebrow: 'Calidad que podés comparar',
    titulo: '¿Por qué',
    titulo_destacado: 'elegirnos?',
    subtitulo: '',
    columna_beneficio: 'Beneficios',
    nosotros: '',          // vacío = el nombre del comercio
    otros: 'Otras marcas',
    items: [],             // [{caracteristica, nosotros, otros}]
  },

  // Tira de fotos debajo del botón de compra. No tiene lista propia: usa
  // las opiniones de la sección "Opiniones de clientes" que tienen foto,
  // así cada opinión se carga una sola vez.
  galeria_clientes: {
    activo: true,
    titulo: 'Ellos ya lo',
    titulo_destacado: 'probaron…',
    // Fotos subidas acá mismo: valen solo para este producto en esta
    // landing (content.productos[id].ficha), no tocan el producto. Si la
    // lista está vacía se usan las opiniones con foto.
    items: [],             // [{foto, nombre, calificacion, comentario}]
  },

  opiniones: {
    activo: false,
    eyebrow: 'Opiniones',
    titulo: 'Lo que dicen nuestros clientes',
    items: [],             // [{nombre, calificacion, comentario, foto}]
  },

  faq: {
    activo: true,
    eyebrow: 'Preguntas frecuentes',
    titulo: 'Tus dudas,',
    titulo_destacado: 'resueltas.',
  },

  upsells: {
    activo: true,
    titulo: 'Complementá tu rutina',
    cta_texto: 'Agregar',
  },

  cta_final: {
    activo: true,
    titulo: 'Bienestar real, todos los días.',
    texto: 'Compra segura · Envío a todo el país',
  },
};

/** Cuántos elementos admite cada lista repetible. Lo usa el panel para cortar el botón "Agregar". */
export const LIMITES = {
  anuncio_items: 4,
  beneficios_items: 6,
  garantias_items: 3,
  como_funciona_pasos: 6,
  ingredientes_items: 6,
  estadisticas_items: 4,
  antes_despues_puntos: 5,
  comparativa_items: 8,
  opiniones_items: 9,
  galeria_clientes_items: 12,
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

const texto = (v) => (typeof v === 'string' ? v : '');

/**
 * Deja cada sección con la forma que el renderer espera, pase lo que pase
 * en el JSON guardado. La ficha es contenido libre en una columna JSON: un
 * guardado viejo, un import o una edición a mano pueden traer una clave con
 * el tipo equivocado, y el renderer no debe romper la landing por eso.
 */
function normalizarSeccion(key, s) {
  const base = { ...s, activo: s.activo !== false };
  switch (key) {
    case 'urgencia':
      return {
        ...base,
        horas: numeroEntre(base.horas, 0, 99, 0),
        minutos: numeroEntre(base.minutos, 0, 59, 15),
        segundos: numeroEntre(base.segundos, 0, 59, 0),
      };
    case 'anuncio':
      return {
        ...base,
        items: lista(base.items, LIMITES.anuncio_items).filter(esObjeto),
        cta_texto: base.cta_texto || '',
        // Fuera de rango no se lee o parece trabada; ver BarraMarquee.
        velocidad: numeroEntre(base.velocidad, 8, 120, 28),
      };
    case 'prueba_social':
      return { ...base, calificacion: numeroEntre(base.calificacion, 0, 5, 5) };
    case 'beneficios':
      return { ...base, items: lista(base.items, LIMITES.beneficios_items).filter(esObjeto) };
    case 'ofertas':
      return {
        ...base,
        packs: esObjeto(base.packs) ? base.packs : {},
        suscripcion: { ...DEFAULTS_FICHA.ofertas.suscripcion, ...(esObjeto(base.suscripcion) ? base.suscripcion : {}) },
      };
    case 'garantias':
      return { ...base, items: lista(base.items, LIMITES.garantias_items).filter(esObjeto) };
    case 'como_funciona':
      return { ...base, pasos: lista(base.pasos, LIMITES.como_funciona_pasos).filter(esObjeto) };
    case 'ingredientes':
      return { ...base, items: lista(base.items, LIMITES.ingredientes_items).filter(esObjeto) };
    case 'estadisticas':
      return { ...base, items: lista(base.items, LIMITES.estadisticas_items).filter(esObjeto) };
    case 'antes_despues':
      return {
        ...base,
        puntos: lista(base.puntos, LIMITES.antes_despues_puntos).filter(t => typeof t === 'string'),
      };
    case 'comparativa':
      return {
        ...base,
        items: lista(base.items, LIMITES.comparativa_items).filter(esObjeto).map(i => ({
          caracteristica: texto(i.caracteristica),
          nosotros: texto(i.nosotros),
          otros: texto(i.otros),
        })),
      };
    case 'galeria_clientes':
      return {
        ...base,
        items: lista(base.items, LIMITES.galeria_clientes_items).filter(esObjeto).map(o => ({
          ...o,
          calificacion: numeroEntre(o?.calificacion, 0, 5, 5),
        })),
      };
    case 'opiniones':
      return {
        ...base,
        items: lista(base.items, LIMITES.opiniones_items).filter(esObjeto).map(o => ({
          ...o,
          calificacion: numeroEntre(o?.calificacion, 1, 5, 5),
        })),
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
 * Lo que la ficha puede armar sola a partir de Vista del producto. Solo devuelve las claves que realmente tiene
 * contenido: una lista vacía no debe pisar el default de la landing con
 * nada.
 *
 * @param {object|null} producto con propuesta_valor / ficha_datos /
 *   beneficios [{titulo,texto}] / confianza [{texto,icono}], tal cual los
 *   guarda ProductForm.jsx y los publica landing.service.js.
 */
export function fichaDesdeMarketing(producto) {
  if (!producto) return {};
  const ficha = {};
  const datos = (producto.ficha_datos && typeof producto.ficha_datos === 'object' && !Array.isArray(producto.ficha_datos))
    ? producto.ficha_datos : {};

  const beneficios = (producto.beneficios || []).filter(b => b?.titulo?.trim());
  const confianza = (producto.confianza || []).filter(c => c?.texto?.trim());
  const promesa = (producto.propuesta_valor || '').trim();
  const beneficiosRapidos = (datos.beneficios_rapidos || []).filter(t => typeof t === 'string' && t.trim());
  const ctaPrincipal = (datos.cta_principal_texto || '').trim();

  if (promesa) ficha.hero = { lead: promesa };
  if (ctaPrincipal) ficha.compra = { cta_texto: ctaPrincipal };

  // La grilla de beneficios del encabezado. Si el producto no tiene
  // beneficios con título y texto pero sí "beneficios rápidos" (una línea
  // cada uno), se usan esos: es la misma idea en formato corto.
  if (beneficios.length) {
    ficha.beneficios = {
      items: beneficios.map(b => ({
        icono: b.icono || null,
        titulo: b.titulo.trim(),
        texto: (b.texto || '').trim(),
      })),
    };
  } else if (beneficiosRapidos.length) {
    ficha.beneficios = {
      items: beneficiosRapidos.map(t => ({ icono: 'check', titulo: t.trim(), texto: '' })),
    };
  }

  if (confianza.length) {
    ficha.garantias = {
      items: confianza.map(c => ({
        icono: ICONO_CONFIANZA_A_CATALOGO[c.icono] || 'shield',
        titulo: c.texto.trim(),
      })),
    };
  }

  // Propio del rubro "suplementos" (Producto.ficha_datos, cargado en Mis
  // Productos → Vista del producto). Es del producto, así que sirve en todas
  // sus landings sin volver a escribirlo en cada una.
  const ingredientes = (datos.ingredientes || []).filter(i => i?.nombre?.trim());
  if (ingredientes.length) {
    ficha.ingredientes = {
      // Si el comercio se tomó el trabajo de cargarlos, la sección se
      // muestra: viene apagada de fábrica justamente porque sin datos no
      // hay nada que mostrar.
      activo: true,
      items: ingredientes.map(i => ({
        icono: i.icono || 'leaf',
        nombre: i.nombre.trim(),
        dosis: (i.dosis || '').trim(),
        texto: (i.texto || '').trim(),
        imagen: (i.imagen || '').trim(),
      })),
    };
  }

  const opiniones = (datos.fitness_opiniones || []).filter(o => o?.nombre?.trim() || o?.comentario?.trim());
  if (opiniones.length) {
    ficha.opiniones = {
      activo: true,
      items: opiniones.map(o => ({
        nombre: (o.nombre || '').trim(),
        comentario: (o.comentario || o.testimonio || '').trim(),
        calificacion: numeroEntre(o.calificacion, 1, 5, 5),
        foto: (o.foto || '').trim(),
      })),
    };
  }

  // ── Secciones del diseño nuevo, cargadas en Vista del producto ──────
  // Solo pasan los valores con contenido: un campo vacío del producto no
  // debe pisar lo que la landing tenga escrito.
  const txt = (v) => (typeof v === 'string' ? v.trim() : '');
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const conTexto = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => (Array.isArray(v) ? v.length : txt(v))));

  const galeria = (datos.fitness_galeria || []).filter(g => txt(g?.foto));
  if (galeria.length) {
    ficha.galeria_clientes = {
      items: galeria.map(g => ({
        foto: txt(g.foto),
        nombre: txt(g.nombre),
        calificacion: numeroEntre(g.calificacion, 0, 5, 5),
        comentario: txt(g.comentario),
      })),
    };
  }

  const est = obj(datos.fitness_estadisticas);
  const cifras = (Array.isArray(est.items) ? est.items : []).filter(c => txt(c?.valor));
  const estadisticas = conTexto({ texto: txt(est.texto), nota: txt(est.nota), imagen: txt(est.imagen) });
  if (cifras.length || Object.keys(estadisticas).length) {
    ficha.estadisticas = { ...estadisticas };
    if (cifras.length) {
      ficha.estadisticas.items = cifras.map(c => ({ valor: txt(c.valor), texto: txt(c.texto) }));
      ficha.estadisticas.activo = true;
    }
  }

  const ad = obj(datos.fitness_antes_despues);
  const antesDespues = conTexto({
    imagen_antes: txt(ad.imagen_antes),
    imagen_despues: txt(ad.imagen_despues),
    imagen_combinada: txt(ad.imagen_combinada),
    bloque_titulo: txt(ad.bloque_titulo),
    texto: txt(ad.texto),
    puntos: (Array.isArray(ad.puntos) ? ad.puntos : []).map(txt).filter(Boolean),
  });
  if (Object.keys(antesDespues).length) {
    ficha.antes_despues = antesDespues;
    if (antesDespues.imagen_antes || antesDespues.imagen_despues || antesDespues.imagen_combinada) ficha.antes_despues.activo = true;
  }

  const comp = obj(datos.fitness_comparativa);
  const filas = (Array.isArray(comp.items) ? comp.items : []).filter(f => txt(f?.caracteristica));
  const comparativa = conTexto({ nosotros: txt(comp.nosotros), otros: txt(comp.otros) });
  if (filas.length || Object.keys(comparativa).length) {
    ficha.comparativa = { ...comparativa };
    if (filas.length) {
      ficha.comparativa.items = filas.map(f => ({ caracteristica: txt(f.caracteristica), nosotros: txt(f.nosotros), otros: txt(f.otros) }));
      ficha.comparativa.activo = true;
    }
  }

  const pasos = (datos.fitness_pasos || []).filter(p => p?.titulo?.trim());
  const modoUso = (datos.modo_uso || '').trim();
  if (pasos.length || modoUso) {
    ficha.como_funciona = {
      activo: true,
      pasos: pasos.length
        ? pasos.map(p => ({
          titulo: p.titulo.trim(),
          texto: (p.texto || p.descripcion || '').trim(),
        }))
        : [{ titulo: 'Modo de uso', texto: modoUso }],
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
  'marketing': 'Tomado de Vista del producto',
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
  const capas = {
    landing: migrarFichaVieja(fichaLanding),
    marketing: fichaMarketing,
    producto: migrarFichaVieja(fichaProducto),
  };
  const capa = (fuente, key) => (esObjeto(fuente) && esObjeto(fuente[key]) ? fuente[key] : null);
  const resultado = {};
  for (const key of CLAVES_SECCIONES) {
    resultado[key] = normalizarSeccion(key, {
      ...DEFAULTS_FICHA[key],
      ...capa(capas.landing, key),
      ...capa(capas.marketing, key),
      ...capa(capas.producto, key),
    });
  }
  return resultado;
}

/**
 * Fichas guardadas con la primera versión de este diseño (2026-10-01): el
 * botón de compra vivía dentro de `hero` y la tira de fotos dentro de
 * `opiniones`. Ahora son secciones propias (`compra`, `galeria_clientes`)
 * para que el panel siga el orden de la página. Se traducen al leer, sin
 * tocar lo guardado: el primer Guardar ya escribe la forma nueva.
 */
export function migrarFichaVieja(ficha) {
  if (!esObjeto(ficha)) return ficha;
  let salida = ficha;
  const hero = ficha.hero;
  if (esObjeto(hero) && !esObjeto(ficha.compra) && ['cta_texto', 'microcopy', 'cta_color'].some(k => k in hero)) {
    const { cta_texto, microcopy, cta_color, ...resto } = hero;
    const compra = {};
    if (cta_texto !== undefined) compra.cta_texto = cta_texto;
    if (microcopy !== undefined) compra.microcopy = microcopy;
    // El rojo era el default de fábrica de esa versión, no una elección
    // del comercio: no se arrastra.
    if (cta_color && cta_color.toUpperCase() !== '#E5231D') compra.cta_color = cta_color;
    salida = { ...salida, hero: resto, compra };
  }
  const op = ficha.opiniones;
  if (esObjeto(op) && !esObjeto(ficha.galeria_clientes) && ['galeria_activa', 'galeria_titulo', 'galeria_destacado'].some(k => k in op)) {
    const { galeria_activa, galeria_titulo, galeria_destacado, ...resto } = op;
    const galeria = {};
    if (galeria_activa !== undefined) galeria.activo = galeria_activa !== false;
    if (galeria_titulo !== undefined) galeria.titulo = galeria_titulo;
    if (galeria_destacado !== undefined) galeria.titulo_destacado = galeria_destacado;
    salida = { ...salida, opiniones: resto, galeria_clientes: galeria };
  }
  return salida;
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
  variantes = [],
  opciones = [],
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
    // Formas de compra elegibles en la ficha: packs del mismo producto y
    // combos normales. Los order bump se ofrecen dentro del checkout.
    // `imagen` es la de la Oferta: se carga una vez (desde Mis Productos o
    // desde el armador) y manda sobre la foto del producto en esa tarjeta.
    packs: (ofertas || []).filter(o => o.estrategia === 'normal'),
    variantes: variantes || [],
    opciones: opciones || [],
    faq: (faq || []).filter(f => f?.pregunta),
    faqTitulo: faqTitulo || '',
    relacionados: relacionados || [],
    relacionadosTitulo: relacionadosTitulo || '',
  };
}
