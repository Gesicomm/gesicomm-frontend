const SYSTEM_FONTS = [
  { id: 'outfit', label: 'Outfit', family: 'Outfit', cssFamily: "'Outfit', system-ui, sans-serif", source: 'system' },
  { id: 'inter', label: 'Inter', family: 'Inter', cssFamily: "'Inter', system-ui, sans-serif", source: 'google' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', cssFamily: "'Poppins', system-ui, sans-serif", source: 'google' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', cssFamily: "'Roboto', system-ui, sans-serif", source: 'google' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', cssFamily: "'Montserrat', system-ui, sans-serif", source: 'google' },
  { id: 'lato', label: 'Lato', family: 'Lato', cssFamily: "'Lato', system-ui, sans-serif", source: 'google' },
  { id: 'playfair-display', label: 'Playfair Display', family: 'Playfair Display', cssFamily: "'Playfair Display', Georgia, serif", source: 'google' },
];

export const DEFAULT_TYPOGRAPHY = {
  headingFont: 'outfit',
  bodyFont: 'outfit',
  systemFonts: SYSTEM_FONTS,
  customFonts: [],
};

export const GOOGLE_FONT_HREFS = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  'playfair-display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
};

const fuentesCargadas = new Set();
const fuentesCustomCargadas = new Set();

function cssString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function cargarFuenteRemota(fontId) {
  const href = GOOGLE_FONT_HREFS[fontId];
  if (!href || fuentesCargadas.has(fontId) || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  fuentesCargadas.add(fontId);
}

function cargarFuenteCustom(font) {
  if (!font?.id || !font.url || fuentesCustomCargadas.has(font.id) || typeof document === 'undefined') return;
  const weight = Array.isArray(font.weights) && font.weights.length ? font.weights[0] : 400;
  const extension = font.extension || (font.url || '').split('.').pop() || 'woff2';
  const format = extension === 'woff2' ? 'woff2' : extension === 'woff' ? 'woff' : 'truetype';
  const style = document.createElement('style');
  style.setAttribute('data-gesicomm-font', font.id);
  style.textContent = `@font-face{font-family:"${cssString(font.family)}";src:url("${cssString(font.url)}") format("${format}");font-weight:${weight};font-style:${font.style || 'normal'};font-display:swap;}`;
  document.head.appendChild(style);
  fuentesCustomCargadas.add(font.id);
}

export function normalizarTypography(typography = {}) {
  return {
    ...DEFAULT_TYPOGRAPHY,
    ...typography,
    systemFonts: Array.isArray(typography.systemFonts) && typography.systemFonts.length ? typography.systemFonts : SYSTEM_FONTS,
    customFonts: Array.isArray(typography.customFonts) ? typography.customFonts : [],
  };
}

export function listaFuentes(typography = {}) {
  const t = normalizarTypography(typography);
  return [...t.systemFonts, ...t.customFonts];
}

export function resolverFuente(typography = {}, id, fallback = 'outfit') {
  const fuente = listaFuentes(typography).find(f => f.id === id);
  return fuente || listaFuentes(typography).find(f => f.id === fallback) || SYSTEM_FONTS[0];
}

export function typographyStyle(typography = {}) {
  const t = normalizarTypography(typography);
  const heading = resolverFuente(t, t.headingFont, DEFAULT_TYPOGRAPHY.headingFont);
  const body = resolverFuente(t, t.bodyFont, DEFAULT_TYPOGRAPHY.bodyFont);
  cargarFuenteRemota(heading.id);
  cargarFuenteRemota(body.id);
  cargarFuenteCustom(heading);
  cargarFuenteCustom(body);
  return {
    '--store-font-heading': heading.cssFamily,
    '--store-font-body': body.cssFamily,
    '--l-font': body.cssFamily,
  };
}

export function typographyCss(typography = {}) {
  const t = normalizarTypography(typography);
  const heading = resolverFuente(t, t.headingFont, DEFAULT_TYPOGRAPHY.headingFont);
  const body = resolverFuente(t, t.bodyFont, DEFAULT_TYPOGRAPHY.bodyFont);
  const custom = [heading, body].filter(font => font.source === 'custom');
  const faces = [...new Map(custom.map(font => [font.id, font])).values()].map(font => {
    const weight = Array.isArray(font.weights) && font.weights.length ? font.weights[0] : 400;
    const extension = font.extension || (font.url || '').split('.').pop() || 'woff2';
    const format = extension === 'woff2' ? 'woff2' : extension === 'woff' ? 'woff' : 'truetype';
    return `@font-face{font-family:"${cssString(font.family)}";src:url("${cssString(font.url)}") format("${format}");font-weight:${weight};font-style:${font.style || 'normal'};font-display:swap;}`;
  }).join('\n');
  return [
    faces,
    ':root{',
    `--store-font-heading:${heading.cssFamily};`,
    `--store-font-body:${body.cssFamily};`,
    '}',
    'body{font-family:var(--store-font-body);}',
    ':where(h1,h2,h3,h4,h5,h6,.section-title,.section-heading,.hero-title){font-family:var(--store-font-heading);}',
    ':where(button,input,textarea,select){font-family:inherit;}',
  ].filter(Boolean).join('\n');
}
