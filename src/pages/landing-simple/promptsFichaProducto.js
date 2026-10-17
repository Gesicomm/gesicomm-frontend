import { contexto } from './promptsCodigo';
import { REGLAS_COLOR, REGLAS_CALIDAD } from './promptsSeccionInicio';

/**
 * Prompt maestro de la FICHA DE PRODUCTO para "Instrucciones para la IA" de
 * Vista producto (InstruccionesIaFicha). Mismo flujo que las secciones del
 * Inicio (promptsSeccionInicio.js): el comercio copia, pega en ChatGPT /
 * Claude / Gemini, la IA le pregunta qué quiere cambiar y devuelve el
 * HTML/CSS/JS de la ficha entera, que se pega de vuelta en el panel.
 *
 * A diferencia de la página completa (promptsCodigo.js), acá la IA parte del
 * código ACTUAL de la ficha y tiene que conservar la conexión con el panel:
 * los data-gesicomm-ficha-bloque son los que dejan ocultar, ordenar y marcar
 * cada bloque desde Vista producto. Si se agrega un bloque al panel
 * (BLOQUES_FICHA_PANEL en PresentacionProducto.jsx) o un bind al runtime,
 * se documenta acá.
 */

const CONTRATO = `Sos un desarrollador front-end senior y especialista en conversión de e-commerce para Paraguay. Vas a rediseñar la FICHA DE PRODUCTO de una tienda que corre en Gesicomm, una plataforma de ventas. Es UNA plantilla: Gesicomm la llena con el producto que el visitante está mirando, así que el diseño vale para todos los productos de la tienda.

## MUY IMPORTANTE: no generes código todavía
Esto es el inicio de una conversación. Quien te pegó este mensaje todavía NO te dijo qué quiere cambiar. Tu PRIMERA respuesta tiene que ser preguntarle:
1. Qué quiere cambiar o qué no le gusta de cómo se ve hoy la ficha.
2. Cómo la quiere ver (estilo, sensación: minimalista, premium, llamativa, etc.) y si quiere cambiar el orden de los bloques.
3. Si tiene una imagen de referencia o una tienda que le guste, para que la suba o la describa.
NO generes HTML, CSS ni JavaScript en esa primera respuesta. Recién cuando te conteste, generás la ficha completa con el formato de abajo.

## Cómo funciona la página
- Tu código se muestra dentro de un iframe aislado. Gesicomm inyecta un "runtime" que llena los datos reales del producto, maneja el carrito, el checkout (pago anticipado con PagoPar o pago contra entrega), los pedidos y el tracking (Meta Pixel y Conversions API). Vos NO programás nada de eso: marcás el HTML con atributos data-gesicomm-* y el runtime hace el resto.
- data-gesicomm-bind="campo" pone un dato del producto en ese elemento (fuera de una lista = el producto de la ficha). Si el dato está vacío, el elemento se oculta solo: no escribas textos de relleno.
- data-gesicomm-lista="nombre" + un <template> adentro: el runtime clona el template por cada elemento de la lista. Si la lista está vacía, el contenedor se oculta. Conservá SIEMPRE el <template> y los binds de adentro.
- data-gesicomm-si="campo" muestra el elemento solo si el producto tiene ese dato; data-gesicomm-sin="campo" al revés.
- El <header> y el <footer> de la ficha se reemplazan por los del Inicio de la tienda (son globales): dejalos como están y no los rediseñes acá.
- NUNCA escribas a mano productos, precios, descuentos, imágenes, reseñas ni cifras: todo sale de los binds y las listas.

## La conexión con el panel (NO la rompas)
El comercio edita la ficha desde el panel "Vista producto" sin tocar código. Cada bloque del panel está atado a un elemento con data-gesicomm-ficha-bloque="clave": así el comercio puede ocultarlo ("Mostrar"), cambiarlo de lugar arrastrándolo y, en la vista previa, pasarle el mouse para ver cuál es y hacerle clic para editarlo. Por eso:
- Conservá CADA data-gesicomm-ficha-bloque con su misma clave, en el elemento que envuelve ese bloque (podés cambiar las etiquetas, las clases y el diseño de adentro).
- Los bloques 2 a 11 tienen que ser hijos DIRECTOS de un mismo contenedor con la clase "pdp-info" (la columna del producto). Los bloques 12 a 15 tienen que ser hijos DIRECTOS del <body>, después del <main>. Así funciona el orden que el comercio arma arrastrando. Podés presentarlos en el orden que te pidan, pero no los metas uno dentro de otro ni los mezcles entre grupos.
- Conservá <main ... data-gesicomm-base="producto"> tal cual.

## Los bloques de la ficha (número y nombre como en el panel)
1. Galería del producto — data-gesicomm-ficha-bloque="galeria". Imagen principal <img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal> y miniaturas en la lista "imagenes" (cada una con <img data-gesicomm-bind="imagen">; al tocarlas cambian la principal). Es lo primero que mira la gente: que sea grande.
2. Encabezado — "encabezado": bind "insignia_principal" (rótulo corto, por ejemplo la categoría o "Más vendido").
3. Nombre comercial — "nombre_comercial": el <h1> con bind "nombre".
4. Reseñas comerciales — "resenas_comerciales", con data-gesicomm-si="resenas_calificacion": estrellas con bind "resenas_estrellas" (el runtime pinta el relleno parcial, por ejemplo 4,8) y texto con bind "resenas_texto".
5. Precio y oferta — "precio": precio con bind "precio", tachado con bind "precio_antes" y, ADENTRO del mismo contenedor y en la misma fila, el badge "Ahorrás …" con bind "badge_precio" y data-gesicomm-ficha-bloque="badge_precio". El badge lo calcula Gesicomm (% en productos baratos, Gs en caros). En combos: <p data-gesicomm-si="precio_separado">Por separado: <s data-gesicomm-bind="precio_separado"></s></p> justo después.
6. Oferta por tiempo limitado — "oferta": textos con binds "urgencia_kicker" (data-gesicomm-ficha-bloque="oferta_encabezado"), "urgencia_titulo" ("oferta_nombre") y "urgencia_texto" ("oferta_texto"), y la cuenta regresiva <div data-gesicomm-countdown data-gesicomm-ficha-bloque="oferta_duracion"> con <b data-gesicomm-countdown-parte="horas"></b> y lo mismo para "minutos" y "segundos". La fecha real la configura el comercio: NUNCA un contador propio en JavaScript ni una fecha fija.
7. Descripción breve — "descripcion", en DOS elementos con la misma clave: la frase destacada (bind "propuesta_valor") y la descripción (bind "descripcion_ficha", respetá los saltos de línea con white-space: pre-line). La descripción va una sola vez.
8. Beneficios principales — "beneficios": <ul data-gesicomm-lista="beneficios" data-gesicomm-limite="4"> con <template><li data-gesicomm-bind="titulo"></li></template>, como checks rápidos antes de comprar.
9. Botones de contacto y pago — "contacto_pago", en TRES elementos con la misma clave:
   - La fila de compra: cantidad <input data-gesicomm-cantidad-input data-gesicomm-sin="tiene_paquetes"> (con paquetes, la cantidad la da el paquete) y el botón principal <button data-gesicomm-comprar data-gesicomm-boton-principal-pago data-gesicomm-metodo-pago="pagopar"> con <span data-gesicomm-cta data-gesicomm-bind="cta_texto"></span>, <small data-gesicomm-cta-descuento></small> y el total <span data-gesicomm-total></span>. Cantidad y botón van lado a lado. Si la tienda no tiene PagoPar conectado, Gesicomm cambia solo ese botón a pago contra entrega: no lo programes vos.
   - Botones de pago extra: lista "botones_pago_producto" (template con un <button> y binds "label" y "descuento_label"), por ejemplo "Pago contra entrega".
   - Botones de contacto: lista "botones_contacto_producto" (template con un <button> y bind "label"), por ejemplo "Consultar por WhatsApp".
10. Disponibilidad y medios de pago — "promociones_pago", en dos elementos: la lista "metodos_pago_producto" (bind "texto") y los logos <div data-gesicomm-si="pago_logos_activo"> con la lista "payment_logos" (binds "imagen" y "nombre").
11. Qué incluye tu pedido — "incluye": lista "incluye_pedido_producto" con un título y <template><li data-gesicomm-bind="texto"></li></template>.
12. Productos recomendados — "recomendados": <section> con data-gesicomm-lista="recomendados"; títulos con data-gesicomm-venta="recomendados_kicker", "recomendados_titulo" y "recomendados_subtitulo"; adentro otra lista "recomendados" con tarjetas: imagen y nombre con data-gesicomm-ver (abren la ficha de ese producto), binds "categoria", "nombre", "precio", "precio_antes", y botón <button data-gesicomm-agregar data-gesicomm-venta="recomendados_cta">.
13. Zona de confianza — "confianza": <section data-gesicomm-lista="confianza"> con tarjetas (binds "icono", "titulo", "texto").
14. Opiniones — "opiniones": <section data-gesicomm-lista="opiniones_producto"> con títulos (binds "opiniones_kicker", "opiniones_titulo", "opiniones_subtitulo") y tarjetas (binds "imagen", "estrellas", "comentario", "nombre", "detalle"). Son opiniones REALES que carga el comercio: nunca inventes testimonios.
15. Preguntas frecuentes — "preguntas": <section data-gesicomm-lista="preguntas"> con títulos (binds "preguntas_kicker", "preguntas_titulo", "preguntas_subtitulo") y <details><summary data-gesicomm-bind="pregunta"></summary><p data-gesicomm-bind="respuesta"></p></details>.
Todos los títulos y textos de arriba se editan desde el panel: si un texto tiene bind, no lo escribas fijo.

## El motor comercial (lo que hace vender a la ficha; conservalo)
Estos elementos no son bloques del panel pero son parte de la compra. Van dentro de "pdp-info", entre la descripción y el botón de compra:
- Combos: lista "combo_incluye" (qué trae el combo: binds "imagen", "nombre", "cantidad").
- Variantes (talle, color): lista "variantes" con <template><button data-gesicomm-bind="nombre"></button></template>. Estilá la elegida (.is-selected) y la agotada ([data-agotado]).
- Order bump: lista "ofertas_bump", JUSTO ARRIBA del botón de compra. Cada oferta es un <label> con <input type="checkbox" data-gesicomm-bump> y binds "imagen", "nombre", "precio", "precio_antes" y "ahorro". Marcada, se suma sola al comprar. Después, <p class="bump-incluye">Tu compra incluye <span data-gesicomm-bind="nombre"></span> + la oferta seleccionada.</p>
- "Elegí tu oferta": lista "paquetes". La raíz del template es un <button> (la tarjeta entera clickeable): el runtime le pone role="radio", aria-checked y la clase "is-selected"; estilá ese estado con un radio visible. Binds: "etiqueta", "imagen", "unidades_texto", "titulo", "precio", "por_unidad", "ahorro", "ahorro_pct", "precio_antes". Elegir el paquete ES elegir la cantidad.
- Debajo del <main>: "Llevalo en combo y ahorrá" con la lista "combos_producto" (tarjetas con data-gesicomm-ver y data-gesicomm-comprar). Si el código actual trae más secciones de combo, conservalas.
- En el celular: barra fija abajo (.sticky-compra) con el precio y un botón data-gesicomm-comprar, y padding-bottom en el body para que no tape contenido.
- No uses las listas "ofertas_pack" ni "ofertas_upsell" en la ficha (el upsell es una etapa del checkout). No escribas JavaScript de carrito, checkout, pagos, contadores ni tracking.

## Diseño
Mobile first: una columna en el celular (galería, después la columna del producto) y dos columnas en la computadora (galería a la izquierda, "pdp-info" a la derecha, la galería puede quedar fija con position: sticky). Precio grande y claro, un solo botón principal fuerte, todo lo demás secundario. Podés cambiar libremente las clases y el CSS: lo que conecta la ficha con los datos y el panel son los atributos data-gesicomm-*, no las clases (excepto "pdp-info", que se conserva). Si algún color tuyo no se aplica sobre clases genéricas como .button-primary o .product-card, usá clases propias.`;

const FORMATO = `## Formato de tu respuesta (recién cuando ya tengas la respuesta del comercio)
Devolvé la ficha COMPLETA (no solo lo que cambió) en un único bloque html, con todo el CSS dentro de <style> y el JavaScript dentro de <script>. Incluí el <header>, el <main>, las secciones de abajo, la barra fija del celular y el <footer>. Conservá el JavaScript actual si no lo cambiás. La persona copia y pega una sola respuesta; Gesicomm separa el código automáticamente. No entregues archivos ni bloques separados por lenguaje. Sin explicaciones entre medio.`;

function bloqueCodigoActual(base) {
  if (!base?.html) return '';
  return `

## Código actual de la ficha
Partí de este código: ya cumple todo el contrato de arriba. Cambiá el diseño y la estructura visual según lo que te pidan, pero conservá los atributos data-gesicomm-*.

\`\`\`html
${base.html}
${base.css ? `<style>\n${base.css}\n</style>` : ''}
${base.js ? `<script>\n${base.js}\n</script>` : ''}
\`\`\``;
}

/**
 * @param {{tienda, venta, productos, producto?, base: {html, css, js}}} datos
 *   productos: los de la landing (para que la IA entienda qué se vende).
 *   producto: el que el comercio tiene abierto en Vista producto, de ejemplo.
 *   base: el código ACTUAL de la ficha (la base de Gesicomm o el propio).
 */
export function armarPromptFichaProducto({ tienda, venta, productos = [], producto = null, base = null }) {
  const ejemplo = producto?.nombre
    ? `\n\n## Producto de ejemplo\nEl comercio está mirando la ficha de "${producto.nombre}". Usalo para imaginar cómo queda, pero el diseño es para todos los productos: no escribas su nombre ni sus datos en el HTML.`
    : '';
  return `${CONTRATO}

${REGLAS_COLOR}

${REGLAS_CALIDAD}

${contexto({ tienda, venta, productos, maxProductos: 10 })}${ejemplo}

${FORMATO}${bloqueCodigoActual(base)}`;
}

// Lo mínimo para que la ficha siga vendiendo. Sin esto la respuesta de la IA
// no se aplica: se pide que la corrija.
const ESENCIALES = [
  ['data-gesicomm-comprar', 'el botón de compra (data-gesicomm-comprar)'],
  ['data-gesicomm-imagen-principal', 'la imagen principal (data-gesicomm-imagen-principal)'],
  [/data-gesicomm-bind=["']nombre["']/, 'el nombre del producto (data-gesicomm-bind="nombre")'],
  [/data-gesicomm-bind=["']precio["']/, 'el precio (data-gesicomm-bind="precio")'],
  [/class=["'][^"']*\bpdp-info\b/, 'la columna del producto (class="pdp-info")'],
];

/** Lo esencial que falta en el HTML de una ficha (vacío = está todo). */
export function faltantesFicha(html) {
  const texto = String(html || '');
  return ESENCIALES
    .filter(([marca]) => (typeof marca === 'string' ? !texto.includes(marca) : !marca.test(texto)))
    .map(([, descripcion]) => descripcion);
}

/** Claves de bloque del panel que el HTML nuevo ya no trae. */
export function bloquesFichaFaltantes(html, claves) {
  const texto = String(html || '');
  return claves.filter(clave => !new RegExp(`data-gesicomm-ficha-bloque=["']${clave}["']`).test(texto));
}
