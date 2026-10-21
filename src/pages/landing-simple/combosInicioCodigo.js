// Tarjetas y estilos compartidos por las bases y los diseños guardados.
export const COMBO_INICIO_TARJETA_HTML = `<article class="home-combo-card">
        <div class="home-combo-visual" data-gesicomm-ver><span class="home-combo-tag" data-combo="etiqueta"></span><span class="home-combo-discount" data-combo="descuento" hidden></span><div class="home-combo-pictures" data-combo="imagenes"></div></div>
        <div class="home-combo-body"><p class="home-combo-meta" data-combo="cantidad"></p><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="home-combo-description" data-gesicomm-bind="descripcion"></p>
          <div class="home-combo-includes"><h4>¿Qué incluye?</h4><ul data-combo="incluye"></ul></div>
          <div class="home-combo-footer"><span class="home-combo-old" data-combo="antes" hidden></span><div class="home-combo-prices"><strong data-gesicomm-bind="precio"></strong><span class="home-combo-saving" data-combo="ahorro" hidden></span></div><button type="button" data-gesicomm-comprar>Comprar combo <span aria-hidden="true">→</span></button></div>
        </div>
      </article>`;

export const COMBOS_INICIO_CSS = `.home-combos { --combo-accent: var(--gc-primario, #6544cf); --combo-surface: var(--gc-superficie, #fff); --combo-ink: var(--gc-texto, #15233d); --combo-muted: var(--gc-texto-suave, #6f7e97); padding: clamp(20px, 3vw, 38px); border-radius: 18px; background: color-mix(in srgb, var(--combo-accent) 3%, var(--gc-fondo, #f8faff)); }
.home-combos .section-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 30px; }
.home-combos .section-heading h2 { font-size: clamp(26px, 3vw, 34px); letter-spacing: -.035em; margin: 14px 0 10px; }
.home-combos .home-combos-eyebrow { display: inline-flex; margin: 0; padding: 8px 12px; border-radius: 999px; color: var(--combo-accent); background: color-mix(in srgb, var(--combo-accent) 10%, var(--combo-surface)); font-size: 11px; font-weight: 900; letter-spacing: .06em; }
.home-combos-explore { flex: none; padding: 10px 0; color: var(--combo-accent); font-size: 13px; font-weight: 800; }
.home-combos-explore:hover { text-decoration: underline; }
.home-combo-grid { display: grid; grid-template-columns: repeat(var(--combo-columnas, 3), minmax(0, 1fr)); gap: 22px; }
.home-combo-card { container-type: inline-size; min-width: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: 20px; background: var(--combo-surface); color: var(--combo-ink); transition: transform .2s, box-shadow .2s; }
.home-combo-card:first-child { border-color: color-mix(in srgb, var(--combo-accent) 45%, var(--line)); }
.home-combo-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px #14213d12; }
.home-combo-visual { position: relative; display: grid; place-items: center; min-height: 210px; padding: 54px 20px 30px; background: color-mix(in srgb, var(--combo-accent) 7%, var(--combo-surface)); cursor: pointer; }
.home-combo-card:nth-child(3n+2) .home-combo-visual { background: color-mix(in srgb, #39aea0 9%, var(--combo-surface)); }
.home-combo-card:nth-child(3n) .home-combo-visual { background: color-mix(in srgb, #efa76e 12%, var(--combo-surface)); }
.home-combo-tag, .home-combo-discount { position: absolute; z-index: 2; top: 17px; padding: 8px 11px; border-radius: 8px; font-size: 10px; font-weight: 900; }
.home-combo-tag { left: 17px; max-width: 55%; background: var(--combo-surface); color: var(--combo-accent); }
.home-combo-discount { right: 17px; background: #16866e; color: #fff; }
.home-combo-pictures { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
.home-combo-tile { width: min(42%, 120px); aspect-ratio: 1; padding: 12px; display: grid; place-items: center; border-radius: 18px; background: #fff; box-shadow: 0 12px 24px #26345a20; transform: rotate(-8deg); }
.home-combo-tile:last-child:not(:first-child) { transform: rotate(8deg); }
.home-combo-tile img { width: 100%; height: 100%; object-fit: contain; }
.home-combo-pictures.has-many { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); justify-items: center; gap: 10px; max-width: 220px; }
.home-combo-pictures.has-many .home-combo-tile { width: 100%; max-width: 90px; }
.home-combo-pictures.has-many .home-combo-plus { display: none; }
/* La portada forma toda la cabecera: su fondo blanco se integra al área
   media y la foto conserva sus proporciones, sin el marco oscuro anterior. */
.home-combo-card .home-combo-visual.has-cover { padding: 0; min-height: 220px; max-height: 400px; aspect-ratio: 4 / 3; background: #fff; overflow: hidden; isolation: isolate; border-bottom: 1px solid var(--line); }
.home-combo-visual.has-cover .home-combo-tag { background: #ffffffed; color: #27334a; box-shadow: 0 2px 10px #14213d10; }
.home-combo-visual.has-cover .home-combo-discount { box-shadow: 0 2px 10px #14213d18; }
.home-combo-pictures.is-cover { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.home-combo-pictures.is-cover .home-combo-tile { width: 100%; max-width: none; height: 100%; min-height: 0; aspect-ratio: auto; transform: none; box-shadow: none; padding: 0; border-radius: 0; background: transparent; }
.home-combo-pictures.is-cover .home-combo-tile img { display: block; width: 100%; height: 100%; max-height: none; min-height: 0; aspect-ratio: auto; object-fit: contain; }
.home-combo-image-fallback { display: grid; place-items: center; min-height: 70px; color: #40516a; font-size: 12px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
.home-combo-plus { color: #8490a9; font-size: 22px; font-weight: 800; }
.home-combo-body { display: flex; flex: 1; flex-direction: column; padding: 24px; }
.home-combo-meta { margin: 0 0 10px; color: var(--combo-muted); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.home-combo-body h3 { margin: 0 0 10px; font-size: 21px; letter-spacing: -.03em; cursor: pointer; }
.home-combo-description { margin: 0 0 20px; min-height: 2.8em; color: var(--combo-muted); font-size: 13px; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.home-combo-includes { margin: 0 0 22px; padding: 18px 0; border-block: 1px solid var(--line); }
.home-combo-includes h4 { margin: 0 0 10px; font-size: 12px; }
.home-combo-includes ul { display: grid; gap: 8px; list-style: none; padding: 0; margin: 0; }
.home-combo-includes li { color: var(--combo-muted); font-size: 12px; }
.home-combo-includes li::before { content: '✓'; margin-right: 8px; color: #199c8b; }
.home-combo-footer { margin-top: auto; }
.home-combo-old { display: block; margin-bottom: 5px; color: var(--combo-muted); font-size: 12px; text-decoration: line-through; }
.home-combo-prices { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 18px; }
.home-combo-prices strong { color: var(--combo-ink); font-size: clamp(21px, 2vw, 27px); font-weight: 950; letter-spacing: -.04em; }
.home-combo-saving { padding: 8px; border-radius: 7px; background: #e7f7f0; color: #087560; font-size: 10px; font-weight: 900; }
.home-combo-footer button { display: flex; justify-content: center; gap: 12px; width: 100%; padding: 16px; border: 0; border-radius: 12px; color: #fff; background: var(--combo-accent); font-weight: 850; font-size: 13px; }
.home-combo-footer button:hover { filter: brightness(1.1); }
.home-combos-note { margin: 25px 0 0; text-align: center; color: var(--combo-muted); font-size: 12px; }
@container (max-width: 240px) {
  .home-combo-body { padding: 14px; }
  .home-combo-body h3 { font-size: 17px; overflow-wrap: anywhere; }
  .home-combo-prices strong { font-size: 18px; }
  .home-combo-tag, .home-combo-discount { padding: 6px; font-size: 8px; }
  .home-combo-tag { left: 10px; max-width: 45%; }
  .home-combo-discount { right: 10px; }
  .home-combo-visual { padding-inline: 12px; }
  .home-combo-tile { padding: 6px; }
  .home-combo-footer button { padding: 12px 8px; font-size: 11px; }
}
@media (max-width: 900px) { .home-combo-grid { grid-template-columns: repeat(var(--combo-columnas-tablet, 2), minmax(0, 1fr)); } }
@media (max-width: 600px) { .home-combo-grid { grid-template-columns: 1fr; } .home-combos .section-heading { display: block; } .home-combos-explore { display: inline-block; margin-top: 12px; } }
`;
