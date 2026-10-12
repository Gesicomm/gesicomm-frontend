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
  // Cuenta como "global de tienda" para arrastrar antes del header:
  //   - la marca explícita del sistema (data-gesicomm-bloque="anuncios",
  //     la que arma el propio Inicio para su barra de beneficios), y
  //   - la clase "announcement" (palabra completa) — el otro nombre que
  //     usa el mismo patrón de barra superior en el contrato de Gesicom
  //     (ver SYSTEM_CSS en construirDocumentoCodigo.js), que una IA puede
  //     haber escrito a mano con texto fijo en vez del bloque dinámico.
  //     Sin este caso, una vista con su propia ".announcement" estática se
  //     queda con ESA barra Y la de Inicio superpuesta — duplicada.
  // Un regex de clase libre (class contiene "promo", "anuncio", "shipping"...)
  // en cambio también matcheaba el hero/banner de venta que la IA escribe con
  // esos mismos nombres, duplicando ese bloque — grande, sin su CSS, roto —
  // arriba de categoría/catálogo/checkout (ver memoria gesicomm_lienzo_html_runtime).
  // Por eso acá se exige la palabra completa "announcement", no una subcadena.
  const barras = [...antes.matchAll(/<(?:div|section|aside)\b[^>]*>/gi)]
    .filter(match => /data-gesicomm-bloque=(["'])anuncios\1/i.test(match[0])
      || /class=(["'])(?:[^"']*\s)?announcement(?:\s[^"']*)?\1/i.test(match[0]));
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

// Un pie normal (marca, políticas, contacto, redes) entra holgado; por
// encima de esto ya trae contenido de página (un catálogo, un formulario
// largo) y clonarlo en todas las vistas haría más daño que dejarlo.
const LIMITE_PIE = 20000;

/**
 * El pie de la tienda: el último <footer> del HTML. El último y no el
 * primero porque una tarjeta de opinión o un <article> pueden traer su
 * propio <footer> adentro; el de la página siempre cierra el documento.
 */
export function extraerPieTienda(html = '') {
  const fin = html.toLowerCase().lastIndexOf('</footer>');
  if (fin < 0) return null;
  const aperturas = [...html.slice(0, fin).matchAll(/<footer\b[^>]*>/gi)];
  const apertura = aperturas[aperturas.length - 1];
  if (!apertura) return null;
  const finPie = fin + '</footer>'.length;
  const bloque = html.slice(apertura.index, finPie);
  if (bloque.length > LIMITE_PIE) return null;
  return { inicio: apertura.index, fin: finPie, html: bloque };
}

export function conGlobalesHeredados(codigoVista, codigoInicio) {
  if (!codigoVista?.html || !codigoInicio?.html || codigoVista === codigoInicio) return codigoVista;
  let html = codigoVista.html;
  let heredo = false;

  const globalInicio = extraerGlobalesTienda(codigoInicio.html);
  const globalVista = globalInicio ? extraerGlobalesTienda(html) : null;
  // Si no se puede ubicar con seguridad el header/anuncios propio de esta
  // vista (header con hero de fondo, demasiado grande, etc.) no hay forma
  // segura de reemplazarlo — y pegar el global ARRIBA sin sacar el suyo
  // duplica la barra de anuncios y el header (uno roto, sin su lugar en el
  // documento, y el propio de la vista debajo). Mejor dejar la vista con lo
  // que ya tiene antes que duplicar.
  if (globalInicio && globalVista) {
    html = `${html.slice(0, globalVista.inicio)}${globalInicio.html}${html.slice(globalVista.fin)}`;
    heredo = true;
  }

  // El pie también es de la tienda, no de cada vista. Antes solo se heredaba
  // el header: una ficha o un checkout con su propio <footer> (el que
  // escribió una IA, o una copia vieja de la plantilla) mostraba un pie
  // distinto al del inicio — sin columna de contacto, con otros links. El
  // del inicio reemplaza al de la vista; si la vista no trae ninguno se
  // agrega al final, así tampoco cae al pie genérico del sistema.
  const pieInicio = extraerPieTienda(codigoInicio.html);
  if (pieInicio) {
    const pieVista = extraerPieTienda(html);
    html = pieVista
      ? `${html.slice(0, pieVista.inicio)}${pieInicio.html}${html.slice(pieVista.fin)}`
      : `${html}\n${pieInicio.html}`;
    heredo = true;
  }

  if (!heredo) return codigoVista;
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
