// Homepage del lienzo: la paleta y las proporciones del diseno de referencia.
export const ESTILOS_INICIO_CODIGO = `:root {
  color-scheme: light;
  --navy: #082947; --blue: #0965a8; --sky: #eaf5fb; --line: #dbe8ef;
  --muted: #668097; --orange: #f15d3d;
  --home-fondo: #f6fafc; --home-superficie: #fff;
  --gc-primario: var(--blue); --gc-fondo: var(--home-fondo);
  --gc-texto: var(--navy); --gc-superficie: var(--home-superficie); --gc-texto-sobre-primario: var(--home-superficie);
}
* { box-sizing: border-box; letter-spacing: 0; }
html { scroll-behavior: smooth; }
body { margin: 0; background: #f6fafc; color: var(--navy); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
h1, h2, h3, p { margin-top: 0; }
[hidden] { display: none !important; }
.container { width: 100%; margin: auto; }
.trust-bar { min-height: 38px; overflow: hidden; background: #111827; color: #fff; }
.trust-track { display: flex; width: max-content; min-width: 100%; animation: trust-scroll 28s linear infinite; }
.trust-item { flex: 0 0 auto; min-width: 245px; display: flex; align-items: center; gap: 9px; padding: 9px 26px; border-right: 1px solid rgba(255,255,255,.13); white-space: nowrap; }
.trust-icon { flex: 0 0 auto; color: #73c9f5; font-size: 13px; line-height: 1; }
.trust-item > div { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.trust-item strong { color: #fff; font-size: 11px; line-height: 1; }
.trust-item span:not(.trust-icon) { color: #b9cfdd; font-size: 10px; line-height: 1; }
@keyframes trust-scroll { to { transform: translateX(-50%); } }
.commerce-header { background: #fff; border-bottom: 1px solid var(--line); }
.commerce-header .container, .site-footer .container { max-width: 1240px; padding: 0 28px; }
/* Fila única: logo a la izquierda, nav (categorías + links) centrado en TODO
   el header, buscador (ícono con desplegable) + carrito a la derecha. */
.header-main { position: relative; min-height: 76px; display: flex; align-items: center; gap: 20px; }
.brand-column { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; }
.brand.brand-mark, .brand { display: inline-flex; align-items: center; gap: 8px; color: var(--navy); font-size: 20px; font-weight: 800; white-space: nowrap; background: transparent !important; border: none !important; box-shadow: none !important; }
.brand-mark span[data-gesicomm-tienda], .brand span[data-gesicomm-tienda] { background: transparent !important; }
.brand-mark::before, .brand::before { display: none !important; }
.brand-logo { width: 32px; height: 32px; object-fit: contain; }
.brand-logo:not([src]), .brand-logo[src=""] { display: none; }
.header-nav { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 22px; }
.header-actions { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.search-wrap { position: relative; display: inline-flex; }
.search-toggle { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 0; border-radius: 8px; background: transparent; color: var(--navy); font-size: 1rem; }
.search-toggle:hover, .search-toggle[aria-expanded="true"] { background: var(--sky); color: var(--blue); }
.search-box { position: absolute; top: calc(100% + 10px); right: 0; z-index: 70; width: min(320px, calc(100vw - 36px)); display: flex; height: 41px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; box-shadow: 0 18px 45px rgba(8, 41, 71, .16); }
.search-box[hidden] { display: none !important; }
.search-box input { flex: 1; min-width: 0; border: 0; outline: 0; padding: 0 14px; background: #fff; color: var(--navy); font-size: 12px; }
.search-box button { width: 48px; border: 0; color: #fff; background: #243978; }
.cart-button { display: flex; align-items: center; gap: 7px; padding: 8px 0; border: 0; background: transparent; color: var(--navy); font-size: 11px; }
.menu-toggle { display: none; }
.nav-links { display: flex; align-items: center; gap: 22px; }
.nav-links a { color: #426078; font-size: 11px; font-weight: 700; white-space: nowrap; }
.nav-links a.active { color: var(--blue); border-bottom: 2px solid var(--blue); }
.category-menu-wrap { position: relative; display: inline-flex; align-items: center; }
.category-menu { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0; border: 0; background: transparent; color: var(--navy); font-size: 11px; font-weight: 800; white-space: nowrap; }
.category-menu-panel { position: absolute; top: calc(100% + 8px); left: 0; z-index: 70; width: min(280px, calc(100vw - 36px)); padding: 10px; background: #fff; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 18px 45px rgba(8, 41, 71, .16); }
.category-menu-panel[hidden] { display: none !important; }
.category-menu-title { margin: 2px 8px 8px; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.category-menu-list { display: grid; gap: 4px; max-height: 320px; overflow: auto; }
.category-menu-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 38px; padding: 8px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--navy); font-size: 12px; font-weight: 800; text-align: left; }
.category-menu-item:hover { background: #eef7fc; color: var(--blue); }
.category-menu-item small { color: var(--muted); font-size: 11px; font-weight: 700; white-space: nowrap; }
.storefront { min-height: 100vh; background: #f6fafc; color: var(--navy); }
.page-content { max-width: 1240px; margin: auto; padding: 20px 28px 50px; }
.storefront section { margin-top: 30px; }
.storefront .hero { margin-top: 0; padding: 0; }
.hero-shell { position: relative; min-height: 310px; overflow: hidden; border-radius: 8px; background: transparent; color: var(--navy); }
.hero-banners { display: grid; }
.hero-banner { position: relative; grid-area: 1 / 1; min-height: 310px; display: flex; visibility: hidden; align-items: center; padding: 40px 70px; background: transparent; }
.hero-banner.is-active { visibility: visible; }
.hero-banner::before { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(90deg, rgba(5,20,34,.78), rgba(5,20,34,.34) 42%, rgba(5,20,34,.04) 76%); }
.hero-banner.is-media-only::before, .hero-banner::after { display: none; }
.hero-banner > img, .hero-banner > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: transparent; }
.hero-text { position: relative; z-index: 2; max-width: 560px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.35); }
.hero-text .eyebrow { color: #fff; font-size: 16px; font-weight: 800; margin-bottom: 8px; }
.hero-text h1, .hero-text h2 { max-width: 560px; color: #fff; font-size: 40px; line-height: 1.02; margin: 8px 0; overflow-wrap: anywhere; font-weight: 800; }
.hero-text p { color: #fff; font-size: 15px; margin: 0 0 20px; }
.hero-text .button-primary { background: #fff; color: var(--navy); text-shadow: none; }
.hero-banner.is-media-only { padding: 0; }
.hero-banner.is-media-only .hero-text { display: none; }
.hero-media-link { position: absolute; inset: 0; z-index: 2; }
.hero-product-feed { display: none; }
.slider-arrow { position: absolute; z-index: 3; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 29px; height: 29px; padding: 0; border: 0; border-radius: 50%; background: #fff; color: var(--navy); font-size: 24px; line-height: 1; box-shadow: 0 3px 10px #001a3a2b; }
.slider-arrow.left { left: 10px; }
.slider-arrow.right { right: 10px; }
.hero-dots { position: absolute; z-index: 3; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 7px; }
.hero-dots button { display: block; width: 6px; height: 6px; padding: 0; border: 0; border-radius: 50%; background: #fff9; }
.hero-dots .is-active { width: 18px; border-radius: 8px; background: #fff; }
.category-strip { padding: 18px; background: #fff; border: 1px solid var(--line); border-radius: 8px; }
.category-strip .section-heading { display: none; }
.category-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 15px; }
.category-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0; border: 0; background: transparent; color: var(--navy); font-size: 11px; }
.category-media { width: 64px; height: 64px; border-radius: 50%; border: 1px solid var(--line); overflow: hidden; background: #fff; }
.category-media img { width: 100%; height: 100%; object-fit: contain; }
.category-card small { display: none; }
.section-heading { margin-bottom: 13px; }
.section-heading h2, .dynamic-head h2 { margin: 0; color: var(--navy); font-size: 20px; line-height: 1.25; }
.section-heading p, .dynamic-head p { margin: 4px 0 0; color: var(--muted); font-size: 11px; }
.eyebrow { color: var(--blue); font-size: 11px; font-weight: 700; margin: 0 0 5px; }
.spotlight-grid, .product-grid, .collection-grid, .benefit-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.product-card { min-width: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--navy); box-shadow: 0 12px 30px rgba(8,41,71,.06); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.product-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--blue) 36%, var(--line)); box-shadow: 0 18px 42px rgba(8,41,71,.12); }
.product-image { height: 205px; overflow: hidden; background: #f7fafc; border-bottom: 1px solid color-mix(in srgb, var(--line) 72%, transparent); }
.product-image img { width: 100%; height: 100%; padding: 18px; object-fit: contain; }
.product-content { display: flex; flex: 1; flex-direction: column; gap: 9px; padding: 16px; }
.product-content h3 { min-height: 2.65em; margin: 0; font-size: 14px; font-weight: 900; line-height: 1.32; overflow-wrap: anywhere; }
.product-category, .product-description, .combo-includes { color: var(--muted); font-size: 12px; line-height: 1.42; margin: 0; }
.product-category { font-size: 10px; font-weight: 800; text-transform: uppercase; }
.gc-product-availability { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: #0f9f6e; font-size: 12px; font-weight: 850; }
.gc-product-availability::before { width: 7px; height: 7px; border-radius: 999px; background: currentColor; content: ""; }
.product-badge { position: absolute; z-index: 1; top: 10px; left: 10px; color: #fff; background: var(--orange); border-radius: 999px; padding: 5px 9px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
.product-footer { display: flex; flex-direction: column; align-items: stretch; gap: 13px; margin-top: auto; }
.product-prices { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: baseline; }
.price { color: var(--navy); font-size: 22px; line-height: 1; font-weight: 900; }
.price-old { flex-basis: 100%; order: -1; color: #8aa0af; font-size: 12px; text-decoration: line-through; }
.button-primary, .button-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border: 0; border-radius: 8px; padding: 9px 15px; background: #243978; color: #fff; font-size: 11px; font-weight: 800; }
.button-secondary { color: var(--blue); background: #fff; border: 1px solid var(--line); }
.button-primary:hover { filter: brightness(1.1); }
.product-card .button-primary { width: 100%; }
.offers-catalog-section .product-card.has-commercial-presentation { border-radius: 12px; box-shadow: 0 8px 22px rgba(8, 41, 71, .08); }
.offers-catalog-section .product-card.has-commercial-presentation .product-image { height: 175px; background: #f7fafc; }
.offers-catalog-section .product-card.has-commercial-presentation .product-content { padding: 16px; }
.offers-catalog-section .product-card.has-commercial-presentation .product-content h3 { margin-bottom: 8px; font-size: 17px; line-height: 1.15; font-weight: 900; letter-spacing: -.02em; }
.offers-catalog-section .product-card.has-commercial-presentation .product-description,
.offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-copy { margin: 0 0 14px; color: #526779; font-size: 13px; line-height: 1.45; }
.offers-catalog-section .product-card.has-commercial-presentation .product-footer { display: flex; flex-flow: row wrap; align-items: center; justify-content: space-between; gap: 10px 14px; padding: 12px 13px; color: #fff; background: #b80f45; border-radius: 10px; }
.offers-catalog-section .product-card.has-commercial-presentation .product-prices { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; min-width: 0; }
.offers-catalog-section .product-card.has-commercial-presentation .price { color: #fff; font-size: 24px; font-weight: 900; letter-spacing: -.02em; }
.offers-catalog-section .product-card.has-commercial-presentation .price-old { color: rgba(255,255,255,.72); font-size: 14px; font-weight: 800; }
.offers-catalog-section .product-card.has-commercial-presentation .button-primary { width: auto; min-height: 34px; padding: 8px 17px; color: #b80f45; background: #fff; border-radius: 999px; font-size: 12px; font-weight: 900; }
.offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-saving { flex: 1 0 100%; margin: -4px 0 0; color: #fff; font-size: 14px; font-weight: 900; }
.offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-details { margin-top: 12px; padding: 0; color: #243978; background: transparent; border: 0; font-size: 12px; font-weight: 800; }
.dynamic-head { display: flex; justify-content: space-between; gap: 14px; align-items: end; margin-bottom: 13px; }
.dynamic-section { padding: 0; }
.mid-banner-section { display: grid; gap: 12px; margin-top: 18px; }
.mid-banner { position: relative; isolation: isolate; display: flex; align-items: center; min-height: 164px; overflow: hidden; padding: 24px 38px; color: #fff; background: #082947; border-radius: 8px; box-shadow: 0 8px 22px rgba(8, 41, 71, .08); }
.mid-banner::before { position: absolute; inset: 0; z-index: -1; content: ""; background: linear-gradient(90deg, rgba(8,41,71,.78) 0%, rgba(8,41,71,.42) 42%, rgba(8,41,71,.10) 100%); }
.mid-banner > img, .mid-banner > video { position: absolute; inset: 0; z-index: -2; width: 100%; height: 100%; object-fit: cover; }
.mid-banner-copy { max-width: 430px; }
.mid-banner .eyebrow { margin: 0 0 5px; color: #ffd27a; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.mid-banner h2 { margin: 0 0 5px; color: #fff; font-size: 25px; line-height: 1.02; }
.mid-banner p:not(.eyebrow) { margin: 0 0 12px; color: rgba(255,255,255,.92); font-size: 12px; }
.mid-banner .button-secondary { min-height: 30px; color: var(--navy); background: #fff; border: 0; border-radius: 5px; font-size: 10px; }
.collection-card { position: relative; isolation: isolate; min-height: 150px; padding: 18px; display: flex; flex-direction: column; justify-content: end; border-radius: 7px; background-color: var(--navy); background-size: cover; background-position: center; color: #fff; overflow: hidden; }
.collection-card::before { content: ''; position: absolute; inset: 0; z-index: -1; }
.collection-card h3 { margin: 0 0 6px; font-size: 14px; }
.collection-card p { margin: 0; font-size: 10px; }
.limited-offer { margin-top: 28px; }
.limited-offer-card { position: relative; display: grid; grid-template-columns: minmax(190px, 240px) minmax(240px, 1fr) auto; gap: 18px; align-items: center; width: 100%; max-width: 100%; padding: 20px; background: #fff; border: 1px solid #dbe8ef; border-radius: 10px; box-shadow: 0 10px 26px rgba(8, 41, 71, .08); }
.limited-offer-summary { min-width: 0; align-self: center; }
.limited-offer h2 { display: flex; align-items: center; gap: 7px; margin: 0 0 5px; color: var(--navy); font-size: 18px; line-height: 1.15; }
.limited-offer h2 span[aria-hidden] { color: #ef3e43; font-size: 15px; }
.limited-offer p { margin: 0; color: var(--muted); font-size: 10px; }
.countdown { display: flex; align-items: center; gap: 5px; margin-top: 13px; color: #ef3e43; }
.countdown-box { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38px; height: 38px; color: #fff; background: #ff3d47; border: 0; border-radius: 6px; }
.countdown-box b { font-size: 14px; line-height: 1; font-variant-numeric: tabular-nums; }
.countdown-box small { margin-top: 2px; color: rgba(255,255,255,.88); font-size: 6px; line-height: 1; }
.countdown-separator { color: #ef3e43; font-size: 15px; font-weight: 800; line-height: 1; }
.limited-offer-products { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; min-width: 0; width: 100%; }
.limited-offer-product { position: relative; display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 10px; min-width: 0; min-height: 112px; padding: 11px; color: var(--navy); background: #fff; border: 1px solid #dbe8ef; border-radius: 8px; box-shadow: 0 5px 14px rgba(8, 41, 71, .06); }
.limited-offer-badge { position: absolute; top: 6px; left: 6px; min-width: 27px; padding: 2px 5px; color: #fff; background: #ff3d47; border-radius: 999px; font-size: 7px; font-weight: 800; text-align: center; line-height: 1.2; }
.limited-offer-image { display: grid; place-items: center; overflow: hidden; align-self: stretch; min-height: 88px; background: #f7fafc; border-radius: 6px; }
.limited-offer-image img { width: 100%; height: 84px; object-fit: contain; }
.limited-offer-copy { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.limited-offer-copy h3 { display: -webkit-box; min-height: 2.4em; margin: 0; overflow: hidden; color: var(--navy); font-size: 11px; font-weight: 800; line-height: 1.2; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.limited-offer-prices { display: flex; flex-wrap: wrap; gap: 5px; align-items: baseline; min-height: 13px; }
.limited-offer-prices span { color: #ef3e43; font-size: 9px; font-weight: 800; }
.limited-offer-prices s { color: #9bacb7; font-size: 8px; }
.limited-offer-product .button-primary { min-height: 26px; margin-top: auto; padding: 6px 10px; border-radius: 5px; font-size: 9px; }
.limited-offer-product.has-commercial-presentation { grid-template-columns: 64px minmax(0, 1fr); border-radius: 10px; box-shadow: 0 8px 18px rgba(8,41,71,.08); }
.limited-offer-product.has-commercial-presentation .limited-offer-copy { gap: 6px; }
.limited-offer-product.has-commercial-presentation .limited-offer-copy h3 { font-size: 10px; }
.limited-offer-product.has-commercial-presentation .limited-offer-prices { display: flex; flex-flow: row wrap; align-items: center; justify-content: space-between; gap: 5px 8px; margin-top: auto; padding: 7px 8px; color: #fff; background: #b80f45; border-radius: 8px; }
.limited-offer-product.has-commercial-presentation .limited-offer-prices span { color: #fff; font-size: 11px; font-weight: 900; }
.limited-offer-product.has-commercial-presentation .limited-offer-prices s { color: rgba(255,255,255,.72); font-size: 8px; }
.limited-offer-product.has-commercial-presentation .gc-commercial-saving { flex: 1 0 100%; margin: -2px 0 0; color: #fff; font-size: 9px; font-weight: 900; }
.limited-offer-product.has-commercial-presentation .button-primary { min-height: 24px; padding: 5px 10px; color: #b80f45; background: #fff; border-radius: 999px; font-size: 8px; font-weight: 900; }
.limited-offer-see-all { display: inline-flex; align-items: center; justify-content: center; align-self: start; min-height: 32px; padding: 7px 12px; color: var(--blue); background: #f3f9fd; border: 1px solid #dbe8ef; border-radius: 999px; font-size: 10px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.offers-catalog-section { scroll-margin-top: 110px; }
.product-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.product-count { color: var(--muted); font-size: 11px; }
.catalog-toolbar { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.catalog-toolbar input, .catalog-toolbar select, .field input, .field textarea { min-width: 0; width: 100%; min-height: 40px; padding: 10px 12px; color: var(--navy); border: 1px solid var(--line); border-radius: 5px; background: #fff; font-size: 12px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; font-size: 12px; }
.pagination button:disabled { cursor: default; opacity: .45; }
.catalog-state { font-size: 12px; color: var(--muted); }
.faq-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.faq-item { border: 1px solid var(--line); border-radius: 7px; background: #fff; }
.faq-question { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 15px; border: 0; background: transparent; color: var(--navy); text-align: left; font-size: 12px; font-weight: 700; }
.faq-answer { display: none; padding: 0 15px 15px; color: var(--muted); font-size: 12px; }
.faq-answer p { margin: 0; }
.faq-item.is-open .faq-answer { display: block; }
.contact-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.contact-layout h2 { font-size: 20px; }
.contact-copy, .contact-link { font-size: 12px; }
.contact-list { display: flex; flex-direction: column; align-items: start; gap: 10px; }
.contact-link { padding: 0; border: 0; background: transparent; color: var(--blue); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.field.full { grid-column: 1 / -1; }
.field label { display: block; margin-bottom: 5px; font-size: 11px; }
.field textarea { min-height: 90px; resize: vertical; }
.form-feedback { margin-top: 10px; font-size: 12px; }
/* ─── Productos por categoría (bloque nuevo) ─── */
.pc-section { padding: 6px 0 2px; }
.pc-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; }
.pc-search { flex: 0 1 300px; display: grid; gap: 5px; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; }
.pc-search input { width: 100%; min-height: 40px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--navy); padding: 0 13px; font-size: 12px; outline: none; text-transform: none; }
.pc-search input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 13%, transparent); }
.pc-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
.pc-tab { border: 1px solid var(--line); border-radius: 999px; background: #fff; color: var(--navy); font-size: 11px; font-weight: 700; padding: 7px 14px; }
.pc-tab.is-active { background: var(--blue); border-color: var(--blue); color: #fff; }
.pc-empty { margin: 18px 0 0; padding: 18px; border: 1px dashed var(--line); border-radius: 8px; background: #fff; color: var(--muted); font-size: 12px; text-align: center; }
/* ─── Zona de confianza (bloque nuevo) ─── */
.trust-section { background: var(--home-superficie); border: 1px solid var(--line); border-radius: 9px; padding: 24px; }
.trust-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.trust-card { display: flex; align-items: flex-start; gap: 12px; }
.trust-card-icon { flex: none; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: var(--sky); font-size: 18px; }
.trust-card h3 { margin: 0 0 4px; color: var(--navy); font-size: 13px; }
.trust-card p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
/* ─── Nuestra marca (bloque nuevo) ─── */
.brand-section { padding: clamp(76px, 9vw, 112px) 0 clamp(70px, 8vw, 100px); background: #fff; border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent); }
.brand-section .brand-layout { width: min(100%, 1120px); margin: 0 auto; padding: 0 clamp(28px, 4vw, 42px); display: grid; grid-template-columns: minmax(320px, .98fr) minmax(0, 1fr); gap: clamp(44px, 6vw, 84px); align-items: center; }
.brand-media { border-radius: 18px; overflow: hidden; background: color-mix(in srgb, var(--tienda-destacado, var(--blue)) 12%, #f2f0e9); min-height: 370px; aspect-ratio: 1.46 / 1; }
.brand-medio { width: 100%; height: 100%; }
.brand-medio img, .brand-medio video { width: 100%; height: 100%; min-height: 370px; object-fit: contain; display: block; padding: clamp(22px, 4vw, 54px); }
.brand-copy { max-width: 620px; }
.brand-copy .eyebrow { margin-bottom: 20px; color: var(--navy); font-size: 13px; font-weight: 850; letter-spacing: .18em; text-transform: uppercase; }
.brand-copy h2 { margin: 0 0 22px; color: var(--navy); font-size: clamp(42px, 5vw, 64px); line-height: 1.12; font-weight: 800; letter-spacing: 0; }
.brand-copy > p:not(.eyebrow) { margin: 0 0 28px; color: var(--navy); font-size: 18px; line-height: 1.65; white-space: pre-line; overflow-wrap: anywhere; }
.brand-badges { display: flex; flex-wrap: wrap; gap: 12px; }
.brand-badge { border: 1px solid var(--line); border-radius: 999px; padding: 10px 17px; background: #fff; font-size: 14px; font-weight: 800; color: var(--navy); }
.site-footer { background: #fff; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
.site-footer .footer-top { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 28px; align-items: start; padding-top: 32px; padding-bottom: 28px; }
.site-footer .footer-brand { display: flex; flex-direction: column; gap: 14px; }
.site-footer .footer-brand-name { color: var(--navy); font-size: clamp(20px, 2.4vw, 26px); font-weight: 800; line-height: 1.1; }
.site-footer .footer-col { display: flex; flex-direction: column; gap: 12px; }
.site-footer .footer-col > strong { color: var(--navy); font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.footer-links { display: flex; flex-direction: column; gap: 8px; }
.footer-links a:hover { color: var(--navy); }
.footer-datos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.footer-datos li[data-gesicomm-tienda] { display: none; }
.footer-datos li[data-gesicomm-tienda]:not(:empty) { display: block; }
.footer-datos a:hover { color: var(--navy); }
.footer-dato-nombre::before { content: "Atiende: "; font-weight: 800; color: var(--navy); }
.footer-dato-whatsapp::before { content: "WhatsApp: "; font-weight: 800; color: var(--navy); }
.footer-dato-tel::before { content: "Tel: "; font-weight: 800; color: var(--navy); }
.footer-dato-email::before { content: "Email: "; font-weight: 800; color: var(--navy); }
.footer-dato-direccion::before { content: "Dirección: "; font-weight: 800; color: var(--navy); }
.footer-dato-horario::before { content: "Horario: "; font-weight: 800; color: var(--navy); }
.footer-redes { display: flex; flex-wrap: wrap; gap: 8px; }
.site-footer .footer-bottom { border-top: 1px solid var(--line); padding: 14px 0 20px; text-align: center; }
.site-footer .footer-bottom a { color: var(--navy); font-weight: 800; }
@media (max-width: 760px) {
  .site-footer .footer-top { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 900px) {
  .header-nav { gap: 16px; }
  .nav-links { gap: 16px; }
  .hero-banner { padding: 35px 50px; }
  .hero-text h1, .hero-text h2 { font-size: 34px; }
  .spotlight-grid, .product-grid, .collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .trust-grid { grid-template-columns: 1fr; gap: 16px; }
  .brand-section { padding: 48px 0; }
  .brand-section .brand-layout { grid-template-columns: 1fr; gap: 28px; }
  .brand-media, .brand-medio img, .brand-medio video { min-height: 280px; }
}
@media (max-width: 600px) {
  .commerce-header .container, .site-footer .container { padding-left: 16px; padding-right: 16px; }
  .header-main { flex-wrap: wrap; gap: 12px; padding-top: 14px; padding-bottom: 14px; }
  /* Sin hamburguesa en este tema: el nav vuelve al flujo normal (debajo del
     logo/acciones) y scrollea horizontal en vez de quedar centrado-absoluto,
     que a este ancho se superpondría con todo lo demás. */
  .header-nav { position: static; left: auto; top: auto; transform: none; order: 3; flex-basis: 100%; overflow-x: auto; justify-content: flex-start; }
  .search-box { left: auto; right: 0; width: min(280px, calc(100vw - 32px)); }
  .nav-links { gap: 20px; }
  .page-content { padding: 12px 16px 30px; }
  .hero-shell, .hero-banner { min-height: 290px; }
  .hero-banner { padding: 24px 40px; }
  .mid-banner { min-height: 150px; padding: 22px; }
  .mid-banner h2 { font-size: 22px; }
  .hero-text h1, .hero-text h2 { font-size: 28px; }
  .hero-text .eyebrow { font-size: 12px; }
  .hero-text p { font-size: 12px; margin-bottom: 14px; }
  .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .category-strip { padding: 14px; }
  .spotlight-grid, .product-grid { gap: 10px; }
  .product-image { height: 150px; }
  .limited-offer-card { grid-template-columns: 1fr; align-items: stretch; padding: 16px; }
  .limited-offer-see-all { align-self: flex-start; order: 3; }
  .limited-offer-products { grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; max-width: none; }
  .limited-offer-product { grid-template-columns: 58px minmax(0, 1fr); }
  .catalog-toolbar { grid-template-columns: 1fr 1fr; }
  .catalog-search { grid-column: 1 / -1; }
  .faq-list, .contact-layout, .form-grid { grid-template-columns: 1fr; }
  .product-toolbar { align-items: start; flex-direction: column; }
  .pc-head { align-items: stretch; flex-direction: column; }
  .pc-search { flex-basis: auto; width: 100%; }
  .brand-section .brand-layout { padding: 0 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .trust-track { animation: none; }
}
@media (max-width: 360px) {
  .hero-banner { padding: 22px 36px; }
  .hero-text h1, .hero-text h2 { font-size: 24px; }
  .spotlight-grid, .product-grid, .collection-grid { grid-template-columns: 1fr; }
}
`;
