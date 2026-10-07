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

export function extraerGlobalesTienda(html = '') {
  const header = /<header\b[^>]*>/i.exec(html);
  if (!header) return null;
  const finHeader = html.indexOf('</header>', header.index);
  if (finHeader < 0) return null;

  let inicio = header.index;
  const antes = html.slice(0, header.index);
  const barras = [...antes.matchAll(/<(?:div|section|aside)\b[^>]*>/gi)]
    .filter(match => {
      const tag = match[0];
      const esCandidata = /data-gesicomm-bloque=(["'])anuncios\1/i.test(tag)
        || /class=(["'])(?=[^"']*(?:announcement|trust(?:-bar)?|top-?bar|promo|promocion|promociones|anuncio|anuncios|benefit|beneficios|shipping|envio|envios|aviso|avisos))[^"']*\1/i.test(tag);
      if (!esCandidata) return false;
      // Una barra de anuncios/beneficios real es una tira angosta de texto;
      // un hero/banner de venta (con su propia clase "promo-banner-home" o
      // similar) puede matchear el mismo regex de clase pero mide miles de
      // caracteres y trae imágenes — eso NO es global de la tienda, es
      // contenido propio del Inicio. Colarlo acá lo duplicaba (roto, sin su
      // CSS de origen) arriba de categoría/catálogo/checkout.
      const bloque = html.slice(match.index, header.index);
      return bloque.length <= 800 && !/<(img|picture|video|source)\b/i.test(bloque);
    });
  const barra = barras[barras.length - 1];
  if (barra) inicio = barra.index;

  return {
    inicio,
    fin: finHeader + '</header>'.length,
    html: html.slice(inicio, finHeader + '</header>'.length),
  };
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
