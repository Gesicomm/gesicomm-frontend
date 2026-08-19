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
