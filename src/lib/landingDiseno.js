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
    surface: '#0c0f17',
    surfaceBorder: 'rgba(255,255,255,0.12)',
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
    modalBg: '#ffffff',
  },
};

/** @returns {object} variables CSS listas para pasar como `style` de un contenedor. */
export function calcularEstiloLanding({ tema, diseno }) {
  const modo = MODOS[tema?.modo] || MODOS.oscuro;
  const radios = RADIOS[diseno?.radio_bordes] || RADIOS.mediano;
  const fuente = FUENTES[diseno?.fuente] || FUENTES.outfit;

  return {
    '--l-primary': tema?.primario || '#10b981',
    '--l-secondary': tema?.secundario || '#059669',
    '--l-bg': tema?.fondo || modo.bg,
    '--l-text': tema?.texto || modo.text,
    '--l-text-muted': modo.textMuted,
    '--l-card-bg': tema?.tarjeta || modo.cardBg,
    '--l-card-border': modo.cardBorder,
    '--l-surface': modo.surface,
    '--l-surface-border': modo.surfaceBorder,
    '--l-modal-bg': modo.modalBg,
    '--l-radius': radios.radius,
    '--l-radius-sm': radios.radiusSm,
    '--l-font': fuente,
  };
}
