/**
 * Mapea tema/diseño de una landing (tema_modo, color_primario/fondo,
 * radio_bordes, fuente) a variables CSS. Un solo lugar para esta tabla:
 * la usan tanto LandingPreview.jsx (constructor) como LandingPublica.jsx
 * (página real) — que queden desincronizadas sería el tipo de bug que
 * solo se nota comparando ambas a simple vista.
 */

const RADIOS = {
  chico: { radius: '8px', radiusSm: '6px' },
  mediano: { radius: '14px', radiusSm: '8px' },
  grande: { radius: '24px', radiusSm: '14px' },
};

const FUENTES = {
  outfit: "'Outfit', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
};

// Google Fonts a cargar según la fuente elegida. "outfit" queda afuera:
// se asume ya cargada global (index.html, para toda la SPA incluida esta
// ruta pública). Las otras tres SÍ hacen falta acá — landingPublica.css
// no importa vitrina.css (por diseño, ver su comentario de cabecera), así
// que ni siquiera Inter está garantizada en esta página.
export const FUENTE_GOOGLE_HREF = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
};

const fuentesCargadas = new Set();

/** Inyecta el <link> de Google Fonts la primera vez que se pide cada fuente. */
export function cargarFuenteGoogle(fuenteId) {
  const href = FUENTE_GOOGLE_HREF[fuenteId];
  if (!href || fuentesCargadas.has(fuenteId) || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  fuentesCargadas.add(fuenteId);
}

export const MODOS = {
  oscuro: {
    bg: '#0a0d14',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    cardBg: '#131722',
    cardBorder: 'rgba(255,255,255,0.08)',
    surface: '#181d2a',
    surfaceBorder: 'rgba(255,255,255,0.12)',
    popoverBg: '#161a28',
    modalBg: '#161a28',
  },
  claro: {
    bg: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
    cardBg: '#ffffff',
    cardBorder: 'rgba(15,23,42,0.08)',
    surface: '#f1f5f9',
    surfaceBorder: 'rgba(15,23,42,0.12)',
    popoverBg: '#ffffff',
    modalBg: '#ffffff',
  },
};

/** Luminancia relativa (WCAG 2.x). `null` si el color no es un hex parseable. */
function luminanciaRelativa(color) {
  if (typeof color !== 'string') return null;
  let h = color.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const canal = (par) => {
    const s = parseInt(par, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(h.slice(0, 2)) + 0.7152 * canal(h.slice(2, 4)) + 0.0722 * canal(h.slice(4, 6));
}

/**
 * Normaliza un color CSS a hex de 6 dígitos. Acepta #rgb, #rrggbb y
 * rgb()/rgba() opacos — este último es lo que devuelve getComputedStyle,
 * que es de donde sale el tema de una landing de "Lienzo en blanco".
 * `null` si no se puede leer o si es (semi)transparente.
 */
export function normalizarColorHex(color) {
  if (typeof color !== 'string') return null;
  const c = color.trim();
  const rgb = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const alpha = rgb[4] == null ? 1 : (rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]));
    if (alpha < 0.95) return null;
    return `#${[rgb[1], rgb[2], rgb[3]].map(v => Math.min(255, Number(v)).toString(16).padStart(2, '0')).join('')}`;
  }
  let h = c.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toLowerCase()}` : null;
}

/** true si el color es claro (fondo sobre el que se escribe con tinta oscura). */
export function esColorClaro(color) {
  const l = luminanciaRelativa(normalizarColorHex(color));
  return l === null ? null : l > 0.4;
}

const TINTA_CLARA = '#ffffff';
const TINTA_OSCURA = '#0b1211';
const LUM_TINTA_OSCURA = 0.00545; // luminanciaRelativa(TINTA_OSCURA), constante

/**
 * Color de texto para escribir ENCIMA del primario (botones, píldora de
 * opción elegida, FAB del carrito).
 *
 * Antes era el literal `#04140d` en seis reglas distintas, lo que daba por
 * sentado que el comercio siempre elige un primario claro: con un primario
 * azul, bordó o violeta oscuro el texto quedaba negro sobre oscuro, sin
 * contraste. Acá se elige entre tinta clara y oscura por razón de contraste
 * WCAG real, así que funciona con cualquier color que elija el comercio.
 */
export function tintaSobre(color) {
  const l = luminanciaRelativa(color);
  if (l === null) return TINTA_OSCURA; // formato exótico: se mantiene el comportamiento previo
  const contrasteClaro = 1.05 / (l + 0.05);
  const contrasteOscuro = (l + 0.05) / (LUM_TINTA_OSCURA + 0.05);
  return contrasteOscuro >= contrasteClaro ? TINTA_OSCURA : TINTA_CLARA;
}

/**
 * Sanitiza colores para evitar que valores transparentes o semi-transparentes
 * guardados en versiones anteriores de la BD rompan la legibilidad y solidez de los componentes.
 */
function sanitizarColorSolido(color, fallback) {
  if (!color || typeof color !== 'string') return fallback;
  const c = color.trim().toLowerCase();
  if (c === 'transparent' || c.startsWith('rgba') || c.startsWith('hsla')) {
    return fallback;
  }
  return color;
}

/** @returns {object} variables CSS listas para pasar como `style` de un contenedor. */
export function calcularEstiloLanding({ tema, diseno }) {
  const modo = MODOS[tema?.modo] || MODOS.oscuro;
  const radios = RADIOS[diseno?.radio_bordes] || RADIOS.mediano;
  const fuente = FUENTES[diseno?.fuente] || FUENTES.outfit;
  const primario = tema?.primario || '#10b981';

  return {
    '--l-primary': primario,
    '--l-on-primary': tintaSobre(primario),
    '--l-secondary': tema?.secundario || '#059669',
    '--l-bg': sanitizarColorSolido(tema?.fondo, modo.bg),
    '--l-text': sanitizarColorSolido(tema?.texto, modo.text),
    '--l-text-muted': modo.textMuted,
    '--l-card-bg': sanitizarColorSolido(tema?.tarjeta, modo.cardBg),
    '--l-card-border': modo.cardBorder,
    '--l-surface': modo.surface,
    '--l-surface-border': modo.surfaceBorder,
    '--l-popover-bg': modo.popoverBg,
    '--l-modal-bg': modo.modalBg,
    '--l-radius': radios.radius,
    '--l-radius-sm': radios.radiusSm,
    '--l-font': fuente,
  };
}
