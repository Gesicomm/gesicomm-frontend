import { contentIdPanel } from './datosRuntime';

/**
 * Prompts para generar el código del lienzo en blanco con una IA (ChatGPT,
 * Claude, Gemini…). El comercio copia, pega, y trae de vuelta HTML/CSS/JS.
 *
 * El prompt MAESTRO es el contrato: explica el runtime de Gesicomm
 * (runtimeGesicomm.js) con las mismas palabras que usa el código. Si se
 * agrega un atributo al runtime, se documenta acá; si no, ninguna IA lo va
 * a usar. Cada vista (inicio / ficha / categoria / checkout) arma su prompt como
 * maestro + lo propio de esa vista + los productos reales de la landing.
 */

const TIPOS_VENTA = {
  catalogo: 'CATÁLOGO: varios productos en una grilla, cada uno con su ficha. El objetivo es que el visitante encuentre rápido lo que busca y compre.',
  producto_unico: 'DIRECTO EN UN PRODUCTO: la landing abre en la FICHA del producto principal (tráfico de anuncios). La ficha tiene que vender sola: beneficios, prueba, ofertas y compra sin salir de ella. Los otros productos aparecen como combos, ofertas o recomendados.',
  combos: 'CATÁLOGO con los combos primero: en la grilla, los combos van antes que los productos sueltos. Destacá el ahorro de cada combo y qué incluye.',
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
- Inicio, Categoría, Ficha y Checkout son vistas separadas. Generá SOLO la vista pedida; no juntes todas ni armes SPA. Navegá con data-gesicomm-ver, -categoria-ir, -checkout-ir e -inicio.

## Estrategia comercial que debe guiar el diseño
No armes una landing lineal de muchas secciones sueltas. Diseñá un sistema de compra conectado, inspirado en marketplaces grandes pero compatible con Gesicomm:
- Descubrimiento: hero/campañas, categorías visuales, vitrinas y módulos editoriales que ayuden a encontrar una necesidad.
- Entrada económica: destacá una solución de entrada o producto accesible cuando exista en el catálogo/ofertas, para convertir rápido y validar la necesidad del cliente.
- Expansión de margen: después de la entrada, mostrale complementos, combos, paquetes y productos relacionados de mayor valor usando listas reales (productos_manual, productos_destacados, combos, recomendados, combos_producto, paquetes, ofertas_bump).
- Recurrencia: agrupá por categorías, usos o problemas para que el cliente vuelva a explorar; no cierres todo en una única grilla interminable.
- Evaluación: cada tarjeta importante debe permitir ver la ficha; la ficha concentra variantes, precio, disponibilidad, confianza, paquetes y complementos.
- Pedido: carrito y checkout son del runtime de Gesicomm. El diseño acompaña el flujo, no lo reemplaza.

La referencia tipo Wayfair es de estructura, no de marca: podés tomar la lógica de cabecera fuerte, búsqueda dominante, departamentos/categorías, carruseles, filtros, ficha evaluativa, complementos y resumen de pedido, pero NO copies colores, nombres, sellos, membresías, crédito, reseñas, políticas ni promesas de Wayfair.

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
- "banners_inicio": banners promocionales configurados por el comercio en Inicio (campañas, banners intermedios, CTA visuales). Campos: titulo, subtitulo, etiqueta, cta_texto, imagen, tipo_medio, enlace. El comercio sube imágenes/GIF; los videos se cargan por URL. Si tipo_medio es "video", agregá un <video data-gesicomm-bind="video" muted autoplay loop playsinline>. Si es "imagen" o "gif", usá <img data-gesicomm-bind="imagen">. Usala para hero alternativo, carrusel o franja de banners; NO escribas banners fijos si el comercio pidió banners editables.
- "menu_categorias": categorías visibles elegidas por el comercio para el menú/acceso rápido. Campos: nombre, imagen, cantidad_texto. Al tocar una categoría, Gesicomm filtra el catálogo.
- "secciones_inicio": secciones comerciales configuradas por el comercio en Inicio (por categoría, ofertas, más vendidos curados, novedades, colecciones manuales). Campos: titulo, subtitulo, tipo_label. Dentro del template de cada sección, poné otra lista "productos_seccion" para que Gesicomm cargue los productos correctos de ESA sección.
- "productos_seccion": productos de la sección comercial actual. Solo se usa anidada dentro de una sección generada por "secciones_inicio".
- "categorias": lista automática de categorías detectadas en los productos seleccionados. Campos: nombre, imagen, cantidad_texto. Sirve para una grilla/menú visual cuando el usuario pide "dividí por categorías"; cada tarjeta puede llevar data-gesicomm-categoria-ir para entrar a su vista propia.
- "productos_destacados": productos marcados como destacados en "Configurar venta"; si no hay destacados, Gesicomm usa los primeros productos de la landing. Sirve para un hero o una franja destacada.
- "productos_ofertas": SOLO productos con descuento activo (precio anterior tachado real). Usala para una vitrina de "Ofertas" — nunca mezcles productos sin descuento ahí.
- "productos_novedades": productos ordenados del más reciente al más antiguo (fecha real en la que se agregaron a la landing). Usala para "Novedades" / "Recién llegados".
- "productos_manual": el comercio elige a mano, desde el panel del editor (no desde tu código), exactamente qué productos van. Usala para "Más vendidos" o cualquier vitrina curada — no necesitás poner ids vos, el editor ya se encarga.
- "productos": los primeros productos de la landing, productos y combos. Sirve para una franja breve, NO para listar todo el catálogo
- NO EXISTE una lista de "más vendidos" CALCULADA (el sistema todavía no cuenta ventas reales). Si te piden una vitrina de "Más vendidos", usá "productos_manual" (el comercio la carga a mano después) — nunca inventes un orden por ventas que no existe.
- "solo_productos": solo productos
- "combos": solo combos
- "combos_producto": (solo ficha) los combos que traen el producto que se está viendo ("Llevalo en combo y ahorrá"). Ponelo en la ficha, debajo de la compra
- "recomendados": productos sugeridos (en la ficha: relacionados con el producto actual)
- "ofertas_bump": (solo ficha) order bumps del producto actual — ver "Order bump" abajo
- "ofertas_upsell": NO la uses en la ficha. Los upsells los muestra Gesicomm como popup/etapa del checkout después de que el cliente completa sus datos.
- "paquetes": (solo ficha) "Elegí tu oferta": 1 unidad + los paquetes del mismo producto (Pack x2, Pack x3), ver la ficha más abajo
- "ofertas_pack": (vieja, no la uses) los mismos paquetes como lista suelta
- "ofertas": (solo ficha) todas las anteriores juntas
- "variantes": (solo ficha) talles / colores del producto actual
- "imagenes": (solo ficha) galería del producto actual
- "estadisticas": prueba social cuantitativa ("94% se sintió más liviano", "+2.300 clientes") — ver "Urgencia y prueba social" más abajo. NUNCA escribas la cifra fija en el HTML, siempre por esta lista.
- "checkout_items": (solo checkout) productos actuales del carrito. Campos: imagen, nombre, variante, precio_unitario, cantidad, subtotal.
Opcionales: data-gesicomm-limite="3", data-gesicomm-categoria="Nombre exacto de categoría".
Si una lista queda vacía, el elemento se oculta solo. Una sección entera puede llevar el mismo data-gesicomm-lista SIN <template> propio para ocultarse cuando no hay datos (por ejemplo, la sección de combos).
El <template> debe ser hijo directo (o nieto) del elemento con data-gesicomm-lista y tener UN elemento raíz.

## Motor comercial editable de Inicio
El comercio puede configurar Inicio desde Gesicomm: banners, categorías, vitrinas por categoría, ofertas, novedades, colecciones y más vendidos curados. Tu diseño puede mostrarlo como carrusel, grilla, filas horizontales, editorial, masonry o cualquier composición, pero mantené estas primitivas:

- Banners editables:
  <section data-gesicomm-lista="banners_inicio"><template>...</template></section>
  Usá binds "titulo", "subtitulo", "etiqueta", "cta_texto", "imagen", "video" y "enlace". El enlace puede ser un destino interno como #ofertas, #productos, #categorias, #mas-vendidos, #novedades o #colecciones.
- Menú/categorías editables:
  <nav data-gesicomm-lista="menu_categorias"><template>...</template></nav>
  Usá binds "nombre", "imagen", "cantidad_texto". No hardcodees categorías si el usuario pidió que sean configurables.
- Grilla automática de categorías:
  <section data-gesicomm-lista="categorias"><template>...</template></section>
  Usala si el usuario pide "separá por categorías", "mostrá rubros", "quiero entrar a cada categoría" o si la selección viene por categoría. Cada item ya puede navegar a la vista propia de esa categoría con data-gesicomm-categoria-ir.
- Secciones comerciales editables:
  <div data-gesicomm-lista="secciones_inicio">
    <template>
      <section>
        <h2 data-gesicomm-bind="titulo"></h2>
        <p data-gesicomm-bind="subtitulo"></p>
        <div data-gesicomm-lista="productos_seccion"><template>tarjeta de producto</template></div>
      </section>
    </template>
  </div>
  El runtime decide qué productos van en cada sección según la configuración del comercio. No escribas IDs ni categorías dentro del HTML para esas secciones.

### Cuando el Inicio se pide dividido por categorías
- Si el usuario dice "dividí por categorías", "agrupá por categorías", "quiero categorías arriba y productos abajo", "separá electrónica, hogar, etc.", NO escribas secciones fijas con nombres inventados.
- Para navegación visual usá "menu_categorias" o "categorias" con binds "nombre", "imagen" y "cantidad_texto"; el click entra a la vista propia de esa categoría.
- Para vitrinas por categoría usá "secciones_inicio" y dentro "productos_seccion". Esa combinación es la que respeta la configuración del comercio y los productos reales.
- Mantené también un catálogo completo "catalogo" con búsqueda, filtro de categoría y orden, porque el cliente puede querer ver todo junto aunque la home esté agrupada.
- Si la selección de venta es "POR CATEGORÍA", las categorías del contexto son especialmente importantes: usalas para copy y jerarquía visual, pero seguí dejando los nombres/datos reales a los binds.

### Estructura marketplace para Inicio
Cuando el comercio pida una home "tipo marketplace", "tipo Wayfair", "con categorías", "por departamentos", "más profesional" o "más e-commerce", armá una arquitectura modular:
1. Header por capas: barra superior breve, logo/nombre, buscador dominante con data-gesicomm-buscar si hay catálogo, acceso a carrito y navegación por categorías. En mobile, buscador en segunda línea y navegación compacta.
2. Hero/campaña editable: usá "banners_inicio" si hay banners; si no, un hero con productos_destacados o copy general sin precios fijos.
3. Categorías/departamentos: "menu_categorias" o "categorias" como tarjetas con imagen/nombre/cantidad_texto y navegación a la vista propia de categoría.
4. Vitrinas compactas: productos_destacados, productos_ofertas, productos_novedades y productos_manual según lo pedido. Cada vitrina debe ocultarse si no tiene datos.
5. Escalera de compra: mostrar una entrada accesible/oferta, luego complementos/combos o colecciones de mayor ticket. No afirmar "mayor margen" al cliente; eso es estrategia interna.
6. Catálogo completo: lista "catalogo" con búsqueda, filtro categoría, orden, total, estados de carga/vacío y paginación.
7. Cierre de confianza y footer legal.

No implementes favoritos, reseñas, comparación avanzada, financiación, membresía, impuestos o entregas calculadas si Gesicomm no provee esos datos. Si el usuario los pide, dejá estructura visual ligera solo si tiene datos reales o indicalo como módulo que requiere soporte del sistema.

Si el usuario te pide "mostralo de otra manera", cambiá diseño, layout, textos envolventes, estilos y orden visual, pero NO elimines los atributos data-gesicomm-* del motor. Si querés ocultar una parte, hacelo por diseño o movela, no reemplazándola por contenido fijo.

## Catálogo navegable (para la lista "catalogo")
- <input type="search" data-gesicomm-buscar> → busca por nombre, categoría o marca (sin distinguir tildes).
- <select data-gesicomm-filtro="categoria"><option value="">Todas</option></select> → Gesicomm agrega las categorías reales. En la vista propia de una categoría NO hace falta este select salvo que quieras permitir saltar a otra categoría: esa página ya entra filtrada por su categoría.
- <select data-gesicomm-filtro="orden"> con opciones value="" (destacados), "min-max", "max-min", "az", "za".
- <button data-gesicomm-pagina="anterior"> y <button data-gesicomm-pagina="siguiente"> + <span data-gesicomm-paginacion> ("Página 2 de 9"); o en su lugar <button data-gesicomm-cargar-mas> ("Ver más productos").
- <p data-gesicomm-cargando style="display:none"> y <p data-gesicomm-sin-resultados style="display:none"> → Gesicomm los muestra cuando corresponde.
- data-gesicomm-total → "N productos disponibles" del catálogo filtrado.
- Estilá los botones de página con :disabled.
- IMPORTANTE: la grilla del catálogo se vuelve a pintar al buscar, filtrar o cambiar de página. No pongas en sus tarjetas clases de animación de aparición que arranquen invisibles (opacity: 0) y dependan de un observer que corre una sola vez: las tarjetas nuevas quedarían invisibles.

## Campos (data-gesicomm-bind)
nombre, descripcion, descripcion_larga, precio, precio_antes (tachado), descuento (ej. "-20%"), ahorro (en ofertas: "Ahorrás Gs 27.000"), imagen (en <img> pone el src; en otro elemento, background-image), categoria, categoria_url, etiqueta, stock, incluye (qué trae un combo), url, valor (solo dentro de la lista "estadisticas"), precio_unitario, cantidad, subtotal (estos últimos dentro de "checkout_items").
- Dentro de un <template>, el campo es del elemento de esa lista.
- Fuera de una lista, en la FICHA, el campo es del producto que se está viendo.
- Si un campo no tiene dato (sin precio_antes, sin etiqueta), el elemento se oculta solo: no pongas texto de relleno.
Datos de la tienda: data-gesicomm-tienda="nombre|logo|email|telefono|whatsapp|direccion|instagram|facebook|tiktok". El total de productos: data-gesicomm-total.
Redes sociales: poné un contenedor vacío <div data-gesicomm-redes></div> (en el footer y/o en la sección de contacto). Gesicomm lo llena con un <a class="gc-red gc-red--instagram"> por cada red que la tienda cargó en su configuración (WhatsApp, Instagram, Facebook, TikTok, YouTube, X) y lo oculta si no hay ninguna. Estilá .gc-red (y .gc-red--whatsapp, etc. si querés colores por red). NUNCA escribas usuarios ni links de redes a mano, ni un título "Redes sociales" suelto fuera de ese contenedor: si la tienda no tiene redes quedaría vacío.

## Acciones (en botones o links)
- data-gesicomm-comprar → agrega al carrito y lo abre. Sin valor usa el producto de la tarjeta o de la ficha. Con valor apunta a uno fijo: data-gesicomm-comprar="ID".
- data-gesicomm-agregar → agrega sin abrir el carrito (muestra "Agregado").
- data-gesicomm-carrito → abre el carrito real de Gesicomm. Usalo en el header o botones "Ver carrito"; no programes tu propio carrito.
- data-gesicomm-checkout-ir → lleva a la página de checkout propia.
- data-gesicomm-categoria-ir → dentro de una tarjeta o item de categoría, lleva a la vista propia de esa categoría. También podés usar data-gesicomm-categoria en listas si querés mostrar una categoría concreta.
- data-gesicomm-ver → abre la ficha del producto (cada producto tiene su propia página).
- En tarjetas de producto (catálogo, destacados, recomendados, combos) poné data-gesicomm-ver en la tarjeta entera o al menos en la imagen y el nombre. Si también querés compra rápida, agregá un botón secundario con data-gesicomm-agregar o data-gesicomm-comprar; no dejes una tarjeta con solo "Agregar", porque el visitante no podría ver la ficha.
- Tarjetas clickeables: usá cursor:pointer, hover/focus visible (elevación, borde, sombra o texto "Ver detalle") y mantené el botón "Agregar" como acción secundaria. Si el producto tiene varias imágenes, Gesicomm marca la tarjeta con data-gesicomm-carrusel y rota la imagen en hover/focus/touch; podés estilizar [data-gesicomm-carrusel].is-previewing img para que se sienta como carrusel sin escribir JavaScript extra.
- data-gesicomm-inicio → vuelve al inicio.
- data-gesicomm-oferta → dentro de una lista de paquetes, agrega esa oferta al carrito. No lo uses para upsells en la ficha.
- <input type="checkbox" data-gesicomm-bump> → dentro de "ofertas_bump": marcada, la oferta se suma sola cuando se toca "Comprar" del producto. El runtime le pone la clase "is-checked" al elemento raíz del template: estilá ese estado.

## Urgencia (countdown) y prueba social (estadísticas)
Se pueden mostrar, pero SIEMPRE con primitivas de Gesicomm — nunca como texto fijo
que vos escribas dentro del HTML:

- Countdown de oferta: <div data-gesicomm-countdown><span data-gesicomm-countdown-parte="horas"></span>:<span data-gesicomm-countdown-parte="minutos"></span>:<span data-gesicomm-countdown-parte="segundos"></span></div>. Podés incluirlo cuando la landing lo necesite; el runtime lo pinta aunque el comercio todavía no haya cargado una fecha real. NUNCA escribas una fecha, un texto de tiempo restante ni JS de cuenta regresiva.
- Textos editables del countdown global: usá data-gesicomm-venta="urgencia_titulo", data-gesicomm-venta="urgencia_texto" y data-gesicomm-venta="urgencia_cta" si querés que el comercio pueda cambiar el copy desde Gesicomm.
- Estadísticas: usá la lista "estadisticas" de arriba, con binds "valor" ("94%") y "etiqueta" ("se sintió más liviano"). Si son datos generados por IA o de ejemplo, Gesicomm muestra una advertencia al publicar para que el comercio acepte conscientemente o cargue datos reales.

Diseñá estos bloques con la forma que quieras (el comercio va a ver un ejemplo mientras no
confirme sus datos reales), pero nunca reemplaces la primitiva por texto fijo.

NUNCA pongas el contenedor completo de "estadisticas" dos veces en el documento (ej. una vez como
"rating" arriba del hero y otra vez en una sección de prueba social): el runtime clona los 2 a 4
items en CADA contenedor con ese atributo, así que un "rating" en el hero termina mostrando las
mismas 2 a 4 cifras con sus estrellas repetidas, no un rating único. Dejalo una sola vez. Si el
hero quiere una insignia de confianza, usá texto fijo sin número ("★★★★★ Calificado por nuestros
clientes") — eso no es una cifra, así que no necesita confirmación.

## Order bump (lo que dicen los datos)
- Es una CASILLA, no un botón aparte, y va justo ARRIBA del botón de comprar de la ficha.
- TODA la tarjeta es la casilla: envolvela en un <label> con el <input type="checkbox" data-gesicomm-bump> adentro (podés ocultarlo visualmente y dibujar un control propio). Hover con cursor pointer.
- Jerarquía: encabezado con el beneficio económico ("Oferta exclusiva · " + bind "ahorro"), después "Sumalo a tu pedido por solo " + precio, foto de 56–72px (que se reconozca el producto), el nombre, precio y precio anterior tachado. Nada de claims de salud exagerados.
- Estado marcado MUY evidente: el runtime pone la clase "is-checked" en la tarjeta (o usá :has(:checked)). Cambiá el encabezado a "✓ Oferta agregada a tu pedido", el borde a sólido y el control a "✓ Oferta agregada · Quitar". No alcanza con un ☑.
- Poné <span data-gesicomm-total></span> dentro del botón de comprar ("Comprar ahora · Gs 40.000"): el runtime lo actualiza en vivo con la cantidad y los bumps marcados ("· Gs 160.000").
- "Agregar al carrito" y "Consultar por WhatsApp" van como caminos secundarios livianos (links o botones fantasma), para que no compitan con la compra y el bump.
- Poco texto: dos o tres frases como máximo.
- Nunca marcada de antemano: la elige el cliente.
- Upsell y paquetes van DEBAJO del botón de compra, con su propio botón.
- Los botones de la lista "variantes" eligen la variante solos; el runtime les pone la clase "is-selected" y el atributo data-agotado si no hay stock. Estilá esos estados.
- <input type="number" data-gesicomm-cantidad-input> → cantidad en la ficha.
- data-gesicomm-whatsapp="texto opcional" → abre el WhatsApp de la tienda.
- data-gesicomm-evento="NombreEvento" → registra un evento de tracking propio (ej. clic en un CTA importante).
- <form data-gesicomm-form="contacto"> con inputs name="nombre", "telefono", "email", "mensaje" → se registra como Lead y abre WhatsApp con los datos. Poné dentro un mensaje de gracias con data-gesicomm-form-ok y style="display:none".
Un producto con variantes comprado desde una grilla lleva a su ficha para elegir la variante: no hace falta que lo resuelvas vos.

## Checkout propio
Si estás diseñando la vista de checkout:
- NO programes un checkout paralelo. Usá <form data-gesicomm-checkout-form> y Gesicomm confirma el pedido.
- Campos reconocidos: name="nombre_cliente", "telefono", "ciudad", "direccion", "documento", "payment_method", "notas". Nombre, telefono, ciudad y direccion deberían ser required.
- Resumen: usá la lista "checkout_items" y los binds imagen, nombre, variante, precio_unitario, cantidad, subtotal.
- Totales/estado: data-gesicomm-checkout="subtotal|cantidad|total|mensaje|estado".
- Bloques de estado: data-gesicomm-checkout-con-items se muestra cuando hay carrito; data-gesicomm-checkout-vacio se muestra cuando no hay productos.
- El botón final es submit del formulario. No uses links a pasarelas ni scripts externos.

## JavaScript
- Tu JS corre DESPUÉS de que el runtime pintó las listas: podés hacer querySelectorAll sobre las tarjetas generadas.
- Tenés window.Gesicomm: productos, producto (en la ficha), recomendados, tienda, formatoPrecio(n), comprar(id), agregar(id), verProducto(id), whatsapp(texto), evento(nombre), renderizar(), toast(texto).
- PROHIBIDO (el guardado lo rechaza, también dentro de atributos onclick): fetch, XMLHttpRequest, WebSocket, EventSource, navigator.sendBeacon, localStorage, sessionStorage, indexedDB, document.cookie, postMessage, eval, new Function, import(), document.write, serviceWorker, y cualquier "parent.", "top." u "opener." — aunque sea la propiedad de otro objeto (rect.top.toFixed() también se rechaza: guardalo antes en una variable, const y = rect.top;). parentElement y parentNode sí se pueden usar.
- Los links a anclas (href="#seccion") scrollean dentro de la página; no hace falta JS para eso.

## Colores (obligatorio)
Definí la paleta con estas variables CSS exactas en :root y usalas en todo el CSS; el carrito y el checkout de Gesicom las leen para pintarse con los mismos colores de la página:
:root { --gc-primario: #xxxxxx; --gc-texto-sobre-primario: #xxxxxx; --gc-fondo: #xxxxxx; --gc-texto: #xxxxxx; }
(botones y acentos / texto encima del primario / fondo principal sólido / texto principal). Poné background: var(--gc-fondo) y color: var(--gc-texto) en el body. Podés sumar variables propias, pero estas cuatro tienen que existir con estos nombres.
Los colores de la marca los define la tienda (Mi Tienda → Branding, ver "Esta tienda") y la landing TIENE que usarlos. Gesicomm los inyecta ya combinados entre sí (el texto siempre es legible sobre su fondo, sea claro u oscuro):
- --tienda-primario, --tienda-texto-sobre-primario → botones y acentos
- --tienda-primario-texto → el primario cuando se usa como color de texto (links, íconos)
- --tienda-secundario, --tienda-texto-sobre-secundario → segundo color de la marca: usalo en etiquetas, badges, destacados, íconos
- --tienda-destacado → el secundario como color de texto (etiquetas sobre el fondo, "Ahorrás…")
- --tienda-fondo, --tienda-texto, --tienda-texto-suave → fondo de la página y sus textos
- --tienda-superficie, --tienda-linea → tarjetas y bordes
- --tienda-banda, --tienda-banda-texto → barras y secciones que se distinguen del fondo (barra superior, oferta final)
Usalos siempre con un hex de respaldo, así la landing sigue a la tienda si cambia su Branding:
:root { --gc-primario: var(--tienda-primario, #hex); --gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #hex); --gc-fondo: var(--tienda-fondo, #hex); --gc-texto: var(--tienda-texto, #hex); }
El fondo y el texto van SIEMPRE juntos (--tienda-fondo con --tienda-texto; tarjetas con --tienda-superficie y --tienda-texto): nunca mezcles uno de la tienda con uno fijo tuyo. No inventes otra paleta de marca.
Todas las secciones (incluido el footer) tienen que verse sobre el fondo de la página con buen contraste: si una sección usa un fondo propio (por ejemplo un footer oscuro), sus textos y links tienen que tener su propio color claro.
El logo va con <img data-gesicomm-tienda="logo" alt=""> y el nombre con <span data-gesicomm-tienda="nombre"></span>: no los escribas a mano.

## Reglas de calidad
- Mobile first: la mayoría de las visitas llegan desde anuncios de Instagram/Facebook en el celular. Probá mentalmente en 375px.
- Español de Paraguay (voseo: "elegí", "comprá"), moneda guaraníes ("Gs 145.735", sin decimales). El runtime ya formatea los precios.
- Accesible: contraste AA, textos alternativos, botones reales (<button>) para acciones, foco visible.
- Nada de testimonios con nombre de una persona inventada, garantías ni certificaciones inventadas: si hace falta, dejá un marcador visible "[Reemplazar por testimonio real]". "Quedan 2 unidades" inventado también sigue prohibido.
- No agregues banners, alertas ni disclaimers legales visibles dentro de la landing sobre "experiencias mostradas", "resultados pueden variar" o contenido generado por IA. Gesicomm ya maneja esas advertencias en el editor y en las páginas legales; la landing comercial no debe mostrar ese aviso.
- El único contenido de ejemplo permitido es el de "Urgencia y prueba social" de arriba — y solo usando esas primitivas, nunca una fecha o cifra fija en el HTML.
- Fuentes: podés usar Google Fonts con <link> en el HTML (no con @import en el CSS). No uses otros scripts externos.
- El footer tiene que tener estos links (son obligatorios para cobrar con PagoPar y para aprobar anuncios en Meta), escritos así, con su data-gesicomm-link: <a href="/contacto" data-gesicomm-link="contacto">, <a href="/politica-privacidad" data-gesicomm-link="politica-privacidad">, <a href="/terminos-servicio" data-gesicomm-link="terminos-servicio">, <a href="/politica-reembolso" data-gesicomm-link="politica-reembolso">, <a href="/politica-envio" data-gesicomm-link="politica-envio">, <a href="/aviso-legal" data-gesicomm-link="aviso-legal">. Gesicomm corrige la URL según dónde se publique la landing; no pongas dominios. En el footer poné también el contenedor de redes <div data-gesicomm-redes></div>.

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
  // Lo cargado en Productos → Vista del producto: la IA escribe con esto, no inventa.
  if (item.propuesta_valor) lineas.push(`   Propuesta de valor: ${String(item.propuesta_valor).slice(0, 300)}`);
  const beneficios = (Array.isArray(item.beneficios) ? item.beneficios : []).map(b => b?.titulo).filter(Boolean);
  if (beneficios.length) lineas.push(`   Beneficios: ${beneficios.slice(0, 8).join(' · ')}`);
  if (item.sobre_este_producto) lineas.push(`   Sobre el producto: ${String(item.sobre_este_producto).slice(0, 600)}`);
  const preguntas = (Array.isArray(item.preguntas_frecuentes) ? item.preguntas_frecuentes : []).length;
  if (preguntas) lineas.push(`   Tiene ${preguntas} preguntas frecuentes cargadas (lista "preguntas").`);
  return lineas.join('\n');
}

// Con cientos de productos el prompt no puede llevarlos a todos: alcanza
// una muestra para que la IA entienda qué se vende y escriba los textos.
const MAX_PRODUCTOS_INICIO_PROMPT = 30;
const MAX_PRODUCTOS_FICHA_PROMPT = 10;
const MAX_BASE_COMPLETA_PROMPT = 14000;

function resumenCategorias(productos) {
  const grupos = new Map();
  for (const p of productos) {
    const nombre = p.categoria || 'Sin categoría';
    const actual = grupos.get(nombre) || { total: 0, ejemplos: [] };
    actual.total += 1;
    if (actual.ejemplos.length < 4 && p.nombre) actual.ejemplos.push(p.nombre);
    grupos.set(nombre, actual);
  }
  return [...grupos.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0], 'es'))
    .slice(0, 30)
    .map(([cat, info]) => `- ${cat}: ${info.total} producto${info.total === 1 ? '' : 's'}${info.ejemplos.length ? ` (ej.: ${info.ejemplos.join(', ')})` : ''}`)
    .join('\n');
}

function resumenSeleccionVenta(venta, productos) {
  const modo = venta?.seleccion || 'manual';
  const categoriasElegidas = Array.isArray(venta?.categorias) ? venta.categorias.filter(Boolean) : [];
  const inicio = venta?.inicio || {};
  const categoriasMenu = Array.isArray(inicio.categorias) ? inicio.categorias.filter(Boolean) : [];
  const secciones = Array.isArray(inicio.secciones) ? inicio.secciones.filter(s => s?.activo !== false && s?.titulo) : [];
  const partes = [];
  if (modo === 'todos') partes.push('Selección de venta: TODOS los productos del catálogo de esta landing.');
  else if (modo === 'categoria') partes.push(`Selección de venta: POR CATEGORÍA${categoriasElegidas.length ? ` (${categoriasElegidas.join(', ')})` : ''}.`);
  else partes.push('Selección de venta: productos elegidos manualmente.');
  if (productos.some(p => p.categoria)) {
    partes.push(`Categorías detectadas y ejemplos:\n${resumenCategorias(productos)}`);
  }
  if (inicio.menu_categorias !== false) {
    partes.push(categoriasMenu.length
      ? `Menú visual de categorías configurado: ${categoriasMenu.join(', ')}.`
      : 'Menú visual de categorías activo: Gesicomm puede armarlo automáticamente con las categorías de los productos seleccionados.');
  } else {
    partes.push('Menú visual de categorías desactivado por el comercio.');
  }
  if (secciones.length) {
    partes.push(`Secciones de Inicio configuradas: ${secciones.map(s => `${s.titulo}${s.tipo === 'categoria' && s.categoria ? ` (${s.categoria})` : ''}`).join(' · ')}.`);
  } else {
    partes.push('No hay secciones comerciales manuales configuradas todavía; si el usuario pide dividir por categorías, usá secciones dinámicas por categoría con las primitivas del runtime.');
  }
  return partes.join('\n');
}

function estrategiaMarketplace(venta, productos) {
  const tieneCategorias = productos.some(p => p.categoria);
  const tieneCombos = productos.some(p => p.tipo === 'combo');
  const tieneOfertas = productos.some(p => Number(p.precio_antes || p.precio_tachado || 0) > Number(p.precio_efectivo || p.precio_usuario || p.precio_base || p.precio || 0));
  const partes = [
    'Arquitectura recomendada: descubrimiento visual → navegación por categorías → solución de entrada/oferta → complementos/combos → catálogo completo → ficha evaluativa → carrito/checkout real.',
  ];
  if (tieneCategorias) partes.push('Hay categorías reales: conviene usarlas como departamentos, accesos visuales y secciones de exploración.');
  if (tieneOfertas) partes.push('Hay productos con precio anterior/oferta: pueden funcionar como entrada económica sin escribir precios a mano.');
  if (tieneCombos) partes.push('Hay combos: úsalos para aumentar ticket promedio y mostrar valor agrupado.');
  if (venta?.tipo === 'producto_unico') partes.push('La venta abre en producto principal: el inicio debe acompañar con complementos y recomendados, no competir con la ficha.');
  return partes.join('\n');
}

function contexto({ tienda, venta, productos, maxProductos = MAX_PRODUCTOS_INICIO_PROMPT }) {
  const tipo = venta?.tipo || 'catalogo';
  const nombre = tienda?.nombre || 'la tienda';
  const muestra = productos.slice(0, maxProductos);
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

  const marca = [
    tienda?.color_primario && `principal ${tienda.color_primario}`,
    tienda?.color_secundario && `secundario ${tienda.color_secundario}`,
    tienda?.color_fondo && `fondo de marca ${tienda.color_fondo}`,
  ].filter(Boolean).join(', ');

  return `## Esta tienda
Nombre: ${nombre}
${marca ? `Colores de la marca (Mi Tienda → Branding): ${marca}.\n` : ''}${tienda?.logo_imagen ? 'Tiene logo cargado: mostralo en el header.\n' : ''}Tipo de venta: ${TIPOS_VENTA[tipo] || TIPOS_VENTA.catalogo}
${extras.join('\n')}

## Productos de la landing (${productos.length})${lineaCategorias}
Usalos para entender QUÉ se vende y escribir los textos (titulares, beneficios, preguntas frecuentes). En el HTML no los escribas: van por las listas y los binds. Si necesitás apuntar a uno fijo, usá su ID.

## Selección y categorías
${resumenSeleccionVenta(venta, productos)}

## Estrategia marketplace / escalera comercial
${estrategiaMarketplace(venta, productos)}

${lista}`;
}

const VISTA_INICIO = {
  catalogo: `## Qué tenés que construir: la página de INICIO (catálogo)
Secciones, en este orden:
1. Barra de anuncio corta (envío / pago seguro).
2. Header tipo e-commerce: nombre o logo de la tienda (data-gesicomm-tienda), buscador dominante cuando haya catálogo, acceso visible al carrito, navegación por categorías/departamentos y versión compacta en mobile.
3. Motor comercial de Inicio:
   - banners editables con "banners_inicio";
   - menú visual con "menu_categorias" o grilla automática "categorias";
   - secciones comerciales con "secciones_inicio" y, adentro, "productos_seccion".
   Si el usuario pidió dividir por categorías, hacé de este bloque la estructura principal: categorías arriba para entrar a cada vista, y debajo vitrinas/secciones por categoría. Podés mostrarlo como carrusel, filas, grid editorial o una home tipo marketplace, pero no lo reemplaces por contenido fijo.
4. Hero con un titular fuerte orientado al beneficio y productos destacados (lista "productos_destacados" o banners editables si el brief pide campaña). Si el comercio busca una estrategia de entrada económica, el hero o la primera vitrina debe llevar a una solución accesible sin escribir precios fijos.
5. Vitrinas compactas de descubrimiento: ofertas reales, novedades, destacados y colecciones manuales. Alterná producto recortado, escena/imagen editorial y grillas compactas si hay imágenes. Nada de módulos vacíos.
6. Escalera comercial: primero entrada/oferta accesible, después categorías, combos, complementos o colecciones de mayor ticket. Usá "combos", "productos_manual", "secciones_inicio" y "productos_seccion"; no inventes márgenes, membresías ni beneficios no cargados.
7. Franja de confianza: pago seguro con PagoPar, envío, atención por WhatsApp y cambios/devoluciones con links reales si aplican.
8. Oferta por tiempo limitado si aplica: data-gesicomm-countdown + textos data-gesicomm-venta. No inventes urgencia.
9. Catálogo (lista "catalogo") con buscador, filtro de categoría, orden y paginación (ver "Catálogo navegable"). Cada tarjeta: imagen, categoría, nombre, descripción corta, precio y precio tachado; la tarjeta o al menos la imagen y el nombre abren la ficha (data-gesicomm-ver) y el botón compra (data-gesicomm-comprar). Mostrá el total con data-gesicomm-total. Aunque la home esté dividida por categorías, dejá este catálogo completo como exploración final.
10. Beneficios, preguntas frecuentes y contacto.
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
8. Complementos: lista "recomendados" (el resto de la selección). Cada tarjeta abre la ficha con data-gesicomm-ver; el botón "Agregar" es secundario y usa data-gesicomm-agregar.
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

const VISTA_CATEGORIA = `## Qué tenés que construir: la VISTA PROPIA DE CATEGORÍA
Es una página independiente para UNA categoría elegida desde el menú de categorías. No es el inicio y no es una sección genérica: el visitante ya entró a una categoría concreta.

Estructura recomendada:
1. Header limpio con logo/nombre de tienda, link a Inicio, link a Catálogo completo, link a Checkout y botón de carrito real (data-gesicomm-carrito).
2. Encabezado de categoría con <h1 data-gesicomm-categoria="nombre"> y un texto breve que explique que está viendo esa selección. Mostrá data-gesicomm-total cerca del título.
3. Barra de filtros visible y cómoda:
   - <input type="search" data-gesicomm-buscar> para buscar dentro de la categoría.
   - <select data-gesicomm-filtro="orden"> con value="" / "max-min" / "min-max" / "az" / "za".
   - Opcional: disponibilidad si la base lo trae. No metas un filtro de categoría como control principal: esta vista ya es de una categoría.
4. Grilla "catalogo" con tarjetas cuidadas: imagen, categoría, nombre, precio, botón secundario data-gesicomm-agregar y el nombre/imagen con data-gesicomm-ver para entrar a la ficha.
5. Estado sin resultados (data-gesicomm-sin-resultados), paginación o "Ver más", y footer legal.

No hardcodees el nombre de la categoría, productos, precios ni imágenes. Todo sale del runtime. Diseñala como una página de navegación rápida, no como una landing larga con hero enorme.`;

const VISTA_CHECKOUT = `## Qué tenés que construir: la VISTA PROPIA DE CHECKOUT
Es una página aparte para finalizar la compra. Tiene que sentirse segura, clara y rápida. No es una ficha ni un catálogo.

Estructura recomendada:
1. Header sobrio con logo/nombre de tienda, link a Inicio, "Seguir comprando" y botón de carrito real.
2. Título "Finalizá tu pedido" o similar, con una frase corta de confianza. Evitá banners comerciales repetidos y claims inventados.
3. Bloque visible solo cuando hay productos: data-gesicomm-checkout-con-items.
4. Formulario principal con <form data-gesicomm-checkout-form>. Inputs:
   - name="nombre_cliente" required
   - name="telefono" required
   - name="ciudad" required
   - name="direccion" required
   - name="documento" opcional
   - select name="payment_method" con "contra_entrega" y "pagopar"
   - textarea name="notas" opcional
5. Resumen lateral o superior del pedido con data-gesicomm-lista="checkout_items": imagen, nombre, variante, precio_unitario, cantidad y subtotal.
6. Totales con data-gesicomm-checkout="subtotal", "cantidad" y "total"; mensaje/estado con data-gesicomm-checkout="mensaje".
7. Estado vacío data-gesicomm-checkout-vacio con CTA a catálogo/inicio.

No programes pagos, cálculos ni envío del pedido en JS. El submit del formulario lo toma Gesicomm. El diseño debe priorizar legibilidad, campos amplios, resumen claro y una sola acción principal.`;

// Estructura de la ficha que más vende, con los datos que la sostienen:
// - Baymard (usabilidad de fichas, 30.000+ puntuaciones): el 56% de los
//   usuarios empieza mirando las imágenes; 64% busca el costo de envío y 60%
//   la política de devolución en la ficha; estructurar la descripción en
//   "highlights" aumenta el interés (78% de los sitios no lo hace).
// - Spiegel Research Center (Northwestern): con 5 reseñas la probabilidad de
//   compra sube 270% frente a 0 (solo reseñas REALES: nunca inventarlas).
// - Regla del 100 (J. Berger): debajo de ~USD 100 el % se percibe mayor; arriba, el monto.
// - Botón de compra fijo en el celular: en A/B tests publicados, +8% a +25%.
const VISTA_PRODUCTO = `## Qué tenés que construir: la FICHA DE PRODUCTO
Es UNA plantilla que Gesicomm llena con el producto que se está viendo: todo sale de data-gesicomm-bind (fuera de listas = el producto de la ficha). Si un dato no existe, el elemento se oculta solo: no escribas textos de relleno ni inventes reseñas, cifras o certificaciones.

Estructura (en este orden; es la que más vende según la investigación de usabilidad de Baymard y datos de conversión):
1. Barra de anuncio y header (logo con data-gesicomm-inicio).
2. ARRIBA DEL PLIEGUE, dos columnas en desktop y una en mobile:
   - Galería grande: <img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal> + miniaturas (lista "imagenes"). Es lo primero que mira el 56% de la gente.
   - Categoría, nombre (h1) y la PROMESA en una frase: bind "propuesta_valor".
   - Precio grande, precio tachado ("precio_antes") y el ahorro con bind "ahorro_texto" (Gesicomm ya elige % o Gs según el precio).
   - Si es un combo: <p data-gesicomm-si="precio_separado">Por separado: <s data-gesicomm-bind="precio_separado"></s></p> y la lista "combo_incluye" (foto + nombre de cada producto que trae). En una ficha de combo, el botón principal data-gesicomm-comprar compra EL COMBO ACTUAL; no escribas IDs a mano ni hagas JavaScript de checkout propio.
   - 3 o 4 "highlights" con check: <ul data-gesicomm-lista="beneficios" data-gesicomm-limite="4"><template><li data-gesicomm-bind="titulo"></li></template></ul>.
   - Variantes (lista "variantes", estilá .is-selected y [data-agotado]).
   - Order bump ("ofertas_bump") justo ARRIBA del selector de oferta.
   - "Elegí tu oferta": lista "paquetes". Gesicomm arma las opciones (1 unidad, Pack x2, Pack x3…) con binds "imagen" (foto del producto/paquete), "titulo", "unidades_texto" ("x2"), "etiqueta" ("Mejor precio", calculado), "precio", "precio_antes" (las unidades sueltas), "por_unidad" ("Gs 125.000 c/u") y "ahorro" ("Ahorrás Gs 88.000"). El elemento raíz del template es la TARJETA ENTERA clickeable (un <button>): el runtime le pone role="radio", aria-checked y la clase "is-selected"; estilá ese estado con un radio visible. Elegir el paquete ES elegir la cantidad y el botón de compra lo compra.
   - Cantidad (data-gesicomm-cantidad-input) SOLO si el producto no tiene paquetes: ponele data-gesicomm-sin="tiene_paquetes". Después el botón grande "Comprar ahora · <span data-gesicomm-total></span>" (data-gesicomm-comprar). "Agregar al carrito" y WhatsApp como links secundarios.
   - Pegado al botón: envío ("el costo lo ves antes de pagar"), pago (PagoPar o al recibir) y cambios (link data-gesicomm-link="reembolsos"); debajo la lista "confianza" (bind "texto": garantías que cargó la tienda).
   - NO uses "ofertas_pack" (los paquetes van en "paquetes") ni "ofertas_upsell" en la ficha. No escribas textos de oferta vagos ("descuento imperdible"): los números concretos ya los dan los binds.
3. DEBAJO DEL PLIEGUE:
   - Complementos para aumentar ticket: "Llevalo en combo y ahorrá" con lista "combos_producto" y/o "recomendados" como accesorios reales. Complementos NO son lo mismo que alternativas: los complementos completan el uso del producto.
   - Beneficios completos: lista "beneficios" con binds "titulo" y "texto".
   - Si es un combo: sección <section data-gesicomm-si="combo_incluye"> con la lista "combo_incluye" (foto, nombre, "cantidad", precio suelto con bind "precio") y el total "Por separado vs En combo". Cada producto incluido puede tener un botón data-gesicomm-ver para ver su ficha; no pongas data-gesicomm-comprar dentro de "combo_incluye" salvo que explícitamente quieras vender ese producto suelto.
   - Descripción: binds "sobre" y "descripcion_larga" (white-space: pre-line).
   - Preguntas frecuentes: lista "preguntas" con <details><summary data-gesicomm-bind="pregunta"></summary><p data-gesicomm-bind="respuesta"></p></details>. Responden las dudas que frenan la compra.
   - Alternativas o productos similares: si usás "recomendados" como alternativa, titulalo claro ("También podés comparar con") y hacé que la ficha se abra con data-gesicomm-ver. Si son accesorios, titulalo como complemento. No mezcles ambos mensajes en un solo bloque.
   - Cierre: nombre, precio y otro botón "Comprar ahora".
4. Footer con los links legales.
5. En mobile, una barra fija abajo con precio y "Comprar ahora" (data-gesicomm-comprar), y padding-bottom en el body para que no tape contenido.
data-gesicomm-si="campo" muestra un bloque solo si el producto tiene ese dato (ej. "precio_separado", "combo_incluye", "beneficios").`;

/**
 * Ficha propia de UN producto: acá sí se puede escribir sobre ese producto
 * (su historia, a quién le sirve), porque la página es solo suya. Los datos
 * de venta (precio, stock, ofertas) siguen saliendo de los binds.
 */
function fichaPropia(producto) {
  return `## Esta ficha es SOLO para "${producto.nombre}"
No es la plantilla general: la ven únicamente quienes entran a este producto. Podés escribir textos y secciones pensados para él (a quién le sirve, cómo se usa, qué problema resuelve), usando lo que dicen sus datos de abajo. Precio, precio tachado, stock, variantes y ofertas tienen que seguir saliendo de data-gesicomm-bind y de las listas: nunca los escribas a mano. No inventes resultados, reseñas ni certificaciones: si no están en los datos, dejá un marcador visible "[Completar con dato real]".`;
}

function valoresAtributoEnBase(texto, atributo) {
  const valores = new Set();
  const re = new RegExp(`${atributo}\\s*=\\s*["']([^"']+)["']`, 'g');
  let match;
  while ((match = re.exec(texto))) {
    String(match[1])
      .split('|')
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(v => valores.add(v));
  }
  return [...valores];
}

function atributosGesicommBase(base) {
  const codigo = [base?.html, base?.css, base?.js].filter(Boolean).join('\n');
  const atributos = [...new Set(codigo.match(/data-gesicomm-[a-z0-9-]+/gi) || [])]
    .map(a => a.toLowerCase())
    .sort();
  return {
    listas: valoresAtributoEnBase(codigo, 'data-gesicomm-lista'),
    binds: valoresAtributoEnBase(codigo, 'data-gesicomm-bind'),
    tienda: valoresAtributoEnBase(codigo, 'data-gesicomm-tienda'),
    atributos,
  };
}

function lineaValores(titulo, valores, limite = 28) {
  if (!valores.length) return `- ${titulo}: ninguno.`;
  const visibles = valores.slice(0, limite);
  const resto = valores.length - visibles.length;
  return `- ${titulo}: ${visibles.map(v => `"${v}"`).join(', ')}${resto > 0 ? `, y ${resto} más` : ''}.`;
}

function resumenCodigoBase(base) {
  const { listas, binds, tienda, atributos } = atributosGesicommBase(base);
  return `

## Código base (resumen)
Hay una plantilla base funcional, pero no pego su HTML/CSS/JS completo para no tapar la información importante del producto. Usala como contrato de estructura:
- Header con logo/nombre de tienda y navegación.
- Ficha arriba del pliegue: galería, nombre, promesa, precio, variantes, order bump, paquetes, CTA principal y confianza.
- Debajo: combos del producto, beneficios, descripción, preguntas, recomendados y footer legal.
- Mobile: una columna, barra de compra fija y suficiente padding inferior.

Mantené estos puntos del contrato que ya usa la base:
${lineaValores('Listas usadas', listas)}
${lineaValores('Binds usados', binds)}
${lineaValores('Datos de tienda usados', tienda)}
${lineaValores('Atributos Gesicomm presentes', atributos, 34)}

No copies productos, precios ni links a mano: usá esos atributos data-gesicomm-* y devolvé igual los tres bloques html/css/js.`;
}

function bloqueCodigoBase(base, { compacto = false } = {}) {
  if (!base) return '';
  const total = (base.html || '').length + (base.css || '').length + (base.js || '').length;
  if (compacto || total > MAX_BASE_COMPLETA_PROMPT) return resumenCodigoBase(base);
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

function promptEspecificoVista(vista, fichaDe) {
  if (vista === 'producto') {
    return fichaDe ? `${VISTA_PRODUCTO}

${fichaPropia(fichaDe)}` : VISTA_PRODUCTO;
  }
  if (vista === 'categoria') return VISTA_CATEGORIA;
  if (vista === 'checkout') return VISTA_CHECKOUT;
  // Un solo inicio: la tienda (los formatos viejos de inicio ya no se ofrecen).
  return VISTA_INICIO.catalogo;
}

/**
 * @param {'inicio'|'producto'|'categoria'|'checkout'} vista
 * @param {{tienda, venta, productos, estilo?: string, base?: {html, css, js}}} datos
 *   productos: items del catálogo del panel, en el orden de la landing.
 *   estilo: indicaciones libres de diseño que escribe el comercio.
 *   base: si viene, el prompt incluye el código base de esa vista.
 */
export function armarPromptVista(vista, { tienda, venta, productos = [], fichaDe = null, estilo = '', base = null }) {
  const especifico = promptEspecificoVista(vista, fichaDe);
  const estiloTexto = estilo.trim()
    ? `\n\n## Estilo visual pedido\n${estilo.trim()}`
    : '\n\n## Estilo visual\nModerno, limpio y confiable, con los colores de la marca de la tienda. Tipografía legible, bordes redondeados y buen espacio.';
  const esFicha = vista === 'producto';
  const esCheckout = vista === 'checkout';
  return `${PROMPT_MAESTRO}

${contexto({
    tienda,
    venta,
    productos,
    maxProductos: esFicha || esCheckout ? MAX_PRODUCTOS_FICHA_PROMPT : MAX_PRODUCTOS_INICIO_PROMPT,
  })}

${especifico}${estiloTexto}${bloqueCodigoBase(base, { compacto: esFicha || esCheckout })}`;
}
