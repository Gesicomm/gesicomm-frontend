/**
 * Arma el documento HTML completo del modo "Lienzo en blanco" a partir de
 * los tres campos que escribe el comercio (HTML / CSS / JS).
 *
 * Este documento SIEMPRE se pinta dentro de un <iframe sandbox> sin
 * allow-same-origin (ver CodigoPreview.jsx). Ese sandbox es la contención
 * real del JavaScript del comercio:
 *
 *   - el origen del iframe es opaco → el script no ve document.cookie de
 *     la tienda, ni su localStorage, ni el DOM de la app de Gesicomm;
 *   - sin allow-same-origin cualquier llamada al backend sale con
 *     Origin: null y muere en CORS;
 *   - el <meta http-equiv="Content-Security-Policy"> de acá abajo corta
 *     además connect-src y form-action, así que ni siquiera puede mandar
 *     lo que el visitante escriba a un servidor de afuera.
 *
 * La sanitización del servidor (backend landingCodigo.service.js) es la
 * otra mitad: acá se renderiza, allá se decide qué se guarda. El preview
 * del editor usa esta misma función con el borrador SIN guardar, así que
 * lo que se ve mientras se escribe es exactamente lo que se va a publicar
 * (salvo lo que el guardado le quite).
 */

import { runtimeGesicomm } from './runtimeGesicomm';
import { conMarcaTienda, cssMarcaTienda } from './marcaTiendaCodigo';
import { typographyCss } from '../../lib/typography';

// El sandbox del iframe. allow-same-origin NO va acá y no debe agregarse:
// combinado con allow-scripts anula el aislamiento por completo.
export const SANDBOX_CODIGO = [
  'allow-scripts',
  'allow-forms',
  'allow-modals',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
].join(' ');

const CSP = [
  "default-src 'none'",
  "img-src https: http: data: blob:",
  "media-src https: http: data: blob:",
  "font-src https: data:",
  "style-src 'unsafe-inline' https:",
  "script-src 'unsafe-inline'",
  "frame-src https:",
  // El código del comercio no llama a ningún servidor: sin esto, un
  // formulario o un script podría mandarse los datos del visitante afuera.
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

// Los separadores de línea se construyen por código y no como escape
// en un literal: más de una herramienta los "normaliza" al carácter real
// y el regex queda roto.
const SEPARADOR_LINEA = new RegExp(String.fromCharCode(0x2028), 'g');
const SEPARADOR_PARRAFO = new RegExp(String.fromCharCode(0x2029), 'g');

/**
 * JSON seguro para meter dentro de un <script>: `<` escapado corta
 * cualquier `</script>` que venga en un nombre o descripción de producto,
 * y U+2028/U+2029 rompen el parseo de JS aunque sean JSON válido.
 */
function jsonEnScript(valor) {
  return JSON.stringify(valor ?? {})
    .replace(/</g, '\\u003c')
    .replace(SEPARADOR_LINEA, '\\u2028')
    .replace(SEPARADOR_PARRAFO, '\\u2029');
}

/** Evita que un `</script>` dentro del JS del comercio cierre el <script> del documento. */
function escaparCierreScript(js) {
  return String(js || '').replace(/<\/(script)/gi, '<\\/$1');
}

/** Ídem para el <style>: un `</style>` en el CSS abriría la puerta a inyectar marcado. */
function escaparCierreStyle(css) {
  return String(css || '').replace(/<\/(style)/gi, '<\\/$1');
}

function linksFuentes(fonts) {
  const urls = Array.isArray(fonts) ? fonts : [];
  const limpias = [];
  const vistos = new Set();
  for (const valor of urls) {
    try {
      const url = new URL(String(valor || '').trim());
      if (url.protocol !== 'https:' || url.hostname !== 'fonts.googleapis.com' || !url.pathname.startsWith('/css2')) continue;
      const href = url.toString();
      if (vistos.has(href)) continue;
      vistos.add(href);
      limpias.push(href);
      if (limpias.length >= 4) break;
    } catch {
      // URL inválida: se ignora.
    }
  }
  if (!limpias.length) return '';
  const stylesheets = limpias.map(href => `<link rel="stylesheet" href="${href}">`).join('\n');
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    stylesheets,
  ].join('\n');
}

/**
 * Las secciones de Gesicom (productos/contacto) van ANTES del último
 * <footer> de la landing, no pegadas al final del body: ahí quedaban debajo
 * del pie, como un bloque suelto con otro estilo. Sin footer propio, al final
 * (en ese caso las extras ya traen el footer legal de Gesicom).
 */
function cuerpoConExtras(html, extrasHtml) {
  const cuerpo = String(html || '');
  if (!extrasHtml) return cuerpo;
  const i = cuerpo.search(/<footer(?:\s|>)(?![\s\S]*<footer(?:\s|>))/i);
  return i === -1
    ? `${cuerpo}\n${extrasHtml}`
    : `${cuerpo.slice(0, i)}${extrasHtml}\n${cuerpo.slice(i)}`;
}

const SYSTEM_CSS = `
/* Contrato de marca: las landings IA usan --gc-* y Mi Tienda inyecta
   --tienda-*. Esta capa se aplica al final para que la marca configurada
   gane aunque el CSS generado haya dejado defaults fijos. */
:root {
  --gc-primario: var(--tienda-primario, #18a66b);
  --gc-secundario: var(--tienda-secundario, #ffb547);
  --gc-fondo: var(--tienda-fondo, #ffffff);
  --gc-texto: var(--tienda-texto, #10202f);
  --gc-texto-suave: var(--tienda-texto-suave, #506172);
  --gc-superficie: var(--tienda-superficie, #ffffff);
  --gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #ffffff);
  --navy: var(--gc-texto, var(--tienda-texto, #062b4f));
  --navy-deep: color-mix(in srgb, var(--navy) 78%, #000);
  --blue: var(--tienda-primario, #075da0);
  --blue-bright: color-mix(in srgb, var(--blue) 82%, #fff);
  --orange: var(--tienda-secundario, #ef5b3f);
  --line: var(--tienda-linea, #d7e6ef);
  --muted: var(--tienda-texto-suave, #5f7890);
  --sky: color-mix(in srgb, var(--tienda-primario, #075da0) 8%, var(--tienda-superficie, #fff));
}

/* El HTML generado por IA a veces deja body o un wrapper raiz con ancho fijo
   (1024px/1200px). En el preview de escritorio eso produce una franja blanca
   horrible a la derecha aunque la landing deberia ocupar todo el viewport. */
html,
body {
  width: auto !important;
  min-width: 100% !important;
  max-width: none !important;
}
html,
body {
  overflow-x: hidden;
}
body {
  overflow-anchor: none;
  background: var(--gc-fondo, var(--tienda-fondo, #ffffff));
  color: var(--gc-texto, var(--tienda-texto, #10202f));
}
html[data-gesicomm-preview-device="mobile"] {
  scrollbar-gutter: stable;
}

:where(.storefront, main[data-gesicomm-base]) {
  background: var(--gc-fondo, var(--tienda-fondo, #ffffff)) !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.storefront .page-content, .page-content) {
  background: transparent !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.section-heading h1, .section-heading h2, .section-title h1, .section-title h2, .dynamic-head h1, .dynamic-head h2, .pc-head h1, .pc-head h2) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.section-heading p, .section-title p, .dynamic-head p, .pc-head p, .pc-search span) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
}
:where(.pc-tabs button, .pc-tabs [role="tab"], .pc-tab, .category-filter, .category-chip) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  border-color: var(--tienda-linea, var(--line, #d7e6ef)) !important;
}
:where(.pc-tabs button.is-active, .pc-tabs button[aria-selected="true"], .pc-tab.is-active, .category-filter.is-active, .category-chip.is-active) {
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  border-color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.pc-search input, .storefront input[type="search"]) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  border-color: var(--tienda-linea, var(--line, #d7e6ef)) !important;
  caret-color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.pc-search input::placeholder, .storefront input[type="search"]::placeholder) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
}
:where(.trust-section, .benefit-strip, .category-strip, .countdown-section) {
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  border-color: var(--tienda-linea, var(--line, #d7e6ef)) !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.trust-card h3, .benefit-strip strong, .category-card, .countdown-copy h2) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.trust-card p, .benefit-strip span, .countdown-copy p) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
}
:where(.trust-card-icon, .benefit-strip svg, .countdown-copy > svg) {
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.hero-text .button-primary, .mid-banner .button-secondary, .promo-banner-home a, .promo-banner button, .light-button) {
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  border-color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  text-shadow: none !important;
}
:where(.hero-text .button-primary:hover, .mid-banner .button-secondary:hover, .promo-banner-home a:hover, .promo-banner button:hover, .light-button:hover) {
  filter: brightness(1.08);
}

:where(.trust-bar, .announcement, .site-footer, footer) {
  background: var(--tienda-banda, var(--gc-primario, var(--tienda-primario, #062b4f))) !important;
  color: var(--tienda-banda-texto, var(--gc-texto-sobre-primario, #fff)) !important;
}
:where(.trust-bar, .announcement) {
  padding-top: env(safe-area-inset-top, 0px) !important;
}
:where(.trust-item span, .footer-brand p, .footer-note, footer a, .site-footer, .footer-links a) {
  color: color-mix(in srgb, var(--tienda-banda-texto, #fff) 74%, transparent) !important;
}
:where(.trust-item strong, .announcement strong, .trust-icon, .trust-item svg) {
  color: var(--tienda-secundario, var(--gc-secundario, #93c5fd)) !important;
}
:where(.site-header, .commerce-header:not([data-variante="embebido"])) {
  background: color-mix(in srgb, var(--gc-superficie, var(--tienda-superficie, #fff)) 92%, transparent) !important;
  border-color: var(--tienda-linea, var(--gc-primario, #d7e6ef)) !important;
}
/* Variante "embebido" (ver estilosInicioCodigo.js): el header va transparente
   y superpuesto a la foto del banner, así que acá NO se fuerza el fondo/texto
   de marca de arriba — se fuerza blanco, que es lo que se lee sobre una foto. */
:where(.commerce-header[data-variante="embebido"]) {
  background: transparent !important;
  border-color: transparent !important;
  top: var(--gc-trust-bar-alto, 38px) !important;
}
:where(.commerce-header[data-variante="embebido"] .brand, .commerce-header[data-variante="embebido"] .brand-mark, .commerce-header[data-variante="embebido"] [data-gesicomm-tienda="nombre"], .commerce-header[data-variante="embebido"] .cart-button, .commerce-header[data-variante="embebido"] .cart-button strong, .commerce-header[data-variante="embebido"] .menu-toggle) {
  color: #fff !important;
}
:where(.commerce-header:not([data-variante="embebido"]) .brand, .commerce-header:not([data-variante="embebido"]) .brand-mark, .commerce-header:not([data-variante="embebido"]) [data-gesicomm-tienda="nombre"], .commerce-header:not([data-variante="embebido"]) .cart-button, .commerce-header:not([data-variante="embebido"]) .cart-button strong, .commerce-header:not([data-variante="embebido"]) .menu-toggle) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.commerce-header .brand, .commerce-header .brand-mark) {
  gap: clamp(8px, 1vw, 12px) !important;
  min-height: 46px !important;
  overflow: visible !important;
}
:where(.commerce-header.logo-centrado .brand, .commerce-header.logo-centrado .brand-mark) {
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  text-align: center !important;
}
:where(.commerce-header .brand-logo, .commerce-header [data-gesicomm-tienda="logo"]) {
  width: 34px !important;
  height: 46px !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
  transform: rotate(var(--gc-logo-rotacion, 0deg)) scale(var(--gc-logo-escala, 1)) !important;
  transform-origin: center !important;
  will-change: transform !important;
}
:where(.commerce-header [data-gesicomm-tienda="nombre"]) {
  font-size: 20px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}
:where(.commerce-header:not([data-variante="embebido"]) .nav-links, .commerce-header:not([data-variante="embebido"]) .nav-links a, .commerce-header:not([data-variante="embebido"]) .main-nav a, .commerce-header:not([data-variante="embebido"]) .header-nav a) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.commerce-header:not([data-variante="embebido"]) .nav-links a:hover, .commerce-header:not([data-variante="embebido"]) .nav-links a.active, .commerce-header:not([data-variante="embebido"]) .nav-links a[aria-current="page"], .commerce-header:not([data-variante="embebido"]) .main-nav a:hover, .commerce-header:not([data-variante="embebido"]) .main-nav a.active, .commerce-header:not([data-variante="embebido"]) .main-nav a[aria-current="page"], .commerce-header:not([data-variante="embebido"]) .header-nav a:hover, .commerce-header:not([data-variante="embebido"]) .header-nav a.active, .commerce-header:not([data-variante="embebido"]) .header-nav a[aria-current="page"]) {
  color: var(--tienda-destacado, var(--gc-secundario, var(--tienda-secundario, #93c5fd))) !important;
  border-color: currentColor !important;
  text-decoration-color: currentColor !important;
}
.commerce-header:not([data-variante="embebido"]) .nav-links,
.commerce-header:not([data-variante="embebido"]) .nav-links a,
.commerce-header:not([data-variante="embebido"]) .main-nav a,
.commerce-header:not([data-variante="embebido"]) .header-nav a {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
.commerce-header:not([data-variante="embebido"]) .nav-links a:hover,
.commerce-header:not([data-variante="embebido"]) .nav-links a.active,
.commerce-header:not([data-variante="embebido"]) .nav-links a[aria-current="page"],
.commerce-header:not([data-variante="embebido"]) .main-nav a:hover,
.commerce-header:not([data-variante="embebido"]) .main-nav a.active,
.commerce-header:not([data-variante="embebido"]) .main-nav a[aria-current="page"],
.commerce-header:not([data-variante="embebido"]) .header-nav a:hover,
.commerce-header:not([data-variante="embebido"]) .header-nav a.active,
.commerce-header:not([data-variante="embebido"]) .header-nav a[aria-current="page"] {
  color: var(--tienda-destacado, var(--gc-secundario, var(--tienda-secundario, #93c5fd))) !important;
  border-color: currentColor !important;
  text-decoration-color: currentColor !important;
}
.commerce-header[data-variante="embebido"] .nav-links,
.commerce-header[data-variante="embebido"] .nav-links a,
.commerce-header[data-variante="embebido"] .main-nav a,
.commerce-header[data-variante="embebido"] .header-nav a {
  color: #fff !important;
}
.commerce-header[data-variante="embebido"] .nav-links a:hover,
.commerce-header[data-variante="embebido"] .nav-links a.active,
.commerce-header[data-variante="embebido"] .nav-links a[aria-current="page"] {
  color: #fff !important;
  border-color: currentColor !important;
  text-decoration-color: currentColor !important;
}
:where(.commerce-header:not([data-variante="embebido"]) .cart-button svg, .commerce-header:not([data-variante="embebido"]) .cart-button i) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.commerce-header[data-variante="embebido"] .cart-button svg, .commerce-header[data-variante="embebido"] .cart-button i) {
  color: #fff !important;
}
body > :where(header, main, footer, section, article, aside, nav, div):not(.container) {
  min-width: 100% !important;
}

/* El panel "Secciones" (ver plantillaInicioEditor.js) oculta una sección
   poniéndole el atributo hidden en vez de borrarla, para poder restaurarla
   después. El HTML5 [hidden] ya trae display:none por defecto, pero una
   regla de layout del propio comercio (display:grid/flex en esa misma
   sección) le gana por venir de un <style> de autor posterior — este
   !important se aplica último (SYSTEM_CSS va al final) y gana siempre. */
main > section[hidden] {
  display: none !important;
}
/* Bloque de la ficha apagado con "Mostrar" en Vista producto (runtime,
   aplicarVisibilidadFicha). */
[data-gesicomm-ficha-oculto] {
  display: none !important;
}

/* Valores por defecto sin especificidad: las miniaturas de una ficha deben
   conservar las dimensiones de su diseño, también en landings ya guardadas. */
:where(img[data-gesicomm-bind="imagen"]) {
  display: block;
  width: 100%;
  height: auto;
}
/* Las fotos reales del catálogo no son banners decorativos: si el CSS de IA
   las fuerza a cover se cortan botellas, pulseras, cajas y combos. */
img[data-gesicomm-bind="imagen"]:not(:where([data-gesicomm-lista="banners_inicio"] *, .hero-banner *, .promo-banner *)),
[data-gesicomm-lista] img[data-gesicomm-bind="imagen"]:not(:where([data-gesicomm-lista="banners_inicio"] *, .hero-banner *, .promo-banner *)) {
  max-width: 100% !important;
  object-fit: contain !important;
  object-position: center !important;
  background: #fff !important;
}
/* Un banner usa el area completa; su CSS puede elegir otro ajuste o fondo. */
:where([data-gesicomm-lista="banners_inicio"], .hero-banner, .promo-banner) img[data-gesicomm-bind="imagen"] {
  object-fit: cover;
  background: transparent;
}
/* En Inicio, el banner configurado ocupa todo el area y su copy sale del panel
   de venta. Tambien neutraliza bases viejas guardadas con fondo azul fijo. */
main[data-gesicomm-base="catalogo"] :where(.hero-shell) {
  background: transparent !important;
}
main[data-gesicomm-base="catalogo"] :where(.hero:has([data-gesicomm-lista="banners_inicio"]:empty), .hero-shell:has([data-gesicomm-lista="banners_inicio"]:empty)) {
  display: none !important;
}
main[data-gesicomm-base="catalogo"] :where([data-gesicomm-lista="banners_inicio"] .hero-banner) {
  background: transparent !important;
  color: #fff !important;
}
main[data-gesicomm-base="catalogo"] :where([data-gesicomm-lista="banners_inicio"] .hero-banner::after, [data-gesicomm-lista="banners_inicio"] .hero-banner.is-media-only::before) {
  display: none !important;
  content: none !important;
  background: none !important;
}
main[data-gesicomm-base="catalogo"] :where([data-gesicomm-lista="banners_inicio"] .hero-text) {
  position: relative;
  z-index: 2;
}
main[data-gesicomm-base="catalogo"] :where([data-gesicomm-lista="banners_inicio"] .hero-banner > img, [data-gesicomm-lista="banners_inicio"] .hero-banner > video) {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  background: transparent !important;
}
/* El contenido del combo comparte espacio con la foto, no con una imagen
   del ancho de toda la tarjeta. Mantiene legibles nombres y precios largos. */
:where(.incluye-card) { min-width: 0; }
:where(.incluye-card > img, .trae-lista img) { flex-shrink: 0; }
:where(.incluye-card > div) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
:where(.description-body) { line-height: 1.7; overflow-wrap: anywhere; }
[data-gesicomm-lista],
[data-gesicomm-generado] {
  overflow-anchor: none;
}
.gc-catalog-controls { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
.gc-catalog-controls > :where(input, select) {
  flex: 1 1 210px; min-width: min(210px, 100%); max-width: 100%; min-height: 44px; padding: 10px 12px;
  color: inherit; background: var(--gc-superficie); border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 12px;
}
.gc-catalog-controls > [data-gesicomm-buscar] { flex-basis: 100%; }
:where(.lv-shell:has(.lv-shop-page), .lv-shop-page) {
  background: var(--gc-fondo, var(--tienda-fondo, #ffffff)) !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.lv-shop-page) {
  --shop-text: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  --shop-muted: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
  --shop-soft: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 8%, var(--gc-fondo, var(--tienda-fondo, #ffffff))) !important;
  --shop-surface: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  --shop-line: var(--tienda-linea, var(--line, #d7e6ef)) !important;
  --shop-accent: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.lv-shop-page .lv-kicker) {
  color: var(--tienda-destacado, var(--gc-primario, #075da0)) !important;
}
:where(.lv-shop-page .lv-title, .lv-shop-page .lv-shop-title, .lv-shop-page .lv-filters h2, .lv-shop-page .lv-filter-head, .lv-shop-page .lv-check, .lv-shop-page .lv-shop-price, .lv-shop-page .lv-clear, .lv-shop-page .lv-results-meta a) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.lv-shop-page .lv-copy, .lv-shop-page .lv-shop-breadcrumb, .lv-shop-page .lv-filter-field, .lv-shop-page .lv-results-meta, .lv-shop-page .lv-shop-category, .lv-shop-page .lv-shop-description, .lv-shop-page .lv-shop-old, .lv-shop-page .lv-stock-note) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
}
:where(.lv-shop-page .lv-filters, .lv-shop-page .lv-shop-media, .lv-shop-page .lv-empty, .lv-shop-page .lv-filter-field input, .lv-shop-page .lv-filter-field select, .lv-shop-page .lv-search input, .lv-shop-page .lv-sort select, .lv-shop-page .gc-select-ui-button, .lv-shop-page .gc-select-ui-menu, .lv-shop-page .lv-quick-filters a, .lv-shop-page .lv-quick-filters button, .lv-shop-page .lv-pages button) {
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  border-color: var(--tienda-linea, var(--line, #d7e6ef)) !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.lv-shop-page .lv-shop-card) {
  background: transparent !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
:where(.lv-shop-page .gc-select-ui-option) {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  background: transparent !important;
}
:where(.lv-shop-page .gc-select-ui-option:hover, .lv-shop-page .gc-select-ui-option[aria-selected="true"], .lv-shop-page .lv-quick-filters a:hover, .lv-shop-page .lv-quick-filters button:hover, .lv-shop-page .lv-quick-filters .is-active) {
  color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 12%, var(--gc-superficie, #ffffff)) !important;
  border-color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.lv-shop-page .lv-primary, .lv-shop-card .lv-primary) {
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
}
:where(.gc-product-shipping) { margin: 8px 0 0; font-size: .8rem; font-weight: 500; color: inherit; opacity: .85; }
.gc-card-media-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 20px);
  pointer-events: none;
}
.gc-card-media-badges span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 5px 9px;
  color: var(--gc-texto-sobre-primario, #fff);
  background: var(--gc-primario, var(--tienda-primario, #075da0));
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(8, 41, 71, .16);
  font: 900 11px/1 system-ui, sans-serif;
  text-transform: uppercase;
}
.gc-commercial-badges { display:flex; flex-wrap:wrap; gap:6px; padding:12px 14px; position:relative; z-index:1; }
.gc-commercial-badges span { background:var(--gc-primario,#155e63); color:white; border-radius:999px; padding:6px 10px; font:700 12px/1.3 system-ui,sans-serif; }
.gc-commercial-badges span + span { background:transparent; color:inherit; border:1px solid currentColor; }
.gc-commercial-copy { margin:8px 0 14px; font:400 14px/1.6 system-ui,sans-serif; color:inherit; opacity:.85; }
.gc-commercial-saving { margin:12px 0 0; font:700 14px/1.5 system-ui,sans-serif; color:inherit; }
.gc-commercial-details { display:inline-flex; margin:14px 0 0; padding:0; border:0; background:transparent; color:inherit; font:700 14px/1.5 system-ui,sans-serif; cursor:pointer; }
.gc-card-countdown {
  display: grid;
  gap: 5px;
  margin: 10px 0 12px;
  padding: 10px 12px;
  color: #fff;
  background: linear-gradient(135deg, #b80f45, #f15d3d);
  border-radius: 14px;
  box-shadow: 0 12px 26px rgba(184, 15, 69, .22);
}
.gc-card-countdown strong {
  font: 900 13px/1.2 system-ui, sans-serif;
}
.gc-card-countdown span {
  font: 650 11px/1.35 system-ui, sans-serif;
  opacity: .9;
}
.gc-card-countdown em {
  width: fit-content;
  padding: 5px 8px;
  color: #7a092b;
  background: #fff;
  border-radius: 999px;
  font: 900 12px/1 system-ui, sans-serif;
  font-style: normal;
  letter-spacing: .02em;
}
/* Oferta flash (LIMITED_OFFER_HTML de plantillasBaseCodigo.js). Va acá y no
   en la plantilla porque las landings guardan su propio CSS: las ya creadas
   no tenían reglas para lo que el runtime agrega a cada tarjeta (insignias,
   "Ver producto", ahorro) y la grilla se desarmaba. Banda oscura con el
   reloj grande a la izquierda; tarjetas blancas horizontales a la derecha.
   La especificidad (section.limited-offer[...]) le gana a las reglas
   .storefront ... .has-commercial-presentation de las bases sin !important. */
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] {
  --flash-bg: var(--tienda-banda, color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #082947)) 38%, var(--gc-fondo, var(--tienda-fondo, #082947))));
  --flash-on-bg: var(--tienda-banda-texto, var(--gc-texto-sobre-primario, #fff));
  --flash-card: var(--gc-superficie, var(--tienda-superficie, #fff));
  --flash-ink: var(--gc-texto, var(--tienda-texto, #082947));
  --flash-accent: var(--tienda-secundario, var(--gc-primario, var(--tienda-primario, #e11d3a)));
  --flash-accent-text: var(--tienda-destacado, var(--flash-accent));
  --flash-on-accent: var(--tienda-texto-sobre-secundario, var(--gc-texto-sobre-primario, #fff));
  --flash-line: var(--tienda-linea, var(--line, #e3eaf0));
  --flash-muted: var(--gc-texto-suave, var(--tienda-texto-suave, #5d7285));
  --flash-soft: color-mix(in srgb, var(--flash-accent) 12%, var(--flash-card));
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-card {
  display: grid;
  grid-template-columns: minmax(200px, 250px) minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  grid-template-areas: "summary products" "see products";
  align-items: stretch;
  gap: 14px 26px;
  padding: 22px;
  color: var(--flash-on-bg);
  background:
    radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--flash-accent) 22%, transparent), transparent 60%),
    var(--flash-bg);
  border: 0;
  border-radius: 18px;
  box-shadow: 0 18px 40px color-mix(in srgb, var(--flash-bg) 36%, transparent);
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-summary {
  grid-area: summary;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-self: start;
  min-width: 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-summary h2 {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  color: var(--flash-on-bg);
  font-size: clamp(21px, 2vw, 26px);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -.02em;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-summary h2 span[aria-hidden] {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: 17px;
  color: var(--flash-on-accent);
  background: color-mix(in srgb, var(--flash-accent) 52%, transparent);
  border-radius: 10px;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-summary p {
  margin: 10px 0 0;
  color: color-mix(in srgb, var(--flash-on-bg) 72%, transparent);
  font-size: 14px;
  line-height: 1.45;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: auto;
  margin: 22px 0 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  min-width: 62px;
  min-height: 0;
  padding: 10px 8px 8px;
  color: var(--flash-on-bg);
  background: color-mix(in srgb, var(--flash-on-bg) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--flash-on-bg) 14%, transparent);
  border-radius: 12px;
}
/* Los segundos llevan el acento de la tienda: es el número que se mueve y da urgencia. */
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box:last-child {
  color: var(--flash-on-accent);
  background: var(--flash-accent);
  border-color: var(--flash-accent);
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box b {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box small {
  margin-top: 5px;
  color: color-mix(in srgb, currentColor 70%, transparent);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: .08em;
  text-transform: uppercase;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-separator {
  align-self: center;
  margin-top: -14px;
  color: color-mix(in srgb, var(--flash-on-bg) 45%, transparent);
  font-size: 20px;
  font-weight: 900;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-see-all {
  grid-area: see;
  order: 0;
  align-self: end;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 9px 16px;
  color: var(--flash-on-bg);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--flash-on-bg) 30%, transparent);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: background .15s ease, border-color .15s ease;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-see-all:hover {
  background: color-mix(in srgb, var(--flash-on-bg) 10%, transparent);
  border-color: color-mix(in srgb, var(--flash-on-bg) 60%, transparent);
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-products {
  grid-area: products;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-content: center;
  gap: 14px;
  width: 100%;
  max-width: none;
  min-width: 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product {
  position: relative;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  color: var(--flash-ink);
  background: var(--flash-card);
  border: 0;
  border-radius: 14px;
  box-shadow: none;
}
/* Las insignias que agrega el runtime flotan sobre la foto en vez de ocupar
   una celda de la grilla (eso era lo que mandaba el texto a 64px de ancho). */
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  max-width: 112px;
  padding: 0;
  pointer-events: none;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-badges span,
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-badge {
  max-width: 100%;
  padding: 4px 7px;
  overflow: hidden;
  color: var(--flash-on-accent);
  background: var(--flash-accent);
  border: 0;
  border-radius: 6px;
  box-shadow: none;
  font: 900 10px/1.1 system-ui, sans-serif;
  letter-spacing: .02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  min-width: 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-badge:empty,
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:has(.gc-commercial-badges) .limited-offer-badge {
  display: none;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-image {
  display: grid;
  place-items: center;
  align-self: start;
  width: 100%;
  aspect-ratio: 1;
  min-height: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--flash-ink) 4%, var(--flash-card));
  border: 1px solid var(--flash-line);
  border-radius: 10px;
  cursor: pointer;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-image img {
  width: 100%;
  height: 100%;
  padding: 8px;
  mix-blend-mode: normal;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-copy {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: 6px;
  min-width: 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-copy h3 {
  display: -webkit-box;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  color: var(--flash-ink);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  cursor: pointer;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-copy {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--flash-muted);
  font: 500 12px/1.4 system-ui, sans-serif;
  opacity: 1;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-prices {
  display: flex;
  flex-flow: row wrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 2px 8px;
  min-height: 0;
  margin: 2px 0 0;
  padding: 0;
  color: var(--flash-ink);
  background: transparent;
  border-radius: 0;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-prices span {
  color: var(--flash-accent-text);
  font-size: 19px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-prices s {
  color: var(--flash-muted);
  font-size: 12px;
  font-weight: 600;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .limited-offer-prices s:empty {
  display: none;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-saving {
  flex: 0 0 auto;
  width: fit-content;
  margin: 2px 0 0;
  padding: 3px 8px;
  color: var(--flash-accent-text);
  background: var(--flash-soft);
  border-radius: 6px;
  font: 800 11px/1.3 system-ui, sans-serif;
}
/* El reloj de la sección ya está a la izquierda: uno por tarjeta repite lo mismo. */
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-card-countdown {
  display: none !important;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-product-shipping {
  margin: 0;
  color: var(--flash-accent-text);
  font-size: 11px;
  font-weight: 800;
  opacity: 1;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .button-primary {
  width: 100%;
  min-height: 38px;
  margin-top: auto;
  padding: 8px 12px;
  color: var(--gc-texto-sobre-primario, #fff);
  background: var(--gc-primario, var(--flash-ink));
  border: 0;
  border-radius: 10px;
  box-shadow: none;
  font-size: 13px;
  font-weight: 800;
  transition: filter .15s ease;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .button-primary:hover {
  filter: brightness(.92);
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-details {
  align-self: center;
  margin: 0;
  padding: 2px 0;
  color: var(--flash-muted);
  background: transparent;
  border: 0;
  font: 700 12px/1.3 system-ui, sans-serif;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product .gc-commercial-details:hover {
  color: var(--flash-ink);
  text-decoration: underline;
}
/* Una sola oferta ocupa todo el ancho: foto más grande y botón acotado. */
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child {
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 20px;
  padding: 18px;
}
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .limited-offer-copy h3 { font-size: 18px; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .gc-commercial-copy { font-size: 13px; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .limited-offer-prices span { font-size: 24px; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .button-primary { max-width: 280px; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .gc-commercial-details { align-self: flex-start; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .gc-commercial-badges { max-width: 176px; }
section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] :is(.limited-offer-see-all, .button-primary, .gc-commercial-details):focus-visible {
  outline: 3px solid color-mix(in srgb, var(--flash-accent) 70%, var(--flash-on-bg));
  outline-offset: 2px;
}
@media (max-width: 820px) {
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-card {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
    grid-template-areas: "summary" "products" "see";
    gap: 20px;
    padding: 20px 16px;
  }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-products {
    grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-see-all {
    justify-self: stretch;
    justify-content: center;
  }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child {
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .limited-offer-copy h3 { font-size: 15px; }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .limited-offer-prices span { font-size: 20px; }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product:only-child .button-primary { max-width: none; }
}
@media (max-width: 380px) {
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .limited-offer-product {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
  }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box { min-width: 0; flex: 1; }
  section.limited-offer[data-gesicomm-bloque="ofertas_urgencia"] .countdown-box b { font-size: 24px; }
}
[data-gesicomm-lista]:not([data-gesicomm-lista="banners_inicio"]) :where(.card__media, .product-image, .product-media, .product__media, .catalog-card__media, .combo__media, .pack__media, .media, .thumb, .image) {
  overflow: hidden !important;
  background: #fff !important;
}
[data-gesicomm-lista]:not([data-gesicomm-lista="banners_inicio"]) :where(.card__media, .product-image, .product-media, .product__media, .catalog-card__media, .combo__media, .pack__media, .media, .thumb, .image) img[data-gesicomm-bind="imagen"] {
  height: 100% !important;
}
/* El carrusel cambia entre fotos horizontales y verticales. La foto queda
   dentro de su área y nunca invade el nombre, los incluidos o el precio. */
[data-gesicomm-lista] .product-card > .product-image {
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  isolation: isolate;
}
[data-gesicomm-lista] .product-image img[data-gesicomm-bind="imagen"] {
  min-width: 0;
  min-height: 0;
  max-height: 100% !important;
  mix-blend-mode: normal !important;
}
:where([data-gesicomm-lista] .product-card) {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff)) !important;
  border-color: var(--tienda-linea, var(--line, #d7e6ef)) !important;
  border-radius: 12px !important;
  box-shadow: 0 14px 34px color-mix(in srgb, var(--gc-fondo, #0f172a) 52%, transparent) !important;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease !important;
}
:where([data-gesicomm-lista] .product-card:hover) {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 42%, var(--tienda-linea, var(--line, #d7e6ef))) !important;
  box-shadow: 0 24px 56px color-mix(in srgb, var(--gc-fondo, #0f172a) 56%, transparent) !important;
}
:where([data-gesicomm-lista] .product-card > .product-image) {
  position: relative !important;
  display: grid !important;
  place-items: center !important;
  min-height: 190px !important;
  background: color-mix(in srgb, var(--gc-texto, var(--tienda-texto, #10202f)) 4%, var(--gc-superficie, #ffffff)) !important;
  border-bottom: 1px solid color-mix(in srgb, var(--tienda-linea, var(--line, #d7e6ef)) 72%, transparent) !important;
}
[data-gesicomm-lista] .product-card > .product-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px !important;
  overflow-wrap: anywhere;
  position: relative;
  isolation: isolate;
  background: var(--gc-superficie, var(--tienda-superficie, #ffffff));
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
[data-gesicomm-lista] .product-card > .product-content h3 {
  min-height: 2.55em;
  margin: 0 !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  font-size: clamp(15px, 1.2vw, 17px);
  line-height: 1.28;
  font-weight: 850;
}
:where([data-gesicomm-lista] .product-card .product-category, [data-gesicomm-lista] .product-card .product-description, [data-gesicomm-lista] .product-card .gc-commercial-copy) {
  margin: 0 !important;
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
  line-height: 1.45;
  font-weight: 500 !important;
}
:where([data-gesicomm-lista] .product-card .product-description, [data-gesicomm-lista] .product-card .gc-commercial-copy) {
  display: -webkit-box;
  min-height: 2.8em;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 13px !important;
}
:where([data-gesicomm-lista] .product-card .gc-product-availability) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  margin: 0 !important;
  color: #0f9f6e !important;
  font-size: 12px !important;
  font-weight: 850 !important;
}
:where([data-gesicomm-lista] .product-card .gc-product-availability)::before {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  content: "";
}
[data-gesicomm-lista] .product-card .product-footer {
  flex-wrap: wrap;
}
[data-gesicomm-lista] .product-card .product-footer > * {
  min-width: 0;
  max-width: 100%;
}
/* Tarjetas de producto en Inicio/Ficha: el precio y la CTA siguen Mi Tienda,
   pero sin bandas duras que rompan la superficie de la card. */
:where([data-gesicomm-lista] .product-card .product-footer) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  align-items: end !important;
  margin-top: auto !important;
  padding: 0 !important;
  gap: 11px !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  background: transparent !important;
}
:where([data-gesicomm-lista] .product-card .product-prices) {
  display: flex !important;
  order: 1 !important;
  width: 100% !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: baseline !important;
  gap: 8px !important;
  margin: 0 !important;
}
:where([data-gesicomm-lista] .product-card .product-footer .price) {
  display: inline-flex !important;
  width: fit-content !important;
  max-width: 100% !important;
  min-height: 0 !important;
  align-items: center !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  background: transparent !important;
  font-size: clamp(19px, 1.55vw, 25px) !important;
  line-height: 1 !important;
  font-weight: 900 !important;
}
:where([data-gesicomm-lista] .product-card .product-footer .price-old) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #506172)) !important;
  font-size: 12px !important;
  order: -1 !important;
  flex-basis: 100% !important;
}
:where([data-gesicomm-lista] .product-card .product-footer .gc-commercial-saving) {
  order: 2 !important;
  flex: 1 0 100% !important;
  margin: -4px 0 0 !important;
  color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  line-height: 1.25 !important;
}
:where([data-gesicomm-lista] .product-card .product-footer .button-primary, [data-gesicomm-lista] .product-card .product-footer [data-gesicomm-comprar]) {
  display: flex !important;
  order: 3 !important;
  width: 100% !important;
  min-height: 42px !important;
  max-height: none !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 10px !important;
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: linear-gradient(135deg, color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 82%, #0b2447), var(--gc-primario, var(--tienda-primario, #075da0))) !important;
  border-color: var(--gc-primario, var(--tienda-primario, #075da0)) !important;
  opacity: 1 !important;
  visibility: visible !important;
  font-size: 13px !important;
  font-weight: 950 !important;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 22%, transparent) !important;
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease !important;
}
:where([data-gesicomm-lista] .product-card .product-footer .button-primary:hover) {
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 84%, #ffffff) !important;
  border-color: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 84%, #ffffff) !important;
  box-shadow: 0 14px 30px color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #075da0)) 28%, transparent) !important;
  transform: translateY(-1px);
}
/* Un solo combo relacionado aprovecha el ancho de la ficha. Con varios
   combos se conserva la grilla; en celular sigue la tarjeta vertical. */
@media (min-width: 701px) {
  .product-grid[data-gesicomm-lista="combos_producto"]:has(> .product-card:only-of-type) {
    grid-template-columns: minmax(0, 1fr);
  }
  .product-grid[data-gesicomm-lista="combos_producto"] > .product-card:only-of-type {
    display: grid;
    grid-template-columns: minmax(240px, .8fr) minmax(0, 1.2fr);
  }
  .product-grid[data-gesicomm-lista="combos_producto"] > .product-card:only-of-type > .product-image {
    height: 260px;
  }
}
/* Las redes las crea el runtime (pintarRedes) DESPUÉS de que el modelo
   escribió su CSS, así que nunca tienen estilo propio y salían como el link
   azul subrayado del navegador, en medio de un pie prolijo. Esto es solo un
   piso digno: va con :where() para tener especificidad cero, así cualquier
   regla que la IA escriba para .gc-red le gana sin pelear. */
:where(.gc-red) {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  color: inherit;
  text-decoration: none;
  transition: transform .16s ease, border-color .16s ease, background .16s ease, color .16s ease;
}
:where(.gc-red__icon) {
  display: block;
}
:where(.gc-red__label) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
:where(.gc-red:hover) {
  border-color: currentColor;
  transform: translateY(-1px);
  background: color-mix(in srgb, currentColor 10%, transparent);
}
:where(.gc-contact-float) {
  position: fixed;
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 2147483000;
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--tienda-primario, #16a34a);
  color: #fff;
  border: 1px solid color-mix(in srgb, #fff 22%, transparent);
  box-shadow: 0 14px 34px rgba(15, 23, 42, .28);
  text-decoration: none;
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}
:where(.gc-contact-float:hover) {
  transform: translateY(-2px);
  filter: brightness(1.04);
  box-shadow: 0 18px 42px rgba(15, 23, 42, .34);
}
:where(.gc-contact-float__icon) {
  display: block;
}
:where(.gc-contact-float__label) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
:where(.gc-contact-float--whatsapp) { background: #16a34a; }
:where(.gc-contact-float--instagram) { background: #c13584; }
:where(.gc-contact-float--email) { background: #2563eb; }
:where(.gc-contact-float--telefono) { background: #0f766e; }

:where([data-gesicomm-item][data-gesicomm-ver], [data-gesicomm-ver]) {
  cursor: pointer;
}
:where(img[data-gesicomm-carrusel]) {
  transition: transform .22s ease, filter .22s ease;
}
:where([data-gesicomm-carrusel].is-previewing) :where(img[data-gesicomm-carrusel]),
:where([data-gesicomm-item][data-gesicomm-ver]:hover) :where(img[data-gesicomm-carrusel]),
:where([data-gesicomm-item][data-gesicomm-ver]:focus-within) :where(img[data-gesicomm-carrusel]) {
  transform: scale(1.035);
  filter: saturate(1.05);
}

/* Header publico: el buscador solo se abre al tocar la lupa y el acceso
   "Todas las categorias" se retira tambien en landings ya guardadas. */
:where(.commerce-header .category-menu-wrap) {
  display: none !important;
}
:where(.commerce-header .header-actions) {
  align-items: center !important;
}
:where(.commerce-header .search-toggle, .commerce-header .cart-button) {
  width: 44px !important;
  min-width: 44px !important;
  height: 44px !important;
  min-height: 44px !important;
  display: inline-grid !important;
  place-items: center !important;
  padding: 0 !important;
}
/* El hamburguesa es mobile-only (ver @media 600px más abajo, donde recibe su
   propio tamaño + el ícono dibujado con ::before) — a diferencia de la lupa
   y el carrito, acá no se fuerza "display" para todos los anchos: si no,
   queda visible (aunque vacío) también en escritorio. */
:where(.commerce-header .menu-toggle) {
  display: none !important;
}
:where(.commerce-header .search-wrap) {
  position: relative !important;
  display: inline-flex !important;
  flex: 0 0 auto !important;
  min-width: 0 !important;
  align-items: center !important;
}
:where(.commerce-header .search-toggle) {
  color: currentColor !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 10px !important;
}
:where(.commerce-header .search-toggle:hover, .commerce-header .search-toggle[aria-expanded="true"]) {
  color: var(--tienda-destacado, var(--gc-primario, currentColor)) !important;
  background: color-mix(in srgb, currentColor 10%, transparent) !important;
}
/* Oculto por defecto sin depender del atributo [hidden] del HTML guardado:
   landings ya publicadas antes de este cambio pueden no tenerlo, y eso
   pintaba el buscador superpuesto al header hasta que corria el JS. */
:where(.commerce-header .search-box, .commerce-header form.search-box) {
  display: none !important;
}
:where(.commerce-header .search-wrap.is-open .search-box, .commerce-header .search-wrap.is-open form.search-box) {
  position: absolute !important;
  top: calc(100% + 10px) !important;
  right: 0 !important;
  transform: none !important;
  z-index: 70 !important;
  width: min(360px, calc(100vw - 40px)) !important;
  min-height: 42px !important;
  display: flex !important;
  overflow: hidden !important;
  background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
  border: 1px solid color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 42%, var(--tienda-linea, #e4eaf0)) !important;
  border-radius: 10px !important;
  box-shadow: 0 18px 45px color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #082947)) 22%, transparent) !important;
}
:where(.commerce-header .search-box input) {
  min-width: 0 !important;
  flex: 1 1 auto !important;
  color: var(--gc-texto, var(--tienda-texto, #071a33)) !important;
  background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
  caret-color: var(--gc-primario, var(--tienda-primario, #0d6efd)) !important;
}
:where(.commerce-header .search-box input::placeholder) {
  color: var(--gc-texto-suave, var(--tienda-texto-suave, #64748b)) !important;
}
:where(.commerce-header .search-box button) {
  flex: 0 0 50px !important;
  color: var(--gc-texto-sobre-primario, var(--tienda-texto-sobre-primario, #fff)) !important;
  background: var(--gc-primario, var(--tienda-primario, #0d6efd)) !important;
}
:where(.commerce-header [data-gesicomm-search-close]) {
  display: none !important;
}
:where(.commerce-header .search-wrap.is-open) {
  z-index: 80 !important;
}
:where(.commerce-header [data-gesicomm-search-results]) {
  position: absolute !important;
  top: calc(100% + 60px) !important;
  right: 0 !important;
  z-index: 69 !important;
  width: min(360px, calc(100vw - 40px)) !important;
  max-height: min(360px, calc(100vh - 120px)) !important;
  overflow: auto !important;
  padding: 8px !important;
  background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
  border: 1px solid color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 28%, var(--tienda-linea, #e4eaf0)) !important;
  border-radius: 12px !important;
  box-shadow: 0 18px 45px color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #082947)) 20%, transparent) !important;
}
:where(.commerce-header [data-gesicomm-search-results][hidden]) {
  display: none !important;
}
:where(.commerce-header [data-gesicomm-search-results]:empty) {
  display: none !important;
}
:where(.commerce-header .search-result-item) {
  display: grid !important;
  grid-template-columns: 46px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
  min-height: 58px !important;
  padding: 7px !important;
  border: 0 !important;
  border-radius: 9px !important;
  background: transparent !important;
  color: var(--tienda-primario-texto, var(--gc-texto, #071a33)) !important;
  text-align: left !important;
  cursor: pointer !important;
}
:where(.commerce-header .search-result-item:hover, .commerce-header .search-result-item:focus-visible) {
  background: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 11%, var(--gc-superficie, #fff)) !important;
  outline: none !important;
}
:where(.commerce-header .search-result-thumb) {
  width: 46px !important;
  height: 46px !important;
  border: 1px solid color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 24%, var(--tienda-linea, #e4eaf0)) !important;
  border-radius: 8px !important;
  object-fit: cover !important;
  background: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d6efd)) 6%, var(--gc-superficie, #fff)) !important;
}
:where(.commerce-header .search-result-name) {
  display: block !important;
  overflow: hidden !important;
  color: var(--tienda-primario-texto, var(--gc-texto, #071a33)) !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1.25 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
:where(.commerce-header .search-result-meta) {
  display: block !important;
  margin-top: 3px !important;
  color: var(--tienda-destacado, var(--tienda-primario-texto, var(--gc-texto-suave, #64748b))) !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}
:where(.commerce-header .cart-button) {
  position: relative !important;
  border: 0 !important;
  background: transparent !important;
}
:where(.commerce-header [data-gesicomm-cart-badge]) {
  position: absolute !important;
  top: 4px !important;
  right: 2px !important;
  display: grid !important;
  min-width: 17px !important;
  height: 17px !important;
  padding: 0 5px !important;
  place-items: center !important;
  border-radius: 999px !important;
  color: var(--gc-texto-sobre-primario, #fff) !important;
  background: var(--tienda-destacado, var(--gc-secundario, var(--gc-primario, #0d6efd))) !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}
:where(.commerce-header [data-gesicomm-cart-badge][hidden]) {
  display: none !important;
}

@media (max-width: 920px) {
  .commerce-header.menu-open::before {
    position: fixed !important;
    inset: 0 !important;
    z-index: 990 !important;
    background: rgba(2, 6, 23, .46) !important;
    content: "" !important;
  }
  .commerce-header .header-nav {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    right: auto !important;
    width: min(84vw, 320px) !important;
    max-width: calc(100vw - 54px) !important;
    max-height: none !important;
    min-height: 100vh !important;
    display: flex !important;
    flex-basis: auto !important;
    order: initial !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    gap: 0 !important;
    overflow-y: auto !important;
    padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px 22px !important;
    background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
    border: 0 !important;
    border-right: 1px solid var(--tienda-linea, var(--line, #e4eaf0)) !important;
    border-radius: 0 !important;
    box-shadow: 0 24px 60px rgba(8, 41, 71, .24) !important;
    transform: translateX(-105%) !important;
    transition: transform .22s ease !important;
    z-index: 1000 !important;
  }
  .commerce-header .header-nav.is-open {
    transform: translateX(0) !important;
  }
  .commerce-header .header-nav .nav-links,
  .commerce-header .header-nav #nav-links {
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
  }
  .commerce-header .header-nav .nav-links a,
  .commerce-header .header-nav #nav-links a {
    width: 100% !important;
    padding: 14px 12px !important;
    border-bottom: 1px solid var(--tienda-linea, var(--line, #e4eaf0)) !important;
    white-space: normal !important;
  }
  .commerce-header[data-variante="embebido"] .header-nav {
    background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
  }
  .commerce-header[data-variante="embebido"] .header-nav a,
  .commerce-header[data-variante="embebido"] .header-nav .nav-links a,
  .commerce-header[data-variante="embebido"] .header-nav #nav-links a {
    color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  }
}

@media (max-width: 600px) {
  :where(.commerce-header .header-main) {
    height: 64px !important;
    min-height: 64px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 8px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  :where(.commerce-header .brand-column) {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    height: 44px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    align-self: center !important;
    padding: 0 !important;
  }
  :where(.commerce-header .brand, .commerce-header .brand-mark) {
    min-width: 0 !important;
    max-width: 100% !important;
    height: 44px !important;
    min-height: 44px !important;
    align-items: center !important;
  }
  :where(.commerce-header [data-gesicomm-tienda="nombre"]) {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
  :where(.commerce-header .header-actions) {
    flex: 0 0 auto !important;
    height: 44px !important;
    display: grid !important;
    grid-auto-flow: column !important;
    grid-auto-columns: 44px !important;
    gap: 4px !important;
    margin-left: auto !important;
    align-items: center !important;
    justify-items: center !important;
    align-self: center !important;
  }
  :where(.commerce-header .search-wrap) {
    position: relative !important;
    width: 44px !important;
    height: 44px !important;
    display: grid !important;
    place-items: center !important;
    align-self: center !important;
  }
  :where(.commerce-header .search-toggle, .commerce-header .cart-button, .commerce-header .menu-toggle) {
    flex: 0 0 44px !important;
    align-self: center !important;
    display: grid !important;
    place-items: center !important;
    justify-content: center !important;
    position: relative !important;
    width: 44px !important;
    min-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    vertical-align: middle !important;
    line-height: 1 !important;
    overflow: visible !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }
  :where(.commerce-header .search-toggle) {
    font-size: 0 !important;
  }
  :where(.commerce-header .search-toggle)::before {
    display: block !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 20px !important;
    height: 20px !important;
    background: currentColor !important;
    content: "" !important;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M20 20l-4.5-4.5' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat !important;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M20 20l-4.5-4.5' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat !important;
  }
  :where(.commerce-header .cart-button) {
    gap: 0 !important;
    font-size: 0 !important;
  }
  :where(.commerce-header .cart-button > span[aria-hidden="true"]) {
    display: none !important;
  }
  :where(.commerce-header .cart-button)::before {
    display: block !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 22px !important;
    height: 22px !important;
    background: currentColor !important;
    content: "" !important;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 6h15l-1.5 8.5H8L6 3H3' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='20' r='1.7'/%3E%3Ccircle cx='18' cy='20' r='1.7'/%3E%3C/svg%3E") center / contain no-repeat !important;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 6h15l-1.5 8.5H8L6 3H3' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='20' r='1.7'/%3E%3Ccircle cx='18' cy='20' r='1.7'/%3E%3C/svg%3E") center / contain no-repeat !important;
  }
  :where(.commerce-header .cart-button strong) {
    display: none !important;
  }
  :where(.commerce-header .menu-toggle) {
    width: 44px !important;
    min-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    display: inline-grid !important;
    place-items: center !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 10px !important;
    color: currentColor !important;
    font-size: 0 !important;
    line-height: 1 !important;
  }
  :where(.commerce-header .menu-toggle)::before {
    display: block !important;
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 22px !important;
    height: 22px !important;
    background: currentColor !important;
    box-shadow: none !important;
    content: "" !important;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 7h16M4 12h16M4 17h16' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat !important;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 7h16M4 12h16M4 17h16' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat !important;
  }
  :where(.commerce-header .menu-toggle[aria-expanded="true"])::before {
    width: 20px !important;
    height: 20px !important;
    background: linear-gradient(45deg, transparent calc(50% - 1px), currentColor 0 calc(50% + 1px), transparent 0), linear-gradient(-45deg, transparent calc(50% - 1px), currentColor 0 calc(50% + 1px), transparent 0) !important;
    box-shadow: none !important;
    -webkit-mask: none !important;
    mask: none !important;
  }
  :where(.commerce-header.menu-open)::before {
    position: fixed !important;
    inset: 0 !important;
    z-index: 990 !important;
    background: rgba(2, 6, 23, .46) !important;
    content: "" !important;
  }
  :where(.commerce-header .header-nav) {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    right: auto !important;
    width: min(86vw, 340px) !important;
    max-height: none !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    overflow-y: auto !important;
    padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px 22px !important;
    background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
    border: 0 !important;
    border-right: 1px solid var(--tienda-linea, var(--line, #e4eaf0)) !important;
    border-radius: 0 !important;
    box-shadow: 0 24px 60px rgba(8, 41, 71, .22) !important;
    transform: translateX(-105%) !important;
    transition: transform .22s ease !important;
    z-index: 1000 !important;
  }
  :where(.commerce-header .header-nav.is-open) {
    transform: translateX(0) !important;
  }
  :where(.commerce-header .search-wrap.is-open .search-box, .commerce-header .search-wrap.is-open form.search-box) {
    position: fixed !important;
    top: calc(env(safe-area-inset-top, 0px) + var(--gc-trust-bar-alto, 0px) + var(--gc-header-alto, 64px) + 8px) !important;
    right: 12px !important;
    bottom: auto !important;
    left: 12px !important;
    width: auto !important;
    min-height: 52px !important;
    z-index: 95 !important;
    border-radius: 14px !important;
  }
  :where(.commerce-header .search-wrap.is-open)::before {
    position: fixed !important;
    inset: 0 !important;
    z-index: 90 !important;
    background: rgba(2, 6, 23, .48) !important;
    content: "" !important;
  }
  :where(.commerce-header [data-gesicomm-search-close]) {
    display: grid !important;
    flex: 0 0 44px !important;
    width: 44px !important;
    place-items: center !important;
    color: var(--gc-texto, #10202f) !important;
    background: transparent !important;
    border: 0 !important;
  }
  :where(.commerce-header .search-wrap.is-open [data-gesicomm-search-results]) {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    top: calc(env(safe-area-inset-top, 0px) + var(--gc-trust-bar-alto, 0px) + var(--gc-header-alto, 64px) + 70px) !important;
    width: auto !important;
    max-height: min(56vh, 430px) !important;
    z-index: 94 !important;
    border-radius: 14px !important;
  }
}

/* Colecciones: tarjetas mas altas y con lectura clara sobre imagen. */
:where(.storefront .collection-grid, .collection-grid) {
  gap: clamp(16px, 2vw, 24px) !important;
}
:where(.storefront .collection-card, .collection-card, .collection) {
  min-height: clamp(260px, 26vw, 360px) !important;
  padding: clamp(18px, 2.2vw, 28px) !important;
  overflow: hidden !important;
  border-radius: 10px !important;
  background-color: color-mix(in srgb, var(--gc-primario, var(--tienda-primario, #0d1b2a)) 85%, #000) !important;
  background-size: cover !important;
  background-position: center !important;
  box-shadow:
    inset 0 -145px 95px color-mix(in srgb, #000 62%, transparent),
    0 18px 36px color-mix(in srgb, var(--gc-fondo, #000) 22%, transparent) !important;
}
:where(.storefront .collection-card h3, .collection-card h3, .collection strong) {
  color: #fff !important;
  font-size: clamp(1rem, 1.15vw, 1.25rem) !important;
  line-height: 1.15 !important;
  text-shadow: 0 2px 12px rgba(0,0,0,.45) !important;
}
:where(.storefront .collection-card p, .collection-card p, .collection span) {
  color: color-mix(in srgb, #fff 88%, transparent) !important;
  font-weight: 800 !important;
  text-shadow: 0 2px 12px rgba(0,0,0,.45) !important;
}
/* En una sola columna (mobile real, viewport angosto) la tarjeta queda muy
   ancha y baja en proporcion a su alto: "cover" la usa para tapar todo el
   ancho y termina recortando la foto en un primer plano feo. Subiendo el
   alto minimo (mas vertical, como ya se ve en el preview del editor) el
   recorte de "cover" es mucho mas suave y el producto entra casi entero. */
@media (max-width: 720px) {
  :where(.storefront .collection-card, .collection-card, .collection) {
    min-height: min(88vw, 340px) !important;
  }
}
:where(.trust-track, .announcement-track) {
  width: max-content !important;
  min-width: max-content !important;
}
:where(.trust-item, .announcement span) {
  flex: 0 0 auto !important;
}

@media (max-width: 720px) {
  html[data-gesicomm-preview-device="mobile"] body:has(main[data-gesicomm-base="producto"]) {
    padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] {
    width: 100% !important;
    max-width: 100% !important;
    padding-inline: 16px !important;
    overflow-x: clip !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .pdp {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 22px !important;
    padding: 16px 0 34px !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .gallery {
    position: static !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    gap: 10px !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .gallery-main {
    width: 100% !important;
    min-height: 220px !important;
    max-height: 340px !important;
    aspect-ratio: 1 / 1 !important;
    padding: 14px !important;
    background: var(--gc-superficie, var(--tienda-superficie, #fff)) !important;
    border: 1px solid var(--tienda-linea, var(--line, #e4eaf0)) !important;
    border-radius: 14px !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .gallery-main img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .pdp-info {
    min-width: 0 !important;
    color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="producto"] .buy-row {
    display: flex !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  html[data-gesicomm-preview-device="mobile"] .sticky-compra {
    z-index: 80 !important;
  }
}

[data-gesicomm-tienda="logo"] {
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
}
[data-gesicomm-tienda="logo"]:not([src]),
[data-gesicomm-tienda="logo"][src=""] {
  display: none !important;
}
.commerce-header .brand,
.commerce-header .brand-mark,
.brand,
.brand-mark,
[data-gesicomm-tienda="nombre"] {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
.commerce-header .brand::before,
.commerce-header .brand-mark::before,
.brand::before,
.brand-mark::before {
  display: none !important;
  content: none !important;
}

/* Nuestra marca: este bloque vive dentro de .page-content pero necesita su
   propio ancho y respiro, porque algunas landings guardadas lo dejaban pegado
   al borde del contenedor. */
main[data-gesicomm-base="catalogo"] > .page-content > .brand-section {
  padding-block: clamp(76px, 9vw, 112px) clamp(70px, 8vw, 100px) !important;
  background: var(--gc-superficie, #fff) !important;
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
main[data-gesicomm-base="catalogo"] > .page-content > .brand-section > .brand-layout {
  width: min(100%, 1120px) !important;
  margin-inline: auto !important;
  padding-inline: clamp(28px, 4vw, 42px) !important;
  display: grid !important;
  grid-template-columns: minmax(320px, .98fr) minmax(0, 1fr) !important;
  align-items: center !important;
  gap: clamp(44px, 6vw, 84px) !important;
}
main[data-gesicomm-base="catalogo"] .brand-media {
  min-height: 370px !important;
  aspect-ratio: 1.46 / 1 !important;
  overflow: hidden !important;
}
main[data-gesicomm-base="catalogo"] .brand-medio,
main[data-gesicomm-base="catalogo"] .brand-medio :where(img, video) {
  width: 100% !important;
  height: 100% !important;
}
main[data-gesicomm-base="catalogo"] .brand-medio :where(img, video) {
  min-height: 370px !important;
  object-fit: contain !important;
}
main[data-gesicomm-base="catalogo"] .brand-copy :where(.eyebrow, h1, h2, h3, p),
main[data-gesicomm-base="catalogo"] .brand-badge {
  color: var(--gc-texto, var(--tienda-texto, #10202f)) !important;
}
main[data-gesicomm-base="catalogo"] .brand-copy .eyebrow {
  color: var(--tienda-destacado, var(--gc-texto, #10202f)) !important;
}
main[data-gesicomm-base="catalogo"] .brand-badge {
  background: color-mix(in srgb, var(--gc-superficie, #fff) 88%, var(--gc-primario, #18a66b)) !important;
  border-color: var(--tienda-linea, var(--line, #e4eaf0)) !important;
}
@media (max-width: 900px) {
  main[data-gesicomm-base="catalogo"] > .page-content > .brand-section {
    padding-block: 48px !important;
  }
  main[data-gesicomm-base="catalogo"] > .page-content > .brand-section > .brand-layout {
    grid-template-columns: 1fr !important;
    gap: 28px !important;
  }
  main[data-gesicomm-base="catalogo"] .brand-media,
  main[data-gesicomm-base="catalogo"] .brand-medio :where(img, video) {
    min-height: 280px !important;
  }
}
@media (max-width: 600px) {
  main[data-gesicomm-base="catalogo"] > .page-content > .brand-section > .brand-layout {
    padding-inline: 16px !important;
  }
}
/* El simulador móvil corre en un iframe de escritorio con scrollbar clásica:
   ese gutter existe en preview pero no en un teléfono real. La compensación
   evita que el bloque de imagen de "Nuestra marca" quede debajo de la barra
   o parezca salirse del recuadro en el editor. */
@media (max-width: 600px) {
  html[data-gesicomm-preview-device="mobile"] :where(.storefront .page-content, .page-content) {
    padding-right: calc(16px + 12px) !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="catalogo"] > .page-content > .brand-section {
    overflow-x: clip !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="catalogo"] > .page-content > .brand-section > .brand-layout {
    max-width: 100% !important;
    padding-inline: 16px !important;
  }
  html[data-gesicomm-preview-device="mobile"] main[data-gesicomm-base="catalogo"] .brand-media {
    width: 100% !important;
    max-width: 100% !important;
    justify-self: stretch !important;
  }
}

/* Los upsells no viven dentro de la ficha: son una etapa del checkout. */
[data-gesicomm-lista="ofertas_upsell"] {
  display: none !important;
}

/* Compatibilidad: landings guardadas antes del rediseño pueden seguir
   teniendo el HTML viejo del order bump. Esta capa se inyecta después del CSS
   del comercio para que la preview y la publicación no revivan el diseño
   amarillo/punteado ni el control de formulario antiguo. */
.bump:has(input[data-gesicomm-bump]) {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
  position: relative !important;
  cursor: pointer !important;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 12%, transparent), transparent 62%),
    var(--gc-superficie, var(--white, #fff)) !important;
  border: 1.5px solid color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 38%, var(--line, #dbe3ee)) !important;
  border-radius: 14px !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .08) !important;
}
.bumps[data-gesicomm-lista="ofertas_bump"] {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  background: transparent !important;
}
:where(section, article, aside, div):has(> .bumps[data-gesicomm-lista="ofertas_bump"]) {
  width: 100% !important;
  max-width: 100% !important;
}
.bump:has(input[data-gesicomm-bump]:hover),
.bump:has(input[data-gesicomm-bump]):hover {
  border-color: var(--gc-primario, var(--brand, #18a66b)) !important;
  box-shadow: 0 18px 34px rgba(15, 23, 42, .12) !important;
}
.bump:has(input[data-gesicomm-bump]:checked) {
  border-color: var(--gc-primario, var(--brand, #18a66b)) !important;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 12%, transparent), transparent 62%),
    var(--gc-superficie, var(--white, #fff)) !important;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .08) !important;
}
@media (min-width: 760px) {
  .bump:has(input[data-gesicomm-bump]:checked) {
    min-width: min(720px, calc(100vw - 32px)) !important;
  }
}
.bump input[data-gesicomm-bump] {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-flag {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 8px 14px !important;
  color: var(--gc-primario, var(--brand, #18a66b)) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 14%, #fff) !important;
  font-size: .72rem !important;
  font-weight: 900 !important;
  letter-spacing: .05em !important;
  line-height: 1.2 !important;
  text-transform: uppercase !important;
}
.bump:has(input[data-gesicomm-bump]:checked) .bump-flag {
  color: #fff !important;
  background: var(--gc-primario, var(--brand, #18a66b)) !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-body {
  display: grid !important;
  grid-template-columns: 68px minmax(0, 1fr) !important;
  gap: 12px !important;
  align-items: center !important;
  padding: 14px !important;
}
/* El botón va en su propia fila, a todo el ancho: en la misma fila que la
   foto y el texto le dejaba al nombre una columna de ~70px (una palabra por
   renglón) en cuanto la ficha se angostaba. */
.bump:has(input[data-gesicomm-bump]):has(.bump-control) .bump-body {
  grid-template-columns: 28px 68px minmax(0, 1fr) !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-control {
  display: grid !important;
  place-items: center !important;
  width: 28px !important;
  height: 28px !important;
  border: 2px solid color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 64%, var(--line, #dbe3ee)) !important;
  border-radius: 999px !important;
  color: var(--gc-primario, var(--brand, #18a66b)) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 10%, #fff) !important;
}
.bump:has(input[data-gesicomm-bump]:checked) .bump-control {
  border-color: var(--gc-primario, var(--brand, #18a66b)) !important;
  background: var(--gc-primario, var(--brand, #18a66b)) !important;
  color: #fff !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-img {
  width: 68px !important;
  height: 68px !important;
  aspect-ratio: 1 / 1 !important;
  object-fit: contain !important;
  background: #fff !important;
  border: 1px solid rgba(15, 23, 42, .08) !important;
  border-radius: 10px !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-copy {
  display: grid !important;
  gap: 4px !important;
  min-width: 0 !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-title {
  color: var(--gc-texto, var(--ink, #0f172a)) !important;
  font-weight: 850 !important;
  line-height: 1.22 !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-ctrl {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  margin: 0 14px 14px !important;
  padding: 10px 14px !important;
  color: #fff !important;
  background: var(--gc-primario, var(--brand, #18a66b)) !important;
  border: 0 !important;
  border-radius: 999px !important;
  font-size: .78rem !important;
  font-weight: 900 !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-action {
  grid-column: 1 / -1 !important;
  justify-self: stretch !important;
  text-align: center !important;
  padding: 10px 14px !important;
  color: var(--gc-texto-sobre-primario, #fff) !important;
  background: var(--gc-primario, var(--brand, #18a66b)) !important;
  border-radius: 999px !important;
  font-size: .76rem !important;
  font-weight: 900 !important;
  white-space: nowrap !important;
}
.bump:has(input[data-gesicomm-bump]:checked) .bump-action {
  color: var(--gc-texto-sobre-primario, #fff) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 78%, #0f172a) !important;
  border: 1px solid color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 72%, transparent) !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-action-on {
  font-size: 0 !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-action-on::after {
  content: "Quitar de mi pedido";
  font-size: .76rem;
}
.bump:has(input[data-gesicomm-bump]) .bump-dot {
  display: none !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-off,
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-on {
  font-size: 0 !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-off > *,
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-on > * {
  display: none !important;
}
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-off::after {
  content: "Agregar a mi pedido";
  font-size: .78rem;
}
.bump:has(input[data-gesicomm-bump]) .bump-ctrl-on::after {
  content: "Quitar de mi pedido";
  font-size: .78rem;
}
.bump:has(input[data-gesicomm-bump]:checked) .bump-ctrl {
  color: var(--gc-texto-sobre-primario, #fff) !important;
  background: color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 78%, #0f172a) !important;
  border: 1px solid color-mix(in srgb, var(--gc-primario, var(--brand, #18a66b)) 72%, transparent) !important;
}
`;

/**
 * @param {{html?: string, css?: string, js?: string, fonts?: string[]}} codigo
 * @param {{titulo?: string, reportarErrores?: boolean, datos?: object, extras?: {html: string, css: string}}} opciones
 *   reportarErrores: manda los errores de ejecución del JS al contenedor
 *   por postMessage — lo usa el editor para mostrarlos; en la landing
 *   pública no hace falta.
 *   extras: secciones de Gesicom (productos/contacto/footer) que se pegan
 *   al final del <body>, ver seccionesSistemaCodigo.js. Ya vienen escapadas.

 *   datos: lo que lee el runtime (window.__GESICOMM__), ver datosRuntime.js.
 * @returns {string} documento listo para el srcDoc del iframe
 */
// Branding de Mi Tienda (--tienda-*): ver marcaTiendaCodigo.js.
export { cssMarcaTienda };

export function construirDocumentoCodigo(codigo, opciones = {}) {
  const { html = '', css = '', js = '', fonts = [] } = codigo || {};
  const { titulo = '', reportarErrores = false, datos = null, extras = null } = opciones;
  const previewDevice = ['mobile', 'tablet', 'desktop'].includes(opciones.previewDevice) ? opciones.previewDevice : '';

  // El puente de errores lo inyectamos nosotros, no el comercio: por eso
  // puede usar postMessage aunque el JS del comercio lo tenga prohibido.
  const puenteErrores = reportarErrores ? `<script>
window.addEventListener('error', function (e) {
  parent.postMessage({ tipo: 'gesicomm:error-codigo', mensaje: String(e.message || e.error || 'Error') }, '*');
});
window.addEventListener('unhandledrejection', function (e) {
  parent.postMessage({ tipo: 'gesicomm:error-codigo', mensaje: String((e.reason && e.reason.message) || e.reason || 'Promesa rechazada') }, '*');
});
</script>` : '';

  // El runtime (ver runtimeGesicomm.js) va ANTES del código del comercio:
  // cuando su JS corre, las listas ya están pintadas y window.Gesicomm
  // existe. Lo inyectamos nosotros, no pasa por el sanitizador, y por eso
  // puede usar postMessage aunque al comercio se lo prohibamos. Maneja
  // compra, cantidad y order bumps; acá solo se agrega el reporte de tema.
  const puenteGesicomm = `<script>window.__GESICOMM__ = ${jsonEnScript(datos)};</script>
<script>(${runtimeGesicomm.toString()})();</script>
<script>
// Tema de la landing → carrito. El carrito vive fuera del iframe y no puede
// leer este CSS: se le mandan los colores. Primero las variables --gc-* del
// prompt; si el código no las define, lo que se ve (fondo del body, color
// de texto, fondo del primer botón de compra).
(function () {
  // Cualquier color CSS (white, hsl(), color-mix(), var() anidada) a #rrggbb
  // pintándolo en un canvas de 1px: el carrito solo entiende hex/rgb, y un
  // valor que no podía leer lo dejaba en modo oscuro sobre una landing blanca.
  var lienzo = null;
  function hex(c) {
    c = String(c || '').trim();
    if (!c || c === 'transparent') return '';
    try {
      lienzo = lienzo || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      lienzo.clearRect(0, 0, 1, 1);
      lienzo.fillStyle = '#000';
      lienzo.fillStyle = c;
      lienzo.fillRect(0, 0, 1, 1);
      var p = lienzo.getImageData(0, 0, 1, 1).data;
      if (p[3] < 240) return '';
      return '#' + [p[0], p[1], p[2]].map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    } catch (e) { return ''; }
  }
  // Una variable puede valer var(--otra) o color-mix(): se resuelve en un
  // elemento de prueba, que devuelve el color ya calculado.
  function resolver(nombre) {
    if (!getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()) return '';
    var prueba = document.createElement('span');
    prueba.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;color:var(' + nombre + ')';
    (document.body || document.documentElement).appendChild(prueba);
    var c = getComputedStyle(prueba).color;
    prueba.remove();
    return hex(c);
  }
  var ultimo = '';
  function reportar() {
    var raiz = getComputedStyle(document.documentElement);
    var body = document.body ? getComputedStyle(document.body) : raiz;
    var boton = document.querySelector('[data-gesicomm-comprar], [data-gesicomm-checkout]');
    var tema = {
      tipo: 'gesicomm:tema',
      primario: resolver('--gc-primario') || (boton ? hex(getComputedStyle(boton).backgroundColor) : ''),
      fondo: resolver('--gc-fondo') || hex(body.backgroundColor) || hex(raiz.backgroundColor) || '#ffffff',
      texto: resolver('--gc-texto') || hex(body.color)
    };
    var clave = tema.primario + tema.fondo + tema.texto;
    if (clave === ultimo) return;
    ultimo = clave;
    parent.postMessage(tema, '*');
  }
  // Apenas hay DOM (sin esperar las imágenes, que con un catálogo grande
  // tardan) y de nuevo al terminar de cargar, por si una fuente o un
  // estilo cambió los colores.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reportar); else reportar();
  window.addEventListener('load', reportar);
})();
</script>`;

  return `<!doctype html>
<html lang="es"${previewDevice ? ` data-gesicomm-preview-device="${previewDevice}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${String(titulo || '').replace(/[<>&"]/g, '')}</title>
<!-- Sin base target, un link dentro del iframe navegaría el iframe y
     dejaría la landing metida dentro de sí misma. -->
<base target="_top">
${linksFuentes(fonts)}
<style>
html, body { margin: 0; padding: 0; }
${typographyCss(opciones.typography || datos?.typography)}
${cssMarcaTienda(datos?.tienda?.colores)}
</style>
<style>
${escaparCierreStyle(conMarcaTienda(css))}
</style>
<style>
${SYSTEM_CSS}
</style>
${extras?.css ? `<style>\n${escaparCierreStyle(extras.css)}\n</style>` : ''}
</head>
<body>
${cuerpoConExtras(html, extras?.html)}
${puenteGesicomm}
${puenteErrores}
<!-- El codigo del comercio va en su propio script, en el nivel mas alto y
     sin envolverlo en nada: metido dentro de un try/catch o de una
     funcion, sus declaraciones dejan de ser globales y cualquier
     onclick="miFuncion()" del HTML deja de encontrarlas. Los errores los
     levanta el listener de arriba, no un catch. -->
<script>
${escaparCierreScript(js)}
</script>
</body>
</html>`;
}
