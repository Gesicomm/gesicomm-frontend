/**
 * Branding de Mi Tienda (color principal, secundario y fondo de marca) en
 * las landings HTML ("Lienzo en blanco").
 *
 * Dos piezas:
 *   1. cssMarcaTienda(colores): las variables --tienda-* que se inyectan en
 *      el <head>, antes del CSS del comercio. Además de los tres colores,
 *      trae los derivados que hacen falta para que todo se lea (texto sobre
 *      el fondo, superficie de tarjetas, bordes, bandas, secundario con
 *      contraste suficiente).
 *   2. conMarcaTienda(css): reescribe el CSS YA GUARDADO para que use esas
 *      variables. Se aplica al armar el documento, nunca en la base de datos:
 *      sin Branding, cada var() cae en el mismo valor de antes y la página
 *      queda idéntica.
 *
 * La base de Gesicom (plantillasBaseCodigo.js) se mapea entera; de un
 * diseño propio o hecho con la IA solo se tocan las variables del contrato
 * (--gc-primario, --gc-texto-sobre-primario).
 */

// Solo hex: estos valores entran al CSS sin pasar por el sanitizador.
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function rgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

export function luminancia(hex) {
  const [r, g, b] = rgb(hex).map(c => c / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Mezcla dos hex (como color-mix, pero calculado acá para medir contraste). */
function mezclar(a, b, pesoA) {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  const m = (x, y) => Math.round(x * pesoA + y * (1 - pesoA)).toString(16).padStart(2, '0');
  return `#${m(ra, rb)}${m(ga, gb)}${m(ba, bb)}`;
}

/** El color, aclarado u oscurecido lo justo para leerse sobre `fondo` (AA texto grande: 3:1). */
function legibleSobre(color, fondo, minimo = 3) {
  if (contraste(color, fondo) >= minimo) return color;
  const hacia = luminancia(fondo) < 0.3 ? '#ffffff' : '#000000';
  for (let peso = 0.9; peso >= 0.2; peso -= 0.1) {
    const c = mezclar(color, hacia, peso);
    if (contraste(c, fondo) >= minimo) return c;
  }
  return hacia;
}

/**
 * Variables --tienda-* para el <head> de la landing.
 *   --tienda-primario / --tienda-texto-sobre-primario / --tienda-primario-texto
 *   --tienda-secundario / --tienda-destacado (el secundario, legible como texto)
 *   --tienda-fondo / --tienda-texto / --tienda-texto-suave
 *   --tienda-superficie (tarjetas) / --tienda-linea (bordes)
 *   --tienda-banda / --tienda-banda-texto (barras y secciones oscuras)
 */
export function cssMarcaTienda(colores) {
  if (!colores) return '';
  const { primario, secundario, fondo } = colores;
  const P = HEX.test(primario || '') ? primario : null;
  const S = HEX.test(secundario || '') ? secundario : null;
  const F = HEX.test(fondo || '') ? fondo : null;
  const oscuro = F ? luminancia(F) < 0.3 : false;
  const superficie = F ? (oscuro ? mezclar(F, '#ffffff', 0.9) : '#ffffff') : '#ffffff';
  const v = [];

  if (P) {
    v.push(`--tienda-primario: ${P};`);
    v.push(`--tienda-texto-sobre-primario: ${luminancia(P) > 0.45 ? '#111111' : '#ffffff'};`);
    v.push(`--tienda-primario-texto: ${legibleSobre(P, superficie)};`);
  }
  if (S) {
    v.push(`--tienda-secundario: ${S};`);
    v.push(`--tienda-texto-sobre-secundario: ${luminancia(S) > 0.45 ? '#111111' : '#ffffff'};`);
    v.push(`--tienda-destacado: ${legibleSobre(S, superficie)};`);
  }
  if (F) {
    v.push(`--tienda-fondo: ${F};`);
    v.push(`--tienda-texto: ${oscuro ? '#eef2f6' : '#10202f'};`);
    v.push(`--tienda-texto-suave: ${oscuro ? '#a9b5c1' : '#506172'};`);
    v.push(`--tienda-superficie: ${superficie};`);
    v.push(`--tienda-linea: ${oscuro ? mezclar(F, '#ffffff', 0.78) : '#e4eaf0'};`);
    if (oscuro) {
      // Bandas (barra superior, oferta final, contacto): el fondo teñido
      // con el principal, para que se distingan del resto de la página.
      v.push(`--tienda-banda: ${P ? mezclar(P, F, 0.35) : mezclar(F, '#ffffff', 0.94)};`);
      v.push('--tienda-banda-texto: #ffffff;');
    } else {
      v.push(`--tienda-fondo-claro: ${F};`);
    }
  }
  return v.length ? `:root { ${v.join(' ')} }` : '';
}

// ─── CSS guardado → variables de la tienda ─────────────────────────────────

// Tokens de la base de Gesicom (los mismos valores en todas sus versiones).
const TOKENS_BASE = [
  ['--paper', '#f7f9fc', 'var(--tienda-fondo, #f7f9fc)'],
  ['--ink', '#10202f', 'var(--tienda-texto, #10202f)'],
  ['--ink-soft', '#506172', 'var(--tienda-texto-suave, #506172)'],
  ['--white', '#ffffff', 'var(--tienda-superficie, #ffffff)'],
  ['--line', '#e4eaf0', 'var(--tienda-linea, #e4eaf0)'],
  ['--brand', '#16a36a', 'var(--tienda-primario, #16a36a)'],
  ['--accent', '#ffb547', 'var(--tienda-secundario, #ffb547)'],
  // Derivados: se recalculan desde el principal/secundario y la superficie.
  ['--brand-dark', '#08734a', 'color-mix(in srgb, var(--brand) 72%, #000)'],
  ['--brand-soft', '#e9f8f0', 'color-mix(in srgb, var(--brand) 12%, var(--white))'],
  ['--accent-soft', '#fff5e3', 'color-mix(in srgb, var(--accent) 16%, var(--white))'],
];

function esBaseGesicom(css) {
  return /--brand\s*:/.test(css) && /--ink\s*:/.test(css) && /--paper\s*:/.test(css);
}

/** Reglas por bloque: lo que va encima del principal o de una banda oscura. */
function mapearBloque(cuerpo) {
  let c = cuerpo;
  const sobrePrimario = /background\s*:\s*var\(--(?:brand|gc-primario)\)/.test(c);
  const sobreBanda = /background\s*:\s*var\(--ink\)/.test(c);
  if (sobreBanda) {
    c = c.replace(/background\s*:\s*var\(--ink\)/g, 'background: var(--tienda-banda, var(--ink))');
    c = c.replace(/color\s*:\s*var\(--white\)/g, 'color: var(--tienda-banda-texto, #fff)');
  }
  if (sobrePrimario) {
    c = c.replace(/color\s*:\s*var\(--white\)/g, 'color: var(--tienda-texto-sobre-primario, #fff)');
  }
  // --white pasa a ser la superficie (oscura con un fondo de marca oscuro):
  // el texto que era blanco va sobre algo oscuro, queda blanco fijo.
  c = c.replace(/color\s*:\s*var\(--white\)/g, 'color: #fff');
  // Texto en el tono oscuro del principal (etiquetas, "CÁPSULAS", íconos,
  // breadcrumb) → el secundario de la tienda, con contraste asegurado.
  c = c.replace(/(^|[;\s])color\s*:\s*var\(--brand-dark\)/g, '$1color: var(--tienda-destacado, var(--brand-dark))');
  // Texto en el principal → la versión legible sobre el fondo.
  c = c.replace(/(^|[;\s])color\s*:\s*var\(--brand\)/g, '$1color: var(--tienda-primario-texto, var(--brand))');
  return c;
}

export function conMarcaTienda(css) {
  if (!css) return css;
  let s = css;

  if (esBaseGesicom(s)) {
    for (const [nombre, hex, valor] of TOKENS_BASE) {
      s = s.replace(new RegExp(`(${nombre}\\s*:\\s*)${hex}(\\s*[;}])`, 'gi'), `$1${valor}$2`);
    }
    s = s.replace(/\{([^{}]*)\}/g, (_, cuerpo) => `{${mapearBloque(cuerpo)}}`);

    // Colores escritos a mano en la base.
    s = s.replace(/rgba\(\s*22\s*,\s*163\s*,\s*106\s*,\s*(0?\.\d+)\s*\)/g,
      (_, a) => `color-mix(in srgb, var(--brand, #16a36a) ${Math.round(parseFloat(a) * 100)}%, transparent)`);
    s = s.replace(/rgba\(\s*255\s*,\s*181\s*,\s*71\s*,\s*(0?\.\d+)\s*\)/g,
      (_, a) => `color-mix(in srgb, var(--accent, #ffb547) ${Math.round(parseFloat(a) * 100)}%, transparent)`);
    s = s.replace(/rgba\(\s*247\s*,\s*249\s*,\s*252\s*,\s*(0?\.\d+)\s*\)/g,
      (_, a) => `color-mix(in srgb, var(--paper) ${Math.round(parseFloat(a) * 100)}%, transparent)`);
    s = s.replace(/rgba\(\s*228\s*,\s*234\s*,\s*240\s*,\s*(0?\.\d+)\s*\)/g,
      (_, a) => `color-mix(in srgb, var(--line) ${Math.round(parseFloat(a) * 100)}%, transparent)`);
    s = s.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+)\s*\)/g,
      (_, a) => `color-mix(in srgb, var(--white) ${Math.round(parseFloat(a) * 100)}%, transparent)`);
    s = s.replace(/linear-gradient\s*\(\s*135deg\s*,\s*#ffffff\s+0%\s*,\s*#eff6ff\s+55%\s*,\s*#fff7ed\s+100%\s*\)/gi,
      'linear-gradient(135deg, var(--white) 0%, color-mix(in srgb, var(--brand, #16a36a) 6%, var(--white)) 55%, color-mix(in srgb, var(--accent, #ffb547) 8%, var(--white)) 100%)');
    s = s.replace(/(background\s*:\s*)#fffaf0\b/gi, '$1color-mix(in srgb, var(--accent, #ffb547) 8%, var(--white))');
    s = s.replace(/(background\s*:\s*)#f0fdf4\b/gi, '$1color-mix(in srgb, var(--brand, #16a36a) 8%, var(--white))');
    s = s.replace(/#eff6ff\b/gi, 'color-mix(in srgb, var(--brand, #16a36a) 6%, var(--paper))');
    s = s.replace(/#fff7ed\b/gi, 'color-mix(in srgb, var(--accent, #ffb547) 8%, var(--paper))');
    s = s.replace(/(border-top-color\s*:\s*)#2563eb\b/gi, '$1var(--brand)');
    s = s.replace(/(border-top-color\s*:\s*)#f59e0b\b/gi, '$1var(--accent)');
    s = s.replace(/(border-top-color\s*:\s*)#10b981\b/gi, '$1var(--brand)');
    s = s.replace(/(background\s*:\s*)#f8fafc\b/gi, '$1var(--paper)');
    // Fondo claro del hero del inicio (en un degradé): con un fondo de marca
    // oscuro quedaba blanco y el texto, ya claro, no se leía.
    s = s.replace(/#f9fbfd\b/gi, 'var(--paper)');
    s = s.replace(/(color\s*:\s*)#8ff2bd\b/gi, '$1var(--tienda-secundario, #8ff2bd)');
    s = s.replace(/(color\s*:\s*)#b42318\b/gi, '$1var(--tienda-destacado, #b42318)');
    s = s.replace(/#eef8f3\b/gi, 'color-mix(in srgb, var(--brand, #16a36a) 10%, var(--paper))');
  }

  // Cualquier diseño (también los de la IA): el contrato --gc-* con un hex fijo.
  s = s.replace(/(--gc-primario\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-primario, $2)');
  s = s.replace(/(--gc-secundario\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-secundario, $2)');
  s = s.replace(/(--gc-fondo\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-fondo, $2)');
  s = s.replace(/(--gc-texto\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-texto, $2)');
  s = s.replace(/(--gc-texto-suave\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-texto-suave, $2)');
  s = s.replace(/(--gc-superficie\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-superficie, $2)');
  s = s.replace(/(--gc-texto-sobre-primario\s*:\s*)(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b)/g, '$1var(--tienda-texto-sobre-primario, $2)');
  return s;
}
