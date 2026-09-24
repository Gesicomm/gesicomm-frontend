import { contentIdPanel } from './datosRuntime';

/**
 * Prompts para generar el código del lienzo en blanco con una IA (ChatGPT,
 * Claude, Gemini…). El comercio copia, pega, y trae de vuelta HTML/CSS/JS.
 *
 * El prompt MAESTRO es el contrato: explica el runtime de Gesicomm
 * (runtimeGesicomm.js) con las mismas palabras que usa el código. Si se
 * agrega un atributo al runtime, se documenta acá; si no, ninguna IA lo va
 * a usar. Cada vista (inicio / ficha de producto) arma su prompt como
 * maestro + lo propio de esa vista + los productos reales de la landing.
 */

const TIPOS_VENTA = {
  catalogo: 'CATÁLOGO: varios productos en una grilla, cada uno con su ficha. El objetivo es que el visitante encuentre rápido lo que busca y compre.',
  producto_unico: 'PRODUCTO ÚNICO: una página de venta larga, enfocada en un solo producto (el principal). Todos los botones de compra apuntan a ese producto; el resto de la selección se muestra como complementos.',
  combos: 'COMBOS Y PACKS: la oferta principal son los combos. Hay que destacar el ahorro frente a comprar cada producto por separado y qué incluye cada combo.',
};

function formatearGs(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `Gs ${num.toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

export const PROMPT_MAESTRO = `Sos un desarrollador front-end senior y especialista en e-commerce para Paraguay. Vas a escribir una landing en HTML, CSS y JavaScript puros (sin frameworks ni librerías) que se publica en Gesicomm, una plataforma de ventas.

## Cómo funciona la página
- Tu código se muestra dentro de un iframe aislado. Gesicomm inyecta un "runtime" que carga los productos reales, maneja el carrito, el checkout (PagoPar o pago contra entrega), los pedidos y el tracking (Meta Pixel, Conversions API, Google Analytics).
- VOS NO programás carrito, checkout, precios ni tracking. Solo marcás el HTML con atributos data-gesicomm-* y el runtime hace el resto.
- NUNCA escribas productos, precios ni imágenes a mano: salen del catálogo. Si escribís un precio fijo, queda desactualizado.

## Listas (el runtime clona el <template> una vez por elemento)
<div data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar">
  <template>
    <article>
      <img data-gesicomm-bind="imagen" alt="">
      <h3 data-gesicomm-bind="nombre"></h3>
      <span data-gesicomm-bind="precio"></span>
      <button data-gesicomm-comprar>Comprar</button>
    </article>
  </template>
</div>

Valores de data-gesicomm-lista:
- "catalogo": LA GRILLA PRINCIPAL de la tienda. Puede tener miles de productos: Gesicomm la pagina y la filtra en el servidor. Usala siempre para "todos los productos" (ver "Catálogo navegable" abajo). Poné data-gesicomm-si-vacio="mostrar" para que no desaparezca cuando una búsqueda no encuentra nada.
- "productos": los primeros productos de la landing (destacados), productos y combos. Sirve para un hero o una franja de destacados, NO para listar todo el catálogo
- "solo_productos": solo productos
- "combos": solo combos
- "recomendados": productos sugeridos (en la ficha: relacionados con el producto actual)
- "ofertas_bump": (solo ficha) order bumps del producto actual — ver "Order bump" abajo
- "ofertas_upsell": NO la uses en la ficha. Los upsells los muestra Gesicomm como popup/etapa del checkout después de que el cliente completa sus datos.
- "ofertas_pack": (solo ficha) paquetes del mismo producto (Llevá 2, Llevá 3)
- "ofertas": (solo ficha) todas las anteriores juntas
- "variantes": (solo ficha) talles / colores del producto actual
- "imagenes": (solo ficha) galería del producto actual
Opcionales: data-gesicomm-limite="3", data-gesicomm-categoria="Nombre exacto de categoría".
Si una lista queda vacía, el elemento se oculta solo. Una sección entera puede llevar el mismo data-gesicomm-lista SIN <template> propio para ocultarse cuando no hay datos (por ejemplo, la sección de combos).
El <template> debe ser hijo directo (o nieto) del elemento con data-gesicomm-lista y tener UN elemento raíz.

## Catálogo navegable (para la lista "catalogo")
- <input type="search" data-gesicomm-buscar> → busca por nombre, categoría o marca (sin distinguir tildes).
- <select data-gesicomm-filtro="categoria"><option value="">Todas</option></select> → Gesicomm agrega las categorías reales.
- <select data-gesicomm-filtro="orden"> con opciones value="" (destacados), "min-max", "max-min", "az", "za".
- <button data-gesicomm-pagina="anterior"> y <button data-gesicomm-pagina="siguiente"> + <span data-gesicomm-paginacion> ("Página 2 de 9"); o en su lugar <button data-gesicomm-cargar-mas> ("Ver más productos").
- <p data-gesicomm-cargando style="display:none"> y <p data-gesicomm-sin-resultados style="display:none"> → Gesicomm los muestra cuando corresponde.
- data-gesicomm-total → "N productos disponibles" del catálogo filtrado.
- Estilá los botones de página con :disabled.
- IMPORTANTE: la grilla del catálogo se vuelve a pintar al buscar, filtrar o cambiar de página. No pongas en sus tarjetas clases de animación de aparición que arranquen invisibles (opacity: 0) y dependan de un observer que corre una sola vez: las tarjetas nuevas quedarían invisibles.

## Campos (data-gesicomm-bind)
nombre, descripcion, descripcion_larga, precio, precio_antes (tachado), descuento (ej. "-20%"), ahorro (en ofertas: "Ahorrás Gs 27.000"), imagen (en <img> pone el src; en otro elemento, background-image), categoria, etiqueta, stock, incluye (qué trae un combo), url.
- Dentro de un <template>, el campo es del elemento de esa lista.
- Fuera de una lista, en la FICHA, el campo es del producto que se está viendo.
- Si un campo no tiene dato (sin precio_antes, sin etiqueta), el elemento se oculta solo: no pongas texto de relleno.
Datos de la tienda: data-gesicomm-tienda="nombre|logo|email|telefono|whatsapp|direccion|instagram|facebook". El total de productos: data-gesicomm-total.

## Acciones (en botones o links)
- data-gesicomm-comprar → agrega al carrito y lo abre. Sin valor usa el producto de la tarjeta o de la ficha. Con valor apunta a uno fijo: data-gesicomm-comprar="ID".
- data-gesicomm-agregar → agrega sin abrir el carrito (muestra "Agregado").
- data-gesicomm-ver → abre la ficha del producto (cada producto tiene su propia página).
- data-gesicomm-inicio → vuelve al inicio.
- data-gesicomm-oferta → dentro de una lista de paquetes, agrega esa oferta al carrito. No lo uses para upsells en la ficha.
- <input type="checkbox" data-gesicomm-bump> → dentro de "ofertas_bump": marcada, la oferta se suma sola cuando se toca "Comprar" del producto. El runtime le pone la clase "is-checked" al elemento raíz del template: estilá ese estado.

## Order bump (lo que dicen los datos)
- Es una CASILLA, no un botón aparte, y va justo ARRIBA del botón de comprar de la ficha.
- Encabezado corto que lo haga notar (ej. "Oferta solo con esta compra"), borde que se distinga del resto, foto chica, el nombre, una sola frase de beneficio, precio, precio anterior tachado y el ahorro.
- Poco texto: dos o tres frases como máximo.
- Nunca marcada de antemano: la elige el cliente.
- Upsell y paquetes van DEBAJO del botón de compra, con su propio botón.
- Los botones de la lista "variantes" eligen la variante solos; el runtime les pone la clase "is-selected" y el atributo data-agotado si no hay stock. Estilá esos estados.
- <input type="number" data-gesicomm-cantidad-input> → cantidad en la ficha.
- data-gesicomm-whatsapp="texto opcional" → abre el WhatsApp de la tienda.
- data-gesicomm-evento="NombreEvento" → registra un evento de tracking propio (ej. clic en un CTA importante).
- <form data-gesicomm-form="contacto"> con inputs name="nombre", "telefono", "email", "mensaje" → se registra como Lead y abre WhatsApp con los datos. Poné dentro un mensaje de gracias con data-gesicomm-form-ok y style="display:none".
Un producto con variantes comprado desde una grilla lleva a su ficha para elegir la variante: no hace falta que lo resuelvas vos.

## JavaScript
- Tu JS corre DESPUÉS de que el runtime pintó las listas: podés hacer querySelectorAll sobre las tarjetas generadas.
- Tenés window.Gesicomm: productos, producto (en la ficha), recomendados, tienda, formatoPrecio(n), comprar(id), agregar(id), verProducto(id), whatsapp(texto), evento(nombre), renderizar(), toast(texto).
- PROHIBIDO (el guardado lo rechaza, también dentro de atributos onclick): fetch, XMLHttpRequest, WebSocket, EventSource, navigator.sendBeacon, localStorage, sessionStorage, indexedDB, document.cookie, postMessage, eval, new Function, import(), document.write, serviceWorker, y cualquier "parent.", "top." u "opener." — aunque sea la propiedad de otro objeto (rect.top.toFixed() también se rechaza: guardalo antes en una variable, const y = rect.top;). parentElement y parentNode sí se pueden usar.
- Los links a anclas (href="#seccion") scrollean dentro de la página; no hace falta JS para eso.

## Reglas de calidad
- Mobile first: la mayoría de las visitas llegan desde anuncios de Instagram/Facebook en el celular. Probá mentalmente en 375px.
- Español de Paraguay (voseo: "elegí", "comprá"), moneda guaraníes ("Gs 145.735", sin decimales). El runtime ya formatea los precios.
- Accesible: contraste AA, textos alternativos, botones reales (<button>) para acciones, foco visible.
- Nada de testimonios, cifras de ventas, garantías ni certificaciones inventadas: si hace falta, dejá un marcador visible "[Reemplazar por testimonio real]".
- Nada de urgencia falsa (contadores que se reinician, "quedan 2" inventado).
- Fuentes: podés usar Google Fonts con <link> en el HTML (no con @import en el CSS). No uses otros scripts externos.
- El footer tiene que tener estos links (son obligatorios para cobrar con PagoPar y para aprobar anuncios en Meta), escritos así, con su data-gesicomm-link: <a href="/contacto" data-gesicomm-link="contacto">, <a href="/politica-privacidad" data-gesicomm-link="politica-privacidad">, <a href="/terminos-servicio" data-gesicomm-link="terminos-servicio">, <a href="/politica-reembolso" data-gesicomm-link="politica-reembolso">, <a href="/politica-envio" data-gesicomm-link="politica-envio">, <a href="/aviso-legal" data-gesicomm-link="aviso-legal">. Gesicomm corrige la URL según dónde se publique la landing; no pongas dominios.

## Formato de tu respuesta
Devolvé exactamente tres bloques de código, en este orden: \`\`\`html (solo el contenido del <body>, sin <html>/<head>/<body>), \`\`\`css y \`\`\`js. Sin explicaciones entre medio.`;

function describirProducto(item, idx, principal) {
  const lineas = [
    `${idx + 1}. ${item.nombre}${principal ? '  ← PRODUCTO PRINCIPAL' : ''}`,
    `   ID: ${contentIdPanel(item)}`,
    `   Tipo: ${item.tipo === 'combo' ? 'combo' : 'producto'}`,
  ];
  if (item.categoria) lineas.push(`   Categoría: ${item.categoria}`);
  const precio = formatearGs(item.precio_efectivo ?? item.precio_usuario ?? item.precio_base ?? item.precio);
  if (precio) lineas.push(`   Precio de referencia: ${precio} (no lo escribas en el HTML)`);
  if (item.descripcion) lineas.push(`   Descripción: ${String(item.descripcion).slice(0, 400)}`);
  if (item.productos_incluidos?.length) lineas.push(`   Incluye: ${item.productos_incluidos.join(', ')}`);
  return lineas.join('\n');
}

// Con cientos de productos el prompt no puede llevarlos a todos: alcanza
// una muestra para que la IA entienda qué se vende y escriba los textos.
const MAX_PRODUCTOS_EN_PROMPT = 30;

function contexto({ tienda, venta, productos }) {
  const tipo = venta?.tipo || 'catalogo';
  const nombre = tienda?.nombre || 'la tienda';
  const muestra = productos.slice(0, MAX_PRODUCTOS_EN_PROMPT);
  const resto = productos.length - muestra.length;
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
  const lista = muestra.length
    ? muestra.map((p, i) => describirProducto(p, i, tipo === 'producto_unico' && i === 0)).join('\n\n')
      + (resto > 0 ? `\n\n… y ${resto} productos más (el catálogo completo lo carga Gesicomm, no lo escribas).` : '')
    : '(todavía no hay productos elegidos)';
  const lineaCategorias = categorias.length ? `\nCategorías: ${categorias.slice(0, 40).join(', ')}` : '';
  const extras = [];
  if (venta?.cross_sell?.activo !== false) extras.push('Ofertas ACTIVAS: en la ficha, "ofertas_bump" va ARRIBA del botón de compra; "ofertas_pack" puede ir debajo. NO pongas "ofertas_upsell" en la ficha: Gesicomm lo muestra como etapa del checkout.');
  else extras.push('Ofertas desactivadas: no incluyas ninguna lista de ofertas.');
  if (venta?.recomendados?.activo !== false) {
    extras.push(`Recomendados ACTIVOS: en la ficha incluí la lista "recomendados"${venta?.recomendados?.titulo ? ` con el título "${venta.recomendados.titulo}"` : ''}.`);
  } else {
    extras.push('Recomendados desactivados: no incluyas la lista "recomendados".');
  }

  return `## Esta tienda
Nombre: ${nombre}
Tipo de venta: ${TIPOS_VENTA[tipo] || TIPOS_VENTA.catalogo}
${extras.join('\n')}

## Productos de la landing (${productos.length})${lineaCategorias}
Usalos para entender QUÉ se vende y escribir los textos (titulares, beneficios, preguntas frecuentes). En el HTML no los escribas: van por las listas y los binds. Si necesitás apuntar a uno fijo, usá su ID.

${lista}`;
}

const VISTA_INICIO = {
  catalogo: `## Qué tenés que construir: la página de INICIO (catálogo)
Secciones, en este orden:
1. Barra de anuncio corta (envío / pago seguro).
2. Header con el nombre o logo de la tienda (data-gesicomm-tienda) y links a las secciones; en mobile, menú hamburguesa.
3. Hero con un titular fuerte orientado al beneficio y el producto destacado (lista "productos" con data-gesicomm-limite="1", clic → ficha).
4. Franja de confianza: pago seguro con PagoPar, envío, atención por WhatsApp.
5. Beneficios de comprar acá (3 tarjetas).
6. Catálogo (lista "catalogo") con buscador, filtro de categoría, orden y paginación (ver "Catálogo navegable"). Cada tarjeta: imagen, categoría, nombre, descripción corta, precio y precio tachado; la imagen y el nombre abren la ficha (data-gesicomm-ver) y el botón compra (data-gesicomm-comprar). Mostrá el total con data-gesicomm-total.
7. Sección de combos (lista "combos", que se oculta si no hay).
8. Prueba social con marcadores "[Reemplazar por testimonio real]".
9. Preguntas frecuentes en acordeón (cómo compro, cómo pago, envíos, cambios).
10. Contacto: botón de WhatsApp y formulario data-gesicomm-form="contacto".
11. Footer con los links legales.`,
  producto_unico: `## Qué tenés que construir: la PÁGINA DE VENTA del producto principal
Página larga tipo "sales page". TODOS los botones de compra usan data-gesicomm-comprar="ID_DEL_PRINCIPAL" (el ID está en la lista de productos).
1. Barra de anuncio.
2. Header mínimo (logo + un CTA "Comprar").
3. Hero: titular con la promesa principal, subtítulo, imagen del principal (data-gesicomm-bind dentro de una lista "productos" con data-gesicomm-limite="1"), precio, precio tachado y CTA.
4. El problema que resuelve y cómo lo resuelve.
5. Beneficios (4 a 6) con íconos en SVG inline.
6. Cómo se usa (3 pasos).
7. Prueba social con marcadores "[Reemplazar por testimonio real]".
8. Complementos: lista "recomendados" (el resto de la selección), con data-gesicomm-agregar.
9. Oferta final: repetir precio y CTA grande.
10. Preguntas frecuentes (objeciones: envío, pago, garantía, cambios).
11. Contacto por WhatsApp y footer con los links legales.
Poné un CTA fijo abajo en mobile (position: sticky/fixed) que compre el principal.`,
  combos: `## Qué tenés que construir: la página de INICIO de combos
1. Barra de anuncio con el beneficio de comprar en pack.
2. Header con logo y links.
3. Hero con el combo más fuerte (lista "combos" con data-gesicomm-limite="1"): nombre, qué incluye (bind "incluye"), precio, precio tachado y descuento.
4. Grilla de combos (lista "combos") mostrando "Incluye: …" y el ahorro (precio_antes + descuento).
5. "¿Preferís armarlo vos?": el catálogo completo (lista "catalogo") con buscador, categorías y paginación.
6. Por qué conviene el combo (3 beneficios).
7. Prueba social con marcadores "[Reemplazar por testimonio real]".
8. Preguntas frecuentes.
9. Contacto (WhatsApp + formulario data-gesicomm-form="contacto") y footer con links legales.`,
};

const VISTA_PRODUCTO = `## Qué tenés que construir: la FICHA DE PRODUCTO
Es UNA sola plantilla que Gesicomm usa para TODOS los productos: no escribas el nombre de ninguno. Todo sale de data-gesicomm-bind (fuera de listas = el producto que se está viendo).
1. Barra de anuncio y header (el logo vuelve al inicio con data-gesicomm-inicio).
2. Migas: Inicio (data-gesicomm-inicio) / categoría.
3. Dos columnas en desktop, una en mobile (order bump arriba del botón de compra; paquetes debajo si existen; upsell fuera de la ficha):
   - Galería: imagen principal (<img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal>) y miniaturas (lista "imagenes"; al tocarlas cambian la principal).
   - Info: categoría, nombre (h1), precio, precio tachado, descuento, descripción corta, variantes (lista "variantes" con título "Elegí una opción"; estilá .is-selected y [data-agotado]), cantidad (data-gesicomm-cantidad-input), botón grande "Comprar ahora" (data-gesicomm-comprar), "Agregar al carrito" (data-gesicomm-agregar) y "Consultar por WhatsApp" (data-gesicomm-whatsapp).
   - Justo ARRIBA del botón de compra: "ofertas_bump" (casilla, ver "Order bump").
   - Debajo del botón: solo "ofertas_pack" ("Llevá más y ahorrá"), con botón data-gesicomm-oferta. No agregues "Mejorá tu compra" ni "ofertas_upsell" en esta zona.
   - Mini garantías: pago seguro, envío, atención.
4. Descripción larga (bind "descripcion_larga", respetando saltos de línea con white-space: pre-line).
5. Recomendados (lista "recomendados") con data-gesicomm-agregar y data-gesicomm-ver.
6. Footer con los links legales.
En mobile, el botón de compra tiene que quedar a la vista (barra fija abajo).`;

function bloqueCodigoBase(base) {
  if (!base) return '';
  return `

## Código base
Partí de este código: ya respeta todo el contrato. Cambiá el diseño y los textos como quieras, pero mantené los atributos data-gesicomm-*.

\`\`\`html
${base.html}
\`\`\`

\`\`\`css
${base.css}
\`\`\`

\`\`\`js
${base.js}
\`\`\``;
}

/**
 * @param {'inicio'|'producto'} vista
 * @param {{tienda, venta, productos, estilo?: string, base?: {html, css, js}}} datos
 *   productos: items del catálogo del panel, en el orden de la landing.
 *   estilo: indicaciones libres de diseño que escribe el comercio.
 *   base: si viene, el prompt incluye el código base de esa vista.
 */
export function armarPromptVista(vista, { tienda, venta, productos = [], estilo = '', base = null }) {
  const especifico = vista === 'producto'
    ? VISTA_PRODUCTO
    : (VISTA_INICIO[venta?.tipo] || VISTA_INICIO.catalogo);
  const estiloTexto = estilo.trim()
    ? `\n\n## Estilo visual pedido\n${estilo.trim()}`
    : '\n\n## Estilo visual\nModerno, limpio y confiable, con un color de acento que combine con los productos. Tipografía legible, bordes redondeados y buen espacio en blanco.';
  return `${PROMPT_MAESTRO}

${contexto({ tienda, venta, productos })}

${especifico}${estiloTexto}${bloqueCodigoBase(base)}`;
}
