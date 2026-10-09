import { contexto, bloqueCodigoBase } from './promptsCodigo';

/**
 * Prompt por SECCIÓN de "Bloques del Inicio" (no por página completa, y sin
 * repetir el contrato entero de promptsCodigo.js — PROMPT_MAESTRO describe
 * las 4 vistas completas con ~20 listas distintas, checkout, order bump,
 * etc.; acá el comercio va a editar UN bloque nomás, así que el prompt solo
 * lleva las listas/binds/acciones que ESE bloque realmente usa).
 *
 * Mismo flujo copiar/pegar que promptsCodigo.js: el comercio copia, pega en
 * ChatGPT/Claude/Gemini y trae de vuelta el HTML/CSS de esa sección nomás —
 * ver EditorCodigoSeccion en ConfigurarVentaCodigo.jsx.
 */

const CONTRATO_BASE = `Sos un desarrollador front-end senior especialista en e-commerce para Paraguay. Vas a rediseñar UN SOLO BLOQUE de una landing que corre dentro de Gesicomm, una plataforma de ventas — no la página completa.

## Cómo funciona
- Tu código se inyecta dentro de un iframe aislado de una página más grande. Gesicomm pone un "runtime" que carga los datos reales (productos, tienda, carrito) en los elementos marcados con atributos data-gesicomm-*. Vos no programás carrito, checkout ni precios: solo marcás el HTML con esos atributos y el runtime hace el resto.
- NUNCA escribas productos, precios, nombres ni imágenes a mano: siempre salen de los binds/listas de abajo.
- El elemento raíz de tu HTML DEBE conservar el mismo atributo data-gesicomm-bloque que tiene ahora (no lo borres ni le cambies el valor): es lo que usa Gesicomm para ubicar este bloque dentro de la página. No agregues header, footer ni otras secciones: SOLO este bloque.

## MUY IMPORTANTE: no generes código todavía
Esto es el inicio de una conversación, no un pedido de código directo. Quien te escribió este mensaje todavía NO te dijo qué cambio quiere. Tu PRIMERA respuesta, antes que nada, tiene que ser preguntarle:
1. Qué quiere cambiar o qué no le gusta de cómo se ve ahora.
2. Cómo quiere que se vea (estilo, colores de acento, sensación: minimalista, llamativo, elegante, etc.).
3. Si tiene una imagen de referencia o un sitio que le guste, para que la suba o la describa.
NO generes HTML ni CSS en esta primera respuesta, ni propongas un diseño todavía. Recién cuando te responda con esa información (texto y, si tiene, una imagen) generás el rediseño con el formato de abajo.`;

const REGLAS_COLOR = `## Colores (obligatorio)
Usá SIEMPRE estas variables CSS en vez de colores fijos — las define la marca de la tienda (Mi Tienda → Branding) y si escribís un hex fijo la landing deja de seguir esos colores si la tienda los cambia:
--gc-primario / --tienda-primario (botones y acentos), --gc-texto-sobre-primario / --tienda-texto-sobre-primario (texto sobre el primario), --gc-secundario / --tienda-secundario (segundo color de marca), --gc-fondo / --tienda-fondo (fondo), --gc-texto / --tienda-texto (texto principal), --gc-texto-suave / --tienda-texto-suave, --gc-superficie / --tienda-superficie (tarjetas), --tienda-linea (bordes).
El logo va con <img data-gesicomm-tienda="logo" alt=""> y el nombre con <span data-gesicomm-tienda="nombre"></span> — nunca los reemplaces por texto o imagen fija.`;

const REGLAS_CALIDAD = `## Calidad
Mobile first (la mayoría entra desde Instagram/Facebook en el celular). Español de Paraguay con voseo ("elegí", "comprá"), moneda en guaraníes ("Gs 145.735", sin decimales — el runtime ya formatea los precios, vos no escribas el número). Accesible: contraste AA, botones reales (<button>), foco visible. No inventes testimonios, cifras, garantías ni certificaciones que no estén en los datos reales de abajo.`;

// Las clases de la plantilla base (.trust-card, .product-card, .hero-banner…)
// tienen estilos de tema globales con !important (construirDocumentoCodigo):
// si la IA las conserva, sus colores nunca se ven. Lo que conecta con los
// datos son los atributos data-gesicomm-*, no las clases.
const REGLAS_CLASES = `## Clases CSS (obligatorio)
Renombrá TODAS las clases del código base con un prefijo propio de este bloque (por ejemplo .blq-seccion__tarjeta) y escribí tu CSS solo para esas clases nuevas. Las clases originales (.trust-card, .product-card, .hero-banner, .section, etc.) tienen estilos de tema globales con !important: si las dejás, tus colores y fondos no se van a ver. Lo que conecta el bloque con los datos son los atributos data-gesicomm-*, no las clases: esos sí, mantenelos tal cual.
El CSS base puede usar variables viejas (--navy, --sky, --muted, --home-superficie): reemplazalas por las de la sección "Colores".`;

const FORMATO_RESPUESTA = `## Formato de tu respuesta (recién cuando ya tengas la respuesta del comercio)
Devolvé el HTML de este bloque nomás (el mismo elemento raíz, con su data-gesicomm-bloque) y su CSS, en dos bloques de código: \`\`\`html y \`\`\`css. Si hace falta JavaScript propio de este bloque (poco común), agregalo en un tercer bloque \`\`\`js. Sin explicaciones entre medio.`;

/**
 * Por bloque: qué construir + SOLO las listas/binds/acciones que ese bloque
 * usa en la base de Gesicomm (sacado de plantillasBaseCodigo.js). Si el
 * comercio pide algo que necesita otra lista, la IA puede proponerla, pero
 * el contrato no le satura la cabeza con las ~20 que no le sirven acá.
 */
const CONTRATO_POR_BLOQUE = {
  anuncios: {
    queConstruir: 'Es la franja angosta arriba de todo (envío, pago seguro, cambios). Va ANTES del header. Mensajes cortos, uno o varios con scroll/carrusel simple.',
    listas: `- Lista "anuncios": cada item trae los binds "icono" y "texto". El contenedor con data-gesicomm-lista="anuncios" clona un <template> por cada anuncio cargado en Mi Tienda; si no cargaron ninguno, el runtime muestra unos de ejemplo.`,
  },
  encabezado: {
    queConstruir: 'El header: logo/nombre de tienda, navegación, buscador (si hay catálogo) y acceso al carrito. Sticky o no, compacto en mobile.',
    listas: `- data-gesicomm-tienda="logo" y ="nombre": NUNCA los reemplaces por texto/imagen fija.
- data-gesicomm-inicio en el logo/link: vuelve al inicio.
- <input data-gesicomm-buscar> dentro de un <form>: buscador del catálogo.
- <button data-gesicomm-carrito>: abre el carrito real de Gesicomm — no programes uno propio.
- Links de navegación con data-gesicomm-link="catalogo" (y otros destinos internos que seas quieras agregar).`,
  },
  banner: {
    queConstruir: 'El banner principal (hero), primera pantalla después del header: titular fuerte orientado al beneficio, imagen/video editable y un CTA claro.',
    listas: `- Lista "banners_inicio": cada banner trae los binds "imagen", "video" (si es tipo video), "etiqueta", "titulo", "subtitulo", "cta_texto" y "enlace". El comercio los carga desde Mi Tienda; no inventes banners fijos.
- Si hay más de un banner, podés mostrar flechas/dots para navegarlos (son solo UI, no hace falta JS de carrusel propio si usás opacity/transform con CSS).`,
  },
  productos_categoria: {
    queConstruir: 'Vitrina de productos de esta sección (el comercio elige cuáles desde el panel). Puede tener buscador y tabs propios.',
    listas: `- Lista "productos_categoria": binds "etiqueta", "imagen", "categoria", "nombre", "descripcion", "precio", "precio_antes".
- data-gesicomm-ver en la tarjeta/imagen/nombre: abre la ficha del producto. data-gesicomm-comprar en el botón: agrega al carrito.
- Textos de título editables: data-gesicomm-venta="productos_categoria_kicker" / "_titulo" / "_subtitulo".`,
  },
  ofertas_urgencia: {
    queConstruir: 'Oferta flash con countdown: urgencia real + grilla de productos en oferta.',
    listas: `- Countdown: <div data-gesicomm-countdown><span data-gesicomm-countdown-parte="horas">:<span data-gesicomm-countdown-parte="minutos">:<span data-gesicomm-countdown-parte="segundos"></div> — NUNCA un countdown en JS propio ni una fecha fija.
- Textos editables: data-gesicomm-venta="urgencia_titulo" / "_texto" / "_cta".
- Lista "productos_ofertas" (SOLO productos con descuento real): binds "descuento", "imagen", "nombre", "precio", "precio_antes". data-gesicomm-ver y data-gesicomm-comprar en cada tarjeta.`,
  },
  confianza: {
    queConstruir: '3 tarjetas cortas (pago seguro, envío, cambios/devoluciones, soporte).',
    listas: `- Lista "confianza_inicio": binds "icono", "titulo", "texto". Normalmente son 3 tarjetas, pero no fuerces el número: el runtime clona lo que haya cargado.`,
  },
  testimonios: {
    queConstruir: 'Prueba social real: reseñas/opiniones de clientes, con estrellas si hay.',
    listas: `- Lista "testimonios_inicio": binds "estrellas", "comentario", "imagen", "nombre", "detalle".
- Textos editables: data-gesicomm-venta="testimonios_kicker" / "_titulo" / "_subtitulo".
- Si querés carrusel, podés usar botones "anterior/siguiente" y puntos, pero son opcionales — lo esencial es la lista. NUNCA inventes testimonios ni cifras si no hay datos reales: dejá un marcador visible "[Reemplazar por testimonio real]".`,
  },
  marca: {
    queConstruir: 'Bloque editorial "Nuestra marca": imagen/video + texto sobre la tienda.',
    listas: `- Lista "marca_medios": binds "imagen", "video".
- Lista "marca_badges" (insignias cortas, opcional): bind "texto".
- Textos editables: data-gesicomm-venta="marca_kicker" / "_titulo" / "_texto".`,
  },
  colecciones: {
    queConstruir: 'Grilla de colecciones/categorías visuales que llevan a su propia vista filtrada.',
    listas: `- Lista "categorias" (automática, según las categorías reales de los productos): binds "imagen", "nombre". Cada card con data-gesicomm-link="catalogo" (o su propia navegación de categoría) — no hardcodees categorías ni productos.`,
  },
};

/**
 * @param {string} tipo uno de los bloques movibles de Inicio o 'encabezado'.
 * @param {{tienda, venta, productos, base: {html, css, js}}} datos
 *   base: SIEMPRE el código actual de ESTA sección nomás (no de toda la página).
 *   No lleva el pedido del comercio como texto: el prompt le pide a la IA
 *   que lo pregunte ella misma (ver CONTRATO_BASE) — el comercio solo
 *   copia y pega, no escribe nada antes.
 */
export function armarPromptSeccionInicio(tipo, { tienda, venta, productos = [], base }) {
  const def = CONTRATO_POR_BLOQUE[tipo] || { queConstruir: `La sección "${tipo}" del Inicio.`, listas: '' };

  return `${CONTRATO_BASE}

## Qué tenés que construir
${def.queConstruir}

## Listas, binds y acciones de ESTE bloque (no uses otras)
${def.listas}

${REGLAS_COLOR}

${REGLAS_CLASES}

${REGLAS_CALIDAD}

${contexto({ tienda, venta, productos, maxProductos: 10 })}

${FORMATO_RESPUESTA}${bloqueCodigoBase(base, { compacto: false })}`;
}
