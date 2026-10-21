/** Presentación compartida por el preview, las bases y el HTML ya guardado. */
export const CATALOGO_TIENDA_CSS = `
.gc-catalog-types { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
.gc-catalog-types button { flex: 0 1 auto; min-height: 42px; padding: 10px 20px; border: 1px solid var(--tienda-linea, #dfe5eb); border-radius: 999px; background: var(--gc-superficie, #fff); color: var(--gc-texto, #10202f); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.gc-catalog-types button[aria-pressed="true"] { background: var(--gc-primario, #075da0); color: #fff; border-color: var(--gc-primario, #075da0); }
.gc-catalog-types button:hover { filter: brightness(.95); }
.gc-catalog-types button:focus-visible { outline: 2px solid var(--gc-primario, #075da0); outline-offset: 3px; }
.lv-shop-page {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 1440px !important;
  margin-inline: auto !important;
  padding: 28px !important;
}
.lv-shop-page .lv-shop-hero { margin-bottom: 24px !important; }
.lv-shop-page .lv-shop-layout {
  display: grid !important;
  grid-template-columns: 240px minmax(0, 1fr) !important;
  gap: 28px !important;
  align-items: start !important;
}
.lv-shop-page .lv-results { min-width: 0 !important; }
.lv-shop-page .lv-filters { top: 112px !important; border-radius: 12px !important; }
.lv-shop-page .lv-shop-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  column-gap: 24px !important;
  row-gap: 32px !important;
  align-items: stretch !important;
}
.lv-shop-page .lv-shop-card {
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  padding: 16px !important;
  height: 100% !important;
  background: var(--gc-superficie, #fff) !important;
  color: var(--gc-texto, #10202f) !important;
  border: 1px solid var(--tienda-linea, #e3e8ed) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, .025) !important;
  transition: border-color .18s ease, box-shadow .18s ease;
}
.lv-shop-page .lv-shop-card:hover {
  border-color: color-mix(in srgb, var(--gc-texto, #10202f) 25%, var(--tienda-linea, #e3e8ed)) !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .06) !important;
}
.lv-shop-page .lv-shop-media {
  position: relative !important;
  flex: 0 0 auto !important;
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  aspect-ratio: 1 / 1 !important;
  padding: 0 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: var(--gc-superficie, #fff) !important;
}
.lv-shop-page .lv-shop-media > img {
  position: absolute !important;
  inset: 12px !important;
  width: calc(100% - 24px) !important;
  height: calc(100% - 24px) !important;
  max-height: none !important;
  padding: 0 !important;
  object-fit: contain !important;
  object-position: center !important;
}
.lv-shop-page .lv-shop-media.is-missing-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--gc-texto, #10202f) 3%, var(--gc-superficie, #fff));
  border-radius: 8px;
}
.lv-shop-page .lv-shop-media.is-missing-image::after {
  content: 'Imagen no disponible';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  color: var(--gc-texto-suave, #506172);
  font: 500 12px/1.4 system-ui, sans-serif;
  text-align: center;
}
.lv-shop-page .lv-shop-card-body {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  gap: 0 !important;
  padding: 16px 0 0 !important;
}
.lv-shop-page .lv-shop-category {
  margin: 0 0 8px !important;
  min-height: 14px !important;
  font-size: 10px !important;
  font-weight: 600 !important;
  line-height: 14px !important;
  color: var(--gc-texto-suave, #506172) !important;
}
.lv-shop-page .lv-shop-title {
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  overflow: hidden !important;
  overflow-wrap: anywhere !important;
  margin: 0 0 16px !important;
  min-height: 42px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  line-height: 21px !important;
  color: var(--gc-texto, #10202f) !important;
}
.lv-shop-page .lv-shop-description { display: none !important; }
.lv-shop-page .lv-shop-prices {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: baseline !important;
  gap: 4px 8px !important;
  margin: auto 0 12px !important;
  min-height: 27px !important;
}
.lv-shop-page .lv-shop-price {
  font-size: 22px !important;
  font-weight: 800 !important;
  line-height: 27px !important;
  color: var(--gc-texto, #10202f) !important;
}
.lv-shop-page .lv-shop-card .lv-primary {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 44px !important;
  height: 44px !important;
  margin: 0 !important;
  padding: 0 10px !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  line-height: 16px !important;
  font-weight: 700 !important;
}
.lv-shop-page .lv-stock-note { margin-top: 8px !important; line-height: 16px !important; }
.lv-shop-page .gc-catalog-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.lv-shop-page .gc-catalog-heading { margin: 0; font-size: 20px; line-height: 1.3; font-weight: 800; }
.lv-shop-page .gc-catalog-count { display: block; margin-top: 4px; color: var(--gc-texto-suave, #506172); font-size: 12px; line-height: 18px; }
.lv-shop-page .gc-catalog-actions { display: flex; align-items: center; gap: 10px; }
.lv-shop-page .gc-catalog-clear { color: var(--gc-texto-suave, #506172); font-size: 12px; text-decoration: underline; }
.lv-shop-page .gc-catalog-views { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--tienda-linea, #e3e8ed); border-radius: 9px; }
.lv-shop-page .gc-catalog-views button,
.lv-shop-page .gc-catalog-filter-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  min-height: 36px;
  padding: 6px 8px;
  color: var(--gc-texto, #10202f);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: 600 13px/1.3 system-ui, sans-serif;
}
.lv-shop-page .gc-catalog-views button[aria-pressed='true'] { background: color-mix(in srgb, var(--gc-texto, #10202f) 8%, var(--gc-superficie, #fff)); }
.lv-shop-page .gc-catalog-actions button:focus-visible { outline: 2px solid var(--gc-primario, #075da0); outline-offset: 3px; }
.lv-shop-page .gc-catalog-filter-toggle { display: none; border: 1px solid var(--tienda-linea, #e3e8ed); border-radius: 9px; }
.lv-shop-page[data-catalogo-vista='lista'] .lv-shop-grid { grid-template-columns: minmax(0, 1fr) !important; row-gap: 16px !important; }
.lv-shop-page[data-catalogo-vista='lista'] .lv-shop-card { display: grid !important; grid-template-columns: 144px minmax(0, 1fr) !important; gap: 20px !important; }
.lv-shop-page[data-catalogo-vista='lista'] .lv-shop-card-body { padding: 0 !important; }
.lv-shop-page[data-catalogo-vista='lista'] .lv-shop-title { min-height: 0 !important; }
.lv-shop-page[data-catalogo-vista='lista'] .lv-primary { max-width: 240px !important; }
@media (max-width: 1100px) and (min-width: 921px) {
  .lv-shop-page .lv-shop-layout { grid-template-columns: 210px minmax(0, 1fr) !important; gap: 24px !important; }
}
@media (max-width: 920px) {
  .lv-shop-page { padding: 20px 16px !important; }
  .lv-shop-page .lv-shop-layout { grid-template-columns: minmax(0, 1fr) !important; gap: 20px !important; }
  .lv-shop-page .lv-filters { display: none !important; position: static !important; }
  .lv-shop-page[data-catalogo-filtros='abiertos'] .lv-filters { display: block !important; }
  .lv-shop-page .gc-catalog-filter-toggle { display: flex; }
  .lv-shop-page .lv-shop-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; column-gap: 16px !important; row-gap: 24px !important; }
}
@media (max-width: 560px) {
  .lv-shop-page { padding-inline: 12px !important; }
  .lv-shop-page .lv-results-head { grid-template-columns: minmax(0, 1fr) !important; gap: 10px !important; }
  .lv-shop-page .lv-results-meta { flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .lv-shop-page .lv-shop-grid { column-gap: 12px !important; }
  .lv-shop-page .lv-shop-card { padding: 12px !important; }
  .lv-shop-page .lv-shop-card-body { padding-top: 12px !important; }
  .lv-shop-page .lv-shop-media > img { inset: 8px !important; width: calc(100% - 16px) !important; height: calc(100% - 16px) !important; }
  .lv-shop-page .lv-shop-title { font-size: 13px !important; line-height: 18px !important; min-height: 36px !important; margin-bottom: 12px !important; }
  .lv-shop-page .lv-shop-price { font-size: 20px !important; }
  .lv-shop-page .lv-shop-card .lv-primary { font-size: 12px !important; padding-inline: 4px !important; }
  .lv-shop-page .gc-catalog-heading { font-size: 18px; }
  .lv-shop-page .gc-catalog-actions { gap: 6px; }
  .lv-shop-page .gc-catalog-clear { display: none; }
  .lv-shop-page[data-catalogo-vista='lista'] .lv-shop-card { grid-template-columns: 96px minmax(0, 1fr) !important; gap: 12px !important; }
}
`;
