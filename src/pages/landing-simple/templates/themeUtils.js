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
  return {
    fondo: temaOverride?.fondo || defaults.fondo,
    texto: temaOverride?.texto || defaults.texto,
    acento: temaOverride?.acento || defaults.acento,
  };
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
  'fitness-suplementos': { fondo: '#0B0B0E', texto: '#FFFFFF', acento: '#FF5A1F' },
  'beauty-skincare': { fondo: '#FBEFEF', texto: '#3A2A2E', acento: '#E8A2B0' },
  'tech-electronica': { fondo: '#0B1220', texto: '#E5EEF7', acento: '#3AB0FF' },
};

/** resolverTema(), pero resolviendo el default por slug de template en vez de tener que pasarlo a mano. */
export function resolverTemaPorSlug(temaOverride, templateSlug) {
  const defaults = DEFAULT_TEMA_POR_TEMPLATE[templateSlug] || DEFAULT_TEMA_POR_TEMPLATE.basico;
  return resolverTema(temaOverride, defaults);
}
