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
:where(:root) {
  --gc-primario: var(--tienda-primario, #18a66b);
  --gc-secundario: var(--tienda-secundario, #ffb547);
  --gc-fondo: var(--tienda-fondo, #ffffff);
  --gc-texto: var(--tienda-texto, #10202f);
  --gc-texto-suave: var(--tienda-texto-suave, #506172);
  --gc-superficie: var(--tienda-superficie, #ffffff);
  --gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #ffffff);
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
body {
  overflow-x: hidden;
  overflow-anchor: none;
  background: var(--gc-fondo, var(--tienda-fondo, #ffffff));
  color: var(--gc-texto, var(--tienda-texto, #10202f));
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
:where(.gc-product-shipping) { margin: 8px 0 0; font-size: .8rem; font-weight: 500; color: inherit; opacity: .85; }
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
[data-gesicomm-lista] .product-card > .product-content {
  min-width: 0;
  overflow-wrap: anywhere;
  position: relative;
  isolation: isolate;
  background: var(--gc-superficie);
}
[data-gesicomm-lista] .product-card > .product-content h3 {
  line-height: 1.35;
}
[data-gesicomm-lista] .product-card .product-footer {
  flex-wrap: wrap;
}
[data-gesicomm-lista] .product-card .product-footer > * {
  min-width: 0;
  max-width: 100%;
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

[data-gesicomm-tienda="logo"] {
  max-width: 160px !important;
  max-height: 52px !important;
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
<html lang="es">
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
