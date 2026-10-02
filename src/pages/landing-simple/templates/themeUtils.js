/** hex ("#rrggbb") → "rgba(r,g,b,alpha)". Usado por los 4 templates rígidos
 * para tintar bordes/textos secundarios a partir del color base del tema
 * (fondo/texto/acento), en vez de clases Tailwind fijas tipo "text-white/60"
 * que no sirven una vez que el color es elegido por el comercio. */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const limpio = hex.replace('#', '');
  const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio;
  const bigint = parseInt(completo, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** hex ("#rgb" o "#rrggbb") → [r, g, b]. null si no es un hex válido. */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return null;
  const limpio = hex.replace('#', '');
  const completo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio;
  const bigint = parseInt(completo, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
export function luminanciaRelativa(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores, de 1:1 a 21:1. */
export function contraste(hexA, hexB) {
  const a = luminanciaRelativa(hexA);
  const b = luminanciaRelativa(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * El color que se va a usar para un texto sobre `fondo`: el que eligió el
 * comercio si se lee (contraste ≥ `minimo`), y si no, el oscuro o el claro
 * que mejor se lea ahí.
 *
 * Existe porque los colores de la tienda se combinan solos con fondos que
 * el comercio no eligió (tarjetas blancas, franjas): una tienda con fondo
 * rosa y texto blanco dejaba los packs con texto blanco sobre blanco.
 */
export function textoLegible(color, fondo, minimo = 4.5) {
  if (color && contraste(color, fondo) >= minimo) return color;
  const oscuro = '#1A1A1A';
  const claro = '#FFFFFF';
  return contraste(oscuro, fondo) >= contraste(claro, fondo) ? oscuro : claro;
}

/**
 * Como textoLegible, pero CONSERVANDO EL TONO que eligió el comercio: si su
 * color no se lee sobre alguna de las superficies (`fondos`), se oscurece
 * (o se aclara, si las superficies son oscuras) ese mismo tono lo justo para
 * llegar al mínimo — un rosa fuerte pasa a un rosa profundo, no a negro.
 *
 * Si el color no tiene tono propio (blanco, gris, negro), se usa el tono de
 * la primera superficie (el fondo de la página) oscurecido o aclarado: con
 * fondo rosa y letra blanca sale un bordó, que combina, y no un negro.
 *
 * Pedido explícito del comercio: "tengo otro color de letra y me toma todo
 * negro". Negro/blanco puros quedan solo como último recurso.
 */
export function ajustarLegible(color, fondos, minimo = 4.5) {
  const lista = (Array.isArray(fondos) ? fondos : [fondos]).filter(Boolean);
  const pasa = (c) => lista.every(b => contraste(c, b) >= minimo);
  if (color && pasa(color)) return color;

  const rgb = hexToRgb(color || '');
  const saturado = rgb ? (Math.max(...rgb) - Math.min(...rgb)) / 255 >= 0.15 : false;
  const fondosClaros = lista.every(b => luminanciaRelativa(b) >= 0.18);
  const destino = fondosClaros ? '#000000' : '#FFFFFF';
  const base = saturado ? color : lista[0];

  for (let t = 0.1; t <= 1.0001; t += 0.05) {
    const c = componer(destino, t, base);
    if (pasa(c)) return c;
  }
  return fondosClaros ? '#1A1A1A' : '#FFFFFF';
}

/**
 * Un tono más suave de `texto` sobre `fondo` (para textos secundarios) que
 * todavía se lea: arranca en `alpha` y se acerca al texto pleno hasta llegar
 * al contraste mínimo. `texto` ya tiene que ser legible sobre `fondo`.
 */
export function textoSuave(texto, fondo, alpha = 0.68, minimo = 4.5) {
  for (let a = alpha; a < 1; a += 0.04) {
    const c = componer(texto, a, fondo);
    if (contraste(c, fondo) >= minimo) return c;
  }
  return texto;
}

/**
 * El color de texto que resulta de pintar `hex` con opacidad `alpha` encima
 * de `fondo` — o sea, el color que el ojo ve realmente.
 *
 * Hace falta porque un texto con alpha NO conserva el contraste del color
 * original: rgba(#E5EEF7, 0.3) sobre #0B1220 se ve #4C5460, que contra ese
 * mismo fondo da 2,4:1 (el mínimo AA es 4,5:1). Calcular el color compuesto
 * es la única forma de verificar contraste de verdad.
 */
export function componer(hex, alpha, fondo) {
  const c = hexToRgb(hex);
  const f = hexToRgb(fondo);
  if (!c || !f) return hex;
  const mezcla = c.map((canal, i) => Math.round(f[i] + (canal - f[i]) * alpha));
  return `#${mezcla.map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Devuelve `acento` sólo si contrasta lo suficiente contra `fondo`; si no,
 * devuelve `respaldo`. Sin esto, el acento rosa de Beauty (#E8A2B0) sobre su
 * fondo rosa (#FBEFEF) da 1,9:1 y el enlace es prácticamente invisible.
 */
export function acentoLegible(acento, fondo, respaldo, minimo = 4.5) {
  return contraste(acento, fondo) >= minimo ? acento : respaldo;
}

/** Arma {fondo, texto, acento} final = override del comercio (data.tema) + default propio del template. */
export function resolverTema(temaOverride, defaults) {
  const fondo = temaOverride?.fondo || defaults.fondo;

  // El acento sale del primario de la tienda cuando no viene uno explícito:
  // el payload público manda `primario`/`secundario` (Mi Tienda), no
  // `acento`, así que antes el color de marca nunca se leía y todo caía al
  // default del template — negro, en las páginas legales y el catálogo.
  const acento = temaOverride?.acento || temaOverride?.primario || defaults.acento;

  // El texto se deriva del fondo REAL, no del default del template. Una
  // tienda de fondo oscuro sin `texto` configurado terminaba con el negro
  // del template 'basico' sobre su propio fondo casi negro: la página
  // quedaba ilegible. Ojo: las landings de código no tienen template rígido,
  // así que SIEMPRE caen a ese default.
  const texto = temaOverride?.texto
    || (luminanciaRelativa(fondo) < 0.5 ? '#FFFFFF' : defaults.texto);

  return { fondo, texto, acento };
}

/**
 * Default de tema por template rígido — antes estaba duplicado (y
 * desincronizado) en cada uno de los 4 templates más CatalogoPublico.jsx,
 * ContactoPublico.jsx y los 3 *Preview.jsx del editor, todos con el mismo
 * blanco/negro genérico de BasicTemplate. Resultado: en Fitness/Beauty/Tech,
 * apenas el comercio salía del home (a un producto, catálogo o contacto)
 * sin haber personalizado colores, esas páginas rompían la identidad del
 * template — pantalla oscura de FitnessTemplate, pero el producto se veía
 * blanco con acento verde genérico (el `--l-bg`/`--l-primary` que trae
 * landingPublica.css por defecto), o directo el inverso en Fitness.
 */
export const DEFAULT_TEMA_POR_TEMPLATE = {
  'basico': { fondo: '#FFFFFF', texto: '#000000', acento: '#000000' },
  'fitness-suplementos': { fondo: '#FFFFFF', texto: '#173C2D', acento: '#0F4933' },
  'moda-indumentaria': { fondo: '#FBFAF7', texto: '#171615', acento: '#E4513D' },
  'bazar-hogar': { fondo: '#FBFAF7', texto: '#292722', acento: '#A95843' },
  'beauty-skincare': { fondo: '#FFFDFB', texto: '#30252A', acento: '#A9606D' },
  'tech-electronica': { fondo: '#0B1220', texto: '#E5EEF7', acento: '#3AB0FF' },
};

/** resolverTema(), pero resolviendo el default por slug de template en vez de tener que pasarlo a mano. */
export function resolverTemaPorSlug(temaOverride, templateSlug) {
  const defaults = DEFAULT_TEMA_POR_TEMPLATE[templateSlug] || DEFAULT_TEMA_POR_TEMPLATE.basico;
  return resolverTema(temaOverride, defaults);
}
