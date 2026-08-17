// Tipos de elemento que quieren ocupar todo el ancho al apilarse (texto,
// link, botón — se ven angostos/cortados si no) — logo y social quieren su
// tamaño natural: un logo pensado para 8% de ancho en desktop no debe
// terminar ocupando el 100% de la pantalla en mobile solo porque no tenía
// layout propio para ese breakpoint (bug real, reportado con captura: el
// logo pasaba a ocupar toda la pantalla al no tener layout.mobile).
const TIPOS_ANCHO_COMPLETO = new Set(['text', 'link', 'button']);

// Tope de ancho para un logo apilado (mobile/tablet sin layout propio, o
// modo normal en general) — en un solo lugar para que el editor
// (BuilderElement.jsx) y el sitio público (PublicFooterRenderer.jsx) usen
// el mismo número. 96px ≈ el 8% de ancho que ya usa el botón "+ Logo" del
// inspector como default en un canvas desktop de ~1200px — así el tamaño
// "apilado" se ve como el mismo logo chico, no como una imagen de portada.
export const LOGO_MAX_APILADO = '96px';

// Espaciado para el modo APILADO (flujo normal). En modo libre va todo en
// 0: ahí las posiciones son absolutas en % del contenedor, así que un
// padding correría todo y rompería lo que el usuario acomodó a mano.
export const FOOTER_PAD_X = '20px';
export const FOOTER_PAD_Y = '28px';
export const FOOTER_GAP = '14px';

/** ¿Este elemento se apila (flujo normal) en este breakpoint? */
export function esApilado(el, breakpoint) {
  return resolveLayout(el?.layout, breakpoint, el?.type).mode !== 'free';
}

// Resuelve qué layout usar en cada breakpoint (desktop/tablet/mobile) para
// un elemento del footer — lo usan tanto el editor (BuilderElement.jsx)
// como el sitio público (PublicFooterRenderer.jsx), antes cada uno tenía su
// propia copia y podían desincronizarse.
export function resolveLayout(layout, breakpoint, elementType) {
  if (!layout) return { mode: 'normal' };

  const bpRules = layout[breakpoint];
  if (bpRules && bpRules.inherit) {
    return resolveLayout(layout, bpRules.inherit, elementType);
  }
  if (bpRules) return bpRules;

  // Sin regla propia para este breakpoint: se hereda del inmediato
  // superior SOLO si es de flujo normal. Heredar una posición "libre"
  // (absoluta, en % de un contenedor pensado para desktop) es lo que hacía
  // que el footer desapareciera en tablet/mobile — position:absolute saca
  // al elemento del flujo del documento, así que sin una altura explícita
  // para ESE breakpoint (el default de settings.minHeight es 'auto') el
  // contenedor colapsaba a 0px de alto y todo el footer quedaba invisible.
  // Además, coordenadas x/y pensadas para un canvas de 1200px casi nunca
  // quedan bien tal cual en 375px. "Normal, apilado" es un default seguro
  // en cualquier tamaño de pantalla — el ancho depende del tipo (ver
  // TIPOS_ANCHO_COMPLETO).
  const heredado = breakpoint === 'mobile' ? (layout.tablet || layout.desktop)
    : breakpoint === 'tablet' ? layout.desktop
    : null;
  if (heredado && heredado.mode !== 'free') return heredado;

  return { mode: 'normal', width: TIPOS_ANCHO_COMPLETO.has(elementType) ? '100%' : 'auto' };
}
