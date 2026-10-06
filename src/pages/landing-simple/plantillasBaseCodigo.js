import { ESTILOS_INICIO_CODIGO } from './estilosInicioCodigo';

/**
 * Código base del lienzo en blanco: una vista de INICIO y una FICHA DE
 * PRODUCTO que ya hablan el contrato del runtime (runtimeGesicomm.js).
 *
 * Nacen del HTML de referencia que usa el equipo (estética "Gesicom
 * verde"), pero sin un solo producto escrito a mano: la grilla, el hero y
 * los combos salen de la selección de la landing, así que la misma base
 * sirve para cualquier tienda. El comercio (o la IA, con el prompt
 * maestro) la toma como punto de partida y le cambia el diseño; lo que no
 * debería cambiar son los atributos data-gesicomm-*.
 *
 * Las dos vistas son documentos separados (cada una se pinta en su propio
 * iframe), por eso el header, el footer y los tokens de color se repiten.
 */

const INICIO_CSS_REFERENCIA = `
:root { color-scheme: light; --navy: #062b4f; --navy-deep: #041f38; --blue: #075da0; --blue-bright: #0877bd; --sky: #eaf6fc; --line: #d7e6ef; --muted: #5f7890; --orange: #ef5b3f; --green: #16a66f; --yellow: #f7c945; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: #f6fafc; color: var(--navy); font-family: Arial, Helvetica, sans-serif; }
button, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; }
.storefront { min-height: 100vh; overflow: hidden; }
.trust-bar { background: var(--navy); color: #fff; overflow: hidden; }
.trust-track { display: flex; width: max-content; animation: marquee 28s linear infinite; }
.trust-item { min-width: 245px; display: flex; align-items: center; gap: 9px; padding: 10px 26px; border-right: 1px solid rgba(255,255,255,.13); }
.trust-item svg { color: #73c9f5; flex: none; }.trust-item strong,.trust-item span { display:block; }.trust-item strong { font-size: 11px; }.trust-item span { color:#b9cfdd; font-size: 10px; margin-top:2px; }
.site-header { background:#fff; border-bottom:1px solid var(--line); }.header-main { height: 76px; max-width: 1240px; margin:auto; display:flex; align-items:center; gap:46px; padding:0 28px; }.brand-mark { display:flex; align-items:center; gap:8px; font-size:20px; letter-spacing:-.7px; white-space:nowrap; background:transparent; border:none; box-shadow:none; }.search-box { flex:1; max-width:570px; display:flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; height:41px; }.search-box input { border:0; outline:0; padding:0 14px; flex:1; color:var(--navy); font-size:12px; }.search-box button { width:48px; color:#fff; border:0; background:#243978; display:grid; place-items:center; }.header-actions { display:flex; gap:24px; margin-left:auto; }.header-actions button { background:transparent; border:0; display:flex; align-items:center; gap:7px; color:var(--navy); font-size:11px; position:relative; }.header-actions button b { position:absolute; right:-10px; top:-8px; background:var(--orange); color:white; font-size:9px; width:15px; height:15px; display:grid; place-items:center; border-radius:50%; }.main-nav { max-width:1240px; margin:auto; min-height:43px; display:flex; align-items:center; gap:30px; padding:0 28px; }.main-nav a,.category-menu { text-decoration:none; border:0; background:transparent; color:#426078; font-size:11px; font-weight:700; padding:13px 0; }.main-nav a.active { color:var(--blue); border-bottom:2px solid var(--blue); }.category-menu { display:flex; align-items:center; gap:7px; color:var(--navy); }
.page-content { max-width:1240px; margin:auto; padding:20px 28px 50px; }.hero { position:relative; height:310px; }.hero-copy { height:100%; border-radius:9px; background-size:cover; background-position:center; color:#fff; display:flex; align-items:center; padding:40px 70px; transition: background-image .4s ease; }.hero-copy > div { max-width:500px; }.hero-copy span { font-size:16px; font-weight:700; }.hero-copy h1 { font-size:40px; line-height:1.02; margin:8px 0; letter-spacing:-1.5px; max-width:450px; }.hero-copy p { margin:0 0 20px; font-size:15px; }.light-button,.promo-banner button { border:0; border-radius:5px; background:#fff; color:var(--navy); padding:11px 15px; font-weight:700; font-size:11px; display:flex; align-items:center; gap:8px; }.slider-arrow { position:absolute; z-index:2; top:50%; transform:translateY(-50%); border:0; background:#fff; color:var(--navy); border-radius:50%; width:29px; height:29px; display:grid; place-items:center; box-shadow:0 3px 10px #001a3a2b; }.slider-arrow.left { left:10px; }.slider-arrow.right { right:10px; }.dots { position:absolute; bottom:15px; left:50%; transform:translateX(-50%); display:flex; gap:7px; }.dots button { border:0; width:6px; height:6px; padding:0; border-radius:50%; background:#fff9; }.dots button.selected { width:18px; border-radius:9px; background:white; }
section { margin-top:30px; }.categories { margin-top:15px; background:#fff; border:1px solid var(--line); border-radius:9px; padding:18px; }.category-row { display:grid; grid-template-columns:repeat(7, 1fr); gap:15px; }.category { display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--navy); text-decoration:none; font-weight:700; font-size:11px; }.category > div { width:64px; height:64px; border-radius:50%; background-size:cover; background-position:center; border:1px solid var(--line); box-shadow:0 3px 12px #08294714; }.category.all > div { display:grid; place-items:center; color:var(--blue); background:#f4faff; }.section-title { display:flex; justify-content:space-between; align-items:end; margin-bottom:13px; }.section-title h2 { font-size:20px; margin:0; display:flex; align-items:center; gap:8px; letter-spacing:-.4px; }.section-title h2 svg { color:var(--blue); }.section-title p { color:var(--muted); margin:4px 0 0; font-size:11px; }.section-title button { border:0; background:transparent; color:var(--blue); font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; }.product-grid,.compact-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }.product-card,.compact-card { background:#fff; border:1px solid var(--line); border-radius:7px; overflow:hidden; }.product-image { height:175px; background-size:cover; background-position:center; position:relative; }.badge { position:absolute; top:9px; left:9px; color:#fff; background:var(--orange); border-radius:4px; padding:4px 7px; font-size:9px; font-weight:700; }.badge.popular { background:#1ab777; }.product-info { padding:11px; }.product-info h3,.compact-card h3 { font-size:12px; margin:0 0 9px; }.product-info strong,.compact-card strong { color:var(--orange); font-size:14px; }.product-info del { font-size:10px; color:#9bacb7; margin-left:7px; }.rating { color:#f6aa31; font-size:10px; margin:7px 0; display:flex; gap:3px; align-items:center; }.rating span { color:#9bacb7; }.product-info button,.compact-card button,.mini-offer button { width:100%; background:var(--blue); color:#fff; border:0; border-radius:4px; padding:8px; font-size:10px; font-weight:700; }.promo-banner { min-height:145px; border-radius:8px; overflow:hidden; padding:23px 40px; color:#fff; background:linear-gradient(90deg,#713b1bdc,#713b1b30),url('https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1400&q=85') center/cover; }.promo-banner h2 { margin:2px 0 3px; font-size:26px; }.promo-banner p { margin:0 0 13px; font-size:12px; }.promo-banner button { padding:8px 12px; font-size:10px; }.flame { color:var(--orange) !important; }.compact-card { display:flex; padding:9px; gap:10px; align-items:center; }.compact-card > div:first-child { width:100px; height:105px; flex:none; background-size:cover; background-position:center; border-radius:4px; }.compact-card div:last-child { flex:1; }.compact-card h3 { line-height:1.2; }.compact-card strong { display:block; margin-bottom:9px; font-size:12px; }.compact-card button { padding:7px; }.countdown-section { background:#fff; border:1px solid var(--line); border-radius:9px; padding:15px; }.countdown-copy { display:flex; align-items:center; gap:12px; }.countdown-copy > svg { color:var(--orange); }.countdown-copy h2 { margin:0; font-size:17px; }.countdown-copy p { margin:3px 0 0; font-size:10px; color:var(--muted); }.countdown { margin-left:auto; display:flex; align-items:center; gap:6px; color:var(--orange); }.countdown b { background:#fff0ed; border-radius:4px; padding:8px 7px; font-size:17px; }.mini-offers { display:grid; grid-template-columns:repeat(3,1fr); gap:13px; margin-top:15px; }.mini-offer { display:flex; gap:9px; border-top:1px solid var(--line); padding-top:12px; }.mini-offer > div:first-child { width:70px; height:64px; flex:none; background-size:cover; background-position:center; border-radius:4px; }.mini-offer strong,.mini-offer small { display:block; font-size:10px; }.mini-offer small { color:var(--orange); font-weight:700; margin:4px 0; }.mini-offer button { width:auto; padding:5px 12px; }.collection-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:13px; }.collection { min-height:135px; background-size:cover; background-position:center; border-radius:7px; color:#fff; text-decoration:none; display:flex; flex-direction:column; justify-content:end; padding:13px; }.collection strong { font-size:13px; }.collection span { font-size:10px; margin-top:4px; display:flex; align-items:center; gap:4px; }.benefit-strip { display:grid; grid-template-columns:repeat(3,1fr); background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; gap:20px; }.benefit-strip div { display:grid; grid-template-columns:26px 1fr; column-gap:10px; align-items:center; }.benefit-strip svg { grid-row:span 2; color:var(--blue); }.benefit-strip strong { font-size:12px; }.benefit-strip span { color:var(--muted); font-size:10px; }
.combo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }.combo-card { background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; }.combo-image { height:125px; background-size:cover; background-position:center; position:relative; }.combo-image span { position:absolute; top:9px; left:9px; background:#1ab777; color:#fff; font-size:9px; font-weight:700; padding:5px 7px; border-radius:4px; }.combo-info { padding:12px; }.combo-info h3 { font-size:13px; margin:0 0 5px; }.combo-info p { color:var(--muted); font-size:10px; margin:0 0 10px; min-height:25px; }.combo-info strong { color:var(--orange); font-size:14px; }.combo-info del { color:#9bacb7; font-size:10px; margin-left:6px; }.combo-info button { margin-top:10px; width:100%; border:0; border-radius:4px; background:var(--blue); color:#fff; padding:8px; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px; }.faq-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px 16px; }.faq-item { background:#fff; border:1px solid var(--line); border-radius:7px; padding:0 14px; }.faq-item summary { cursor:pointer; list-style:none; padding:15px 0; display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:12px; }.faq-item summary::-webkit-details-marker { display:none; }.faq-item summary svg { color:var(--blue); transition:transform .2s; }.faq-item[open] summary svg { transform:rotate(90deg); }.faq-item p { color:var(--muted); font-size:11px; line-height:1.5; margin:0 0 15px; padding-right:20px; }
footer { background:var(--navy); color:#fff; padding:35px max(28px, calc((100% - 1184px)/2)); display:grid; grid-template-columns:2fr 1fr 1fr 1.5fr; gap:32px; }.footer-brand p,.footer-note { color:#a9bdc9; font-size:11px; }.footer-brand .brand-mark span { border-color:#8bcff1; color:#8bcff1; }.footer-brand .brand-mark { color:white; }.footer-brand .brand-mark + p { max-width:220px; line-height:1.5; }.footer-brand > div,.footer-brand p { margin-bottom:12px; }footer > div:not(.footer-brand) { display:flex; flex-direction:column; gap:9px; }footer > div > strong { font-size:12px; color:#fff; margin-bottom:3px; }footer a { color:#a9bdc9; font-size:11px; text-decoration:none; }footer a:hover { color:#fff; }
@keyframes marquee { to { transform:translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .trust-track { animation:none; } html { scroll-behavior:auto; } }
@media (max-width: 760px) { .header-main { height:auto; padding:16px; gap:14px; flex-wrap:wrap; }.brand-mark { font-size:18px; }.search-box { order:3; flex-basis:100%; }.header-actions { margin-left:auto; gap:10px; }.header-actions span { display:none; }.main-nav { overflow:auto; padding:0 16px; gap:22px; white-space:nowrap; }.page-content { padding:12px 14px 35px; }.hero { height:260px; }.hero-copy { padding:25px 35px; }.hero-copy h1 { font-size:30px; }.hero-copy span { font-size:13px; }.category-row { grid-template-columns:repeat(4,1fr); }.category:nth-child(n+5) { display:none; }.category > div { width:52px; height:52px; }.product-grid,.compact-grid,.combo-grid { grid-template-columns:repeat(2,1fr); gap:10px; }.product-image { height:135px; }.combo-image { height:105px; }.faq-grid { grid-template-columns:1fr; gap:8px; }.promo-banner { padding:20px; }.mini-offers { grid-template-columns:1fr; }.mini-offer:nth-child(n+3) { display:none; }.collection-grid { grid-template-columns:repeat(2,1fr); }.benefit-strip { grid-template-columns:1fr; }.countdown-copy { align-items:flex-start; flex-wrap:wrap; }.countdown { margin-left:0; flex-basis:100%; }.section-title h2 { font-size:17px; }footer { grid-template-columns:1fr 1fr; padding:28px 20px; gap:24px; }.footer-brand { grid-column:1/-1; } }
@media (max-width: 420px) { .hero-copy h1 { font-size:25px; }.hero-copy p { font-size:12px; }.product-image { height:120px; }.compact-card > div:first-child { width:80px; height:90px; }.collection { min-height:115px; } }

.helper { display:none; }

/* Reference image description: ecommerce storefront with multiple banners, trust ticker, navigation, category bubbles, product rows, promotional cards, collections, FAQs, and footer. */

/* Keep the source reference available for visual comparison: https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-fPOd4YmqLVCk8lvug77weuP1OJifN3.png */
/* Adaptación al contrato dinámico de Gesicomm */
:root{--navy:#062b4f;--navy-deep:#041f38;--blue:var(--tienda-primario,#075da0);--blue-bright:color-mix(in srgb,var(--blue) 82%,#fff);--sky:#eaf6fc;--line:var(--tienda-linea,#d7e6ef);--muted:var(--tienda-texto-suave,#5f7890);--orange:var(--tienda-secundario,#ef5b3f);--green:#16a66f;--gc-primario:var(--blue);--gc-texto-sobre-primario:var(--tienda-texto-sobre-primario,#fff);--gc-fondo:#f6fafc;--gc-texto:var(--navy)}
.container{width:100%;max-width:1240px;margin:auto;padding-left:28px;padding-right:28px}.commerce-header{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--line)}
.commerce-header .header-main{height:76px;max-width:1240px;margin:auto;display:flex;align-items:center;gap:46px;padding:0 28px}.commerce-header .brand{display:flex;align-items:center;gap:8px;color:var(--navy);font-size:20px;font-weight:800;white-space:nowrap;background:transparent;border:none;box-shadow:none}.brand-logo{width:29px;height:29px;object-fit:contain}.brand-logo[src=""],.brand-logo:not([src]){display:none}.commerce-header .main-nav{max-width:1240px;margin:auto;min-height:43px;display:flex;align-items:center;gap:30px;padding:0 28px;border-top:1px solid color-mix(in srgb,var(--line) 75%,transparent)}.commerce-header .nav-links{display:flex;gap:30px}.commerce-header .main-nav a{color:#426078;font-size:11px;font-weight:700;padding:13px 0}.commerce-header .main-nav a.active{color:var(--blue);border-bottom:2px solid var(--blue)}.commerce-header .category-menu{font-size:11px}.commerce-header .menu-toggle{display:none}.cart-button{background:transparent;border:0;display:flex;align-items:center;gap:7px;color:var(--navy);font-size:11px}
.trust-bar{background:var(--navy);color:#fff;overflow:hidden}.trust-track{display:flex;width:max-content;animation:marquee 28s linear infinite}.trust-item{min-width:245px;display:flex;align-items:center;gap:9px;padding:10px 26px;border-right:1px solid rgba(255,255,255,.13)}.trust-icon{color:#73c9f5;font-size:16px}.trust-item strong,.trust-item span{display:block}.trust-item strong{font-size:11px}.trust-item span{color:#b9cfdd;font-size:10px;margin-top:2px}@keyframes marquee{to{transform:translateX(-50%)}}
.storefront .page-content{max-width:1240px;margin:auto;padding:20px 28px 50px}.storefront .hero{position:relative;height:310px;margin:0}.hero-shell{height:100%;position:relative;overflow:hidden;border-radius:9px;background:var(--navy)}.hero-banners,.hero-banner{position:absolute;inset:0}.hero-banner{display:none;align-items:center;padding:40px 70px;color:#fff}.hero-banner:first-child,.hero-banner.is-active{display:flex}.hero-banner img,.hero-banner video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.hero-banner:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,31,54,.88),rgba(8,31,54,.08));pointer-events:none}.hero-text{position:relative;z-index:2;max-width:500px}.hero-text .eyebrow{font-size:16px;font-weight:700;margin:0}.hero-text h2{font-size:40px;line-height:1.02;margin:8px 0;letter-spacing:-1.5px;max-width:450px}.hero-text>p:not(.eyebrow){margin:0 0 20px;font-size:15px}.hero-text .button-primary{display:inline-flex;background:#fff;color:var(--navy);padding:11px 15px;border-radius:5px;font-size:11px;font-weight:700}.hero-product-feed{display:none}.hero-dots{position:absolute;z-index:4;bottom:15px;left:50%;transform:translateX(-50%);display:flex;gap:7px}.hero-dots>*{width:6px;height:6px;border-radius:50%;background:#fff9}.hero-dots>.is-active{width:18px;border-radius:9px;background:#fff}.slider-arrow{position:absolute;z-index:5;top:50%;transform:translateY(-50%);border:0;background:#fff;color:var(--navy);border-radius:50%;width:29px;height:29px;display:grid;place-items:center;box-shadow:0 3px 10px #001a3a2b}.slider-arrow.left{left:10px}.slider-arrow.right{right:10px}
.storefront section{margin-top:30px}.storefront .categories,.storefront .category-strip{margin-top:15px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:18px}.storefront .category-strip .container{padding:0}.storefront .category-strip .section-heading{display:none}.storefront .category-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:15px}.storefront .category-card{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--navy);background:transparent;border:0;font-weight:700;font-size:11px}.storefront .category-media{width:64px;height:64px;border-radius:50%;overflow:hidden;border:1px solid var(--line);box-shadow:0 3px 12px #08294714}.storefront .category-media img{width:100%;height:100%;object-fit:cover}.storefront .category-card small{display:none}
.section-title,.storefront .section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:13px;max-width:none}.storefront .section-heading h2{font-size:20px;margin:0;letter-spacing:-.4px}.storefront .section-heading p{color:var(--muted);margin:4px 0 0;font-size:11px}.storefront .section{padding:0;background:transparent}.storefront .spotlight-grid,.storefront .product-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.storefront .product-card{background:#fff;border:1px solid var(--line);border-radius:7px;overflow:hidden;box-shadow:none;color:var(--navy)}.storefront .product-image{height:175px;padding:0;background:#fff;position:relative}.storefront .product-image img{width:100%;height:100%;object-fit:cover}.storefront .product-badge{position:absolute;z-index:2;top:9px;left:9px;color:#fff;background:var(--orange);border-radius:4px;padding:4px 7px;font-size:9px;font-weight:700}.storefront .product-content{padding:11px}.storefront .product-category{color:var(--muted);font-size:9px;margin-bottom:5px}.storefront .product-content h3{font-size:12px;margin:0 0 9px;min-height:0}.storefront .product-description{color:var(--muted);font-size:10px;margin-bottom:8px}.storefront .product-footer{display:block;padding:0;background:transparent}.storefront .product-prices{display:flex;align-items:center;gap:7px;margin-bottom:8px}.storefront .price{color:var(--orange);font-size:14px}.storefront .price-old{font-size:10px;color:#9bacb7}.storefront .product-card .button-primary{width:100%;min-height:0;background:var(--blue);color:#fff;border:0;border-radius:4px;padding:8px;font-size:10px;font-weight:700}.storefront .product-card .button-primary:hover{background:var(--blue-bright);color:#fff}
.promo-banner-home{min-height:145px;border-radius:8px;overflow:hidden;padding:23px 40px;color:#fff;background:linear-gradient(90deg,#713b1bdc,#713b1b30),url('https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1400&q=85') center/cover}.promo-banner-home h2{margin:2px 0 3px;font-size:26px}.promo-banner-home p{margin:0 0 13px;font-size:12px}.promo-banner-home a{display:inline-flex;background:#fff;color:var(--navy);border-radius:5px;padding:8px 12px;font-size:10px;font-weight:700}
.storefront .compact-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.storefront .compact-grid .product-card{display:grid;grid-template-columns:100px 1fr;padding:9px;gap:10px;align-items:center}.storefront .compact-grid .product-image{height:105px;border-radius:4px}.storefront .compact-grid .product-content{padding:0}.storefront .compact-grid .product-description,.storefront .compact-grid .product-category{display:none}
.storefront .limited-offer{margin:30px 0 0}.storefront .limited-offer-card{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:15px;box-shadow:none}.storefront .limited-offer-card>div:first-child{display:flex;align-items:center;gap:12px}.storefront .limited-offer-kicker{display:none}.storefront .limited-offer h2{font-size:17px;margin:0}.storefront .limited-offer p{font-size:10px;color:var(--muted);margin:3px 0 0}.storefront .countdown{margin-left:auto;display:flex;gap:6px}.storefront .countdown-box{background:#fff0ed;color:var(--orange);border-radius:4px;padding:8px 7px;min-width:45px}.storefront .countdown-box b{font-size:17px}.storefront .countdown-box small{font-size:8px;color:var(--orange)}.storefront .limited-offer .button-primary{background:var(--blue);color:#fff;border-radius:4px;padding:9px 13px;font-size:10px}
.storefront .collection-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.storefront .collection-card{min-height:135px;border:0;border-radius:7px;color:#fff;display:flex;flex-direction:column;justify-content:end;padding:13px;background:linear-gradient(0deg,rgba(3,24,42,.76),rgba(3,24,42,.08)),var(--blue);background-size:cover;background-position:center}.storefront .collection-card h3{font-size:13px;margin:0}.storefront .collection-card p{font-size:10px;margin:4px 0 0;color:#fff}
.storefront .combos-section{background:transparent}.storefront .faq-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 16px;max-width:none;border:0}.storefront .faq-item{background:#fff;border:1px solid var(--line);border-radius:7px;padding:0 14px}.storefront .faq-question{padding:15px 0;font-size:12px}.storefront .faq-answer p{font-size:11px}.storefront .contact-section{background:#fff;border:1px solid var(--line);border-radius:9px;padding:24px}.storefront .contact-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:40px}.storefront .contact-form{box-shadow:none;border-radius:8px}.storefront .benefit-strip{display:grid;grid-template-columns:repeat(3,1fr);background:#fff;border:1px solid var(--line);border-radius:8px;padding:20px;gap:20px}.storefront .benefit-strip div{display:grid;grid-template-columns:26px 1fr;column-gap:10px;align-items:center}.storefront .benefit-strip strong{font-size:12px}.storefront .benefit-strip span{color:var(--muted);font-size:10px}
.storefront .products-section{padding-top:30px}.catalog-toolbar{display:grid;grid-template-columns:1fr auto auto;gap:10px;margin-bottom:16px}.catalog-search,.catalog-select{height:41px;border:1px solid var(--line);border-radius:7px;background:#fff;padding:0 12px;color:var(--navy);font-size:11px}.pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:24px}.button-secondary{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:5px;padding:8px 12px;font-size:10px;font-weight:700}
.site-footer{background:var(--navy);color:#fff;padding:35px max(28px,calc((100% - 1184px)/2));font-size:11px}.site-footer .footer-row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px}.site-footer .footer-links{display:flex;flex-direction:column;gap:9px}.site-footer a{color:#a9bdc9}.site-footer .footer-redes{align-content:start}.site-footer .footer-redes .gc-red{font-size:10px}
@media(max-width:760px){.commerce-header .header-main{height:auto;padding:16px;gap:14px;flex-wrap:wrap}.search-box{order:3;flex-basis:100%}.commerce-header .main-nav{overflow:auto;padding:0 16px;gap:22px;white-space:nowrap}.commerce-header .nav-links{display:flex;gap:22px}.commerce-header .category-menu{display:none}.storefront .page-content{padding:12px 14px 35px}.storefront .hero{height:260px}.hero-banner{padding:25px 35px}.hero-text h2{font-size:30px}.storefront .category-grid{grid-template-columns:repeat(4,1fr)}.storefront .category-card:nth-child(n+5){display:none}.storefront .spotlight-grid,.storefront .product-grid,.storefront .compact-grid{grid-template-columns:repeat(2,1fr);gap:10px}.storefront .compact-grid .product-card{grid-template-columns:1fr}.storefront .product-image{height:135px}.storefront .faq-list{grid-template-columns:1fr}.storefront .collection-grid{grid-template-columns:repeat(2,1fr)}.storefront .limited-offer-card{display:grid}.storefront .countdown{margin-left:0}.storefront .contact-layout{grid-template-columns:1fr}.catalog-toolbar{grid-template-columns:1fr}.site-footer .footer-row{grid-template-columns:1fr}.storefront .benefit-strip{grid-template-columns:1fr}}
@media(max-width:420px){.hero-text h2{font-size:25px}.storefront .product-image{height:120px}}
`;

const TOKENS_CSS = `:root {
  --ink: var(--tienda-texto, #10202f);
  --ink-soft: var(--tienda-texto-suave, #506172);
  /* Paleta de respaldo: al armar la página, Gesicom la conecta con los
     colores de Mi Tienda → Branding (ver marcaTiendaCodigo.js). */
  --paper: var(--tienda-fondo, #f6f8fb);
  --white: var(--tienda-superficie, #ffffff);
  --line: var(--tienda-linea, #e4eaf0);
  --brand: var(--tienda-primario, #16a36a);
  --brand-dark: color-mix(in srgb, var(--brand) 72%, #000);
  --brand-soft: color-mix(in srgb, var(--brand) 9%, #ffffff);
  --ui-action: var(--brand);
  --accent: var(--tienda-secundario, #ffb547);
  --accent-soft: #fff7ed;
  --shadow-sm: 0 8px 25px rgba(23, 32, 51, .07);
  --shadow-lg: 0 24px 70px rgba(23, 32, 51, .13);
  /* Contrato con el carrito de Gesicom: lee estas cuatro para pintarse con
     los colores de la página (ver el puente de tema del iframe). */
  --gc-primario: var(--brand);
  --gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #ffffff);
  --gc-fondo: var(--paper);
  --gc-texto: var(--ink);
  --radius-sm: 14px;
  --radius-lg: 28px;
  --max: 1180px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--ink);
  background: var(--paper);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
h1, h2, h3, p { margin-top: 0; }

.container { width: min(calc(100% - 40px), var(--max)); margin-inline: auto; }

.announcement { overflow: hidden; color: var(--white); background: #111827; font-size: .82rem; white-space: nowrap; }
.announcement-track { display: inline-flex; min-width: max-content; animation: announcement-scroll 24s linear infinite; }
.announcement span { display: inline-flex; align-items: center; gap: 8px; padding: 9px 28px; }
.announcement strong { color: #93c5fd; }
@keyframes announcement-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.site-header { position: sticky; top: 0; z-index: 50; background: rgba(247, 249, 252, .9); border-bottom: 1px solid rgba(228, 234, 240, .8); backdrop-filter: blur(18px); }
.nav { display: flex; align-items: center; justify-content: space-between; min-height: 76px; gap: 24px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-size: 1.28rem; font-weight: 850; letter-spacing: -.04em; cursor: pointer; }
.brand-mark { display: inline-flex; align-items: center; gap: 10px; background: transparent; border: none; box-shadow: none; }
.brand-logo { width: 36px; height: 36px; object-fit: contain; }
.brand-logo[src=""], .brand-logo:not([src]) { display: none; }
.nav-links { display: flex; align-items: center; gap: 26px; color: var(--ink-soft); font-size: .92rem; font-weight: 650; }
.nav-links a:hover { color: var(--brand-dark); }
.menu-toggle { display: none; width: 42px; height: 42px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 12px; }

.nav-cta, .button-primary, .button-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 20px; border: 0; border-radius: 999px; font-weight: 780;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.nav-cta, .button-primary { color: var(--gc-texto-sobre-primario); background: var(--brand); box-shadow: 0 10px 24px color-mix(in srgb, var(--brand) 22%, transparent); }
.nav-cta { min-height: 40px; padding-inline: 16px; font-size: .86rem; }
.button-primary:hover, .nav-cta:hover, .button-secondary:hover { transform: translateY(-2px); }
.button-primary:hover, .nav-cta:hover { background: var(--brand-dark); }
.button-secondary { color: var(--ink); background: var(--white); border: 1px solid var(--line); }

.eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 18px; color: var(--brand-dark); font-size: .78rem; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
.eyebrow::before { width: 22px; height: 3px; content: ""; background: var(--accent); border-radius: 99px; }

.section { padding: 100px 0; }
.section-heading { max-width: 660px; margin-bottom: 44px; }
.section-heading.center { margin-inline: auto; text-align: center; }
.section-heading h2 { margin-bottom: 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.03; letter-spacing: -.065em; }
.section-heading p { margin-bottom: 0; color: var(--ink-soft); font-size: 1.05rem; }

.limited-offer { position: relative; z-index: 3; margin: -36px 0 0; }
.limited-offer-card {
  display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 18px;
  padding: 18px; color: var(--ink); background: var(--white); border: 1px solid color-mix(in srgb, var(--brand) 22%, var(--line));
  border-radius: 24px; box-shadow: var(--shadow-lg);
}
.limited-offer-kicker { margin: 0 0 4px; color: var(--brand-dark); font-size: .74rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.limited-offer h2 { margin: 0; font-size: clamp(1.25rem, 3vw, 2rem); line-height: 1.05; letter-spacing: -.055em; }
.limited-offer p { margin: 4px 0 0; color: var(--ink-soft); font-size: .9rem; }
.countdown { display: flex; align-items: stretch; gap: 8px; }
.countdown-box { min-width: 58px; padding: 9px 10px; text-align: center; background: var(--ink); color: var(--white); border-radius: 16px; }
.countdown-box b { display: block; font-size: 1.28rem; line-height: 1; font-variant-numeric: tabular-nums; }
.countdown-box small { display: block; margin-top: 4px; color: rgba(255,255,255,.72); font-size: .62rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.limited-offer .button-primary { white-space: nowrap; }
.pdp-limited-offer { margin: 18px 0 20px; }
.pdp-limited-offer .limited-offer-card { grid-template-columns: minmax(0, 1fr) auto; box-shadow: var(--shadow-sm); }

.price { color: var(--ink); font-size: 1.3rem; font-weight: 900; letter-spacing: -.035em; }
.price-old { color: var(--ink-soft); font-size: .9rem; text-decoration: line-through; }
.badge-off { padding: 4px 9px; color: #fff; background: #d95b55; border-radius: 999px; font-size: .72rem; font-weight: 850; }

.product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.product-card { position: relative; display: flex; flex-direction: column; overflow: hidden; color: #f8fbfd; background: #18232a; border: 1px solid rgba(255,255,255,.1); border-radius: 22px; box-shadow: 0 18px 44px rgba(9, 16, 23, .18); transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.product-card:hover { border-color: rgba(255,255,255,.28); box-shadow: 0 24px 60px rgba(9, 16, 23, .28); transform: translateY(-5px); }
.product-card[data-agotado] { opacity: .6; }
.product-badge { position: absolute; z-index: 3; top: 15px; left: 15px; padding: 7px 10px; color: #fff; background: #b00f3f; border-radius: 8px; font-size: .7rem; font-weight: 900; }
.gc-commercial-badges { position: absolute; z-index: 4; top: 14px; left: 14px; right: 14px; display: flex; flex-wrap: wrap; gap: 7px; pointer-events: none; }
.gc-commercial-badges span { padding: 6px 9px; color: #fff; background: #b00f3f; border-radius: 8px; box-shadow: 0 10px 24px rgba(176,15,63,.28); font-size: .68rem; font-weight: 900; line-height: 1; }
.gc-commercial-badges span:nth-child(2) { background: rgba(255,255,255,.92); color: #18232a; }
.product-image { display: grid; height: 260px; padding: 20px; place-items: center; background: #fff; cursor: pointer; }
.product-image img { width: 100%; height: 220px; object-fit: contain; mix-blend-mode: multiply; }
.product-content { display: flex; flex: 1; flex-direction: column; padding: 20px; }
.product-category { margin-bottom: 8px; color: rgba(255,255,255,.68); font-size: .72rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.product-content h3 { margin-bottom: 10px; font-size: 1.17rem; line-height: 1.14; letter-spacing: -.035em; cursor: pointer; }
.product-description, .gc-commercial-copy { margin-bottom: 16px; color: rgba(255,255,255,.72); font-size: .88rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.product-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding: 14px; color: #fff; background: #b00f3f; border-radius: 10px; }
.product-prices { display: grid; gap: 2px; }
.product-card .price { color: #fff; font-size: 1.45rem; }
.product-card .price-old { color: rgba(255,255,255,.72); }
.product-card .button-primary { min-height: 38px; padding: 0 14px; color: #0f1c22; background: #fff; border-color: #fff; font-size: .82rem; box-shadow: none; }
.product-card .button-primary:hover { color: #0f1c22; background: #f3f7f9; border-color: #f3f7f9; transform: none; }
.gc-commercial-saving, .gc-product-urgency, .gc-product-shipping { margin: 10px 0 0; color: #fff; font-size: .82rem; font-weight: 850; }
.gc-product-urgency { color: #ffdbe5; font-variant-numeric: tabular-nums; }
.gc-product-shipping { color: rgba(255,255,255,.72); }
.gc-commercial-details { width: fit-content; margin-top: 10px; padding: 0; color: #fff; background: transparent; border: 0; font-size: .82rem; font-weight: 850; cursor: pointer; }

.site-footer { padding: 28px 0; color: #94a3b1; background: #0a1520; font-size: .78rem; }
.footer-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; }
.footer-links { display: flex; flex-wrap: wrap; gap: 18px; }
.footer-links a:hover { color: var(--white); }
.footer-redes { display: flex; flex-wrap: wrap; gap: 8px; }
.footer-redes .gc-red { padding: 6px 12px; color: #dbe4ec; border: 1px solid rgba(255, 255, 255, .18); border-radius: 999px; font-weight: 700; transition: border-color .2s ease, color .2s ease; }
.footer-redes .gc-red:hover { color: var(--white); border-color: var(--brand); }

.reveal { opacity: 1; transform: none; transition: transform .2s ease, box-shadow .2s ease; }
.reveal.is-visible { opacity: 1; transform: none; }

@media (max-width: 960px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .container { width: min(calc(100% - 28px), var(--max)); }
  .nav { min-height: 68px; }
  .nav-links { position: absolute; top: calc(100% + 1px); right: 14px; left: 14px; display: none; flex-direction: column; align-items: stretch; gap: 0; padding: 10px; background: rgba(255, 255, 255, .98); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-lg); }
  .nav-links.is-open { display: flex; }
  .nav-links a { padding: 12px; }
  .menu-toggle { display: block; }
  .section { padding: 70px 0; }
  .announcement-track { animation-duration: 18s; }
  .limited-offer { margin-top: -20px; }
  .limited-offer-card { grid-template-columns: 1fr; gap: 14px; padding: 16px; border-radius: 18px; }
  .pdp-limited-offer .limited-offer-card { grid-template-columns: 1fr; }
  .countdown { width: 100%; }
  .countdown-box { flex: 1; min-width: 0; }
  .limited-offer .button-primary { width: 100%; }
  .product-grid { grid-template-columns: 1fr; }
  .footer-row { align-items: start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
  .announcement-track { animation: none; transform: none; }
  .reveal { opacity: 1; transform: none; }
}`;

const HEADER_HTML = `<header class="commerce-header">
  <div class="container header-main">
    <a class="brand brand-mark" href="#" data-gesicomm-inicio aria-label="Volver al inicio">
      <img class="brand-logo" data-gesicomm-tienda="logo" alt="">
      <span data-gesicomm-tienda="nombre">Tu tienda</span>
    </a>
    <form class="search-box" role="search">
      <input type="search" placeholder="Buscá productos, marcas y más..." aria-label="Buscar productos" data-gesicomm-buscar>
      <button type="submit" aria-label="Buscar">⌕</button>
    </form>
    <div class="header-actions">
      <button class="cart-button" type="button" data-gesicomm-carrito aria-label="Abrir carrito">
        <span aria-hidden="true">🛒</span>
        <strong>Carrito</strong>
      </button>
      <button class="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
    </div>
  </div>
  <nav class="container main-nav" aria-label="Navegación comercial">
    <a class="category-menu" href="#categorias">☰ Todas las categorías</a>
    <div id="nav-links" class="nav-links">
      __LINKS__
    </div>
  </nav>
</header>`;

const ANNOUNCEMENT_HTML = `<div class="announcement" aria-label="Beneficios de compra">
  <div class="announcement-track">
    <span><strong>Oferta por tiempo limitado</strong> aprovechá antes de que termine</span>
    <span><strong>Pago seguro</strong> online o al recibir</span>
    <span><strong>Envío rápido</strong> a tu ciudad</span>
    <span><strong>Atención por WhatsApp</strong> te ayudamos a elegir</span>
    <span><strong>Oferta por tiempo limitado</strong> aprovechá antes de que termine</span>
    <span><strong>Pago seguro</strong> online o al recibir</span>
    <span><strong>Envío rápido</strong> a tu ciudad</span>
    <span><strong>Atención por WhatsApp</strong> te ayudamos a elegir</span>
  </div>
</div>`;

const LIMITED_OFFER_HTML = `<section id="ofertas" class="limited-offer" data-gesicomm-lista="productos_ofertas" data-gesicomm-countdown data-gesicomm-venta-configurada="urgencia">
  <div class="limited-offer-card">
    <div class="limited-offer-summary">
      <h2><span aria-hidden="true">⏰</span> <span data-gesicomm-venta="urgencia_titulo">Ofertas que terminan pronto</span></h2>
      <p data-gesicomm-venta="urgencia_texto">Aprovechá antes de que se agoten</p>
      <div class="countdown" aria-label="Cuenta regresiva de la oferta">
        <span class="countdown-box"><b data-gesicomm-countdown-parte="horas">--</b><small>horas</small></span>
        <span class="countdown-separator">:</span>
        <span class="countdown-box"><b data-gesicomm-countdown-parte="minutos">--</b><small>min</small></span>
        <span class="countdown-separator">:</span>
        <span class="countdown-box"><b data-gesicomm-countdown-parte="segundos">--</b><small>seg</small></span>
      </div>
    </div>
    <div class="limited-offer-products" data-gesicomm-lista="productos_ofertas" data-gesicomm-limite="4">
      <template>
        <article class="limited-offer-product">
          <span class="limited-offer-badge" data-gesicomm-bind="descuento"></span>
          <div class="limited-offer-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
          <div class="limited-offer-copy">
            <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <div class="limited-offer-prices"><span data-gesicomm-bind="precio"></span><s data-gesicomm-bind="precio_antes"></s></div>
            <button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button>
          </div>
        </article>
      </template>
    </div>
    <a class="limited-offer-see-all" href="#ofertas-catalogo"><span data-gesicomm-venta="urgencia_cta">Ver todos</span> <span aria-hidden="true">→</span></a>
  </div>
</section>`;

// Las políticas son obligatorias para PagoPar y para aprobar anuncios en
// Meta: van en las dos vistas aunque el diseño cambie.
const FOOTER_HTML = `<footer class="site-footer">
  <div class="container footer-row">
    <div>© 2026 <span data-gesicomm-tienda="nombre">Tu tienda</span>. Todos los derechos reservados.</div>
    <!-- Redes cargadas en Mi Tienda: el runtime pone un link por red y
         oculta el bloque si la tienda no tiene ninguna. -->
    <div class="footer-redes" data-gesicomm-redes aria-label="Redes sociales"></div>
    <nav class="footer-links" aria-label="Información de la tienda">
      <a href="/contacto" data-gesicomm-link="contacto">Contacto</a>
      <a href="/politica-privacidad" data-gesicomm-link="politica-privacidad">Privacidad</a>
      <a href="/terminos-servicio" data-gesicomm-link="terminos-servicio">Términos</a>
      <a href="/politica-reembolso" data-gesicomm-link="politica-reembolso">Reembolsos</a>
      <a href="/politica-envio" data-gesicomm-link="politica-envio">Envíos</a>
      <a href="/aviso-legal" data-gesicomm-link="aviso-legal">Aviso legal</a>
    </nav>
  </div>
</footer>`;

const JS_COMUN = `(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('#nav-links');
  menuToggle?.addEventListener('click', () => {
    const abierto = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(abierto));
  });
  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('is-open'));
  });

  document.querySelectorAll('.featured-carousel').forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll('.hero-card'));
    if (!slides.length) return;
    let actual = 0;
    const dots = document.createElement('div');
    dots.className = 'featured-dots';
    function pintar(n) {
      actual = n;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === actual));
      Array.from(dots.children).forEach((dot, i) => dot.classList.toggle('is-active', i === actual));
    }
    if (slides.length > 1) {
      slides.forEach((_slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'featured-dot';
        dot.setAttribute('aria-label', 'Ver destacado ' + (i + 1));
        dot.addEventListener('click', () => pintar(i));
        dots.appendChild(dot);
      });
      carousel.appendChild(dots);
      const timer = setInterval(() => pintar((actual + 1) % slides.length), 4200);
      if (timer && timer.unref) timer.unref();
    }
    carousel.classList.add('is-ready');
    pintar(0);
  });

  document.querySelectorAll('.faq-question').forEach((pregunta) => {
    pregunta.addEventListener('click', () => {
      const item = pregunta.closest('.faq-item');
      const abierto = item.classList.toggle('is-open');
      pregunta.setAttribute('aria-expanded', String(abierto));
    });
  });

  // Las tarjetas que pinta Gesicomm ya están en el DOM cuando corre esto.
  const revelar = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entradas, obs) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-visible');
        obs.unobserve(entrada.target);
      });
    }, { threshold: 0.12 });
    revelar.forEach((el) => observer.observe(el));
  } else {
    revelar.forEach((el) => el.classList.add('is-visible'));
  }
})();`;

// ─── INICIO ──────────────────────────────────────────────────────────────

const INICIO_CSS_LEGACY = `${TOKENS_CSS}

.commerce-header { position: sticky; top: 0; z-index: 20; background: var(--white); border-bottom: 1px solid var(--line); box-shadow: 0 8px 22px rgba(8, 41, 71, .05); }
.commerce-header .header-main { min-height: 76px; display: flex; align-items: center; gap: 28px; }
.commerce-header .brand-mark { display: inline-flex; align-items: center; gap: 9px; min-width: max-content; color: var(--ink); font-size: 1.16rem; font-weight: 900; text-decoration: none; letter-spacing: -.03em; background: transparent; border: none; box-shadow: none; }
.commerce-header .brand-logo { width: 32px; height: 32px; object-fit: contain; }
.commerce-header .brand-logo[src=""], .commerce-header .brand-logo:not([src]) { display: none; }
.commerce-header .brand-mark::before { display: none !important; }
.commerce-header .brand-mark:has(.brand-logo[src]:not([src=""]))::before { display: none; }
.search-box { flex: 1 1 360px; max-width: 620px; display: flex; min-height: 42px; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 10px; }
.search-box input { min-width: 0; flex: 1; padding: 0 14px; color: var(--ink); background: transparent; border: 0; outline: 0; font-size: .86rem; }
.search-box button { width: 50px; color: var(--gc-texto-sobre-primario); background: var(--brand); border: 0; font-size: 1.1rem; font-weight: 900; }
.header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.cart-button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 12px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: .84rem; }
.cart-button:hover { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.commerce-header .menu-toggle { display: none; width: 40px; height: 40px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
.main-nav { min-height: 44px; display: flex; align-items: center; gap: 26px; border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent); }
.main-nav a { color: var(--ink-soft); text-decoration: none; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.main-nav a:hover, .main-nav a.active { color: var(--brand-dark); }
.category-menu { display: inline-flex; align-items: center; gap: 7px; color: var(--ink) !important; }
.commerce-header .nav-links { position: static; display: flex; flex-direction: row; gap: 28px; padding: 0; background: transparent; border: 0; box-shadow: none; }
.storefront { background: #f6fafc; color: var(--ink); }
.storefront .page-content { max-width: 1240px; margin: 0 auto; padding: 18px 28px 42px; }
.storefront .hero { height: 298px; padding: 0; background: transparent; }
.hero-shell { position: relative; height: 100%; overflow: hidden; color: #fff; background: linear-gradient(90deg, rgba(8,41,71,.9), rgba(8,41,71,.16)), var(--brand-dark); border-radius: 12px; box-shadow: 0 18px 38px rgba(8,41,71,.16); }
.hero-banners { position: absolute; inset: 0; z-index: 2; }
.hero-banners .hero-banner { position: absolute; inset: 0; display: none; align-items: center; padding: 42px 72px; color: #fff; background: #082947; }
.hero-banners .hero-banner:first-of-type, .hero-banners .hero-banner.is-active { display: flex; }
.hero-shell.has-banner .hero-banners .hero-banner:not(.is-active) { display: none; }
.hero-banners .hero-banner::before { position: absolute; inset: 0; z-index: 1; content: ""; background: linear-gradient(90deg, rgba(8,41,71,.86) 0%, rgba(8,41,71,.46) 40%, rgba(8,41,71,.10) 72%, rgba(8,41,71,.04) 100%); pointer-events: none; }
.hero-banners .hero-banner img, .hero-banners .hero-banner video { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-fallback { position: relative; z-index: 1; display: flex; align-items: center; height: 100%; padding: 40px 70px; background-image: linear-gradient(90deg, rgba(8,41,71,.76) 0%, rgba(8,41,71,.56) 38%, rgba(8,41,71,.12) 68%, rgba(8,41,71,.02) 100%), url('https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=85'); background-position: center; background-size: cover; }
.hero-shell:has(.hero-banners [data-gesicomm-generado]) .hero-fallback { display: none; }
.hero-text { position: relative; z-index: 2; max-width: 540px; }
.hero-text .eyebrow, .hero-banner .eyebrow { color: #ffd27a; }
.storefront .hero h1, .hero-banner h1, .hero-banner h2 { max-width: 520px; margin: 8px 0 10px; color: #fff; font-size: clamp(2rem, 4.4vw, 3.2rem); line-height: 1.02; letter-spacing: -.04em; text-shadow: 0 2px 14px rgba(0,0,0,.28); }
.storefront .hero p, .hero-banner p { max-width: 480px; margin: 0 0 20px; color: rgba(255,255,255,.92); font-size: .98rem; text-shadow: 0 1px 10px rgba(0,0,0,.18); }
.hero-dots { position: absolute; right: 32px; bottom: 26px; z-index: 5; display: flex; gap: 7px; }
.hero-dots span { width: 7px; height: 7px; background: rgba(255,255,255,.48); border-radius: 999px; }
.hero-dots span:first-child, .hero-dots span.is-active { width: 23px; background: var(--accent); }
.hero-shell.has-banner .hero-dots span:not(.is-active) { width: 7px; background: rgba(255,255,255,.48); }
.hero-product-feed { display: none; }
.store-benefits { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; overflow: hidden; color: #fff; background: #24313a; border-radius: 0 0 10px 10px; }
.store-benefit { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; align-items: center; padding: 16px 18px; border-left: 1px solid rgba(255,255,255,.08); }
.store-benefit:first-child { border-left: 0; }
.store-benefit-icon { display: grid; width: 31px; height: 31px; place-items: center; color: var(--brand-dark); background: #eef5f8; border-radius: 9px; font-size: .84rem; font-weight: 950; }
.store-benefit strong { display: block; color: #fff; font-size: .83rem; line-height: 1.15; }
.store-benefit span { display: block; margin-top: 2px; color: #c8d5df; font-size: .74rem; line-height: 1.25; }
.storefront .category-strip { margin-top: 16px; padding: 18px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; }
.storefront .category-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 15px; }
.storefront .category-card { align-items: center; min-height: 112px; padding: 8px; text-align: center; background: transparent; border: 0; border-radius: 12px; box-shadow: none; }
.storefront .category-media { width: 68px; height: 68px; margin: 0 auto; background: var(--paper); border: 1px solid var(--line); border-radius: 999px; box-shadow: 0 4px 14px rgba(8,41,71,.08); }
.storefront .category-media img { height: 66px; padding: 6px; border-radius: 999px; }
.storefront .category-card small { display: none; }
.storefront .section { padding: 30px 0 0; }
.storefront .section-heading { margin-bottom: 14px; }
.storefront .section-heading h2 { font-size: 1.34rem; letter-spacing: -.025em; }
.storefront .section-heading p { font-size: .82rem; }
.storefront .spotlight-grid, .storefront .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.storefront .news-grid { display: grid; grid-template-columns: 1.2fr repeat(3, minmax(0, .86fr)); gap: 16px; }
.storefront .news-grid .product-card:first-of-type { grid-row: span 2; }
.storefront .news-grid .product-card:first-of-type .product-image { height: 276px; }
.storefront .news-grid .product-card:first-of-type .product-image img { height: 248px; }
.storefront .news-grid .product-card:not(:first-of-type) .product-image { height: 136px; }
.storefront .news-grid .product-card:not(:first-of-type) .product-image img { height: 116px; }
.storefront .news-grid .product-card:not(:first-of-type) .product-description { display: none; }
.storefront .product-card { overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 9px; box-shadow: none; }
.storefront .product-image { height: 176px; background: #fff; }
.storefront .product-image img { height: 150px; }
.storefront .product-content { padding: 12px; }
.storefront .product-content h3 { min-height: 2.4em; font-size: .9rem; line-height: 1.2; }
.storefront .product-description, .storefront .product-category { font-size: .72rem; }
.storefront .product-badge { background: #f15d3d; border-radius: 5px; font-size: .68rem; }
.storefront .price { color: #0965a8; font-size: 1rem; }
.storefront .button-primary { border-radius: 6px; }
.storefront .promo-band { padding: 30px 0 0; background: transparent; }
.storefront .promo-inner { min-height: 145px; padding: 24px 38px; color: #fff; background: linear-gradient(90deg, rgba(113,59,27,.88), rgba(113,59,27,.26)), radial-gradient(circle at 78% 32%, rgba(255,255,255,.34), transparent 25%), #713b1b; border: 0; border-radius: 10px; box-shadow: none; }
.storefront .promo-inner h2 { color: #fff; font-size: 1.8rem; }
.storefront .promo-inner p { color: rgba(255,255,255,.86); }
.storefront .promo-metrics { display: none; }
.storefront .dynamic-sections { background: transparent; }
.storefront .dynamic-section { padding: 30px 0 0; border: 0; }
.storefront .dynamic-head { margin-bottom: 14px; }
.storefront .dynamic-head h2 { font-size: 1.34rem; }
.storefront .limited-offer { margin-top: 30px; }
.storefront .limited-offer-card { border-radius: 10px; }
.storefront .collection-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.storefront .collection-card { min-height: 138px; padding: 18px; color: #fff; background: linear-gradient(0deg, rgba(8,41,71,.82), rgba(8,41,71,.12)), var(--brand); border: 0; border-radius: 9px; }
.storefront .collection-card h3 { color: #fff; font-size: 1rem; }
.storefront .collection-card p { color: rgba(255,255,255,.82); font-size: .78rem; }

.hero { position: relative; overflow: hidden; padding: 70px 0 78px; background: radial-gradient(circle at 82% 18%, rgba(255, 181, 71, .22), transparent 26%), linear-gradient(135deg, var(--paper) 0%, color-mix(in srgb, var(--brand) 8%, var(--paper)) 58%, var(--paper) 100%); }
.hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); align-items: center; gap: 58px; }
h1 { max-width: 680px; margin-bottom: 22px; font-size: clamp(2.7rem, 5.3vw, 5.2rem); line-height: .98; letter-spacing: -.075em; }
h1 em { color: var(--ui-action); font-style: normal; }
.hero-copy { max-width: 590px; margin-bottom: 30px; color: var(--ink-soft); font-size: 1.1rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.mini-trust { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 28px; }
.mini-trust span { padding: 12px 13px; color: var(--ink-soft); background: rgba(255,255,255,.72); border: 1px solid rgba(228,234,240,.86); border-radius: 14px; font-size: .82rem; font-weight: 750; }
.mini-trust b { color: var(--brand); }
.hero-card { overflow: hidden; background: var(--white); border: 1px solid rgba(255,255,255,.75); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); cursor: pointer; }
.featured-carousel { position: relative; min-height: 520px; }
.featured-carousel .hero-card { display: none; opacity: 0; transform: translateY(8px); transition: opacity .35s ease, transform .35s ease; }
.featured-carousel:not(.is-ready) .hero-card:first-of-type,
.featured-carousel .hero-card.is-active { display: block; opacity: 1; transform: translateY(0); }
.featured-dots { position: absolute; right: 18px; bottom: 18px; z-index: 3; display: flex; gap: 7px; }
.featured-dot { width: 8px; height: 8px; padding: 0; background: color-mix(in srgb, var(--ink) 22%, transparent); border: 0; border-radius: 999px; }
.featured-dot.is-active { width: 22px; background: var(--brand); }
.hero-image-wrap { display: grid; min-height: 345px; padding: 20px; place-items: center; background: transparent; }
.hero-image-wrap img { width: 100%; height: 330px; object-fit: contain; mix-blend-mode: normal; }
.hero-card-copy { padding: 22px 24px 26px; }
.product-kicker { margin-bottom: 8px; color: var(--brand-dark); font-size: .72rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.hero-card h2 { margin-bottom: 12px; font-size: 1.5rem; line-height: 1.08; letter-spacing: -.04em; }
.price-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.trust-strip { border-bottom: 1px solid var(--line); background: var(--white); }
.trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; padding: 18px 0; }
.trust-item { display: flex; align-items: center; gap: 12px; color: var(--ink-soft); font-size: .84rem; }
.trust-icon { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 10px; font-weight: 900; }
.trust-item strong { display: block; color: var(--ink); font-size: .87rem; }

.category-strip { padding: 48px 0 30px; background: var(--white); }
.category-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
.category-card { display: grid; gap: 10px; width: 100%; min-height: 150px; padding: 12px; text-align: left; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 18px; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
.category-card:hover { border-color: color-mix(in srgb, var(--brand) 42%, var(--line)); box-shadow: var(--shadow-sm); transform: translateY(-3px); }
.category-media { display: grid; height: 74px; place-items: center; overflow: hidden; background: transparent; border-radius: 14px; }
.category-media img { width: 100%; height: 74px; object-fit: contain; mix-blend-mode: normal; }
.category-card strong { font-size: .95rem; line-height: 1.15; }
.category-card small { color: var(--ink-soft); font-weight: 750; }

.menu-categorias { padding: 18px 0; background: var(--white); border-bottom: 1px solid var(--line); }
.menu-categorias-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
.menu-cat { display: inline-flex; align-items: center; gap: 9px; min-width: max-content; padding: 9px 13px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 999px; font-size: .84rem; font-weight: 800; }
.menu-cat img { width: 30px; height: 30px; object-fit: contain; border-radius: 50%; background: var(--white); }
.menu-cat:hover { border-color: color-mix(in srgb, var(--brand) 42%, var(--line)); color: var(--brand-dark); }

.banner-zone { padding: 26px 0 72px; background: var(--white); }
.banner-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.promo-banner { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 22px; align-items: center; min-height: 220px; overflow: hidden; padding: 30px; color: var(--ink); background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, var(--white)), var(--white)); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow-sm); }
.promo-banner:nth-child(2n) { background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--white)), var(--white)); }
.promo-banner-label { display: inline-flex; width: fit-content; margin-bottom: 10px; padding: 5px 9px; color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 999px; font-size: .7rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.promo-banner h2 { margin: 0 0 8px; font-size: clamp(1.45rem, 2.8vw, 2.2rem); line-height: 1.04; letter-spacing: -.055em; }
.promo-banner p { margin: 0 0 18px; color: var(--ink-soft); font-size: .95rem; }
.promo-banner img, .promo-banner video { width: 100%; height: 180px; object-fit: cover; border-radius: 12px; background: #eef5f8; }

.dynamic-sections { background: var(--paper); }
.dynamic-section { padding: 70px 0; border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent); }
.dynamic-section:first-child { border-top: 0; }
.dynamic-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 26px; }
.dynamic-head h2 { margin: 0 0 8px; font-size: clamp(1.8rem, 3vw, 2.7rem); line-height: 1.05; letter-spacing: -.055em; }
.dynamic-head p { margin: 0; color: var(--ink-soft); }
.dynamic-head .button-secondary { min-height: 40px; white-space: nowrap; }

.showcase-section { background: var(--white); }
.muted-section { background: var(--paper); }
.section-action { margin-top: -18px; text-align: right; }
.spotlight-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.product-grid { grid-template-columns: repeat(4, 1fr); }
.product-card { border-radius: 18px; }
.product-image { height: 220px; }
.product-image img { height: 188px; mix-blend-mode: normal; }
.product-content { padding: 20px; }
.product-content h3 { font-size: 1.05rem; }
.product-footer { align-items: center; }
.product-card .button-primary { min-height: 40px; padding-inline: 13px; }
.combo-includes { margin: 0 0 18px; color: var(--ink-soft); font-size: .82rem; }

.promo-band { padding: 0 0 70px; background: var(--white); }
.promo-inner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr); gap: 30px; align-items: center; padding: 42px; color: var(--ink); background: linear-gradient(135deg, var(--white) 0%, color-mix(in srgb, var(--brand) 6%, var(--white)) 55%, color-mix(in srgb, var(--accent) 8%, var(--white)) 100%); border: 1px solid var(--line); border-radius: 28px; box-shadow: var(--shadow-lg); }
.promo-inner h2 { margin-bottom: 10px; font-size: clamp(2rem, 4vw, 3.3rem); line-height: 1.02; letter-spacing: -.06em; }
.promo-inner p { max-width: 560px; margin-bottom: 22px; color: var(--ink-soft); }
.promo-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.promo-metrics div { padding: 18px; background: color-mix(in srgb, var(--white) 82%, transparent); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-sm); }
.promo-metrics strong { display: block; font-size: 1.8rem; line-height: 1; }
.promo-metrics span { color: var(--ink-soft); font-size: .82rem; }

.collection-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.collection-card { min-height: 210px; padding: 26px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-top: 5px solid var(--brand); border-radius: 22px; box-shadow: var(--shadow-sm); }
.collection-card:nth-child(2) { border-top-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--white)); }
.collection-card:nth-child(3) { border-top-color: var(--brand); background: color-mix(in srgb, var(--brand) 8%, var(--white)); }
.collection-card h3 { max-width: 260px; margin-bottom: 12px; font-size: 1.55rem; line-height: 1.08; letter-spacing: -.04em; }
.collection-card p { max-width: 280px; color: var(--ink-soft); }

.products-section { background: var(--white); }
.combos-section { background: var(--brand-soft); }
.product-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.product-toolbar .section-heading { margin-bottom: 0; }
.product-count { color: var(--ink-soft); font-size: .9rem; font-weight: 700; }
.catalog-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; margin-bottom: 22px; }
.catalog-search, .catalog-select { min-height: 46px; padding: 0 14px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 12px; outline: none; }
.catalog-search:focus, .catalog-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 13%, transparent); }
.catalog-state { margin: 26px 0 0; color: var(--ink-soft); text-align: center; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 34px; color: var(--ink-soft); font-size: .9rem; font-weight: 700; }
.pagination button:disabled { opacity: .45; cursor: default; transform: none; }

.reviews-section { background: var(--paper); }
.review-grid { display: grid; grid-template-columns: .8fr repeat(2, 1fr); gap: 18px; align-items: stretch; }
.rating-card, .review-card { padding: 26px; background: var(--white); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-sm); }
.rating-card strong { display: block; margin-bottom: 8px; color: var(--brand-dark); font-size: 2.4rem; letter-spacing: -.06em; }
.stars { color: #f59e0b; font-size: 1.1rem; letter-spacing: .06em; }
.review-card p { color: var(--ink-soft); }
.review-card b { display: block; margin-top: 18px; }
.review-card small { color: var(--ink-soft); font-weight: 750; }

.benefit-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.benefit-card { padding: 24px; background: var(--white); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-sm); }
.benefit-icon { display: grid; width: 42px; height: 42px; margin-bottom: 16px; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 13px; font-size: 1.05rem; }
.benefit-card h3 { margin-bottom: 8px; font-size: 1rem; }
.benefit-card p { margin: 0; color: var(--ink-soft); font-size: .9rem; }

.faq-section { background: var(--white); }
.faq-list { max-width: 860px; margin: 0 auto; border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-question { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 22px 0; color: var(--ink); background: transparent; border: 0; text-align: left; font-weight: 800; }
.faq-plus { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 50%; font-size: 1.25rem; transition: transform .2s ease; }
.faq-answer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }
.faq-answer > div { overflow: hidden; }
.faq-answer p { margin: 0; color: var(--ink-soft); font-size: .92rem; }
.faq-item.is-open .faq-answer { grid-template-rows: 1fr; }
.faq-item.is-open .faq-answer p { padding-bottom: 22px; }
.faq-item.is-open .faq-plus { transform: rotate(45deg); }

.contact-section { background: #f8fafc; color: var(--ink); border-top: 1px solid var(--line); }
.contact-layout { display: grid; grid-template-columns: .86fr 1.14fr; align-items: start; gap: 70px; }
.contact-section .eyebrow { color: var(--brand-dark); }
.contact-section h2 { margin-bottom: 15px; font-size: clamp(2rem, 4vw, 3.35rem); line-height: 1.03; letter-spacing: -.065em; }
.contact-copy { color: var(--ink-soft); }
.contact-list { display: grid; gap: 14px; margin-top: 28px; }
.contact-link { display: flex; align-items: center; gap: 11px; color: var(--brand-dark); font-size: .92rem; background: none; border: 0; padding: 0; text-align: left; font-weight: 750; }
.contact-form { padding: 28px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 22px; box-shadow: var(--shadow-lg); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.field { display: grid; gap: 7px; }
.field.full { grid-column: 1 / -1; }
.field label { color: var(--ink-soft); font-size: .8rem; font-weight: 780; }
.field input, .field textarea { width: 100%; padding: 13px 14px; color: var(--ink); background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; outline: none; }
.field input:focus, .field textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 13%, transparent); }
.field textarea { min-height: 110px; resize: vertical; }
.contact-form .button-primary { width: 100%; margin-top: 16px; }
.form-feedback { margin-top: 12px; padding: 10px 12px; color: var(--brand-dark); background: var(--brand-soft); border-radius: 9px; font-size: .82rem; }

@media (max-width: 1080px) {
  .category-grid { grid-template-columns: repeat(3, 1fr); }
  .banner-grid { grid-template-columns: 1fr; }
  .spotlight-grid, .product-grid { grid-template-columns: repeat(2, 1fr); }
  .benefit-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 960px) {
  .hero-grid, .contact-layout, .promo-inner { grid-template-columns: 1fr; gap: 36px; }
  .trust-grid { grid-template-columns: repeat(2, 1fr); }
  .review-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .hero { padding: 48px 0 58px; }
  h1 { font-size: 2.28rem; line-height: 1.1; }
  .hero-copy { font-size: 1rem; }
  .featured-carousel { min-height: 0; }
  .hero-image-wrap { min-height: 220px; }
  .hero-image-wrap img { height: 210px; }
  .hero-card-copy { padding: 18px; }
  .mini-trust, .trust-grid, .category-grid, .spotlight-grid, .product-grid, .news-grid, .collection-grid, .benefit-grid, .promo-metrics { grid-template-columns: 1fr; }
  .store-benefits { grid-template-columns: 1fr; border-radius: 0 0 10px 10px; }
  .store-benefit { border-top: 1px solid rgba(255,255,255,.08); border-left: 0; }
  .store-benefit:first-child { border-top: 0; }
  .storefront .news-grid .product-card:first-of-type { grid-row: auto; }
  .spotlight-grid > article:nth-of-type(n+3) { display: none; }
  .promo-banner { grid-template-columns: 1fr; padding: 22px; }
  .promo-banner img { height: 150px; }
  .dynamic-head { align-items: start; flex-direction: column; }
  .product-toolbar { align-items: start; flex-direction: column; gap: 5px; }
  .catalog-toolbar { grid-template-columns: 1fr; }
  .promo-inner { padding: 28px; border-radius: 22px; }
  .form-grid { grid-template-columns: 1fr; }
}

/* Storefront final pass: these rules intentionally live after the older
   template styles so the home never inherits dark product-card text on white. */
.storefront .container { max-width: 1240px; padding-left: 28px; padding-right: 28px; }
.commerce-header .brand.brand-mark {
  width: auto; height: auto; min-width: max-content; padding: 0; color: var(--ink);
  background: transparent; border-radius: 0; box-shadow: none;
}
.commerce-header .brand.brand-mark span[data-gesicomm-tienda] { color: var(--ink); background: transparent !important; }
.commerce-header .brand.brand-mark::before {
  display: none !important;
  color: var(--brand); background: transparent; border: 3px solid var(--brand);
  border-radius: 10px; font-weight: 950; line-height: 1;
}
.commerce-header .brand.brand-mark:has(.brand-logo[src]:not([src=""]))::before { display: none; }
.storefront { background: #f4f8fb !important; color: #082947 !important; }
.storefront .page-content { background: transparent !important; }
.storefront .hero-shell { background: #082947; border: 1px solid rgba(8, 41, 71, .12); }
.storefront .hero-shell.has-banner .hero-fallback { display: none; }
.storefront .hero .eyebrow { color: #ffd27a !important; }
.storefront .hero h1, .storefront .hero h2 { color: #ffffff !important; }
.storefront .hero p { color: rgba(255,255,255,.94) !important; }
.storefront .trust-strip { display: none; }
.storefront .category-strip { margin: 18px 0 0; padding: 0; background: transparent !important; border: 0; border-radius: 0; }
.storefront .category-strip .container { padding-top: 18px; padding-bottom: 18px; background: #ffffff !important; border: 1px solid #dbe8ef !important; border-radius: 12px; }
.storefront .category-strip .section-heading { display: none; }
.storefront .category-card { color: #082947 !important; }
.storefront .category-card strong { color: #082947 !important; }
.storefront .category-media { background: #f7fafc !important; border: 1px solid #dbe8ef !important; }
.storefront .menu-categorias { padding: 16px 0; background: #ffffff !important; border-top: 1px solid #dbe8ef; border-bottom: 1px solid #dbe8ef; }
.storefront .banner-zone { background: transparent !important; }
.storefront .promo-banner { color: #082947 !important; background: #ffffff !important; border-color: #dbe8ef !important; }
.storefront .promo-banner h2 { color: #082947 !important; }
.storefront .promo-banner p { color: #526779 !important; }
.storefront .product-card {
  position: relative; color: var(--ink); background: var(--white); border: 1px solid var(--line);
  border-radius: 8px; box-shadow: 0 4px 14px rgba(8, 41, 71, .06);
}
.storefront .product-card:hover {
  border-color: color-mix(in srgb, var(--brand) 28%, var(--line));
  box-shadow: 0 10px 24px rgba(8, 41, 71, .10); transform: translateY(-2px);
}
.storefront .product-content { color: var(--ink); }
.storefront .product-content h3 { color: var(--ink); font-weight: 850; letter-spacing: -.015em; }
.storefront .product-category, .storefront .product-description { color: var(--ink-soft); }
.storefront .product-card .price { color: var(--brand-dark); font-size: 1.04rem; }
.storefront .product-card .price-old { color: #8aa0af; }
.storefront .product-card .button-primary {
  min-height: 34px; width: 100%; color: var(--gc-texto-sobre-primario);
  background: var(--brand); border-color: var(--brand); box-shadow: none;
}
.storefront .product-card .button-primary:hover { color: var(--gc-texto-sobre-primario); background: var(--brand-dark); border-color: var(--brand-dark); }
.storefront .product-footer { align-items: end; gap: 10px; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation { border-radius: 12px; box-shadow: 0 8px 22px rgba(8, 41, 71, .08); }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-image { height: 175px; background: #f7fafc; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-content { padding: 16px; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-content h3 { margin-bottom: 8px; color: #062b4f; font-size: 17px; line-height: 1.15; font-weight: 900; letter-spacing: -.02em; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-description,
.storefront .offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-copy { margin: 0 0 14px; color: #526779; font-size: 13px; line-height: 1.45; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-footer { display: flex; flex-flow: row wrap; align-items: center; justify-content: space-between; gap: 10px 14px; padding: 12px 13px; color: #fff; background: #b80f45; border-radius: 10px; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .product-prices { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; min-width: 0; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .price { color: #fff; font-size: 24px; font-weight: 900; letter-spacing: -.02em; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .price-old { color: rgba(255,255,255,.72); font-size: 14px; font-weight: 800; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .button-primary { width: auto; min-height: 34px; padding: 8px 17px; color: #b80f45; background: #fff; border-color: #fff; border-radius: 999px; font-size: 12px; font-weight: 900; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .button-primary:hover { color: #b80f45; background: #fff; border-color: #fff; filter: brightness(.98); }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-saving { flex: 1 0 100%; margin: -4px 0 0; color: #fff; font-size: 14px; font-weight: 900; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-details { margin-top: 12px; padding: 0; color: #243978; background: transparent; border: 0; font-size: 12px; font-weight: 800; }
.storefront .limited-offer-product.has-commercial-presentation { grid-template-columns: 64px minmax(0, 1fr); border-radius: 10px; box-shadow: 0 8px 18px rgba(8,41,71,.08); }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-copy { gap: 6px; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-copy h3 { font-size: 10px; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices { display: flex; flex-flow: row wrap; align-items: center; justify-content: space-between; gap: 5px 8px; margin-top: auto; padding: 7px 8px; color: #fff; background: #b80f45; border-radius: 8px; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices span { color: #fff; font-size: 11px; font-weight: 900; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices s { color: rgba(255,255,255,.72); font-size: 8px; }
.storefront .limited-offer-product.has-commercial-presentation .gc-commercial-saving { flex: 1 0 100%; margin: -2px 0 0; color: #fff; font-size: 9px; font-weight: 900; }
.storefront .limited-offer-product.has-commercial-presentation .button-primary { min-height: 24px; padding: 5px 10px; color: #b80f45; background: #fff; border-color: #fff; border-radius: 999px; font-size: 8px; font-weight: 900; }
.storefront .limited-offer-card { box-shadow: 0 8px 20px rgba(8, 41, 71, .08); }

@media (max-width: 760px) {
  .commerce-header .header-main { min-height: auto; padding: 14px 16px; gap: 12px; flex-wrap: wrap; }
  .commerce-header .search-box { order: 3; flex-basis: 100%; max-width: none; }
  .commerce-header .menu-toggle { display: grid; place-items: center; }
  .commerce-header .main-nav { overflow-x: auto; padding: 0 16px; gap: 20px; }
  .commerce-header .nav-links { display: none; position: absolute; top: 100%; right: 12px; left: 12px; flex-direction: column; gap: 0; padding: 10px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lg); }
  .commerce-header .nav-links.is-open { display: flex; }
  .storefront .page-content { padding: 12px 14px 36px; }
  .storefront .hero { height: 270px; }
  .store-benefits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .store-benefit { padding: 13px; }
  .hero-fallback, .hero-banners .hero-banner { padding: 28px 36px; }
  .storefront .hero h1, .hero-banner h2 { font-size: 1.8rem; }
  .storefront .category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .storefront .category-card:nth-child(n+5) { display: none; }
  .storefront .spotlight-grid, .storefront .product-grid, .storefront .news-grid, .storefront .collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .storefront .news-grid .product-card:first-of-type { grid-row: auto; }
  .storefront .news-grid .product-card:first-of-type .product-image { height: 138px; }
  .storefront .news-grid .product-card:first-of-type .product-image img { height: 118px; }
  .storefront .product-image { height: 138px; }
  .storefront .product-image img { height: 118px; }
}
@media (max-width: 430px) {
  .store-benefits { grid-template-columns: 1fr; }
  .storefront .spotlight-grid, .storefront .product-grid, .storefront .news-grid, .storefront .collection-grid { grid-template-columns: 1fr; }
}`;

const INICIO_HTML = `<div class="trust-bar" aria-label="Beneficios de compra">
  <div class="trust-track">
    <div class="trust-item"><span class="trust-icon">✦</span><div><strong>Envío a todo Paraguay</strong><span>Recibí tus compras donde estés</span></div></div>
    <div class="trust-item"><span class="trust-icon">✓</span><div><strong>Pago seguro</strong><span>Comprá con total confianza</span></div></div>
    <div class="trust-item"><span class="trust-icon">◉</span><div><strong>Atención personalizada</strong><span>Estamos para ayudarte</span></div></div>
    <div class="trust-item"><span class="trust-icon">↺</span><div><strong>Cambios y devoluciones</strong><span>Tu compra siempre respaldada</span></div></div>
    <div class="trust-item"><span class="trust-icon">✦</span><div><strong>Envío a todo Paraguay</strong><span>Recibí tus compras donde estés</span></div></div>
    <div class="trust-item"><span class="trust-icon">✓</span><div><strong>Pago seguro</strong><span>Comprá con total confianza</span></div></div>
    <div class="trust-item"><span class="trust-icon">◉</span><div><strong>Atención personalizada</strong><span>Estamos para ayudarte</span></div></div>
    <div class="trust-item"><span class="trust-icon">↺</span><div><strong>Cambios y devoluciones</strong><span>Tu compra siempre respaldada</span></div></div>
  </div>
</div>

${HEADER_HTML.replace('__LINKS__', `<a class="active" href="#inicio">Inicio</a>
      <a href="#ofertas">Ofertas</a>
      <a href="#mas-vendidos">Más vendidos</a>
      <a href="#novedades">Novedades</a>
      <a href="#colecciones">Colecciones</a>
      <a href="#preguntas">Ayuda</a>`)}

<main class="storefront" data-gesicomm-base="catalogo">
  <div class="page-content">
    <section id="inicio" class="hero">
      <div class="hero-shell">
        <div class="hero-banners" data-gesicomm-lista="banners_inicio"><template><article class="hero-banner"><img data-gesicomm-bind="imagen" alt="" loading="lazy"><video data-gesicomm-bind="video" muted autoplay loop playsinline preload="metadata"></video><div class="hero-text"><p class="eyebrow" data-gesicomm-bind="etiqueta"></p><h2 data-gesicomm-bind="titulo"></h2><p data-gesicomm-bind="subtitulo"></p><a class="button-primary" data-gesicomm-bind="enlace"><span data-gesicomm-bind="cta_texto"></span> <span aria-hidden="true">→</span></a></div></article></template></div>
        <button class="slider-arrow left" type="button" data-gesicomm-banner-anterior aria-label="Banner anterior">‹</button><button class="slider-arrow right" type="button" data-gesicomm-banner-siguiente aria-label="Banner siguiente">›</button><div class="hero-dots" data-gesicomm-slider aria-label="Elegir banner"></div>
      </div>
    </section>

    <section id="categorias" class="category-strip" data-gesicomm-lista="menu_categorias"><div class="container"><div class="section-heading"><h2>Categorías</h2></div><div class="category-grid" data-gesicomm-lista="menu_categorias" data-gesicomm-limite="8"><template><button class="category-card" type="button"><span class="category-media"><img data-gesicomm-bind="imagen" alt="" loading="lazy"></span><strong data-gesicomm-bind="nombre"></strong><small data-gesicomm-bind="cantidad_texto"></small></button></template></div></div></section>

    <section id="destacados" class="section"><div class="section-heading"><div><h2>✦ Productos destacados</h2><p>Los favoritos de nuestros clientes</p></div><a href="#productos">Ver todos →</a></div><div class="spotlight-grid" data-gesicomm-lista="productos_destacados" data-gesicomm-limite="4"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div></section>

    <section id="banner-promocional" class="mid-banner-section" data-gesicomm-lista="banners_intermedios">
      <template>
        <article class="mid-banner">
          <img data-gesicomm-bind="imagen" alt="" loading="lazy">
          <video data-gesicomm-bind="video" muted autoplay loop playsinline preload="metadata"></video>
          <div class="mid-banner-copy">
            <p class="eyebrow" data-gesicomm-bind="etiqueta"></p>
            <h2 data-gesicomm-bind="titulo"></h2>
            <p data-gesicomm-bind="subtitulo"></p>
            <a class="button-secondary" data-gesicomm-bind="enlace"><span data-gesicomm-bind="cta_texto"></span> <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </template>
    </section>

    <div class="dynamic-sections" data-gesicomm-lista="secciones_inicio"><template><section class="section dynamic-section"><div class="dynamic-head"><div><p class="eyebrow" data-gesicomm-bind="tipo_label"></p><h2 data-gesicomm-bind="titulo"></h2><p data-gesicomm-bind="subtitulo"></p></div><a href="#productos">Ver todos →</a></div><div class="spotlight-grid" data-gesicomm-lista="productos_seccion"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section></template></div>

    <section id="mas-vendidos" class="section"><div class="section-heading"><div><h2>🔥 Más vendidos</h2><p>Los productos que más eligen nuestros clientes</p></div></div><div class="compact-grid" data-gesicomm-lista="productos_manual"><template><article class="product-card"><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section>

    ${LIMITED_OFFER_HTML}

    <section id="ofertas-catalogo" class="section offers-catalog-section" data-gesicomm-lista="productos_ofertas"><div class="section-heading"><div><h2>Ofertas disponibles</h2><p>Todos los productos con precio especial</p></div><a href="#productos">Ver catálogo →</a></div><div class="product-grid" data-gesicomm-lista="productos_ofertas"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="descuento"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div></section>

    <section id="colecciones" class="section"><div class="section-heading"><div><h2>✧ Colecciones</h2><p>Elegí tu estilo, encontrá tus favoritos</p></div></div><div class="collection-grid" data-gesicomm-lista="categorias" data-gesicomm-limite="4"><template><a class="collection-card" href="#productos" data-gesicomm-bind="imagen"><h3 data-gesicomm-bind="nombre"></h3><p>Explorar →</p></a></template></div></section>

    <section id="novedades" class="section"><div class="section-heading"><div><h2>Novedades</h2><p>Los últimos productos en llegar</p></div></div><div class="product-grid" data-gesicomm-lista="productos_novedades" data-gesicomm-limite="4"><template><article class="product-card"><div class="product-badge">Nuevo</div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section>

    <section id="combos" class="section combos-section" data-gesicomm-lista="combos"><div class="section-heading"><div><h2>▣ Combos y packs</h2><p>Más ahorro cuando comprás en conjunto</p></div></div><div class="product-grid" data-gesicomm-lista="combos"><template><article class="product-card"><div class="product-badge">Ahorrá más</div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description">Incluye: <span data-gesicomm-bind="incluye"></span></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar combo</button></div></div></article></template></div></section>

    <section id="productos" class="section products-section"><div class="product-toolbar"><div class="section-heading"><div><h2>Todos los productos</h2><p>Explorá el catálogo completo</p></div></div><div class="product-count" data-gesicomm-total></div></div><div class="catalog-toolbar"><input class="catalog-search" type="search" placeholder="Buscar productos" aria-label="Buscar productos" data-gesicomm-buscar><select class="catalog-select" aria-label="Categoría" data-gesicomm-filtro="categoria"><option value="">Todas las categorías</option></select><select class="catalog-select" aria-label="Ordenar" data-gesicomm-filtro="orden"><option value="">Destacados</option><option value="min-max">Menor precio</option><option value="max-min">Mayor precio</option><option value="az">A → Z</option></select></div><div class="product-grid" data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div><p class="catalog-state" data-gesicomm-cargando style="display:none">Cargando productos...</p><p class="catalog-state" data-gesicomm-sin-resultados style="display:none">No encontramos productos con esa búsqueda.</p><nav class="pagination" aria-label="Páginas del catálogo"><button class="button-secondary" type="button" data-gesicomm-pagina="anterior">Anterior</button><span data-gesicomm-paginacion></span><button class="button-secondary" type="button" data-gesicomm-pagina="siguiente">Siguiente</button></nav></section>

    <section id="preguntas" class="section faq-section"><div class="section-heading"><div><h2>Preguntas frecuentes</h2><p>Resolvemos tus dudas más comunes</p></div></div><div class="faq-list"><div class="faq-item is-open"><button class="faq-question" type="button" aria-expanded="true"><span>¿Cuánto tarda en llegar mi pedido?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Los envíos se realizan según la cobertura de la tienda. Vas a ver las condiciones antes de confirmar.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Qué medios de pago aceptan?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Podés pagar con los medios habilitados por la tienda y consultar disponibilidad de pago al recibir.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Qué hago si recibo un producto con problemas?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Escribinos por WhatsApp para recibir asistencia sobre cambios o devoluciones.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Los productos tienen garantía?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Consultá las condiciones del producto o escribinos antes de comprar.</p></div></div></div></div></section>

    <section id="contacto" class="section contact-section"><div class="contact-layout"><div><h2>¿Querés ayuda para elegir?</h2><p>Escribinos por WhatsApp o dejá tu consulta.</p><div class="contact-list"><button class="contact-link" type="button" data-gesicomm-whatsapp="Hola! Tengo una consulta">Escribinos por WhatsApp</button><span>Email: <span data-gesicomm-tienda="email"></span></span><span>Dirección: <span data-gesicomm-tienda="direccion"></span></span></div></div><form class="contact-form" data-gesicomm-form="contacto"><div class="form-grid"><div class="field"><label for="nombre">Nombre</label><input id="nombre" name="nombre" type="text" required></div><div class="field"><label for="telefono">Celular</label><input id="telefono" name="telefono" type="tel" required></div><div class="field full"><label for="mensaje">Consulta</label><textarea id="mensaje" name="mensaje" required></textarea></div></div><button class="button-primary" type="submit">Enviar consulta →</button><div class="form-feedback" data-gesicomm-form-ok style="display:none">Gracias. Te abrimos WhatsApp para que nos mandes la consulta.</div></form></div></section>
  </div>
</main>

${FOOTER_HTML}`;

// ─── FICHA DE PRODUCTO ───────────────────────────────────────────────────

const PRODUCTO_CSS = `${TOKENS_CSS}

.commerce-header { position: sticky; top: 0; z-index: 50; background: var(--white); border-bottom: 1px solid var(--line); box-shadow: 0 8px 22px rgba(8, 41, 71, .05); }
.commerce-header .header-main { min-height: 76px; display: flex; align-items: center; gap: 28px; }
.commerce-header .brand, .commerce-header .brand.brand-mark { display: inline-flex; align-items: center; gap: 9px; min-width: max-content; color: var(--ink); font-size: 1.16rem; font-weight: 900; text-decoration: none; letter-spacing: -.03em; background: transparent !important; border: none !important; box-shadow: none !important; }
.commerce-header .brand-logo { width: 32px; height: 32px; object-fit: contain; }
.commerce-header .brand-logo[src=""], .commerce-header .brand-logo:not([src]) { display: none; }
.commerce-header .brand.brand-mark::before, .commerce-header .brand::before { display: none !important; }
.commerce-header .brand.brand-mark:has(.brand-logo[src]:not([src=""]))::before { display: none; }
.commerce-header .search-box { flex: 1 1 360px; max-width: 620px; display: flex; min-height: 42px; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 10px; }
.commerce-header .search-box input { min-width: 0; flex: 1; padding: 0 14px; color: var(--ink); background: transparent; border: 0; outline: 0; font-size: .86rem; }
.commerce-header .search-box button { width: 50px; color: var(--gc-texto-sobre-primario); background: var(--brand); border: 0; font-size: 1.1rem; font-weight: 900; }
.commerce-header .header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.commerce-header .cart-button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 12px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: .84rem; }
.commerce-header .cart-button:hover { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.commerce-header .menu-toggle { display: none; width: 40px; height: 40px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
.commerce-header .main-nav { min-height: 44px; display: flex; align-items: center; gap: 26px; border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent); }
.commerce-header .main-nav a { color: var(--ink-soft); text-decoration: none; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.commerce-header .main-nav a:hover, .commerce-header .main-nav a.active { color: var(--brand-dark); }
.commerce-header .category-menu { display: inline-flex; align-items: center; gap: 7px; color: var(--ink) !important; }
.commerce-header .nav-links { position: static; display: flex; flex-direction: row; gap: 28px; padding: 0; background: transparent; border: 0; box-shadow: none; }

.breadcrumb { display: flex; flex-wrap: wrap; gap: 8px; padding: 22px 0 0; color: var(--ink-soft); font-size: .82rem; }
.breadcrumb a { color: var(--brand-dark); font-weight: 700; cursor: pointer; }

.pdp { display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; padding: 32px 0 80px; align-items: start; }
.gallery { position: sticky; top: 100px; display: grid; gap: 14px; }
.gallery-main { display: grid; place-items: center; aspect-ratio: 1; padding: 28px; background: transparent; border-radius: var(--radius-lg); }
.gallery-main img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: normal; }
.thumbs { display: flex; gap: 10px; overflow-x: auto; }
.thumb { flex: 0 0 76px; height: 76px; padding: 6px; background: transparent; border: 2px solid transparent; border-radius: 14px; cursor: pointer; }
.thumb:hover { border-color: var(--brand); }
.thumb img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: normal; }

.pdp-info h1 { margin-bottom: 14px; font-size: clamp(2rem, 3.4vw, 3rem); line-height: 1.02; letter-spacing: -.06em; }
.pdp-prices { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 18px; }
.pdp-prices .price { font-size: 2rem; }
.pdp-lead { margin-bottom: 26px; color: var(--ink-soft); font-size: 1.02rem; }

.block-title { margin-bottom: 10px; font-size: .8rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
.variants { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.variant { min-height: 44px; padding: 0 16px; color: var(--ink); background: var(--white); border: 1.5px solid var(--line); border-radius: 12px; font-weight: 700; }
.variant.is-selected { color: var(--brand-dark); background: var(--brand-soft); border-color: var(--brand); }
.variant[data-agotado] { opacity: .45; text-decoration: line-through; }

.buy-row { display: flex; gap: 12px; margin-bottom: 14px; }
.qty { width: 92px; color: color: var(--gc-texto) !important; min-height: 52px; padding: 0 12px; text-align: center; background: var(--white); border: 1.5px solid var(--line); border-radius: 999px; font-weight: 800; }
.buy-row .button-primary { flex: 1; min-height: 52px; font-size: 1rem; }
.buy-secondary { display: flex; gap: 10px; margin-bottom: 26px; }
.buy-secondary .button-secondary { flex: 1; }
/* Caminos secundarios más livianos: el primario es "Comprar ahora" con el
   total, y el bump no tiene que competir con tres botones iguales. */
.pdp .buy-secondary .button-secondary { min-height: 40px; background: transparent; border-color: transparent; color: var(--ink-soft); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.pdp .buy-secondary .button-secondary:hover { color: var(--ink); }

 .offers { display: grid; gap: 12px; margin-bottom: 26px; }
/* Order bump moderno: mini oferta clickeable, no formulario amarillo. */
.bumps { display: grid; gap: 12px; margin-bottom: 12px; }
.bump {
  display: block; overflow: hidden; position: relative; cursor: pointer;
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, transparent), transparent 62%), var(--white);
  border: 1.5px solid color-mix(in srgb, var(--brand) 38%, var(--line));
  border-radius: 14px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, .08);
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.bump:hover { border-color: var(--brand); transform: translateY(-1px); box-shadow: 0 18px 34px rgba(15, 23, 42, .12); }
.bump:has(.bump-check:focus-visible) { outline: 3px solid var(--brand-soft); outline-offset: 2px; }
.bump.is-checked, .bump:has(.bump-check:checked) { border-color: var(--brand); background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, transparent), transparent 62%), var(--white); }
.bump-check { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.bump-flag {
  display: flex; align-items: center; gap: 7px; padding: 8px 14px;
  color: var(--brand); background: color-mix(in srgb, var(--brand) 14%, var(--white));
  font-size: .72rem; font-weight: 900; letter-spacing: .05em; line-height: 1.2; text-transform: uppercase;
}
.bump-flag-on { display: none; }
.bump.is-checked .bump-flag, .bump:has(.bump-check:checked) .bump-flag { color: var(--gc-texto-sobre-primario); background: var(--brand); }
.bump.is-checked .bump-flag-off, .bump:has(.bump-check:checked) .bump-flag-off { display: none; }
.bump.is-checked .bump-flag-on, .bump:has(.bump-check:checked) .bump-flag-on { display: inline; }
.bump-body { display: grid; grid-template-columns: 28px 68px minmax(0, 1fr); gap: 12px; align-items: center; padding: 14px; }
.bump-control {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 2px solid color-mix(in srgb, var(--brand) 64%, var(--line));
  border-radius: 999px; color: var(--brand); background: color-mix(in srgb, var(--brand) 10%, var(--white));
  font-size: 0; font-weight: 950; line-height: 1;
}
.bump-control::before { content: "+"; font-size: 1.05rem; }
.bump.is-checked .bump-control, .bump:has(.bump-check:checked) .bump-control { border-color: var(--brand); background: var(--brand); color: var(--white); }
.bump.is-checked .bump-control::before, .bump:has(.bump-check:checked) .bump-control::before { content: "✓"; font-size: .85rem; }
.bump-img { width: 68px; aspect-ratio: 1 / 1; object-fit: contain; background: var(--white); border: 1px solid rgba(15, 23, 42, .08); border-radius: 10px; }
.bump-copy { display: grid; gap: 4px; min-width: 0; }
.bump-sub { color: var(--brand); font-size: .76rem; font-weight: 900; }
.bump-title { color: var(--ink); font-weight: 850; line-height: 1.22; }
.bump-prices { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.bump-prices b { color: var(--ink); font-size: 1.05rem; font-weight: 950; }
.bump-prices s { color: var(--ink-soft); font-size: .85rem; }
.bump-prices em, .offer-save { color: #b42318; font-size: .82rem; font-style: normal; font-weight: 800; }
.bump-action {
  grid-column: 1 / -1; padding: 10px 14px; color: var(--gc-texto-sobre-primario); background: var(--brand);
  border-radius: 999px; font-size: .8rem; font-weight: 900; text-align: center; white-space: nowrap;
}
.bump.is-checked .bump-action, .bump:has(.bump-check:checked) .bump-action { color: var(--gc-texto-sobre-primario); background: color-mix(in srgb, var(--brand) 78%, #0f172a); border: 1px solid color-mix(in srgb, var(--brand) 72%, transparent); }
.bump-action-on { display: none; }
.bump.is-checked .bump-action-off, .bump:has(.bump-check:checked) .bump-action-off { display: none; }
.bump.is-checked .bump-action-on, .bump:has(.bump-check:checked) .bump-action-on { display: inline; }
.bump-incluye { display: none; margin: -2px 2px 14px; color: var(--ink-soft); font-size: .85rem; }
.bumps:has(.bump-check:checked) + .bump-incluye { display: block; }
.upsell { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding: 14px; background: var(--white); border: 1px solid var(--line); border-radius: 16px; }
.upsell img { flex: 0 0 64px; width: 64px; height: 64px; object-fit: contain; background: #f3f2ee; border-radius: 12px; }
.upsell > div { flex: 1 1 160px; min-width: 0; }
.upsell h4 { margin: 0 0 2px; font-size: .95rem; }
.upsell p { margin: 0 0 4px; color: var(--ink-soft); font-size: .8rem; }
.upsell .price, .offer .price { font-size: 1rem; }
.upsell .button-primary { min-height: 40px; padding: 0 16px; font-size: .85rem; }
.offer { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding: 14px; background: var(--white); border: 1.5px solid var(--line); border-radius: 16px; }
/* Flex y no grid: si la oferta no tiene imagen (el runtime oculta el <img>),
   el texto ocupa ese lugar en vez de quedar encajonado en la columna de la foto. */
.offer img { flex: 0 0 64px; width: 64px; height: 64px; object-fit: contain; background: #fff; border-radius: 12px; }
.offer > div { flex: 1 1 160px; min-width: 0; }
.offer h4 { margin: 0 0 2px; font-size: .95rem; }
.offer p { margin: 0; color: var(--ink-soft); font-size: .8rem; }
.offer .price { font-size: 1rem; }
.offer .button-primary { min-height: 38px; padding: 0 14px; font-size: .8rem; }

.mini-trust { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mini-trust div { padding: 12px; background: var(--white); border: 1px solid var(--line); border-radius: 14px; font-size: .78rem; color: var(--ink-soft); }
.mini-trust strong { display: block; color: var(--ink); font-size: .84rem; }

.description { padding: 70px 0; background: var(--white); }
.description-body { max-width: 760px; color: var(--ink-soft); font-size: 1.02rem; line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere; }

.related { padding: 80px 0; }

/* ─── Paquetes por cantidad ─────────────────────────────────────────── */
.paquetes { margin: 26px 0 20px; }
.paquetes-cabeza { margin-bottom: 16px; }
.paquetes-titulo { margin: 0; font-size: 1.15rem; letter-spacing: -.02em; }
.paquetes-sub { margin: 4px 0 0; color: var(--ink-soft); font-size: .92rem; }
.paquetes-lista { display: grid; gap: 14px; }
.paquete {
  position: relative; display: grid; grid-template-columns: 22px 64px minmax(0, 1fr); gap: 14px; align-items: center; width: 100%;
  padding: 16px 18px; text-align: left; color: var(--ink); background: var(--white);
  border: 1.5px solid var(--line); border-radius: 16px; cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.paquete:hover { border-color: color-mix(in srgb, var(--brand) 55%, var(--line)); }
.paquete:focus-visible { outline: 3px solid color-mix(in srgb, var(--brand) 45%, transparent); outline-offset: 2px; }
/* El elegido tiene que saltar a la vista, no solo cambiar el borde. */
.paquete.is-selected {
  border: 2px solid var(--brand); background: color-mix(in srgb, var(--brand) 18%, var(--white));
  box-shadow: 0 12px 30px color-mix(in srgb, var(--brand) 22%, transparent);
}
.paquete-radio { width: 22px; height: 22px; border: 2px solid color-mix(in srgb, var(--ink) 35%, transparent); border-radius: 50%; }
.paquete.is-selected .paquete-radio { border-color: var(--brand); background: radial-gradient(circle, var(--gc-texto-sobre-primario) 0 28%, var(--brand) 32%); }
.paquete-foto { position: relative; display: grid; place-items: center; width: 64px; height: 64px; background: #f3f2ee; border-radius: 12px; }
.paquete-foto img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; border-radius: 12px; }
.paquete-x {
  position: absolute; right: -6px; bottom: -6px; min-width: 26px; padding: 2px 6px; text-align: center;
  color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 999px; font-size: .72rem; font-weight: 900;
}
.paquete-info { display: grid; gap: 3px; min-width: 0; }
.paquete-titulo { font-size: 1.02rem; font-weight: 850; }
.paquete-precio { font-size: 1.35rem; font-weight: 900; letter-spacing: -.02em; line-height: 1.1; }
.paquete-unidad { color: var(--ink); font-size: .9rem; font-weight: 700; }
.paquete-ahorro { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--brand-dark); font-size: .9rem; font-weight: 850; }
.paquete-ahorro:empty { display: none; }
.paquete-ahorro em {
  padding: 2px 8px; color: var(--tienda-texto-sobre-secundario, #10202f); background: var(--accent); border-radius: 999px;
  font-size: .72rem; font-style: normal; font-weight: 900;
}
.paquete-antes { margin-top: 4px; color: var(--ink-soft); font-size: .78rem; opacity: .8; }
.paquete-etiqueta {
  position: absolute; top: -11px; right: 16px; padding: 3px 10px;
  color: var(--brand-dark); background: var(--white); border: 1.5px solid var(--brand);
  border-radius: 999px; font-size: .7rem; font-weight: 900; letter-spacing: .02em;
}
/* El destacado (y el elegido) llevan la etiqueta llena: es el que se empuja. */
.paquete.is-destacado .paquete-etiqueta, .paquete.is-selected .paquete-etiqueta { color: var(--gc-texto-sobre-primario); background: var(--brand); }
@media (max-width: 520px) {
  .paquete { grid-template-columns: 22px 52px minmax(0, 1fr); padding: 16px 14px; gap: 12px; }
  .paquete-foto { width: 52px; height: 52px; }
}

/* ─── Ficha que vende (estructura de docs/investigación en promptsCodigo) ── */
.pdp-promesa { margin: -4px 0 14px; color: var(--ink); font-size: 1.08rem; font-weight: 650; line-height: 1.45; }
.pdp-separado { margin: -10px 0 16px; color: var(--ink-soft); font-size: .88rem; }
.highlights { display: grid; gap: 8px; margin: 0 0 20px; padding: 0; list-style: none; }
.highlights li { position: relative; padding-left: 28px; color: var(--ink); font-weight: 650; line-height: 1.35; }
.highlights li::before {
  content: "✓"; position: absolute; left: 0; top: 1px; display: grid; place-items: center; width: 20px; height: 20px;
  color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 50%; font-size: .7rem; font-weight: 900;
}
.trae { margin-bottom: 22px; }
.trae-lista { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.trae-lista li { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 650; }
.trae-lista img { width: 44px; height: 44px; object-fit: contain; background: #f3f2ee; border-radius: 10px; }
.trae-lista em { color: var(--ink-soft); font-style: normal; font-weight: 800; }
.mini-trust a { color: var(--brand-dark); font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
.garantias { display: grid; gap: 6px; margin: 14px 0 0; padding: 0; list-style: none; }
.garantias li { padding-left: 22px; position: relative; color: var(--ink-soft); font-size: .88rem; }
.garantias li::before { content: "🛡"; position: absolute; left: 0; font-size: .8rem; }

.beneficios-section { padding: 72px 0; }
.beneficios-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.beneficio { padding: 22px; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-sm); }
.beneficio h3 { margin: 0 0 6px; font-size: 1.05rem; }
.beneficio p { margin: 0; color: var(--ink-soft); font-size: .92rem; }

.incluye-section { padding: 72px 0; }
.incluye-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.incluye-card { display: flex; min-width: 0; gap: 14px; align-items: center; padding: 14px; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-sm); cursor: pointer; }
.incluye-card img { flex-shrink: 0; width: 72px; height: 72px; object-fit: contain; background: #f3f2ee; border-radius: 12px; }
.incluye-card > div { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.incluye-card h3 { margin: 0 0 4px; font-size: .98rem; }
.incluye-card em { color: var(--ink-soft); font-style: normal; }
.incluye-card p { margin: 0; color: var(--ink-soft); font-size: .85rem; }
.incluye-total { margin-top: 18px; font-size: 1.05rem; }

.faq-container { max-width: 820px; }
.faq-lista { display: grid; gap: 10px; }
.faq-item { padding: 16px 18px; background: var(--white); border: 1px solid var(--line); border-radius: 14px; }
.faq-item summary { cursor: pointer; font-weight: 800; color: var(--ink); }
.faq-item p { margin: 10px 0 0; color: var(--ink-soft); }

.cierre { padding: 56px 0; color: var(--gc-texto-sobre-primario); background: var(--brand); }
.cierre-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; }
.cierre h2 { margin: 0 0 6px; color: inherit; font-size: clamp(1.4rem, 2.6vw, 2rem); }
.cierre .price, .cierre .price-old { color: inherit; }
.cierre .button-primary { color: var(--brand); background: var(--gc-texto-sobre-primario); min-height: 52px; padding: 0 28px; }

.sticky-compra { display: none; }

/* ─── Estructura suplemento / bienestar (referencia de alta conversión) ─── */
.dark-section { background: var(--brand-dark); color: var(--gc-texto-sobre-primario); }
.result-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; align-items: center; gap: 70px; padding: 74px 0; }
.result-grid h2, .proof h2 { margin: 0 0 22px; color: inherit; font-size: clamp(2rem, 3.4vw, 3rem); line-height: 1.05; letter-spacing: -.04em; }
.result-grid h2 em, .proof h2 em, .comparison-section h2 em, .why-section h2 em, .ingredients h2 em { color: var(--brand); font-style: normal; }
.dark-section .result-grid h2 em { color: var(--accent); }
.result-grid img { width: 220px; height: 250px; object-fit: contain; justify-self: center; background: color-mix(in srgb, var(--brand) 14%, transparent); border-radius: var(--radius-sm); }
.timeline { display: grid; gap: 0; max-width: 540px; }
.timeline-item { display: flex; gap: 12px; align-items: center; padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.78); font-size: .92rem; }
.timeline-item b { color: inherit; }
.dark-section .timeline-item, .dark-section .timeline-item b { color: rgba(255,255,255,.78) !important; }
.timeline-item span { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; color: var(--brand-dark); background: var(--gc-texto-sobre-primario); font-size: .75rem; font-weight: 900; }
.timeline-item.current { color: var(--gc-texto-sobre-primario); }
.dark-section .timeline-item.current, .dark-section .timeline-item.current b { color: var(--gc-texto-sobre-primario) !important; }
.timeline-item.current span { background: var(--brand); color: var(--gc-texto-sobre-primario); }

.ingredients { padding: 72px 0 86px; }
.ingredient-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 24px 0; }
.ingredient-tabs button { min-height: 38px; padding: 0 18px; color: var(--gc-texto-sobre-primario); background: color-mix(in srgb, var(--brand) 68%, var(--brand-dark)); border: 0; border-radius: 999px; font-size: .78rem; font-weight: 850; }
.ingredient-tabs button.active { background: var(--brand-dark); }
.ingredient-content { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); align-items: center; gap: 54px; max-width: 780px; margin: 0 auto; }
.ingredient-content img { width: 100%; aspect-ratio: 1.25; object-fit: contain; background: #f3f2ee; border-radius: var(--radius-sm); }
.ingredient-content h3 { margin: 0 0 10px; font-size: 1.45rem; }
.ingredient-content p { margin: 0; color: var(--ink-soft); line-height: 1.6; }
.quote { margin-top: 20px; padding: 14px 16px; color: var(--brand-dark); background: var(--brand-soft); border-radius: var(--radius-sm); font-size: .9rem; font-weight: 800; }

.soft-section { background: color-mix(in srgb, var(--brand) 18%, var(--white)); }
.proof { display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: center; gap: 70px; padding: 74px 0; }
.proof > img { width: 100%; aspect-ratio: 1; object-fit: contain; background: var(--white); border-radius: var(--radius-sm); }
.proof > div > p:not(.eyebrow) { color: var(--brand-dark); line-height: 1.6; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 28px; }
.stats > div { padding: 18px; background: rgba(255,255,255,.68); border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent); border-radius: var(--radius-sm); }
.stats b { display: block; color: var(--brand-dark); font-size: 2rem; font-style: italic; line-height: 1; }
.stats span { display: block; margin-top: 6px; color: var(--ink-soft); font-size: .82rem; font-weight: 800; }

.comparison-section { padding: 76px 0 86px; background: color-mix(in srgb, var(--brand) 9%, var(--white)); }
.comparison-grid { display: grid; grid-template-columns: minmax(0, .92fr) minmax(280px, .74fr); align-items: center; gap: 64px; max-width: 930px; margin: 36px auto 0; }
.comparison-copy h3 { margin: 0 0 12px; color: var(--brand-dark); font-size: 1.65rem; }
.comparison-copy p { margin: 0; color: var(--ink-soft); line-height: 1.65; }
.comparison-points { display: grid; gap: 11px; margin-top: 22px; color: var(--ink); font-size: .9rem; font-weight: 800; }
.comparison-points span { display: flex; align-items: center; gap: 8px; }
.comparison-points span::before { content: "✓"; display: grid; place-items: center; width: 20px; height: 20px; color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 50%; font-size: .72rem; font-weight: 900; }
.before-after { position: relative; overflow: hidden; width: min(360px, 100%); margin: 0 auto; aspect-ratio: 1 / 1.18; background: color-mix(in srgb, var(--brand) 16%, var(--white)); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); }
.before-after img { width: 100%; height: 100%; object-fit: cover; }
.before-label, .after-label { position: absolute; top: 15px; padding: 6px 9px; color: var(--gc-texto-sobre-primario); background: var(--brand-dark); border-radius: 4px; font-size: .68rem; font-weight: 900; letter-spacing: .06em; }
.before-label { left: 15px; }
.after-label { right: 15px; }
.comparison-divider { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: var(--white); box-shadow: 0 0 0 1px rgba(15,23,42,.12); }

.why-section { padding: 74px 0 90px; }
.comparison-table { max-width: 800px; margin: 34px auto 0; border-top: 1px solid var(--line); }
.table-head, .table-row { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(110px, 1fr) minmax(110px, 1fr); align-items: center; min-height: 56px; border-bottom: 1px solid var(--line); font-size: .86rem; }
.table-head { color: var(--brand-dark); font-size: .76rem; text-align: center; text-transform: uppercase; letter-spacing: .06em; }
.table-head b:first-child { text-align: left; }
.table-row > * { padding: 13px 16px; }
.table-row strong { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 56px; color: var(--gc-texto-sobre-primario); background: var(--brand-dark); }
.table-row strong::before { content: "✓"; }
.table-row .other { color: var(--ink-soft); text-align: center; }

@media (max-width: 960px) {
  .pdp { grid-template-columns: 1fr; gap: 30px; }
  .gallery { position: static; }
  .result-grid, .ingredient-content, .proof, .comparison-grid { grid-template-columns: 1fr; gap: 32px; }
  .result-grid img, .proof > img { max-width: 260px; justify-self: center; }
}
@media (max-width: 720px) {
  .commerce-header .header-main { min-height: auto; padding-top: 14px; padding-bottom: 14px; gap: 12px; flex-wrap: wrap; }
  .commerce-header .search-box { order: 3; flex-basis: 100%; max-width: none; }
  .commerce-header .menu-toggle { display: grid; place-items: center; }
  .commerce-header .main-nav { overflow-x: auto; gap: 20px; }
  .commerce-header .nav-links { display: none; position: absolute; top: 100%; right: 12px; left: 12px; flex-direction: column; gap: 0; padding: 10px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lg); }
  .commerce-header .nav-links.is-open { display: flex; }
  .commerce-header .nav-links a, .commerce-header .nav-links .nav-cta { justify-content: flex-start; padding: 12px; }
  .sticky-compra {
    position: fixed; right: 0; bottom: 0; left: 0; z-index: 60; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--white); border-top: 1px solid var(--line);
    box-shadow: 0 -10px 30px rgba(15, 23, 42, .12);
  }
  .sticky-compra strong { color: var(--ink); font-size: 1.1rem; }
  .sticky-compra s { color: var(--ink-soft); font-size: .8rem; }
  .sticky-compra .button-primary { min-height: 46px; padding: 0 20px; }
  body { padding-bottom: 76px; }
  .mini-trust { grid-template-columns: 1fr; }
  .offer .button-primary, .offer .button-secondary, .upsell .button-primary { flex: 1 1 100%; }
  .stats { grid-template-columns: 1fr 1fr; }
  .table-head, .table-row { grid-template-columns: 1.35fr .95fr .95fr; font-size: .72rem; }
  .table-row > * { padding: 10px 6px; }
}`;

const PRODUCTO_HTML = `${ANNOUNCEMENT_HTML}

${HEADER_HTML.replace('__LINKS__', `<a href="#" data-gesicomm-inicio>Inicio</a>
      <a href="#descripcion">Detalles</a>
      <a href="#relacionados">Te puede gustar</a>
      <button class="nav-cta" type="button" data-gesicomm-whatsapp>Consultar</button>`)}

<main class="container" data-gesicomm-base="producto">
  <nav class="breadcrumb" aria-label="Estás en">
    <a data-gesicomm-inicio>Inicio</a> <span>/</span>
    <span data-gesicomm-bind="categoria"></span>
  </nav>

  <section class="pdp">
    <div class="gallery">
      <div class="gallery-main"><img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal alt=""></div>
      <!-- Miniaturas: al tocarlas cambian la imagen principal. -->
      <div class="thumbs" data-gesicomm-lista="imagenes">
        <template><button class="thumb" type="button"><img data-gesicomm-bind="imagen" alt=""></button></template>
      </div>
    </div>

    <div class="pdp-info">
      <p class="eyebrow" data-gesicomm-bind="categoria"></p>
      <h1 data-gesicomm-bind="nombre"></h1>
      <!-- Propuesta de valor: el porqué en una frase (Productos → Vista del producto). -->
      <p class="pdp-promesa" data-gesicomm-bind="propuesta_valor"></p>
      <div class="pdp-prices">
        <span class="price" data-gesicomm-bind="precio"></span>
        <span class="price-old" data-gesicomm-bind="precio_antes"></span>
        <!-- % en productos baratos, Gs en caros ("regla del 100"). -->
        <span class="badge-off" data-gesicomm-bind="ahorro_texto"></span>
      </div>
      <!-- Combo: el ancla del ahorro, cuánto costaría por separado. -->
      <p class="pdp-separado" data-gesicomm-si="precio_separado">Por separado: <s data-gesicomm-bind="precio_separado"></s></p>

      <div class="limited-offer pdp-limited-offer" data-gesicomm-countdown>
        <div class="limited-offer-card">
          <div>
            <p class="limited-offer-kicker">Oferta por tiempo limitado</p>
            <h2>Reservá esta condición antes de que termine.</h2>
            <p>La fecha real se configura en Gesicomm; el contador se actualiza solo.</p>
          </div>
          <div class="countdown" aria-label="Cuenta regresiva de la oferta">
            <span class="countdown-box"><b data-gesicomm-countdown-parte="horas">--</b><small>horas</small></span>
            <span class="countdown-box"><b data-gesicomm-countdown-parte="minutos">--</b><small>min</small></span>
            <span class="countdown-box"><b data-gesicomm-countdown-parte="segundos">--</b><small>seg</small></span>
          </div>
        </div>
      </div>

      <!-- Highlights arriba del pliegue: 3–4 motivos, se escanean de un vistazo. -->
      <ul class="highlights" data-gesicomm-lista="beneficios" data-gesicomm-limite="4">
        <template><li data-gesicomm-bind="titulo"></li></template>
      </ul>
      <p class="pdp-lead" data-gesicomm-bind="descripcion"></p>

      <!-- Combo: qué trae, con foto. -->
      <div class="trae" data-gesicomm-lista="combo_incluye">
        <div class="block-title">Qué trae este combo</div>
        <ul class="trae-lista">
          <template>
            <li><img data-gesicomm-bind="imagen" alt=""><span data-gesicomm-bind="nombre"></span> <em data-gesicomm-bind="cantidad"></em></li>
          </template>
        </ul>
      </div>

      <!-- Talles / colores. Si el producto no tiene, el bloque se oculta. -->
      <div data-gesicomm-lista="variantes">
        <div class="block-title">Elegí una opción</div>
        <div class="variants">
          <template><button class="variant" type="button" data-gesicomm-bind="nombre"></button></template>
        </div>
      </div>

      <!-- Order bump: una casilla ARRIBA del botón de compra. Marcada, la
           oferta se suma sola al tocar "Comprar ahora". -->
      <div class="bumps" data-gesicomm-lista="ofertas_bump">
        <template>
          <!-- Toda la tarjeta es la casilla (label): se marca tocando en
               cualquier parte. El estado marcado cambia encabezado y control. -->
          <label class="bump">
            <input class="bump-check" type="checkbox" data-gesicomm-bump>
            <span class="bump-flag">
              <span class="bump-flag-off">Oferta exclusiva · <span data-gesicomm-bind="ahorro"></span></span>
              <span class="bump-flag-on">✓ Oferta agregada a tu pedido</span>
            </span>
            <span class="bump-body">
              <span class="bump-control" aria-hidden="true"></span>
              <img class="bump-img" data-gesicomm-bind="imagen" alt="">
              <span class="bump-copy">
                <span class="bump-sub">Sumalo a tu pedido por solo <b data-gesicomm-bind="precio"></b></span>
                <span class="bump-title" data-gesicomm-bind="nombre"></span>
                <span class="bump-prices">
                  <b data-gesicomm-bind="precio"></b>
                  <s data-gesicomm-bind="precio_antes"></s>
                </span>
              </span>
              <span class="bump-action">
                <span class="bump-action-off">Agregar a mi pedido</span>
                <span class="bump-action-on">Quitar de mi pedido</span>
              </span>
            </span>
          </label>
        </template>
      </div>
      <p class="bump-incluye">Tu compra incluye <span data-gesicomm-bind="nombre"></span> + la oferta seleccionada.</p>

      <!-- Paquetes por cantidad: elegir el paquete ES elegir cuántos. Tarjeta
           entera clickeable; el botón de compra muestra el total elegido. -->
      <div class="paquetes" data-gesicomm-lista="paquetes">
        <div class="paquetes-cabeza">
          <h2 class="paquetes-titulo">Elegí tu oferta</h2>
          <p class="paquetes-sub">Mientras más llevás, menos pagás por unidad.</p>
        </div>
        <div class="paquetes-lista" role="radiogroup" aria-label="Elegí tu oferta">
          <template>
            <button class="paquete" type="button">
              <!-- Etiqueta editable en Configurar venta ("Más elegido", "Mayor ahorro"…). -->
              <span class="paquete-etiqueta" data-gesicomm-bind="etiqueta"></span>
              <span class="paquete-radio" aria-hidden="true"></span>
              <span class="paquete-foto" aria-hidden="true">
                <img data-gesicomm-bind="imagen" alt="">
                <span class="paquete-x" data-gesicomm-bind="unidades_texto"></span>
              </span>
              <span class="paquete-info">
                <span class="paquete-titulo" data-gesicomm-bind="titulo"></span>
                <span class="paquete-precio" data-gesicomm-bind="precio"></span>
                <span class="paquete-unidad" data-gesicomm-bind="por_unidad"></span>
                <span class="paquete-ahorro"><span data-gesicomm-bind="ahorro"></span><em data-gesicomm-bind="ahorro_pct"></em></span>
                <s class="paquete-antes" data-gesicomm-bind="precio_antes"></s>
              </span>
            </button>
          </template>
        </div>
      </div>

      <div class="buy-row">
        <!-- Con paquetes, la cantidad la da el paquete elegido. -->
        <input class="qty" type="number" min="1" max="99" value="1" aria-label="Cantidad" data-gesicomm-cantidad-input data-gesicomm-sin="tiene_paquetes">
        <button class="button-primary" type="button" data-gesicomm-comprar><span data-gesicomm-cta>Comprar ahora</span> · <span data-gesicomm-total></span></button>
      </div>
      <div class="buy-secondary">
        <button class="button-secondary" type="button" data-gesicomm-agregar>Agregar al carrito</button>
        <button class="button-secondary" type="button" data-gesicomm-whatsapp>Consultar por WhatsApp</button>
      </div>

      <!-- Junto al botón, lo que se busca antes de comprar: envío, pago y
           cambios (Baymard: 64% busca el envío y 60% la política de
           devolución en la ficha). -->
      <div class="mini-trust">
        <div><strong>Envío</strong>El costo lo ves antes de pagar</div>
        <div><strong>Pago seguro</strong>PagoPar o al recibir</div>
        <div><strong>Cambios</strong><a href="#" data-gesicomm-link="reembolsos">Ver la política</a></div>
      </div>
      <!-- Garantías que cargó el comercio (solo datos reales). -->
      <ul class="garantias" data-gesicomm-lista="confianza">
        <template><li data-gesicomm-bind="texto"></li></template>
      </ul>
    </div>
  </section>
</main>

<!-- Combos que traen este producto. Si no hay, la sección se oculta sola. -->
<section id="combos-producto" class="section combos-section" data-gesicomm-lista="combos_producto">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Combos</p><h2>Llevalo en combo y ahorrá.</h2></div>
    <div class="product-grid" data-gesicomm-lista="combos_producto">
      <template>
        <article class="product-card">
          <div class="product-badge">Combo</div>
          <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
          <div class="product-content">
            <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <p class="combo-includes">Incluye: <span data-gesicomm-bind="incluye"></span></p>
            <div class="product-footer">
              <div class="product-prices">
                <span class="price-old" data-gesicomm-bind="precio_antes"></span>
                <span class="price" data-gesicomm-bind="precio"></span>
              </div>
              <button class="button-primary" type="button" data-gesicomm-comprar>Quiero el combo</button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</section>

<!-- Beneficios completos: cada motivo con su explicación. -->
<section id="beneficios" class="section beneficios-section" data-gesicomm-lista="beneficios">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Por qué elegirlo</p><h2>Lo que vas a notar.</h2></div>
    <div class="beneficios-grid" data-gesicomm-lista="beneficios">
      <template>
        <article class="beneficio">
          <h3 data-gesicomm-bind="titulo"></h3>
          <p data-gesicomm-bind="texto"></p>
        </article>
      </template>
    </div>
  </div>
</section>

<section id="resultados" class="dark-section" data-template-section="timeline-resultados">
  <div class="container result-grid">
    <div>
      <p class="eyebrow">RESULTADOS REALES</p>
      <h2>Pequeños hábitos.<br><em>Grandes cambios.</em></h2>
      <div class="timeline" aria-label="Progreso esperado">
        <div class="timeline-item current"><span>1</span><b>Primeros días · Menos hinchazón</b></div>
        <div class="timeline-item"><span>2</span><b>2 semanas · Más ligereza</b></div>
        <div class="timeline-item"><span>3</span><b>4 semanas · Rutina más estable</b></div>
        <div class="timeline-item"><span>4</span><b>8 semanas · Un cambio que se nota</b></div>
      </div>
    </div>
    <img data-gesicomm-bind="imagen" alt="">
  </div>
</section>

<section id="ingredientes" class="section ingredients" data-template-section="ingredientes">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow">LO QUE HACE POR VOS</p>
      <h2>Ingredientes con <em>propósito</em></h2>
      <p>Cada ingrediente tiene una función. La IA debe completar esta sección con datos reales del producto o dejarla marcada para editar.</p>
    </div>
    <div class="ingredient-tabs" aria-label="Ingredientes destacados">
      <button type="button" class="active">Ingrediente principal</button>
      <button type="button">Rutina diaria</button>
      <button type="button">Calidad cuidada</button>
    </div>
    <div class="ingredient-content">
      <img data-gesicomm-bind="imagen" alt="">
      <div>
        <h3>Fórmula natural</h3>
        <p data-gesicomm-bind="propuesta_valor"></p>
        <p data-gesicomm-bind="sobre"></p>
        <div class="quote">Hacé de tu bienestar una prioridad.</div>
      </div>
    </div>
  </div>
</section>

<section id="prueba-social" class="soft-section" data-template-section="prueba-social">
  <div class="container proof">
    <div>
      <p class="eyebrow">POR QUÉ ELEGIRNOS</p>
      <h2>Una fórmula que se siente <em>honesta.</em></h2>
      <p>Calidad, transparencia y una experiencia pensada para personas reales.</p>
      <div class="stats" data-gesicomm-lista="estadisticas">
        <template>
          <div><b data-gesicomm-bind="valor"></b><span data-gesicomm-bind="etiqueta"></span></div>
        </template>
      </div>
    </div>
    <img data-gesicomm-bind="imagen" alt="">
  </div>
</section>

<section id="comparacion" class="comparison-section" data-template-section="comparacion">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow">EL CAMBIO QUE TODAS ESTÁN VIENDO</p>
      <h2>Antes y después, <em>sin promesas vacías.</em></h2>
      <p>Historias reales de personas que incorporaron una rutina constante. Si no hay pruebas reales, esta sección debe quedar como guía editable, no como testimonio inventado.</p>
    </div>
    <div class="comparison-grid">
      <div class="comparison-copy">
        <h3>Un proceso que se nota</h3>
        <p>Los resultados pueden variar según cada persona. Lo importante es acompañar tu bienestar con hábitos sostenibles, alimentación equilibrada y constancia.</p>
        <div class="comparison-points">
          <span>Menos hinchazón</span>
          <span>Más ligereza</span>
          <span>Rutina más estable</span>
        </div>
      </div>
      <div class="before-after">
        <img data-gesicomm-bind="imagen" alt="">
        <span class="before-label">ANTES</span>
        <span class="after-label">DESPUÉS</span>
        <div class="comparison-divider"></div>
      </div>
    </div>
  </div>
</section>

<section id="por-que-elegirnos" class="why-section" data-template-section="tabla-comparativa">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow">CALIDAD QUE PODÉS COMPARAR</p>
      <h2>¿Por qué <em>elegirnos?</em></h2>
      <p>No todos los productos son iguales. Mirá la diferencia.</p>
    </div>
    <div class="comparison-table">
      <div class="table-head"><b>Beneficios</b><b>Esta opción</b><b>Otras marcas</b></div>
      <div class="table-row"><span>Fórmula natural</span><strong>Incluido</strong><span class="other">No siempre</span></div>
      <div class="table-row"><span>Ingredientes seleccionados</span><strong>Certificados</strong><span class="other">Variable</span></div>
      <div class="table-row"><span>Bienestar diario</span><strong>Sí</strong><span class="other">Depende</span></div>
      <div class="table-row"><span>Pago al recibir</span><strong>Sí</strong><span class="other">No siempre</span></div>
      <div class="table-row"><span>Atención y seguimiento</span><strong>Sí</strong><span class="other">Variable</span></div>
    </div>
  </div>
</section>

<!-- Combo: el detalle de cada producto, con su precio suelto (se puede
     comprar por separado: el combo es la opción que conviene). -->
<section id="incluye" class="section incluye-section" data-gesicomm-si="combo_incluye">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Qué incluye</p><h2>Todo junto, a mejor precio.</h2></div>
    <div class="incluye-grid" data-gesicomm-lista="combo_incluye">
      <template>
        <article class="incluye-card" data-gesicomm-ver>
          <img data-gesicomm-bind="imagen" alt="" loading="lazy">
          <div>
            <h3><span data-gesicomm-bind="nombre"></span> <em data-gesicomm-bind="cantidad"></em></h3>
            <p>Por separado: <span data-gesicomm-bind="precio"></span></p>
          </div>
        </article>
      </template>
    </div>
    <p class="incluye-total" data-gesicomm-si="precio_separado">Por separado: <s data-gesicomm-bind="precio_separado"></s> · En combo: <b data-gesicomm-bind="precio"></b> <span class="badge-off" data-gesicomm-bind="ahorro_texto"></span></p>
  </div>
</section>

<section id="descripcion" class="description">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Detalles</p><h2>Todo lo que tenés que saber.</h2></div>
    <p class="description-body" data-gesicomm-bind="sobre"></p>
    <p class="description-body" data-gesicomm-bind="descripcion_larga"></p>
  </div>
</section>

<!-- Preguntas frecuentes del producto: responde las dudas que frenan la compra. -->
<section id="preguntas" class="section faq-section" data-gesicomm-lista="preguntas">
  <div class="container faq-container">
    <div class="section-heading"><p class="eyebrow">Preguntas</p><h2>Antes de comprar.</h2></div>
    <div class="faq-lista" data-gesicomm-lista="preguntas">
      <template>
        <details class="faq-item">
          <summary data-gesicomm-bind="pregunta"></summary>
          <p data-gesicomm-bind="respuesta"></p>
        </details>
      </template>
    </div>
  </div>
</section>

<!-- Recomendados: según la configuración de venta de la landing. -->
<section id="relacionados" class="related" data-gesicomm-lista="recomendados">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Te puede gustar</p><h2 data-gesicomm-venta="recomendados_titulo">Te puede gustar</h2></div>
    <div class="product-grid" data-gesicomm-lista="recomendados">
      <template>
        <article class="product-card">
          <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
          <div class="product-content">
            <div class="product-category" data-gesicomm-bind="categoria"></div>
            <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <div class="product-footer">
              <span class="price" data-gesicomm-bind="precio"></span>
              <button class="button-primary" type="button" data-gesicomm-agregar>Agregar</button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</section>

<!-- Cierre: la última pantalla vuelve a ofrecer la compra. -->
<section class="cierre">
  <div class="container cierre-inner">
    <div>
      <h2 data-gesicomm-bind="nombre"></h2>
      <p><span class="price" data-gesicomm-bind="precio"></span> <span class="price-old" data-gesicomm-bind="precio_antes"></span></p>
    </div>
    <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora</button>
  </div>
</section>

<!-- Celular: el botón de compra siempre a mano. -->
<div class="sticky-compra">
  <div><strong data-gesicomm-bind="precio"></strong> <s data-gesicomm-bind="precio_antes"></s></div>
  <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora</button>
</div>

${FOOTER_HTML}`;

// ─── PRODUCTO ESTRELLA ───────────────────────────────────────────────────
// Página de venta larga de UN producto: todo empuja a comprar el principal
// (data-gesicomm-comprar="principal" = el primero de la landing, el que se
// eligió como estrella). El resto de la selección va como complemento.

const ESTRELLA_CSS = `${INICIO_CSS_LEGACY}

.star-hero { padding: 56px 0 72px; background: linear-gradient(180deg, #eef8f3 0%, var(--paper) 100%); }
.star-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; align-items: center; }
.star-media { display: grid; place-items: center; aspect-ratio: 1; padding: 28px; background: #f3f2ee; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.star-media img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
.star-prices { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 18px 0 24px; }
.star-prices .price { font-size: 2.1rem; }
.star-points { display: grid; gap: 10px; margin: 0 0 28px; padding: 0; list-style: none; color: var(--ink-soft); }
.star-points li::before { content: "✓"; margin-right: 10px; color: var(--brand); font-weight: 900; }
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; counter-reset: paso; }
.step { padding: 26px; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-sm); }
.step::before { counter-increment: paso; content: counter(paso); display: grid; width: 34px; height: 34px; margin-bottom: 14px; place-items: center; color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 50%; font-weight: 900; }
.step h3 { margin-bottom: 6px; font-size: 1.05rem; }
.step p { margin: 0; color: var(--ink-soft); font-size: .92rem; }
.star-details { padding: 80px 0; background: var(--white); }
.star-details p { max-width: 760px; color: var(--ink-soft); font-size: 1.02rem; white-space: pre-line; }
.final-offer { padding: 80px 0; text-align: center; background: var(--ink); color: var(--white); }
.final-offer h2 { margin-bottom: 12px; font-size: clamp(2rem, 4vw, 3rem); letter-spacing: -.05em; }
.final-offer .price { color: var(--white); font-size: 2rem; }
.sticky-buy { position: fixed; right: 0; bottom: 0; left: 0; z-index: 60; display: none; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255, 255, 255, .97); border-top: 1px solid var(--line); box-shadow: 0 -10px 30px rgba(16, 32, 47, .1); }
.sticky-buy .button-primary { min-height: 46px; }
@media (max-width: 960px) {
  .star-grid { grid-template-columns: 1fr; gap: 30px; }
  .steps { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .sticky-buy { display: flex; }
  body { padding-bottom: 76px; }
}`;

const ESTRELLA_HTML = `${ANNOUNCEMENT_HTML}

${HEADER_HTML.replace('__LINKS__', `<a href="#detalles">Detalles</a>
      <a href="#como-funciona">Cómo funciona</a>
      <a href="#preguntas">Preguntas</a>
      <button class="nav-cta" type="button" data-gesicomm-comprar="principal">Comprar</button>`)}

<main data-gesicomm-base="producto_unico">
  <!-- Hero: el producto estrella (el primero de la landing). -->
  <section class="star-hero" data-gesicomm-lista="productos" data-gesicomm-limite="1">
    <template>
      <div class="container star-grid">
        <div class="star-media"><img data-gesicomm-bind="imagen" alt=""></div>
        <div>
          <p class="eyebrow" data-gesicomm-bind="categoria"></p>
          <h1 data-gesicomm-bind="nombre"></h1>
          <p class="hero-copy" data-gesicomm-bind="descripcion"></p>
          <div class="star-prices">
            <span class="price" data-gesicomm-bind="precio"></span>
            <span class="price-old" data-gesicomm-bind="precio_antes"></span>
            <span class="badge-off" data-gesicomm-bind="descuento"></span>
          </div>
          <ul class="star-points">
            <li>Pagás online o al recibir</li>
            <li>Ves el costo de envío antes de confirmar</li>
            <li>Te respondemos por WhatsApp</li>
          </ul>
          <div class="hero-actions">
            <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora →</button>
            <button class="button-secondary" type="button" data-gesicomm-whatsapp>Consultar por WhatsApp</button>
          </div>
        </div>
      </div>
    </template>
  </section>

  ${LIMITED_OFFER_HTML}

  <section id="como-funciona" class="section">
    <div class="container">
      <div class="section-heading center">
        <p class="eyebrow">Así de simple</p>
        <h2>Tu pedido en tres pasos.</h2>
      </div>
      <div class="steps">
        <article class="step"><h3>Lo pedís</h3><p>Tocá “Comprar ahora” y completá tus datos de entrega.</p></article>
        <article class="step"><h3>Lo pagás</h3><p>Online con PagoPar o en efectivo al recibir, según tu ciudad.</p></article>
        <article class="step"><h3>Lo recibís</h3><p>Te avisamos por WhatsApp cuando sale tu pedido.</p></article>
      </div>
    </div>
  </section>

  <section id="detalles" class="star-details" data-gesicomm-lista="productos" data-gesicomm-limite="1">
    <template>
      <div class="container">
        <div class="section-heading"><p class="eyebrow">Detalles</p><h2>Todo lo que tenés que saber.</h2></div>
        <p data-gesicomm-bind="descripcion_larga"></p>
      </div>
    </template>
  </section>

  <!-- Complementos: el resto de la selección (se oculta si no hay). -->
  <section class="section" data-gesicomm-lista="recomendados">
    <div class="container">
      <div class="section-heading"><p class="eyebrow">Complementá tu compra</p><h2 data-gesicomm-venta="recomendados_titulo">Te puede gustar</h2></div>
      <div class="product-grid" data-gesicomm-lista="recomendados">
        <template>
          <article class="product-card">
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <div class="product-footer">
                <span class="price" data-gesicomm-bind="precio"></span>
                <button class="button-primary" type="button" data-gesicomm-agregar>Agregar</button>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  <section id="preguntas" class="section faq-section">
    <div class="container">
      <div class="section-heading center"><p class="eyebrow">Preguntas frecuentes</p><h2>Antes de comprar.</h2></div>
      <div class="faq-list">
        <div class="faq-item is-open">
          <button class="faq-question" type="button" aria-expanded="true"><span>¿Cómo pago?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Online con PagoPar (tarjeta, billeteras, transferencia) o en efectivo al recibir, según lo que esté habilitado en tu ciudad.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Cuánto tarda el envío?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Al completar tu pedido ves las ciudades disponibles y el costo de envío antes de confirmar.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Y si tengo un problema con el producto?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Escribinos por WhatsApp y lo resolvemos. Revisá también nuestra política de reembolso.</p></div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="final-offer" data-gesicomm-lista="productos" data-gesicomm-limite="1">
    <template>
      <div class="container">
        <h2>Llevate <span data-gesicomm-bind="nombre"></span></h2>
        <p><span class="price" data-gesicomm-bind="precio"></span></p>
        <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora →</button>
      </div>
    </template>
  </section>
</main>

<!-- En el celular, el botón de compra queda siempre a la vista. -->
<div class="sticky-buy" data-gesicomm-lista="productos" data-gesicomm-limite="1">
  <template>
    <div style="display:contents">
      <span class="price" data-gesicomm-bind="precio"></span>
      <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora</button>
    </div>
  </template>
</div>

${FOOTER_HTML}`;

// ─── COMBOS ───────────────────────────────────────────────────────────────
// Los combos primero, con lo que incluye cada uno y cuánto se ahorra; los
// productos sueltos después, para quien prefiera armarlo.

const COMBOS_HTML = `${ANNOUNCEMENT_HTML}

${HEADER_HTML.replace('__LINKS__', `<a href="#combos">Combos</a>
      <a href="#productos">Productos sueltos</a>
      <a href="#preguntas">Preguntas</a>
      <a class="nav-cta" href="#combos">Ver combos</a>`)}

<main data-gesicomm-base="combos">
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <p class="eyebrow">Combos</p>
        <h1>Todo junto, <em>a mejor precio.</em></h1>
        <p class="hero-copy">Elegimos los productos que mejor combinan y los armamos en packs. Pagás menos que comprándolos por separado.</p>
        <div class="hero-actions">
          <a class="button-primary" href="#combos">Ver combos →</a>
          <a class="button-secondary" href="#productos">Prefiero armarlo yo</a>
        </div>
      </div>
      <!-- El combo destacado: el primero de la landing. -->
      <div data-gesicomm-lista="combos" data-gesicomm-limite="1">
        <template>
          <article class="hero-card" data-gesicomm-ver>
            <div class="hero-image-wrap"><img data-gesicomm-bind="imagen" alt=""></div>
            <div class="hero-card-copy">
              <div class="product-kicker">Combo destacado <span class="badge-off" data-gesicomm-bind="descuento"></span></div>
              <h2 data-gesicomm-bind="nombre"></h2>
              <p class="combo-includes">Incluye: <span data-gesicomm-bind="incluye"></span></p>
              <div class="price-row">
                <span class="price" data-gesicomm-bind="precio"></span>
                <span class="price-old" data-gesicomm-bind="precio_antes"></span>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  ${LIMITED_OFFER_HTML}

  <section id="combos" class="section combos-section">
    <div class="container">
      <div class="section-heading"><p class="eyebrow">Todos los combos</p><h2>Elegí tu pack.</h2></div>
      <div class="product-grid" data-gesicomm-lista="combos" data-gesicomm-si-vacio="mostrar">
        <template>
          <article class="product-card">
            <div class="product-badge" data-gesicomm-bind="descuento"></div>
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <p class="combo-includes">Incluye: <span data-gesicomm-bind="incluye"></span></p>
              <div class="product-footer">
                <div class="product-prices">
                  <span class="price-old" data-gesicomm-bind="precio_antes"></span>
                  <span class="price" data-gesicomm-bind="precio"></span>
                </div>
                <button class="button-primary" type="button" data-gesicomm-comprar>Quiero el combo</button>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  <section id="productos" class="section products-section" data-gesicomm-lista="solo_productos">
    <div class="container">
      <div class="section-heading"><p class="eyebrow">¿Preferís armarlo vos?</p><h2>Productos sueltos.</h2></div>
      <div class="product-grid" data-gesicomm-lista="solo_productos">
        <template>
          <article class="product-card">
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <div class="product-category" data-gesicomm-bind="categoria"></div>
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <div class="product-footer">
                <span class="price" data-gesicomm-bind="precio"></span>
                <button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  <section id="preguntas" class="section faq-section">
    <div class="container">
      <div class="section-heading center"><p class="eyebrow">Preguntas frecuentes</p><h2>Sobre los combos.</h2></div>
      <div class="faq-list">
        <div class="faq-item is-open">
          <button class="faq-question" type="button" aria-expanded="true"><span>¿Puedo cambiar un producto del combo?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Los combos vienen armados. Si querés otra combinación, sumá los productos sueltos al carrito.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Cómo pago?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Online con PagoPar o en efectivo al recibir, según tu ciudad.</p></div></div>
        </div>
      </div>
    </div>
  </section>
</main>

${FOOTER_HTML}`;

export const PLANTILLA_INICIO = { html: INICIO_HTML, css: ESTILOS_INICIO_CODIGO, js: JS_COMUN };
export const PLANTILLA_ESTRELLA = { html: ESTRELLA_HTML, css: ESTRELLA_CSS, js: JS_COMUN };
export const PLANTILLA_COMBOS = { html: COMBOS_HTML, css: INICIO_CSS_LEGACY, js: JS_COMUN };

const TIENDA_VISTA_CSS = `:root{
  --gc-primario: var(--tienda-primario, #143f3a);
  --gc-texto-sobre-primario: var(--tienda-texto-sobre-primario, #ffffff);
  --gc-fondo: var(--tienda-fondo, #f6f7f2);
  --gc-texto: var(--tienda-texto, #10201d);
  --lv-surface: var(--tienda-superficie, #ffffff);
  --lv-line: var(--tienda-linea, #dfe5dc);
  --lv-soft: color-mix(in srgb, var(--gc-primario) 8%, var(--gc-fondo));
  --lv-muted: var(--tienda-texto-suave, #62706b);
  --lv-radius: 8px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--gc-fondo);color:var(--gc-texto);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
a{color:inherit;text-decoration:none}
.lv-shell{min-height:100vh;background:linear-gradient(180deg,var(--lv-soft),var(--gc-fondo) 320px)}
.lv-topbar{background:var(--gc-primario);color:var(--gc-texto-sobre-primario);font-size:13px;font-weight:750}
.lv-topbar-inner{max-width:1180px;margin:0 auto;padding:9px 18px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.lv-header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--gc-fondo) 88%,white);backdrop-filter:blur(12px);border-bottom:1px solid var(--lv-line)}
.lv-header-inner{max-width:1180px;margin:0 auto;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}
.lv-brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:850;letter-spacing:0}
.lv-brand img{width:38px;height:38px;object-fit:contain;border-radius:7px;background:var(--lv-surface);border:1px solid var(--lv-line)}
.lv-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.lv-nav a,.lv-nav button{border:1px solid transparent;background:transparent;color:var(--gc-texto);border-radius:8px;padding:9px 11px;font-size:13px;font-weight:750}
.lv-nav a:hover,.lv-nav button:hover{border-color:var(--lv-line);background:var(--lv-surface)}
.lv-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:8px;background:var(--gc-primario);color:var(--gc-texto-sobre-primario);padding:12px 16px;font-weight:850;box-shadow:0 10px 22px color-mix(in srgb,var(--gc-primario) 22%,transparent);transition:transform .18s ease,box-shadow .18s ease}
.lv-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px color-mix(in srgb,var(--gc-primario) 26%,transparent)}
.lv-secondary{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--lv-line);border-radius:8px;background:var(--lv-surface);color:var(--gc-texto);padding:11px 14px;font-weight:800}
.lv-page{max-width:1180px;margin:0 auto;padding:34px 18px 58px}
.lv-kicker{margin:0 0 8px;color:var(--tienda-destacado,var(--gc-primario));font-size:12px;font-weight:900;text-transform:uppercase}
.lv-title{margin:0;color:var(--gc-texto);font-size:clamp(30px,5vw,54px);line-height:1.02;letter-spacing:0}
.lv-copy{margin:12px 0 0;color:var(--lv-muted);font-size:16px;line-height:1.7;max-width:680px}
.lv-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:end;margin-bottom:24px}
.lv-metrics{display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:10px}
.lv-metric{background:var(--lv-surface);border:1px solid var(--lv-line);border-radius:var(--lv-radius);padding:14px;box-shadow:0 12px 30px rgba(16,32,29,.06)}
.lv-metric strong{display:block;font-size:19px}.lv-metric span{display:block;margin-top:2px;color:var(--lv-muted);font-size:12px;font-weight:700}
.lv-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 180px 180px;gap:10px;margin:20px 0 18px;background:var(--lv-surface);border:1px solid var(--lv-line);border-radius:var(--lv-radius);padding:12px;box-shadow:0 12px 30px rgba(16,32,29,.05)}
.lv-field{display:grid;gap:6px}
.lv-field span{color:var(--lv-muted);font-size:11px;font-weight:850;text-transform:uppercase}
.lv-field input,.lv-field select,.lv-field textarea{width:100%;min-height:43px;border:1px solid var(--lv-line);border-radius:7px;background:#fff;color:var(--gc-texto);padding:10px 12px;outline:none}
.lv-field input:focus,.lv-field select:focus,.lv-field textarea:focus{border-color:var(--gc-primario);box-shadow:0 0 0 3px color-mix(in srgb,var(--gc-primario) 14%,transparent)}
.lv-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.lv-card{background:var(--lv-surface);border:1px solid var(--lv-line);border-radius:var(--lv-radius);overflow:hidden;box-shadow:0 10px 24px rgba(16,32,29,.05);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.lv-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--gc-primario) 34%,var(--lv-line));box-shadow:0 18px 34px rgba(16,32,29,.1)}
.lv-card-media{aspect-ratio:1/1;background:var(--lv-soft);display:grid;place-items:center;cursor:pointer}
.lv-card-media img{width:100%;height:100%;object-fit:cover}
.lv-card-body{padding:13px;display:grid;gap:8px}
.lv-card-category{color:var(--tienda-destacado,var(--gc-primario));font-size:11px;font-weight:900;text-transform:uppercase;min-height:14px}
.lv-card-title{margin:0;color:var(--gc-texto);font-size:15px;line-height:1.25;min-height:38px;cursor:pointer}
.lv-card-price{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lv-card-price strong{font-size:17px}.lv-card-price button{padding:9px 10px;border-radius:7px;font-size:12px}
.lv-empty,.lv-pages{margin-top:22px;text-align:center;color:var(--lv-muted)}
.lv-empty{background:var(--lv-surface);border:1px dashed var(--lv-line);border-radius:var(--lv-radius);padding:28px}
.lv-pages{display:flex;justify-content:center;align-items:center;gap:10px}
.lv-pages button{border:1px solid var(--lv-line);background:var(--lv-surface);border-radius:7px;padding:10px 12px;font-weight:800}
.lv-pages button:disabled{opacity:.45;cursor:not-allowed}
.lv-checkout-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}
.lv-steps{display:flex;align-items:center;gap:8px;color:var(--lv-muted);font-size:12px;font-weight:800;white-space:nowrap}
.lv-dot{width:8px;height:8px;border-radius:99px;background:var(--gc-primario)}
.lv-checkout-grid{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;align-items:start}
.lv-panel{background:var(--lv-surface);border:1px solid var(--lv-line);border-radius:var(--lv-radius);box-shadow:0 16px 38px rgba(16,32,29,.07)}
.lv-form{padding:20px;display:grid;gap:16px}
.lv-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lv-form .lv-wide{grid-column:1/-1}
.lv-form textarea{min-height:86px;resize:vertical}
.lv-message{min-height:18px;margin:0;color:var(--tienda-destacado,var(--gc-primario));font-size:13px;font-weight:750}
.lv-summary{position:sticky;top:86px;padding:18px}
.lv-summary h2{margin:0 0 12px;font-size:22px}
.lv-items{display:grid;gap:10px}
.lv-item{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 0;border-bottom:1px solid var(--lv-line)}
.lv-item img{width:58px;height:58px;object-fit:cover;border-radius:7px;background:var(--lv-soft)}
.lv-item strong{display:block;font-size:13px;line-height:1.25}
.lv-item small,.lv-item span{display:block;color:var(--lv-muted);font-size:12px;margin-top:3px}
.lv-item b{font-size:13px;white-space:nowrap}
.lv-total{display:grid;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--lv-line)}
.lv-total-row{display:flex;align-items:center;justify-content:space-between;gap:14px;color:var(--lv-muted)}
.lv-total-row strong{color:var(--gc-texto);font-size:22px}
.lv-empty-checkout{max-width:620px;margin:42px auto;text-align:center;background:var(--lv-surface);border:1px dashed var(--lv-line);border-radius:var(--lv-radius);padding:34px;box-shadow:0 16px 38px rgba(16,32,29,.06)}
.lv-empty-checkout h1{margin:0;color:var(--gc-texto);font-size:32px}.lv-empty-checkout p{color:var(--lv-muted);line-height:1.6}
.lv-footer{border-top:1px solid var(--lv-line);background:var(--lv-surface);color:var(--lv-muted)}
.lv-footer-inner{max-width:1180px;margin:0 auto;padding:24px 18px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:13px}
.lv-footer nav{display:flex;gap:12px;flex-wrap:wrap}.lv-footer a:hover{color:var(--gc-texto)}
@media(max-width:920px){.lv-hero,.lv-checkout-head{display:grid}.lv-metrics{grid-template-columns:1fr 1fr}.lv-toolbar,.lv-checkout-grid{grid-template-columns:1fr}.lv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lv-summary{position:static}.lv-form-grid{grid-template-columns:1fr}}
@media(max-width:560px){.lv-header-inner{align-items:flex-start}.lv-nav{width:100%;justify-content:flex-start}.lv-grid{grid-template-columns:1fr}.lv-metrics{grid-template-columns:1fr}.lv-title{font-size:34px}.lv-page{padding-top:24px}.lv-topbar-inner{justify-content:flex-start}}
`;

const CATEGORIA_HTML = `<div class="lv-shell">
  <div class="lv-topbar">
    <div class="lv-topbar-inner">
      <span>Pago seguro online o al recibir</span>
      <span>Envio rapido a tu ciudad</span>
      <span>Atencion por WhatsApp</span>
    </div>
  </div>

  <header class="lv-header">
    <div class="lv-header-inner">
      <a class="lv-brand" href="/" data-gesicomm-inicio>
        <img data-gesicomm-tienda="logo" alt="">
        <span data-gesicomm-tienda="nombre">Tienda</span>
      </a>
      <nav class="lv-nav" aria-label="Navegacion">
        <a href="/" data-gesicomm-inicio>Inicio</a>
        <a href="/catalogo" data-gesicomm-link="catalogo">Catalogo</a>
        <a href="/checkout" data-gesicomm-link="checkout">Checkout</a>
        <button type="button" data-gesicomm-carrito>Carrito</button>
      </nav>
    </div>
  </header>

  <main class="lv-page">
    <section class="lv-hero">
      <div>
        <p class="lv-kicker">Categoria</p>
        <h1 class="lv-title" data-gesicomm-categoria="nombre">Categoria</h1>
        <p class="lv-copy">Explora esta seleccion con filtros rapidos, orden por precio y acceso directo al detalle de cada producto.</p>
      </div>
      <div class="lv-metrics" aria-label="Resumen de categoria">
        <div class="lv-metric">
          <strong data-gesicomm-total></strong>
          <span>en esta vista</span>
        </div>
        <div class="lv-metric">
          <strong>Entrega local</strong>
          <span>coordinada por la tienda</span>
        </div>
      </div>
    </section>

    <section class="lv-toolbar" aria-label="Filtros de categoria">
      <label class="lv-field">
        <span>Buscar</span>
        <input type="search" data-gesicomm-buscar placeholder="Producto, marca o palabra clave">
      </label>
      <label class="lv-field">
        <span>Ordenar</span>
        <select data-gesicomm-filtro="orden">
          <option value="">Destacados</option>
          <option value="max-min">Mayor precio</option>
          <option value="min-max">Menor precio</option>
          <option value="az">Nombre A-Z</option>
          <option value="za">Nombre Z-A</option>
        </select>
      </label>
      <label class="lv-field">
        <span>Stock</span>
        <select data-gesicomm-filtro="disponibilidad">
          <option value="todos">Todos</option>
          <option value="en_stock">En stock</option>
          <option value="agotado">Agotados</option>
        </select>
      </label>
    </section>

    <section class="lv-grid" data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar">
      <template>
        <article class="lv-card">
          <div class="lv-card-media" data-gesicomm-ver>
            <img data-gesicomm-bind="imagen" alt="" loading="lazy">
          </div>
          <div class="lv-card-body">
            <div class="lv-card-category" data-gesicomm-bind="categoria"></div>
            <h3 class="lv-card-title" data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <div class="lv-card-price">
              <strong data-gesicomm-bind="precio"></strong>
              <button class="lv-primary" type="button" data-gesicomm-agregar>Agregar</button>
            </div>
          </div>
        </article>
      </template>
    </section>

    <p class="lv-empty" data-gesicomm-sin-resultados style="display:none">No encontramos productos para estos filtros.</p>
    <div class="lv-pages">
      <button type="button" data-gesicomm-pagina="anterior">Anterior</button>
      <span data-gesicomm-paginacion></span>
      <button type="button" data-gesicomm-pagina="siguiente">Siguiente</button>
    </div>
  </main>

  <footer class="lv-footer">
    <div class="lv-footer-inner">
      <strong data-gesicomm-tienda="nombre">Tienda</strong>
      <nav aria-label="Links legales">
        <a href="/contacto" data-gesicomm-link="contacto">Contacto</a>
        <a href="/politica-privacidad" data-gesicomm-link="politica-privacidad">Privacidad</a>
        <a href="/terminos-servicio" data-gesicomm-link="terminos-servicio">Terminos</a>
        <a href="/politica-reembolso" data-gesicomm-link="politica-reembolso">Reembolsos</a>
        <a href="/politica-envio" data-gesicomm-link="politica-envio">Envios</a>
        <a href="/aviso-legal" data-gesicomm-link="aviso-legal">Aviso legal</a>
      </nav>
      <div data-gesicomm-redes></div>
    </div>
  </footer>
</div>`;

const CHECKOUT_HTML = `<div class="lv-shell">
  <div class="lv-topbar">
    <div class="lv-topbar-inner">
      <span>Pedido protegido por Gesicomm</span>
      <span>Pago online o al recibir</span>
      <span>Confirmacion por WhatsApp</span>
    </div>
  </div>

  <header class="lv-header">
    <div class="lv-header-inner">
      <a class="lv-brand" href="/" data-gesicomm-inicio>
        <img data-gesicomm-tienda="logo" alt="">
        <span data-gesicomm-tienda="nombre">Tienda</span>
      </a>
      <nav class="lv-nav" aria-label="Navegacion">
        <a href="/" data-gesicomm-inicio>Inicio</a>
        <a href="/catalogo" data-gesicomm-link="catalogo">Seguir comprando</a>
        <button type="button" data-gesicomm-carrito>Carrito</button>
      </nav>
    </div>
  </header>

  <main class="lv-page">
    <section class="lv-checkout-head" data-gesicomm-checkout-con-items>
      <div>
        <p class="lv-kicker">Checkout</p>
        <h1 class="lv-title">Finaliza tu pedido</h1>
        <p class="lv-copy">Completa tus datos para coordinar entrega, metodo de pago y confirmacion del pedido.</p>
      </div>
      <div class="lv-steps" aria-label="Estado del pedido">
        <span class="lv-dot"></span>
        <span>Carrito</span>
        <span class="lv-dot"></span>
        <span>Datos</span>
        <span class="lv-dot"></span>
        <span>Confirmacion</span>
      </div>
    </section>

    <section class="lv-checkout-grid" data-gesicomm-checkout-con-items>
      <form class="lv-panel lv-form" data-gesicomm-checkout-form>
        <div class="lv-form-grid">
          <label class="lv-field">
            <span>Nombre y apellido</span>
            <input name="nombre_cliente" autocomplete="name" required>
          </label>
          <label class="lv-field">
            <span>Celular</span>
            <input name="telefono" autocomplete="tel" required>
          </label>
          <label class="lv-field">
            <span>Ciudad</span>
            <input name="ciudad" autocomplete="address-level2" required>
          </label>
          <label class="lv-field">
            <span>Documento</span>
            <input name="documento" autocomplete="off">
          </label>
          <label class="lv-field lv-wide">
            <span>Direccion</span>
            <input name="direccion" autocomplete="street-address" required>
          </label>
          <label class="lv-field lv-wide">
            <span>Metodo de pago</span>
            <select name="payment_method">
              <option value="contra_entrega">Pago al recibir</option>
              <option value="pagopar">Pago online con PagoPar</option>
            </select>
          </label>
          <label class="lv-field lv-wide">
            <span>Notas para la tienda</span>
            <textarea name="notas" rows="3" placeholder="Referencia de entrega, horario preferido u otra aclaracion"></textarea>
          </label>
        </div>
        <button class="lv-primary" type="submit">Confirmar pedido - <span data-gesicomm-checkout="total"></span></button>
        <p class="lv-message" data-gesicomm-checkout="mensaje"></p>
      </form>

      <aside class="lv-panel lv-summary">
        <h2>Tu pedido</h2>
        <div class="lv-items" data-gesicomm-lista="checkout_items">
          <template>
            <article class="lv-item">
              <img data-gesicomm-bind="imagen" alt="">
              <div>
                <strong data-gesicomm-bind="nombre"></strong>
                <small data-gesicomm-bind="variante"></small>
                <span><span data-gesicomm-bind="precio_unitario"></span> x <span data-gesicomm-bind="cantidad"></span></span>
              </div>
              <b data-gesicomm-bind="subtotal"></b>
            </article>
          </template>
        </div>
        <div class="lv-total">
          <div class="lv-total-row"><span>Subtotal</span><b data-gesicomm-checkout="subtotal"></b></div>
          <div class="lv-total-row"><span>Items</span><b data-gesicomm-checkout="cantidad"></b></div>
          <div class="lv-total-row"><span>Total</span><strong data-gesicomm-checkout="total"></strong></div>
        </div>
      </aside>
    </section>

    <section class="lv-empty-checkout" data-gesicomm-checkout-vacio>
      <p class="lv-kicker">Carrito vacio</p>
      <h1>Tu pedido todavia no tiene productos</h1>
      <p>Volve al catalogo, elegi lo que queres comprar y despues finaliza el checkout desde esta vista.</p>
      <a class="lv-primary" href="/catalogo" data-gesicomm-link="catalogo">Ver catalogo</a>
    </section>
  </main>

  <footer class="lv-footer">
    <div class="lv-footer-inner">
      <strong data-gesicomm-tienda="nombre">Tienda</strong>
      <nav aria-label="Links legales">
        <a href="/contacto" data-gesicomm-link="contacto">Contacto</a>
        <a href="/politica-privacidad" data-gesicomm-link="politica-privacidad">Privacidad</a>
        <a href="/terminos-servicio" data-gesicomm-link="terminos-servicio">Terminos</a>
        <a href="/politica-reembolso" data-gesicomm-link="politica-reembolso">Reembolsos</a>
        <a href="/politica-envio" data-gesicomm-link="politica-envio">Envios</a>
        <a href="/aviso-legal" data-gesicomm-link="aviso-legal">Aviso legal</a>
      </nav>
      <div data-gesicomm-redes></div>
    </div>
  </footer>
</div>`;

export const PLANTILLA_CATEGORIA = { html: CATEGORIA_HTML, css: TIENDA_VISTA_CSS, js: JS_COMUN };
export const PLANTILLA_CHECKOUT = { html: CHECKOUT_HTML, css: TIENDA_VISTA_CSS, js: JS_COMUN };

/** La página de inicio base de cada formato de venta. */
// Un solo inicio: la tienda. "Combos primero" es orden, no diseño, y
// "Directo en un producto" abre la ficha (PLANTILLA_PRODUCTO). Las bases
// ESTRELLA y COMBOS quedan solo por las landings que ya las guardaron.
// eslint-disable-next-line no-unused-vars
export function plantillaInicioPara(tipo) {
  return PLANTILLA_INICIO;
}

/** De qué formato es la base que tiene este HTML (o null si no es una base). */
export function formatoDeBase(html) {
  const m = String(html || '').match(/data-gesicomm-base="([a-z_]+)"/);
  return m ? m[1] : null;
}

/** Detecta fichas PDP base de Gesicomm guardadas antes de la base nueva. */
export function esFichaProductoBase(html) {
  const texto = String(html || '');
  if (!texto.trim()) return true;
  if (formatoDeBase(texto) === 'producto') return true;
  return texto.includes('data-gesicomm-imagen-principal')
    && texto.includes('data-gesicomm-lista="ofertas_bump"')
    && texto.includes('data-gesicomm-lista="paquetes"')
    && texto.includes('data-gesicomm-comprar')
    || (
      texto.includes('class="commerce-header"')
      && texto.includes('class="pdp"')
      && texto.includes('data-gesicomm-bind="nombre"')
      && texto.includes('data-gesicomm-comprar')
    );
}

// La estructura larga de bienestar es una referencia para suplementos, no una
// ficha universal. La base generica conserva solo la ficha PDP/combos/FAQ.
const PRODUCTO_HTML_GENERICO = PRODUCTO_HTML.replace(
  /\n<section id="resultados"[\s\S]*?(?=\n<!-- Combo: el detalle de cada producto)/,
  '\n'
);

const PRODUCTO_CSS_GENERICO = PRODUCTO_CSS
  .replace(/\/\* ─── Estructura suplemento[\s\S]*?(?=@media \(max-width: 960px\))/u, '')
  .replace(/  \.result-grid, \.ingredient-content, \.proof, \.comparison-grid \{ grid-template-columns: 1fr; gap: 32px; \}\n/g, '')
  .replace(/  \.result-grid img, \.proof > img \{ max-width: 260px; justify-self: center; \}\n/g, '')
  .replace(/  \.stats \{ grid-template-columns: 1fr 1fr; \}\n/g, '')
  .replace(/  \.table-head, \.table-row \{ grid-template-columns: 1\.35fr \.95fr \.95fr; font-size: \.72rem; \}\n/g, '')
  .replace(/  \.table-row > \* \{ padding: 10px 6px; \}\n/g, '');

export const PLANTILLA_PRODUCTO = { html: PRODUCTO_HTML_GENERICO, css: PRODUCTO_CSS_GENERICO, js: JS_COMUN };
export const PLANTILLA_PRODUCTO_SUPLEMENTOS = { html: PRODUCTO_HTML, css: PRODUCTO_CSS, js: JS_COMUN };
