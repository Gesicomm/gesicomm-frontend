function unirPartesUnicas(partes = []) {
  const vistas = [];
  const vistasSet = new Set();
  partes.forEach(parte => {
    const valor = String(parte || '').trim();
    if (!valor || vistasSet.has(valor)) return;
    vistasSet.add(valor);
    vistas.push(parte);
  });
  return vistas.join('\n\n');
}

// Tamaño y marcas de un hero/banner de venta colado como si fuera un global
// de tienda (ver abajo): por encima de esto, o con video/imagen de fondo,
// ya no es "una tira de texto antes del header" sino contenido propio del
// Inicio que no tiene sentido (ni su CSS de origen) en otra vista.
const LIMITE_GLOBAL = 4000;
// video/picture/source nunca aparecen en un header normal (logo + nav) —
// son casi siempre la marca de un hero. Un solo <img> sigue siendo válido
// (el logo); dos o más ya es una galería o un banner con fotos.
const TIENE_MEDIA_DE_HERO = /<(picture|video|source)\b/i;
const MAX_IMAGENES = 1;

export function extraerGlobalesTienda(html = '') {
  const header = /<header\b[^>]*>/i.exec(html);
  if (!header) return null;
  const finHeader = html.indexOf('</header>', header.index);
  if (finHeader < 0) return null;

  let inicio = header.index;
  const antes = html.slice(0, header.index);
  // Únicamente la marca explícita del sistema (data-gesicomm-bloque=
  // "anuncios", la que arma el propio Inicio para su barra de beneficios)
  // cuenta como "global de tienda" para arrastrar antes del header. Un
  // regex de clase libre (class contiene "promo", "anuncio", "shipping"...)
  // también matcheaba el hero/banner de venta que la IA escribe con esos
  // mismos nombres, duplicando ese bloque — grande, sin su CSS, roto —
  // arriba de categoría/catálogo/checkout (ver memoria gesicomm_lienzo_html_runtime).
  const barras = [...antes.matchAll(/<(?:div|section|aside)\b[^>]*>/gi)]
    .filter(match => /data-gesicomm-bloque=(["'])anuncios\1/i.test(match[0]));
  const barra = barras[barras.length - 1];
  if (barra) inicio = barra.index;

  const fin = finHeader + '</header>'.length;
  const bloque = html.slice(inicio, fin);
  // Aun el <header> "oficial" puede venir con un hero de fondo escrito por
  // la IA adentro (patrón común: header pegajoso + banner superpuesto). Si
  // es así, no es seguro clonarlo en otra vista: se prefiere que esa vista
  // se quede con su propio header genérico antes que mostrar un bloque roto.
  const cantidadImagenes = (bloque.match(/<img\b/gi) || []).length;
  if (bloque.length > LIMITE_GLOBAL || TIENE_MEDIA_DE_HERO.test(bloque) || cantidadImagenes > MAX_IMAGENES) return null;

  return { inicio, fin, html: bloque };
}

export function conGlobalesHeredados(codigoVista, codigoInicio) {
  if (!codigoVista?.html || !codigoInicio?.html || codigoVista === codigoInicio) return codigoVista;
  const globalInicio = extraerGlobalesTienda(codigoInicio.html);
  const globalVista = extraerGlobalesTienda(codigoVista.html);
  if (!globalInicio) return codigoVista;
  const html = globalVista
    ? `${codigoVista.html.slice(0, globalVista.inicio)}${globalInicio.html}${codigoVista.html.slice(globalVista.fin)}`
    : `${globalInicio.html}\n${codigoVista.html}`;
  return {
    ...codigoVista,
    html,
    css: unirPartesUnicas([codigoInicio.css, codigoVista.css]),
    js: unirPartesUnicas([codigoInicio.js, codigoVista.js]),
  };
}

export function codigoConGlobales(codigos = []) {
  return codigos.find(c => c?.html && extraerGlobalesTienda(c.html)) || null;
}
