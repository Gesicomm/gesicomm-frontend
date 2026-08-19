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
