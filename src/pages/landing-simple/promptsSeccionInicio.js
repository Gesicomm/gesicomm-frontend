import { PROMPT_MAESTRO, contexto, bloqueCodigoBase } from './promptsCodigo';

/**
 * Prompt por SECCIÓN de "Bloques del Inicio" (no por página completa). Mismo
 * flujo copiar/pegar que promptsCodigo.js: el comercio copia, pega en
 * ChatGPT/Claude/Gemini y trae de vuelta el HTML/CSS de esa sección nomás —
 * ver EditorCodigoSeccion en ConfigurarVentaCodigo.jsx.
 *
 * Reusa el mismo PROMPT_MAESTRO (el contrato de binds/listas/colores no
 * cambia por editar una sola sección) y el mismo `contexto()`/
 * `bloqueCodigoBase()` que arman el prompt de Inicio completo, pero la
 * instrucción "qué construir" y el código base se recortan a UNA sección.
 */

const QUE_CONSTRUIR_POR_BLOQUE = {
  anuncios: `## Qué tenés que construir: la BARRA DE ANUNCIOS
Es la franja angosta arriba de todo el sitio (envío, pago seguro, cambios, etc.). No es el header ni el hero: va ANTES del header. Mensajes cortos, uno o varios con un carrusel/scroll simple. No inventes promesas (garantías, certificaciones) que la tienda no cargó.`,
  encabezado: `## Qué tenés que construir: el ENCABEZADO (header)
Logo/nombre de la tienda (data-gesicomm-tienda), navegación, buscador si hay catálogo (data-gesicomm-buscar) y acceso al carrito (data-gesicomm-carrito). Tiene que verse bien sticky o no, en mobile compacto. NUNCA reemplaces el logo/nombre por texto fijo: siempre data-gesicomm-tienda="logo" y ="nombre".`,
  banner: `## Qué tenés que construir: el BANNER PRINCIPAL (hero)
Primera pantalla después del header: titular fuerte orientado al beneficio, imagen/banner editable con la lista "banners_inicio" (binds titulo, subtitulo, etiqueta, cta_texto, imagen, video, enlace) y un CTA claro. No escribas productos ni precios fijos.`,
  productos_categoria: `## Qué tenés que construir: la sección de PRODUCTOS
Vitrina de productos reales de esta sección (lista "productos_destacados", "productos_manual" o similar según corresponda). Buscador/tabs si aplica (ver ".pc-*" de referencia). Cada tarjeta con imagen, nombre, precio y data-gesicomm-ver para abrir la ficha.`,
  ofertas_urgencia: `## Qué tenés que construir: la OFERTA FLASH con countdown
Sección de urgencia: countdown real con data-gesicomm-countdown (nunca una cuenta regresiva en JS propio ni una fecha fija) y una grilla de productos en oferta real (lista "productos_ofertas"). Textos editables con data-gesicomm-venta="urgencia_titulo/_texto/_cta".`,
  confianza: `## Qué tenés que construir: la ZONA DE CONFIANZA
3 tarjetas cortas con ícono, título y texto (pago seguro, envío, cambios/devoluciones, soporte). Sin reseñas ni certificaciones inventadas.`,
  testimonios: `## Qué tenés que construir: TESTIMONIOS / prueba social
Prueba social real únicamente. Si hay testimonios cargados, mostralos; si no, dejá un marcador visible "[Reemplazar por testimonio real]" — nunca inventes nombres ni cifras. Para cifras cuantitativas ("94% recomienda") usá la lista "estadisticas", nunca un número fijo en el HTML.`,
  marca: `## Qué tenés que construir: NUESTRA MARCA
Bloque editorial: imagen/video de marca + texto sobre la tienda (propuesta de valor, historia corta). Texto editable por el comercio, sin inventar datos que no tiene.`,
  colecciones: `## Qué tenés que construir: COLECCIONES
Grilla de colecciones/categorías visuales (foto + nombre) que llevan a su propia vista filtrada. Usá "menu_categorias" o "categorias" del runtime — no hardcodees categorías ni productos.`,
};

/**
 * @param {string} tipo uno de TIPOS_BLOQUE_INICIO (ver ConfigurarVentaCodigo.jsx) o 'encabezado'.
 * @param {{tienda, venta, productos, estilo?: string, base: {html, css, js}}} datos
 *   base: SIEMPRE el código actual de ESTA sección nomás (no de toda la página).
 */
export function armarPromptSeccionInicio(tipo, { tienda, venta, productos = [], estilo = '', base }) {
  const especifico = QUE_CONSTRUIR_POR_BLOQUE[tipo] || `## Qué tenés que construir: la sección "${tipo}" del Inicio`;
  const estiloTexto = estilo.trim()
    ? `\n\n## Estilo visual pedido\n${estilo.trim()}`
    : '\n\n## Estilo visual\nModerno, limpio y confiable, con los colores de la marca de la tienda. Tipografía legible, bordes redondeados y buen espacio.';
  const alcance = `\n\nALCANCE: estás rediseñando SOLO esta sección de la página de Inicio, no la página completa. Devolvé nada más el HTML de este bloque (con su mismo data-gesicomm-bloque="${tipo}" en el elemento raíz, no lo cambies ni lo borres) y el CSS que le corresponde. No agregues header, footer ni otras secciones.`;

  return `${PROMPT_MAESTRO}

${contexto({ tienda, venta, productos })}

${especifico}${alcance}${estiloTexto}${bloqueCodigoBase(base, { compacto: false })}`;
}
