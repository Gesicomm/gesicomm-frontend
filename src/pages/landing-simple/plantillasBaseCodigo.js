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
    <div class="brand-column">
      <a class="brand brand-mark" href="#" data-gesicomm-inicio aria-label="Volver al inicio">
        <img class="brand-logo" data-gesicomm-tienda="logo" alt="">
        <span data-gesicomm-tienda="nombre">Tu tienda</span>
      </a>
      <div class="category-menu-wrap">
        <button class="category-menu" type="button" data-gesicomm-categorias-toggle aria-expanded="false" aria-controls="gesicomm-menu-categorias">☰ Todas las categorías</button>
        <div id="gesicomm-menu-categorias" class="category-menu-panel" data-gesicomm-menu-categorias hidden>
          <p class="category-menu-title">Categorías</p>
          <div class="category-menu-list"></div>
        </div>
      </div>
    </div>

    <nav class="header-nav" aria-label="Navegación comercial">
      <div id="nav-links" class="nav-links">
        __LINKS__
      </div>
    </nav>

    <div class="header-actions">
      <div class="search-wrap">
        <button class="search-toggle" type="button" data-gesicomm-search-toggle aria-expanded="false" aria-controls="gesicomm-search-panel" aria-label="Buscar">⌕</button>
        <form id="gesicomm-search-panel" class="search-box" role="search" hidden>
          <input type="search" placeholder="Buscá productos, marcas y más..." aria-label="Buscar productos" data-gesicomm-buscar>
          <button type="submit" aria-label="Buscar">⌕</button>
        </form>
      </div>
      <button class="cart-button" type="button" data-gesicomm-carrito aria-label="Abrir carrito">
        <span aria-hidden="true">🛒</span>
        <strong>Carrito</strong>
      </button>
      <button class="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
    </div>
  </div>
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

const LIMITED_OFFER_HTML = `<section id="ofertas" class="limited-offer" data-gesicomm-bloque="ofertas_urgencia" data-gesicomm-lista="productos_ofertas" data-gesicomm-countdown data-gesicomm-venta-configurada="urgencia">
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
    <a class="limited-offer-see-all" href="/catalogo?etiqueta=Oferta" data-gesicomm-link="catalogo"><span data-gesicomm-venta="urgencia_cta">Ver todos</span> <span aria-hidden="true">→</span></a>
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
  // Mobile: el hamburguesa abre/cierra TODO el bloque de navegación
  // (categorías + links), que en escritorio va centrado en la misma fila
  // que el logo y el carrito — ver HEADER_HTML.
  const menuToggle = document.querySelector('.menu-toggle');
  const headerNav = document.querySelector('.header-nav');
  menuToggle?.addEventListener('click', () => {
    const abierto = headerNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(abierto));
  });
  headerNav?.querySelectorAll('#nav-links a').forEach((link) => {
    link.addEventListener('click', () => headerNav.classList.remove('is-open'));
  });

  // Buscador del header: ícono que despliega el formulario (ver
  // search-toggle en HEADER_HTML) en vez de ocupar lugar siempre.
  const searchToggle = document.querySelector('[data-gesicomm-search-toggle]');
  const searchBox = document.querySelector('#gesicomm-search-panel');
  searchToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = searchBox.hidden;
    searchBox.hidden = !abrir;
    searchToggle.setAttribute('aria-expanded', String(abrir));
    if (abrir) searchBox.querySelector('input')?.focus();
  });
  document.addEventListener('click', (e) => {
    if (searchBox && !searchBox.hidden && !e.target.closest('.search-wrap')) {
      searchBox.hidden = true;
      searchToggle?.setAttribute('aria-expanded', 'false');
    }
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
.commerce-header .header-main { position: relative; min-height: 76px; display: flex; align-items: center; gap: 28px; }
.commerce-header .brand-column { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; }
.commerce-header .brand-mark { display: inline-flex; align-items: center; gap: 9px; min-width: max-content; color: var(--ink); font-size: 1.16rem; font-weight: 900; text-decoration: none; letter-spacing: -.03em; background: transparent; border: none; box-shadow: none; }
.commerce-header .brand-logo { width: 32px; height: 32px; object-fit: contain; }
.commerce-header .brand-logo[src=""], .commerce-header .brand-logo:not([src]) { display: none; }
.commerce-header .brand-mark::before { display: none !important; }
.commerce-header .brand-mark:has(.brand-logo[src]:not([src=""]))::before { display: none; }
.commerce-header .header-nav { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 22px; }
.header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.search-wrap { position: relative; display: inline-flex; }
.search-toggle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: 1.05rem; }
.search-toggle:hover, .search-toggle[aria-expanded="true"] { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.search-box { position: absolute; top: calc(100% + 10px); right: 0; z-index: 70; width: min(320px, calc(100vw - 36px)); display: flex; min-height: 42px; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 18px 45px rgba(8,41,71,.16); }
.search-box[hidden] { display: none !important; }
.search-box input { min-width: 0; flex: 1; padding: 0 14px; color: var(--ink); background: transparent; border: 0; outline: 0; font-size: .86rem; }
.search-box button { width: 50px; color: var(--gc-texto-sobre-primario); background: var(--brand); border: 0; font-size: 1.1rem; font-weight: 900; }
.cart-button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 12px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: .84rem; }
.cart-button:hover { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.commerce-header .menu-toggle { display: none; width: 40px; height: 40px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
.category-menu-wrap { position: relative; display: inline-flex; align-items: center; }
.category-menu { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0; border: 0; background: transparent; color: var(--ink) !important; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.category-menu-panel { position: absolute; top: calc(100% + 8px); left: 0; z-index: 70; width: min(280px, calc(100vw - 36px)); padding: 10px; background: var(--white); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 18px 45px rgba(8,41,71,.16); }
.category-menu-panel[hidden] { display: none !important; }
.category-menu-title { margin: 2px 8px 8px; color: var(--ink-soft); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.category-menu-list { display: grid; gap: 4px; max-height: 320px; overflow: auto; }
.category-menu-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 38px; padding: 8px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--ink); font-size: 12px; font-weight: 800; text-align: left; }
.category-menu-item:hover { background: var(--brand-soft); color: var(--brand-dark); }
.category-menu-item small { color: var(--ink-soft); font-size: 11px; font-weight: 700; white-space: nowrap; }
.commerce-header .nav-links { display: flex; flex-direction: row; align-items: center; gap: 22px; padding: 0; background: transparent; border: 0; box-shadow: none; }
.commerce-header .nav-links a { color: var(--ink-soft); text-decoration: none; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.commerce-header .nav-links a:hover, .commerce-header .nav-links a.active { color: var(--brand-dark); }
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
.storefront .gc-card-countdown { display: grid; gap: 5px; margin: 10px 0 12px; padding: 10px 12px; color: #fff; background: linear-gradient(135deg, #b80f45, #f15d3d); border-radius: 14px; box-shadow: 0 12px 26px rgba(184,15,69,.22); }
.storefront .gc-card-countdown strong { font-size: 13px; font-weight: 900; line-height: 1.2; }
.storefront .gc-card-countdown span { font-size: 11px; font-weight: 650; line-height: 1.35; opacity: .9; }
.storefront .gc-card-countdown em { width: fit-content; padding: 5px 8px; color: #7a092b; background: #fff; border-radius: 999px; font-size: 12px; font-style: normal; font-weight: 900; line-height: 1; letter-spacing: .02em; }
.storefront .offers-catalog-section .product-card.has-commercial-presentation .gc-commercial-details { margin-top: 12px; padding: 0; color: #243978; background: transparent; border: 0; font-size: 12px; font-weight: 800; }
.storefront .limited-offer-card {
  display: grid; grid-template-columns: minmax(210px, .72fr) minmax(0, 1.8fr) auto; align-items: stretch; gap: 18px;
  padding: 18px; border-radius: 12px; box-shadow: 0 8px 20px rgba(8, 41, 71, .08);
}
.storefront .limited-offer-summary {
  display: flex; flex-direction: column; justify-content: center; min-width: 0;
}
.storefront .limited-offer-summary h2 {
  margin: 0; color: #082947; font-size: clamp(18px, 1.8vw, 26px); line-height: 1.05; letter-spacing: -.03em;
}
.storefront .limited-offer-summary p { margin: 6px 0 14px; color: #526779; font-size: 13px; }
.storefront .limited-offer-summary .countdown { width: 100%; margin-left: 0; gap: 8px; }
.storefront .limited-offer-summary .countdown-separator { align-self: center; color: #f15d3d; font-weight: 900; }
.storefront .limited-offer-summary .countdown-box {
  display: grid; min-width: 46px; min-height: 52px; place-items: center; padding: 7px 8px;
  color: #fff; background: #ff3f54; border-radius: 8px;
}
.storefront .limited-offer-summary .countdown-box b { font-size: 18px; line-height: 1; }
.storefront .limited-offer-summary .countdown-box small { margin-top: 2px; color: rgba(255,255,255,.9); font-size: 8px; line-height: 1; }
.storefront .limited-offer-products {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; min-width: 0;
}
.storefront .limited-offer-product,
.storefront .limited-offer-product.has-commercial-presentation {
  position: relative; display: grid; grid-template-columns: 88px minmax(0, 1fr); min-width: 0; min-height: 132px; gap: 12px;
  padding: 12px; overflow: hidden; color: #082947; background: #fff; border: 1px solid #dbe8ef; border-radius: 12px;
  box-shadow: 0 8px 18px rgba(8,41,71,.08);
}
.storefront .limited-offer-image { align-self: stretch; min-height: 108px; overflow: hidden; background: #f7fafc; border-radius: 9px; }
.storefront .limited-offer-image img { width: 100%; height: 100%; object-fit: contain; padding: 8px; mix-blend-mode: multiply; }
.storefront .limited-offer-badge { position: absolute; top: 8px; left: 8px; z-index: 3; padding: 4px 7px; color: #fff; background: #ff3f54; border-radius: 999px; font-size: 9px; font-weight: 900; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-copy,
.storefront .limited-offer-copy { display: flex; flex-direction: column; min-width: 0; gap: 7px; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-copy h3,
.storefront .limited-offer-copy h3 {
  margin: 0; color: #082947; font-size: 13px; line-height: 1.15; font-weight: 900;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices,
.storefront .limited-offer-prices {
  display: flex; flex-flow: row wrap; align-items: baseline; gap: 4px 8px; margin-top: auto; padding: 8px 9px;
  color: #fff; background: #b80f45; border-radius: 9px;
}
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices span,
.storefront .limited-offer-prices span { color: #fff; font-size: 13px; font-weight: 900; line-height: 1.05; }
.storefront .limited-offer-product.has-commercial-presentation .limited-offer-prices s,
.storefront .limited-offer-prices s { color: rgba(255,255,255,.72); font-size: 9px; font-weight: 800; line-height: 1.05; }
.storefront .limited-offer-product.has-commercial-presentation .gc-commercial-saving { flex: 1 0 100%; margin: -2px 0 0; color: #fff; font-size: 10px; font-weight: 900; }
.storefront .limited-offer-product.has-commercial-presentation .button-primary,
.storefront .limited-offer-product .button-primary { min-height: 30px; padding: 6px 11px; color: #b80f45; background: #fff; border-color: #fff; border-radius: 999px; font-size: 10px; font-weight: 900; }
.storefront .limited-offer-see-all {
  align-self: start; justify-self: end; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
  padding: 9px 13px; color: #0965a8; background: #f4faff; border-radius: 999px; font-size: 12px; font-weight: 900;
}

@media (max-width: 760px) {
  .commerce-header .header-main { min-height: auto; padding: 14px 16px; gap: 12px; }
  .commerce-header .menu-toggle { display: grid; place-items: center; }
  .commerce-header .search-box { left: auto; right: 0; width: min(280px, calc(100vw - 32px)); }
  .commerce-header .header-nav { display: none; position: absolute; top: 100%; right: 12px; left: 12px; transform: none; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lg); }
  .commerce-header .header-nav.is-open { display: flex; }
  .commerce-header .nav-links { flex-direction: column; align-items: stretch; gap: 0; }
  .commerce-header .nav-links a { padding: 10px 4px; }
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
  .storefront .limited-offer-card { grid-template-columns: 1fr; gap: 14px; }
  .storefront .limited-offer-products { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .storefront .limited-offer-see-all { justify-self: stretch; justify-content: center; }
}
@media (max-width: 430px) {
  .store-benefits { grid-template-columns: 1fr; }
  .storefront .spotlight-grid, .storefront .product-grid, .storefront .news-grid, .storefront .collection-grid { grid-template-columns: 1fr; }
  .storefront .limited-offer-products { grid-template-columns: 1fr; }
  .storefront .limited-offer-product, .storefront .limited-offer-product.has-commercial-presentation { grid-template-columns: 82px minmax(0, 1fr); }
}`;

const INICIO_HTML = `<div class="trust-bar" aria-label="Beneficios de compra" data-gesicomm-bloque="anuncios">
  <div class="trust-track" data-gesicomm-lista="anuncios">
    <template>
      <div class="trust-item"><span class="trust-icon" data-gesicomm-bind="icono"></span><strong data-gesicomm-bind="texto"></strong></div>
    </template>
  </div>
</div>

${HEADER_HTML.replace('__LINKS__', `<a class="active" href="#inicio">Inicio</a>
      <a href="/catalogo" data-gesicomm-link="catalogo">Productos</a>
      <a href="#colecciones">Colecciones</a>`)}

<main class="storefront" data-gesicomm-base="catalogo">
  <div class="page-content">
    <section id="inicio" class="hero" data-gesicomm-bloque="banner">
      <div class="hero-shell">
        <div class="hero-banners" data-gesicomm-lista="banners_inicio"><template><article class="hero-banner"><img data-gesicomm-bind="imagen" alt="" loading="lazy"><video data-gesicomm-bind="video" muted autoplay loop playsinline preload="metadata"></video><div class="hero-text"><p class="eyebrow" data-gesicomm-bind="etiqueta"></p><h2 data-gesicomm-bind="titulo"></h2><p data-gesicomm-bind="subtitulo"></p><a class="button-primary" data-gesicomm-bind="enlace"><span data-gesicomm-bind="cta_texto"></span> <span aria-hidden="true">→</span></a></div></article></template></div>
        <button class="slider-arrow left" type="button" data-gesicomm-banner-anterior aria-label="Banner anterior">‹</button><button class="slider-arrow right" type="button" data-gesicomm-banner-siguiente aria-label="Banner siguiente">›</button><div class="hero-dots" data-gesicomm-slider aria-label="Elegir banner"></div>
      </div>
    </section>

    <section id="productos-categoria" class="section pc-section" data-gesicomm-bloque="productos_categoria"><div class="section-heading pc-head"><div><p class="eyebrow" data-gesicomm-venta="productos_categoria_kicker"></p><h2 data-gesicomm-venta="productos_categoria_titulo"></h2><p data-gesicomm-venta="productos_categoria_subtitulo"></p></div><label class="pc-search"><span>Buscar</span><input type="search" placeholder="Buscar en esta selección" aria-label="Buscar en productos seleccionados" data-gesicomm-pc-buscar></label></div><div class="pc-tabs" data-gesicomm-pc-tabs></div><div class="spotlight-grid" data-gesicomm-lista="productos_categoria"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div><p class="pc-empty" data-gesicomm-pc-vacio hidden>No encontramos productos con esa búsqueda.</p></section>

    <section id="confianza" class="section trust-section" data-gesicomm-bloque="confianza"><div class="trust-grid" data-gesicomm-lista="confianza_inicio"><template><div class="trust-card"><span class="trust-card-icon" data-gesicomm-bind="icono"></span><div><h3 data-gesicomm-bind="titulo"></h3><p data-gesicomm-bind="texto"></p></div></div></template></div></section>

    <section id="marca" class="section brand-section" data-gesicomm-bloque="marca" data-gesicomm-venta-configurada="marca" hidden><div class="brand-layout"><div class="brand-media" data-gesicomm-lista="marca_medios"><template><div class="brand-medio"><img data-gesicomm-bind="imagen" alt="" loading="lazy"><video data-gesicomm-bind="video" muted autoplay loop playsinline preload="metadata"></video></div></template></div><div class="brand-copy"><p class="eyebrow" data-gesicomm-venta="marca_kicker"></p><h2 data-gesicomm-venta="marca_titulo"></h2><p data-gesicomm-venta="marca_texto"></p><div class="brand-badges" data-gesicomm-lista="marca_badges"><template><span class="brand-badge" data-gesicomm-bind="texto"></span></template></div></div></div></section>

    <section id="categorias" class="category-strip" data-gesicomm-bloque="categorias" data-gesicomm-lista="menu_categorias"><div class="container"><div class="section-heading"><h2>Categorías</h2></div><div class="category-grid" data-gesicomm-lista="menu_categorias" data-gesicomm-limite="8"><template><button class="category-card" type="button"><span class="category-media"><img data-gesicomm-bind="imagen" alt="" loading="lazy"></span><strong data-gesicomm-bind="nombre"></strong><small data-gesicomm-bind="cantidad_texto"></small></button></template></div></div></section>

    <section id="destacados" class="section" data-gesicomm-bloque="destacados"><div class="section-heading"><div><h2>✦ Productos destacados</h2><p>Los favoritos de nuestros clientes</p></div><a href="/catalogo" data-gesicomm-link="catalogo">Ver catálogo →</a></div><div class="spotlight-grid" data-gesicomm-lista="productos_destacados" data-gesicomm-limite="4"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div></section>

    <section id="banner-promocional" class="mid-banner-section" data-gesicomm-bloque="banner_intermedio" data-gesicomm-lista="banners_intermedios">
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

    <div class="dynamic-sections" data-gesicomm-bloque="secciones_inicio" data-gesicomm-lista="secciones_inicio"><template><section class="section dynamic-section"><div class="dynamic-head"><div><p class="eyebrow" data-gesicomm-bind="tipo_label"></p><h2 data-gesicomm-bind="titulo"></h2><p data-gesicomm-bind="subtitulo"></p></div><a href="/catalogo" data-gesicomm-link="catalogo">Ver catálogo →</a></div><div class="spotlight-grid" data-gesicomm-lista="productos_seccion"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="etiqueta"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section></template></div>

    <section id="mas-vendidos" class="section" data-gesicomm-bloque="mas_vendidos"><div class="section-heading"><div><h2>🔥 Más vendidos</h2><p>Los productos que más eligen nuestros clientes</p></div></div><div class="compact-grid" data-gesicomm-lista="productos_manual"><template><article class="product-card"><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section>

    ${LIMITED_OFFER_HTML}

    <section id="ofertas-catalogo" class="section offers-catalog-section" data-gesicomm-bloque="ofertas_catalogo" data-gesicomm-lista="productos_ofertas"><div class="section-heading"><div><h2>Ofertas disponibles</h2><p>Productos seleccionados con precio especial</p></div><a href="/catalogo" data-gesicomm-link="catalogo">Ver catálogo →</a></div><div class="product-grid" data-gesicomm-lista="productos_ofertas"><template><article class="product-card"><div class="product-badge" data-gesicomm-bind="descuento"></div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Agregar al carrito</button></div></div></article></template></div></section>

    <section id="colecciones" class="section" data-gesicomm-bloque="colecciones"><div class="section-heading"><div><h2>✧ Colecciones</h2><p>Elegí tu estilo, encontrá tus favoritos</p></div></div><div class="collection-grid" data-gesicomm-lista="categorias" data-gesicomm-limite="4"><template><a class="collection-card" href="/catalogo" data-gesicomm-link="catalogo" data-gesicomm-bind="imagen"><h3 data-gesicomm-bind="nombre"></h3><p>Explorar →</p></a></template></div></section>

    <section id="novedades" class="section" data-gesicomm-bloque="novedades"><div class="section-heading"><div><h2>Novedades</h2><p>Los últimos productos en llegar</p></div></div><div class="product-grid" data-gesicomm-lista="productos_novedades" data-gesicomm-limite="4"><template><article class="product-card"><div class="product-badge">Nuevo</div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><div class="product-category" data-gesicomm-bind="categoria"></div><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description" data-gesicomm-bind="descripcion"></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button></div></div></article></template></div></section>

    <section id="combos" class="section combos-section" data-gesicomm-bloque="combos" data-gesicomm-lista="combos"><div class="section-heading"><div><h2>▣ Combos y packs</h2><p>Más ahorro cuando comprás en conjunto</p></div></div><div class="product-grid" data-gesicomm-lista="combos"><template><article class="product-card"><div class="product-badge">Ahorrá más</div><div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div><div class="product-content"><h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3><p class="product-description">Incluye: <span data-gesicomm-bind="incluye"></span></p><div class="product-footer"><div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span><span class="price-old" data-gesicomm-bind="precio_antes"></span></div><button class="button-primary" type="button" data-gesicomm-comprar>Comprar combo</button></div></div></article></template></div></section>

    <section id="preguntas" class="section faq-section" data-gesicomm-bloque="preguntas"><div class="section-heading"><div><h2>Preguntas frecuentes</h2><p>Resolvemos tus dudas más comunes</p></div></div><div class="faq-list"><div class="faq-item is-open"><button class="faq-question" type="button" aria-expanded="true"><span>¿Cuánto tarda en llegar mi pedido?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Los envíos se realizan según la cobertura de la tienda. Vas a ver las condiciones antes de confirmar.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Qué medios de pago aceptan?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Podés pagar con los medios habilitados por la tienda y consultar disponibilidad de pago al recibir.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Qué hago si recibo un producto con problemas?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Escribinos por WhatsApp para recibir asistencia sobre cambios o devoluciones.</p></div></div></div><div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>¿Los productos tienen garantía?</span><span class="faq-plus">›</span></button><div class="faq-answer"><div><p>Consultá las condiciones del producto o escribinos antes de comprar.</p></div></div></div></div></section>

    <section id="contacto" class="section contact-section" data-gesicomm-bloque="contacto"><div class="contact-layout"><div><h2>¿Querés ayuda para elegir?</h2><p>Escribinos por WhatsApp o dejá tu consulta.</p><div class="contact-list"><button class="contact-link" type="button" data-gesicomm-whatsapp="Hola! Tengo una consulta">Escribinos por WhatsApp</button><span>Email: <span data-gesicomm-tienda="email"></span></span><span>Dirección: <span data-gesicomm-tienda="direccion"></span></span></div></div><form class="contact-form" data-gesicomm-form="contacto"><div class="form-grid"><div class="field"><label for="nombre">Nombre</label><input id="nombre" name="nombre" type="text" required></div><div class="field"><label for="telefono">Celular</label><input id="telefono" name="telefono" type="tel" required></div><div class="field full"><label for="mensaje">Consulta</label><textarea id="mensaje" name="mensaje" required></textarea></div></div><button class="button-primary" type="submit">Enviar consulta →</button><div class="form-feedback" data-gesicomm-form-ok style="display:none">Gracias. Te abrimos WhatsApp para que nos mandes la consulta.</div></form></div></section>
  </div>
</main>

${FOOTER_HTML}`;

// ─── FICHA DE PRODUCTO ───────────────────────────────────────────────────

const PRODUCTO_CSS = `${TOKENS_CSS}

.commerce-header { position: sticky; top: 0; z-index: 50; background: var(--white); border-bottom: 1px solid var(--line); box-shadow: 0 8px 22px rgba(8, 41, 71, .05); }
.commerce-header .header-main { position: relative; min-height: 76px; display: flex; align-items: center; gap: 28px; }
.commerce-header .brand-column { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; }
.commerce-header .brand, .commerce-header .brand.brand-mark { display: inline-flex; align-items: center; gap: 9px; min-width: max-content; color: var(--ink); font-size: 1.16rem; font-weight: 900; text-decoration: none; letter-spacing: -.03em; background: transparent !important; border: none !important; box-shadow: none !important; }
.commerce-header .brand-logo { width: 32px; height: 32px; object-fit: contain; }
.commerce-header .brand-logo[src=""], .commerce-header .brand-logo:not([src]) { display: none; }
.commerce-header .brand.brand-mark::before, .commerce-header .brand::before { display: none !important; }
.commerce-header .brand.brand-mark:has(.brand-logo[src]:not([src=""]))::before { display: none; }
.commerce-header .header-nav { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 22px; }
.commerce-header .header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.commerce-header .search-wrap { position: relative; display: inline-flex; }
.commerce-header .search-toggle { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: 1.05rem; }
.commerce-header .search-toggle:hover, .commerce-header .search-toggle[aria-expanded="true"] { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.commerce-header .search-box { position: absolute; top: calc(100% + 10px); right: 0; z-index: 70; width: min(320px, calc(100vw - 36px)); display: flex; min-height: 42px; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 18px 45px rgba(8,41,71,.16); }
.commerce-header .search-box[hidden] { display: none !important; }
.commerce-header .search-box input { min-width: 0; flex: 1; padding: 0 14px; color: var(--ink); background: transparent; border: 0; outline: 0; font-size: .86rem; }
.commerce-header .search-box button { width: 50px; color: var(--gc-texto-sobre-primario); background: var(--brand); border: 0; font-size: 1.1rem; font-weight: 900; }
.commerce-header .cart-button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 12px; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 10px; font-size: .84rem; }
.commerce-header .cart-button:hover { color: var(--brand-dark); background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 22%, var(--line)); }
.commerce-header .menu-toggle { display: none; width: 40px; height: 40px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
.commerce-header .category-menu-wrap { position: relative; display: inline-flex; align-items: center; }
.commerce-header .category-menu { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0; border: 0; background: transparent; color: var(--ink) !important; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.commerce-header .category-menu-panel { position: absolute; top: calc(100% + 8px); left: 0; z-index: 70; width: min(280px, calc(100vw - 36px)); padding: 10px; background: var(--white); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 18px 45px rgba(8,41,71,.16); }
.commerce-header .category-menu-panel[hidden] { display: none !important; }
.commerce-header .category-menu-title { margin: 2px 8px 8px; color: var(--ink-soft); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.commerce-header .category-menu-list { display: grid; gap: 4px; max-height: 320px; overflow: auto; }
.commerce-header .category-menu-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 38px; padding: 8px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--ink); font-size: 12px; font-weight: 800; text-align: left; }
.commerce-header .category-menu-item:hover { background: var(--brand-soft); color: var(--brand-dark); }
.commerce-header .category-menu-item small { color: var(--ink-soft); font-size: 11px; font-weight: 700; white-space: nowrap; }
.commerce-header .nav-links { display: flex; flex-direction: row; align-items: center; gap: 22px; padding: 0; background: transparent; border: 0; box-shadow: none; }
.commerce-header .nav-links a { color: var(--ink-soft); text-decoration: none; font-size: .78rem; font-weight: 850; white-space: nowrap; }
.commerce-header .nav-links a:hover, .commerce-header .nav-links a.active { color: var(--brand-dark); }

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
.pdp-reviews { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: -4px 0 18px; color: var(--ink-soft); font-size: .9rem; }
.pdp-reviews .stars { color: #b7791f; letter-spacing: .08em; }
.pdp-reviews a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
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
.contact-actions, .payment-actions { display: grid; gap: 10px; margin: -10px 0 16px; }
.contact-action, .payment-action { display: flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 16px; color: var(--ink); background: var(--white); border: 1.5px solid var(--line); border-radius: 999px; text-decoration: none; font-weight: 850; }
.contact-action:hover, .payment-action:hover { border-color: var(--brand); color: var(--brand-dark); background: var(--brand-soft); }
.payment-methods { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; }
.payment-methods span { padding: 8px 12px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 999px; font-size: .78rem; font-weight: 800; }
.order-includes { margin: 26px 0; padding: 22px; background: var(--white); border: 1px solid var(--line); border-radius: 18px; }
.order-includes h2 { margin: 0 0 14px; font-size: 1.25rem; letter-spacing: -.02em; }
.order-includes ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.order-includes li { position: relative; padding-left: 28px; color: var(--ink); font-weight: 650; line-height: 1.35; }
.order-includes li::before { content: "✓"; position: absolute; left: 0; top: 0; color: var(--brand-dark); font-weight: 950; }
.opiniones-section { background: var(--paper); }
.opiniones-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.opinion-card { padding: 24px; background: var(--white); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-sm); }
.opinion-head { display: flex; align-items: center; gap: 12px; }
.opinion-avatar { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 999px; object-fit: cover; background: var(--brand-soft); border: 1px solid var(--line); }
.opinion-stars { color: #b7791f; letter-spacing: .08em; font-size: .88rem; }
.opinion-card p { margin: 12px 0 16px; color: var(--ink-soft); line-height: 1.65; }
.opinion-card b { display: block; color: var(--ink); }
.opinion-card small { color: var(--ink-soft); font-weight: 750; }

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
.payment-brands { display: grid; gap: 10px; margin-top: 14px; padding: 14px 16px; background: var(--white); border: 1px solid var(--line); border-radius: 14px; }
.payment-brands-title { margin: 0; color: var(--ink-soft); font-size: .82rem; line-height: 1.4; }
.payment-brands-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.payment-brands-label { color: var(--ink); font-size: .78rem; font-weight: 750; }
.payment-brands-logos { height: 24px; width: auto; max-width: 100%; object-fit: contain; }
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
  .commerce-header .header-main { min-height: auto; padding-top: 14px; padding-bottom: 14px; gap: 12px; }
  .commerce-header .menu-toggle { display: grid; place-items: center; }
  .commerce-header .search-box { left: auto; right: 0; width: min(280px, calc(100vw - 32px)); }
  .commerce-header .header-nav { display: none; position: absolute; top: 100%; right: 12px; left: 12px; transform: none; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; background: var(--white); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-lg); }
  .commerce-header .header-nav.is-open { display: flex; }
  .commerce-header .nav-links { flex-direction: column; align-items: stretch; gap: 0; }
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
  .opiniones-grid { grid-template-columns: 1fr; }
  .offer .button-primary, .offer .button-secondary, .upsell .button-primary { flex: 1 1 100%; }
  .stats { grid-template-columns: 1fr 1fr; }
  .table-head, .table-row { grid-template-columns: 1.35fr .95fr .95fr; font-size: .72rem; }
  .table-row > * { padding: 10px 6px; }
}`;

// Logos de medios de pago que acepta PagoPar (tarjetas, bocas de cobranza,
// billetera electronica), recortados de la lamina oficial de marca que
// paso el comercio. Homebanking queda afuera: no lo pidio. Van como data
// URI (no un upload mas) porque es contenido fijo del sistema, igual para
// toda tienda que use esta ficha generica -- no algo que el comercio suba
// por producto.
const LOGOS_PAGO = {
  tarjetas: 'data:image/webp;base64,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',
  bocas: 'data:image/webp;base64,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',
  billetera: 'data:image/webp;base64,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',
};

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
    <div class="gallery" data-gesicomm-ficha-bloque="portada">
      <div class="gallery-main"><img data-gesicomm-bind="imagen" data-gesicomm-imagen-principal alt=""></div>
      <!-- Miniaturas: al tocarlas cambian la imagen principal. -->
      <div class="thumbs" data-gesicomm-lista="imagenes">
        <template><button class="thumb" type="button"><img data-gesicomm-bind="imagen" alt=""></button></template>
      </div>
    </div>

    <div class="pdp-info">
      <p class="eyebrow" data-gesicomm-bind="insignia_principal" data-gesicomm-ficha-bloque="textos"></p>
      <h1 data-gesicomm-bind="nombre" data-gesicomm-ficha-bloque="textos"></h1>
      <div class="pdp-reviews" data-gesicomm-ficha-bloque="textos"><span class="stars">★★★★★</span><span data-gesicomm-bind="resenas_texto"></span></div>
      <!-- Propuesta de valor: el porqué en una frase (Productos → Vista del producto). -->
      <p class="pdp-promesa" data-gesicomm-bind="propuesta_valor" data-gesicomm-ficha-bloque="textos"></p>
      <div class="pdp-prices" data-gesicomm-ficha-bloque="textos">
        <span class="price" data-gesicomm-bind="precio"></span>
        <span class="price-old" data-gesicomm-bind="precio_antes"></span>
        <!-- % en productos baratos, Gs en caros ("regla del 100"). -->
        <span class="badge-off" data-gesicomm-bind="ahorro_texto"></span>
      </div>
      <!-- Combo: el ancla del ahorro, cuánto costaría por separado. -->
      <p class="pdp-separado" data-gesicomm-si="precio_separado">Por separado: <s data-gesicomm-bind="precio_separado"></s></p>

      <div class="limited-offer pdp-limited-offer" data-gesicomm-countdown data-gesicomm-ficha-bloque="urgencia">
        <div class="limited-offer-card">
          <div>
            <p class="limited-offer-kicker" data-gesicomm-bind="urgencia_kicker">Oferta por tiempo limitado</p>
            <h2 data-gesicomm-bind="urgencia_titulo">Reservá esta condición antes de que termine.</h2>
            <p data-gesicomm-bind="urgencia_texto">La fecha real se configura en Gesicomm; el contador se actualiza solo.</p>
          </div>
          <div class="countdown" aria-label="Cuenta regresiva de la oferta">
            <span class="countdown-box"><b data-gesicomm-countdown-parte="horas">--</b><small>horas</small></span>
            <span class="countdown-box"><b data-gesicomm-countdown-parte="minutos">--</b><small>min</small></span>
            <span class="countdown-box"><b data-gesicomm-countdown-parte="segundos">--</b><small>seg</small></span>
          </div>
        </div>
      </div>

      <!-- Highlights arriba del pliegue: 3–4 motivos, se escanean de un vistazo. -->
      <ul class="highlights" data-gesicomm-lista="beneficios" data-gesicomm-limite="4" data-gesicomm-ficha-bloque="beneficios">
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

      <div class="buy-row" data-gesicomm-ficha-bloque="compra">
        <!-- Con paquetes, la cantidad la da el paquete elegido. -->
        <input class="qty" type="number" min="1" max="99" value="1" aria-label="Cantidad" data-gesicomm-cantidad-input data-gesicomm-sin="tiene_paquetes">
        <button class="button-primary" type="button" data-gesicomm-comprar><span data-gesicomm-cta data-gesicomm-bind="cta_texto">Comprar ahora</span> · <span data-gesicomm-total></span></button>
      </div>
      <div class="buy-secondary" data-gesicomm-ficha-bloque="compra">
        <button class="button-secondary" type="button" data-gesicomm-agregar><span data-gesicomm-bind="agregar_carrito_texto">Agregar al carrito</span></button>
        <button class="button-secondary" type="button" data-gesicomm-whatsapp>Consultar por WhatsApp</button>
      </div>
      <div class="payment-actions" data-gesicomm-lista="botones_pago_producto" data-gesicomm-ficha-bloque="compra">
        <template><a class="payment-action" data-gesicomm-bind="url" target="_blank" rel="noopener"><span data-gesicomm-bind="label"></span></a></template>
      </div>
      <div class="payment-methods" data-gesicomm-lista="metodos_pago_producto" data-gesicomm-ficha-bloque="compra">
        <template><span data-gesicomm-bind="texto"></span></template>
      </div>
      <div class="contact-actions" data-gesicomm-lista="botones_contacto_producto" data-gesicomm-ficha-bloque="compra">
        <template><a class="contact-action" data-gesicomm-bind="url" target="_blank" rel="noopener"><span data-gesicomm-bind="label"></span></a></template>
      </div>
      <div class="order-includes" data-gesicomm-lista="incluye_pedido_producto" data-gesicomm-ficha-bloque="incluye">
        <h2>¿Qué incluye tu pedido?</h2>
        <ul><template><li data-gesicomm-bind="texto"></li></template></ul>
      </div>

      <!-- Junto al botón, lo que se busca antes de comprar: envío, pago y
           cambios (Baymard: 64% busca el envío y 60% la política de
           devolución en la ficha). -->
      <div class="mini-trust" data-gesicomm-ficha-bloque="compra">
        <div><strong>Envío</strong>El costo lo ves antes de pagar</div>
        <div><strong>Pago seguro</strong>PagoPar o al recibir</div>
        <div><strong>Cambios</strong><a href="#" data-gesicomm-link="reembolsos">Ver la política</a></div>
      </div>
      <!-- Medios de pago reales que acepta PagoPar: siempre visible, no
           depende de lo que cargue el comercio (a diferencia de
           "metodos_pago_producto", que es texto libre). Homebanking queda
           afuera a pedido explícito. -->
      <div class="payment-brands" data-gesicomm-ficha-bloque="compra" data-gesicomm-si="pago_logos_activo">
        <p class="payment-brands-title">Consultá disponibilidad, cobertura y medios de pago antes de confirmar.</p>
        <div class="payment-brands-row" data-gesicomm-si="pago_logo_tarjetas">
          <span class="payment-brands-label">Tarjetas de crédito</span>
          <img class="payment-brands-logos" src="${LOGOS_PAGO.tarjetas}" alt="Visa, Mastercard, Pago Móvil" loading="lazy">
        </div>
        <div class="payment-brands-row" data-gesicomm-si="pago_logo_bocas">
          <span class="payment-brands-label">Bocas de cobranza</span>
          <img class="payment-brands-logos" src="${LOGOS_PAGO.bocas}" alt="Aquí Pago, Pago Express, Practipago, Infonet Cobranzas" loading="lazy">
        </div>
        <div class="payment-brands-row" data-gesicomm-si="pago_logo_billetera">
          <span class="payment-brands-label">Billetera electrónica</span>
          <img class="payment-brands-logos" src="${LOGOS_PAGO.billetera}" alt="Tigo Money, Billetera Personal" loading="lazy">
        </div>
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
<section id="beneficios" class="section beneficios-section" data-gesicomm-lista="beneficios" data-gesicomm-ficha-bloque="beneficios">
  <div class="container">
    <div class="section-heading"><p class="eyebrow" data-gesicomm-bind="beneficios_kicker">Por qué elegirlo</p><h2 data-gesicomm-bind="beneficios_titulo">Lo que vas a notar.</h2><p data-gesicomm-bind="beneficios_subtitulo"></p></div>
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

<!-- Opiniones reales cargadas por el comercio para este producto. -->
<section id="opiniones" class="section opiniones-section" data-gesicomm-lista="opiniones_producto" data-gesicomm-ficha-bloque="opiniones">
  <div class="container">
    <div class="section-heading"><p class="eyebrow" data-gesicomm-bind="opiniones_kicker">Opiniones</p><h2 data-gesicomm-bind="opiniones_titulo">Personas que ya lo probaron.</h2><p data-gesicomm-bind="opiniones_subtitulo"></p></div>
    <div class="opiniones-grid" data-gesicomm-lista="opiniones_producto">
      <template>
        <article class="opinion-card">
          <div class="opinion-head"><img class="opinion-avatar" data-gesicomm-bind="imagen" alt="" loading="lazy"><div class="opinion-stars" data-gesicomm-bind="estrellas"></div></div>
          <p data-gesicomm-bind="comentario"></p>
          <b data-gesicomm-bind="nombre"></b>
          <small data-gesicomm-bind="detalle"></small>
        </article>
      </template>
    </div>
  </div>
</section>

<!-- Preguntas frecuentes del producto: responde las dudas que frenan la compra. -->
<section id="preguntas" class="section faq-section" data-gesicomm-lista="preguntas" data-gesicomm-ficha-bloque="preguntas">
  <div class="container faq-container">
    <div class="section-heading"><p class="eyebrow" data-gesicomm-bind="preguntas_kicker">Resolvemos tus dudas</p><h2 data-gesicomm-bind="preguntas_titulo">Preguntas frecuentes</h2><p data-gesicomm-bind="preguntas_subtitulo"></p></div>
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
    <div class="section-heading"><p class="eyebrow" data-gesicomm-venta="recomendados_kicker">Te puede gustar</p><h2 data-gesicomm-venta="recomendados_titulo">Te puede gustar</h2><p data-gesicomm-venta="recomendados_subtitulo"></p></div>
    <div class="product-grid" data-gesicomm-lista="recomendados">
      <template>
        <article class="product-card">
          <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
          <div class="product-content">
            <div class="product-category" data-gesicomm-bind="categoria"></div>
            <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
            <div class="product-footer">
              <span class="price" data-gesicomm-bind="precio"></span>
              <button class="button-primary" type="button" data-gesicomm-agregar data-gesicomm-venta="recomendados_cta">Agregar</button>
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
      <div class="section-heading"><p class="eyebrow" data-gesicomm-venta="recomendados_kicker">Complementá tu compra</p><h2 data-gesicomm-venta="recomendados_titulo">Te puede gustar</h2><p data-gesicomm-venta="recomendados_subtitulo"></p></div>
      <div class="product-grid" data-gesicomm-lista="recomendados">
        <template>
          <article class="product-card">
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <div class="product-footer">
                <span class="price" data-gesicomm-bind="precio"></span>
                <button class="button-primary" type="button" data-gesicomm-agregar data-gesicomm-venta="recomendados_cta">Agregar</button>
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
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
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
.lv-pay-options{display:grid;gap:10px}
.lv-pay-option{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1.5px solid var(--lv-line);border-radius:var(--lv-radius);cursor:pointer;background:var(--lv-surface);transition:border-color .15s ease,box-shadow .15s ease}
.lv-pay-option:hover{border-color:color-mix(in srgb,var(--gc-primario) 40%,var(--lv-line))}
.lv-pay-option input{width:18px!important;height:18px;min-height:0!important;margin:2px 0 0;padding:0;border:0;background:none;accent-color:var(--gc-primario);flex-shrink:0}
.lv-pay-option-copy{display:grid;gap:3px;min-width:0}
.lv-pay-option-copy strong{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--gc-texto);font-size:15px;font-weight:750;line-height:1.3}
.lv-pay-option-copy small{color:var(--lv-muted);font-size:13px;line-height:1.45}
.lv-pay-option-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:900;font-style:normal;text-transform:uppercase;letter-spacing:.04em;background:var(--gc-primario);color:var(--gc-texto-sobre-primario)}
.lv-pay-option--highlight{border-color:color-mix(in srgb,var(--gc-primario) 50%,var(--lv-line));background:color-mix(in srgb,var(--gc-primario) 7%,var(--lv-surface))}
.lv-pay-option:has(input:checked){border-color:var(--gc-primario);box-shadow:0 0 0 3px color-mix(in srgb,var(--gc-primario) 18%,transparent)}
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
.lv-shell:has(.lv-shop-page){background:#fff}
.lv-shop-page{--shop-text:#10201d;--shop-muted:#62706b;--shop-soft:#f6f8f4;--shop-surface:#ffffff;--shop-line:#dfe5dc;--shop-accent:var(--gc-primario,#143f3a);background:#fff;color:var(--shop-text)}
.lv-shop-page,.lv-shop-page *{letter-spacing:0}
.lv-shop-page .lv-kicker{color:color-mix(in srgb,var(--shop-accent) 72%,#c56b23)}
.lv-shop-page .lv-title{color:var(--shop-text)}
.lv-shop-page .lv-copy{color:var(--shop-muted)}
.lv-shop-breadcrumb{margin:0 0 28px;color:var(--shop-muted);font-size:12px}
.lv-shop-hero{margin-bottom:26px}
.lv-shop-hero .lv-title{max-width:760px;font-size:clamp(34px,4.8vw,58px);font-weight:650;line-height:1.02}
.lv-shop-hero .lv-copy{max-width:680px;font-size:15px}
.lv-shop-layout{display:grid;grid-template-columns:250px minmax(0,1fr);gap:28px;align-items:start}
.lv-filters{position:sticky;top:92px;border:1px solid var(--shop-line);border-radius:10px;background:var(--shop-surface);color:var(--shop-text);padding:20px;box-shadow:0 12px 28px rgba(16,32,29,.04)}
.lv-filters h2{margin:0 0 18px;color:var(--shop-text);font-size:20px;font-weight:650}
.lv-filter-group{padding:16px 0;border-top:1px solid var(--shop-line)}
.lv-filter-group:first-of-type{border-top:0;padding-top:0}
.lv-filter-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--shop-text);font-size:13px;font-weight:850}
.lv-filter-field{display:grid;gap:6px;margin-top:10px;color:var(--shop-muted);font-size:11px}
.lv-filter-field select,.lv-filter-field input{width:100%;min-height:38px;border:1px solid var(--shop-line);border-radius:7px;background:#fff;color:var(--shop-text);padding:8px 10px;outline:none}
.lv-filter-field select:disabled{background:var(--shop-soft);color:var(--shop-text);cursor:not-allowed;opacity:1}
.lv-filter-field select::placeholder,.lv-filter-field input::placeholder,.lv-search input::placeholder{color:color-mix(in srgb,var(--shop-muted) 62%,#fff)}
.lv-filter-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lv-check{display:flex;align-items:center;gap:8px;margin-top:9px;color:var(--shop-text);font-size:13px}
.lv-check input{width:16px;height:16px;accent-color:var(--shop-accent)}
.lv-clear{display:inline-flex;margin-top:14px;color:var(--shop-text);font-size:12px;text-decoration:underline}
.lv-results-head{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:12px;align-items:center;margin-bottom:14px}
.lv-search{position:relative}
.lv-search input{width:100%;min-height:48px;border:1px solid var(--shop-line);border-radius:9px;background:#fff;color:var(--shop-text);padding:0 16px 0 44px;outline:none}
.lv-search:before{content:"⌕";position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--shop-muted);font-size:18px}
.lv-sort select{width:100%;min-height:48px;border:1px solid var(--shop-line);border-radius:9px;background:#fff;color:var(--shop-text);padding:0 12px;font-weight:750;outline:none}
.gc-select-ui{position:relative;width:100%;z-index:20}
.gc-select-ui-button{width:100%;min-height:48px;border:1px solid var(--shop-line);border-radius:9px;background:#fff;color:var(--shop-text);padding:0 34px 0 12px;font:inherit;font-weight:750;text-align:left;cursor:pointer;position:relative}
.gc-select-ui-button:after{content:"⌄";position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--shop-muted);font-size:14px}
.gc-select-ui-button[aria-expanded="true"]{border-color:var(--shop-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--shop-accent) 14%,transparent)}
.gc-select-ui-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:80;max-height:240px;overflow:auto;border:1px solid var(--shop-line);border-radius:9px;background:#fff;box-shadow:0 14px 30px rgba(15,23,42,.14);padding:4px}
.gc-select-ui-option{display:block;width:100%;border:0;background:transparent;color:var(--shop-text);padding:10px 12px;border-radius:7px;text-align:left;font:inherit;cursor:pointer}
.gc-select-ui-option:hover,.gc-select-ui-option[aria-selected="true"]{background:color-mix(in srgb,var(--shop-accent) 12%,#fff);color:var(--shop-accent)}
.lv-search input:focus,.lv-sort select:focus,.lv-filter-field select:focus,.lv-filter-field input:focus{border-color:var(--shop-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--shop-accent) 14%,transparent)}
.lv-results-meta{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 22px;color:var(--shop-muted);font-size:12px}
.lv-quick-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.lv-quick-filters a,.lv-quick-filters button{border:1px solid var(--shop-line);border-radius:999px;background:#fff;padding:8px 12px;color:var(--shop-text);font-size:12px;font-weight:750;cursor:pointer}
.lv-quick-filters a:hover,.lv-quick-filters button:hover,.lv-quick-filters .is-active{border-color:var(--shop-accent);color:var(--shop-accent);background:color-mix(in srgb,var(--shop-accent) 8%,#fff)}
.lv-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 22px}
.lv-shop-card{position:relative;min-width:0;background:#fff;border:0;border-radius:0;overflow:visible;box-shadow:none;color:var(--shop-text)}
.lv-shop-media{position:relative;display:grid;place-items:center;aspect-ratio:1/1;background:var(--shop-soft);border-radius:10px;overflow:hidden;cursor:pointer}
.lv-shop-media img{width:100%;height:100%;object-fit:contain;padding:18px}
.lv-shop-badge{position:absolute;left:12px;top:12px;z-index:2;border-radius:5px;background:color-mix(in srgb,var(--shop-accent) 72%,#b9ff38);color:#fff;padding:5px 9px;font-size:11px;font-weight:900}
.lv-shop-card-body{padding-top:13px;display:grid;gap:7px}
.lv-shop-category{min-height:14px;color:var(--shop-muted);font-size:11px;font-weight:850;text-transform:uppercase}
.lv-shop-title{margin:0;color:var(--shop-text);font-size:15px;line-height:1.35;font-weight:750;cursor:pointer}
.lv-shop-description{margin:0;color:var(--shop-muted);font-size:12px;line-height:1.45;min-height:17px}
.lv-shop-prices{display:flex;align-items:baseline;gap:8px;margin-top:2px}
.lv-shop-price{color:var(--shop-text);font-size:20px;font-weight:900}
.lv-shop-old{color:var(--shop-muted);font-size:12px;text-decoration:line-through}
.lv-shop-card .lv-primary{width:100%;min-height:46px;margin-top:8px;border-radius:8px;background:var(--shop-accent);color:#fff;box-shadow:none}
.lv-stock-note{color:var(--shop-muted);font-size:11px}
@media(max-width:920px){.lv-hero,.lv-checkout-head{display:grid}.lv-metrics{grid-template-columns:1fr 1fr}.lv-toolbar,.lv-checkout-grid{grid-template-columns:1fr}.lv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lv-summary{position:static}.lv-form-grid{grid-template-columns:1fr}.lv-shop-layout{grid-template-columns:1fr}.lv-filters{position:static}.lv-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.lv-header-inner{align-items:flex-start}.lv-nav{width:100%;justify-content:flex-start}.lv-grid,.lv-shop-grid{grid-template-columns:1fr}.lv-metrics{grid-template-columns:1fr}.lv-title{font-size:34px}.lv-page{padding-top:24px}.lv-topbar-inner{justify-content:flex-start}.lv-results-head{grid-template-columns:1fr}.lv-filter-row{grid-template-columns:1fr}}
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

  <main class="lv-page lv-shop-page">
    <p class="lv-shop-breadcrumb"><a href="/" data-gesicomm-inicio>Inicio</a> / Productos</p>
    <section class="lv-shop-hero">
      <p class="lv-kicker">Encontrá tu próximo favorito</p>
      <h1 class="lv-title" data-gesicomm-categoria="nombre">Todos los productos</h1>
      <p class="lv-copy">Encontrá lo que necesitás para hacer tu día a día más fácil.</p>
    </section>

    <section class="lv-shop-layout" aria-label="Catálogo de productos">
      <aside class="lv-filters" aria-label="Filtros">
        <h2>Filtros</h2>
        <div class="lv-filter-group" data-gesicomm-control="categoria">
          <div class="lv-filter-head"><span>Categorías</span><span aria-hidden="true">-</span></div>
          <label class="lv-filter-field">
            <span>Categoría</span>
            <select data-gesicomm-filtro="categoria">
              <option value="">Todas las categorías</option>
            </select>
          </label>
        </div>
        <div class="lv-filter-group" data-gesicomm-control="precio">
          <div class="lv-filter-head"><span>Precio en guaraníes</span><span aria-hidden="true">-</span></div>
          <div class="lv-filter-row">
            <label class="lv-filter-field">
              <span>Desde</span>
              <input inputmode="numeric" data-gesicomm-filtro="precioMin" placeholder="Sin mínimo">
            </label>
            <label class="lv-filter-field">
              <span>Hasta</span>
              <input inputmode="numeric" data-gesicomm-filtro="precioMax" placeholder="Sin máximo">
            </label>
          </div>
        </div>
        <div class="lv-filter-group" data-gesicomm-control="disponibilidad">
          <div class="lv-filter-head"><span>Disponibilidad</span><span aria-hidden="true">-</span></div>
          <label class="lv-check"><input type="radio" name="lv-stock" data-gesicomm-filtro="disponibilidad" value="en_stock"> Disponible</label>
          <label class="lv-check"><input type="radio" name="lv-stock" data-gesicomm-filtro="disponibilidad" value="agotado"> Agotado</label>
        </div>
        <div class="lv-filter-group" data-gesicomm-control="promociones">
          <div class="lv-filter-head"><span>Promociones</span><span aria-hidden="true">-</span></div>
          <label class="lv-check"><input type="checkbox" data-gesicomm-filtro="soloDescuento" value="true"> Solo con descuento</label>
          <a class="lv-clear" href="/catalogo" data-gesicomm-link="catalogo">Limpiar filtros</a>
        </div>
      </aside>

      <div class="lv-results">
        <div class="lv-results-head">
          <label class="lv-search" data-gesicomm-control="buscador">
            <span class="sr-only">Buscar productos</span>
            <input type="search" data-gesicomm-buscar placeholder="¿Qué estás buscando?">
          </label>
          <label class="lv-sort" data-gesicomm-control="orden">
            <span class="sr-only">Ordenar</span>
            <select data-gesicomm-filtro="orden">
              <option value="">Orden recomendado</option>
              <option value="max-min">Mayor precio</option>
              <option value="min-max">Menor precio</option>
              <option value="az">Nombre A-Z</option>
              <option value="za">Nombre Z-A</option>
            </select>
          </label>
        </div>
        <div class="lv-results-meta">
          <span data-gesicomm-total></span>
          <a href="/catalogo" data-gesicomm-link="catalogo">Limpiar filtros</a>
        </div>
        <div class="lv-quick-filters" aria-label="Filtros rápidos">
          <button type="button" data-gesicomm-filtro-etiqueta="Oferta">Ofertas</button>
          <button type="button" data-gesicomm-filtro-etiqueta="Novedades">Novedades</button>
          <button type="button" data-gesicomm-filtro-etiqueta="Más vendidos">Más vendidos</button>
        </div>
        <section class="lv-shop-grid" data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar">
          <template>
            <article class="lv-shop-card">
              <div class="lv-shop-media" data-gesicomm-ver>
                <span class="lv-shop-badge" data-gesicomm-bind="descuento"></span>
                <img data-gesicomm-bind="imagen" alt="" loading="lazy">
              </div>
              <div class="lv-shop-card-body">
                <div class="lv-shop-category" data-gesicomm-bind="categoria"></div>
                <h3 class="lv-shop-title" data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
                <p class="lv-shop-description" data-gesicomm-bind="descripcion"></p>
                <div class="lv-shop-prices">
                  <strong class="lv-shop-price" data-gesicomm-bind="precio"></strong>
                  <span class="lv-shop-old" data-gesicomm-bind="precio_antes"></span>
                </div>
                <button class="lv-primary" type="button" data-gesicomm-agregar>Agregar al carrito</button>
                <span class="lv-stock-note">Disponible</span>
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
      </div>
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

const CATALOGO_HTML = CATEGORIA_HTML
  .replace('<h1 class="lv-title" data-gesicomm-categoria="nombre">Todos los productos</h1>', '<h1 class="lv-title">Todos los productos</h1>')
  .replace('Resumen de categoria', 'Resumen del catalogo')
  .replace('<span>en esta vista</span>', '<span>en el catalogo</span>')
  .replace('Filtros de categoria', 'Filtros del catalogo');

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
          <div class="lv-field lv-wide">
            <span>Metodo de pago</span>
            <div class="lv-pay-options">
              <label class="lv-pay-option lv-pay-option--highlight">
                <input type="radio" name="payment_method" value="pagopar" checked>
                <span class="lv-pay-option-copy">
                  <strong>Pago anticipado <span class="lv-pay-option-badge">Recomendado</span></strong>
                  <small>Tarjetas, QR o Tigo Money. Tu pedido queda confirmado al instante.</small>
                </span>
              </label>
              <label class="lv-pay-option">
                <input type="radio" name="payment_method" value="contra_entrega">
                <span class="lv-pay-option-copy">
                  <strong>Pago contra entrega</strong>
                  <small>Pagas cuando recibis el pedido.</small>
                </span>
              </label>
            </div>
          </div>
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

export const PLANTILLA_CATALOGO = { html: CATALOGO_HTML, css: TIENDA_VISTA_CSS, js: JS_COMUN };
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








