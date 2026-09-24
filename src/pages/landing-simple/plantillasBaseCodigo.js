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

const TOKENS_CSS = `:root {
  --ink: #10202f;
  --ink-soft: #506172;
  --paper: #f7f9fc;
  --white: #ffffff;
  --line: #e4eaf0;
  --brand: #16a36a;
  --brand-dark: #08734a;
  --brand-soft: #e9f8f0;
  --accent: #ffb547;
  --accent-soft: #fff5e3;
  --shadow-sm: 0 8px 25px rgba(16, 32, 47, .07);
  --shadow-lg: 0 24px 70px rgba(16, 32, 47, .14);
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

.announcement { padding: 9px 16px; color: var(--white); background: var(--ink); font-size: .82rem; text-align: center; }
.announcement strong { color: #8ff2bd; }

.site-header { position: sticky; top: 0; z-index: 50; background: rgba(247, 249, 252, .9); border-bottom: 1px solid rgba(228, 234, 240, .8); backdrop-filter: blur(18px); }
.nav { display: flex; align-items: center; justify-content: space-between; min-height: 76px; gap: 24px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-size: 1.28rem; font-weight: 850; letter-spacing: -.04em; cursor: pointer; }
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; color: var(--white); background: var(--brand); border-radius: 12px; box-shadow: 0 8px 18px rgba(22, 163, 106, .25); font-weight: 900; }
.brand-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 10px; }
.nav-links { display: flex; align-items: center; gap: 26px; color: var(--ink-soft); font-size: .92rem; font-weight: 650; }
.nav-links a:hover { color: var(--brand-dark); }
.menu-toggle { display: none; width: 42px; height: 42px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 12px; }

.nav-cta, .button-primary, .button-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 20px; border: 0; border-radius: 999px; font-weight: 780;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.nav-cta, .button-primary { color: var(--white); background: var(--brand); box-shadow: 0 10px 24px rgba(22, 163, 106, .22); }
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

.price { color: var(--ink); font-size: 1.3rem; font-weight: 900; letter-spacing: -.035em; }
.price-old { color: var(--ink-soft); font-size: .9rem; text-decoration: line-through; }
.badge-off { padding: 4px 9px; color: #fff; background: #d95b55; border-radius: 999px; font-size: .72rem; font-weight: 850; }

.product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.product-card { position: relative; display: flex; flex-direction: column; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 22px; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.product-card:hover { border-color: rgba(22, 163, 106, .38); box-shadow: var(--shadow-lg); transform: translateY(-5px); }
.product-card[data-agotado] { opacity: .6; }
.product-badge { position: absolute; z-index: 2; top: 15px; left: 15px; padding: 6px 10px; color: var(--brand-dark); background: var(--brand-soft); border-radius: 999px; font-size: .7rem; font-weight: 850; }
.product-image { display: grid; height: 260px; padding: 20px; place-items: center; background: #f3f2ee; cursor: pointer; }
.product-image img { width: 100%; height: 220px; object-fit: contain; mix-blend-mode: multiply; }
.product-content { display: flex; flex: 1; flex-direction: column; padding: 23px; }
.product-category { margin-bottom: 8px; color: var(--brand-dark); font-size: .72rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.product-content h3 { margin-bottom: 10px; font-size: 1.17rem; line-height: 1.14; letter-spacing: -.035em; cursor: pointer; }
.product-description { margin-bottom: 20px; color: var(--ink-soft); font-size: .88rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.product-footer { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-top: auto; }
.product-prices { display: grid; gap: 2px; }
.product-card .button-primary { min-height: 42px; padding: 0 15px; font-size: .83rem; }

.site-footer { padding: 28px 0; color: #94a3b1; background: #0a1520; font-size: .78rem; }
.footer-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; }
.footer-links { display: flex; flex-wrap: wrap; gap: 18px; }
.footer-links a:hover { color: var(--white); }

.reveal { opacity: 0; transform: translateY(18px); transition: opacity .65s ease, transform .65s ease; }
.reveal.is-visible { opacity: 1; transform: translateY(0); }

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
  .product-grid { grid-template-columns: 1fr; }
  .footer-row { align-items: start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
  .reveal { opacity: 1; transform: none; }
}`;

const HEADER_HTML = `<header class="site-header">
  <div class="container nav">
    <a class="brand" href="#" data-gesicomm-inicio aria-label="Volver al inicio">
      <img class="brand-logo" data-gesicomm-tienda="logo" alt="">
      <span data-gesicomm-tienda="nombre">Tu tienda</span>
    </a>
    <button class="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
    <nav id="nav-links" class="nav-links" aria-label="Navegación principal">
      __LINKS__
    </nav>
  </div>
</header>`;

// Las políticas son obligatorias para PagoPar y para aprobar anuncios en
// Meta: van en las dos vistas aunque el diseño cambie.
const FOOTER_HTML = `<footer class="site-footer">
  <div class="container footer-row">
    <div>© 2026 <span data-gesicomm-tienda="nombre">Tu tienda</span>. Todos los derechos reservados.</div>
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

const INICIO_CSS = `${TOKENS_CSS}

.hero { position: relative; overflow: hidden; padding: 76px 0 92px; background: radial-gradient(circle at 74% 20%, rgba(255, 181, 71, .2), transparent 25%), radial-gradient(circle at 95% 90%, rgba(22, 163, 106, .17), transparent 29%), linear-gradient(135deg, #f9fbfd 0%, #eef8f3 100%); }
.hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); align-items: center; gap: 64px; }
h1 { max-width: 620px; margin-bottom: 22px; font-size: clamp(2.65rem, 5vw, 5rem); line-height: .99; letter-spacing: -.075em; }
h1 em { color: var(--brand); font-style: normal; }
.hero-copy { max-width: 570px; margin-bottom: 30px; color: var(--ink-soft); font-size: 1.1rem; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.mini-trust { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 28px; color: var(--ink-soft); font-size: .82rem; font-weight: 650; }
.mini-trust b { color: var(--brand); }
.hero-card { overflow: hidden; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); transform: rotate(2deg); cursor: pointer; }
.hero-image-wrap { display: grid; min-height: 335px; padding: 20px; place-items: center; background: #f2f2ed; }
.hero-image-wrap img { width: 100%; height: 330px; object-fit: contain; mix-blend-mode: multiply; }
.hero-card-copy { padding: 20px 24px 24px; }
.product-kicker { margin-bottom: 8px; color: var(--brand-dark); font-size: .72rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.hero-card h2 { margin-bottom: 12px; font-size: 1.5rem; line-height: 1.08; letter-spacing: -.04em; }
.price-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.trust-strip { border-bottom: 1px solid var(--line); background: var(--white); }
.trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; padding: 24px 0; }
.trust-item { display: flex; align-items: center; gap: 12px; color: var(--ink-soft); font-size: .86rem; }
.trust-icon { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 10px; font-weight: 900; }
.trust-item strong { display: block; color: var(--ink); font-size: .87rem; }

.benefit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.benefit-card { padding: 28px; background: var(--white); border: 1px solid var(--line); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
.benefit-icon { display: grid; width: 48px; height: 48px; margin-bottom: 20px; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 15px; font-size: 1.25rem; }
.benefit-card h3 { margin-bottom: 8px; font-size: 1.1rem; }
.benefit-card p { margin: 0; color: var(--ink-soft); font-size: .92rem; }

.products-section { background: var(--white); }
.combos-section { background: var(--brand-soft); }
.product-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.product-toolbar .section-heading { margin-bottom: 0; }
.product-count { color: var(--ink-soft); font-size: .9rem; font-weight: 700; }
.combo-includes { margin: 0 0 18px; color: var(--ink-soft); font-size: .82rem; }
.catalog-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; margin-bottom: 22px; }
.catalog-search, .catalog-select { min-height: 46px; padding: 0 14px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 12px; outline: none; }
.catalog-search:focus, .catalog-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(22, 163, 106, .13); }
.catalog-state { margin: 26px 0 0; color: var(--ink-soft); text-align: center; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 34px; color: var(--ink-soft); font-size: .9rem; font-weight: 700; }
.pagination button:disabled { opacity: .45; cursor: default; transform: none; }

.faq-section { background: var(--white); }
.faq-list { max-width: 820px; margin: 0 auto; border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-question { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 22px 0; color: var(--ink); background: transparent; border: 0; text-align: left; font-weight: 800; }
.faq-plus { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; color: var(--brand-dark); background: var(--brand-soft); border-radius: 50%; font-size: 1.25rem; transition: transform .2s ease; }
.faq-answer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }
.faq-answer > div { overflow: hidden; }
.faq-answer p { margin: 0; color: var(--ink-soft); font-size: .92rem; }
.faq-item.is-open .faq-answer { grid-template-rows: 1fr; }
.faq-item.is-open .faq-answer p { padding-bottom: 22px; }
.faq-item.is-open .faq-plus { transform: rotate(45deg); }

.contact-section { background: var(--ink); color: var(--white); }
.contact-layout { display: grid; grid-template-columns: .86fr 1.14fr; align-items: start; gap: 70px; }
.contact-section .eyebrow { color: #8ff2bd; }
.contact-section h2 { margin-bottom: 15px; font-size: clamp(2rem, 4vw, 3.35rem); line-height: 1.03; letter-spacing: -.065em; }
.contact-copy { color: #b5c2cc; }
.contact-list { display: grid; gap: 14px; margin-top: 28px; }
.contact-link { display: flex; align-items: center; gap: 11px; color: #e9f7ef; font-size: .92rem; background: none; border: 0; padding: 0; text-align: left; }
.contact-form { padding: 28px; color: var(--ink); background: var(--white); border-radius: 22px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.field { display: grid; gap: 7px; }
.field.full { grid-column: 1 / -1; }
.field label { color: var(--ink-soft); font-size: .8rem; font-weight: 780; }
.field input, .field textarea { width: 100%; padding: 13px 14px; color: var(--ink); background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; outline: none; }
.field input:focus, .field textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(22, 163, 106, .13); }
.field textarea { min-height: 110px; resize: vertical; }
.contact-form .button-primary { width: 100%; margin-top: 16px; }
.form-feedback { margin-top: 12px; padding: 10px 12px; color: var(--brand-dark); background: var(--brand-soft); border-radius: 9px; font-size: .82rem; }

@media (max-width: 960px) {
  .hero-grid, .contact-layout { grid-template-columns: 1fr; gap: 45px; }
  .trust-grid { grid-template-columns: repeat(2, 1fr); }
  .benefit-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .hero { padding: 52px 0 65px; }
  .hero-image-wrap { min-height: 260px; }
  .hero-image-wrap img { height: 250px; }
  .trust-grid { grid-template-columns: 1fr; gap: 14px; }
  .product-toolbar { align-items: start; flex-direction: column; gap: 5px; }
  .catalog-toolbar { grid-template-columns: 1fr 1fr; }
  .catalog-search { grid-column: 1 / -1; }
  .form-grid { grid-template-columns: 1fr; }
}`;

const INICIO_HTML = `<div class="announcement">
  <strong>Compra simple, productos útiles.</strong> Elegí tu favorito y completá tu pedido con pago seguro.
</div>

${HEADER_HTML.replace('__LINKS__', `<a href="#beneficios">Beneficios</a>
      <a href="#productos">Productos</a>
      <a href="#preguntas">Preguntas</a>
      <a href="#contacto">Contacto</a>
      <a class="nav-cta" href="#productos">Ver ofertas</a>`)}

<main data-gesicomm-base="catalogo">
  <section id="inicio" class="hero">
    <div class="container hero-grid">
      <div class="reveal">
        <p class="eyebrow">Elegido para tu día a día</p>
        <h1>Pequeños cambios. <em>Más comodidad.</em></h1>
        <p class="hero-copy">Productos prácticos, precios claros y una compra sin vueltas. Descubrí opciones pensadas para tu rutina, todo desde un solo lugar.</p>
        <div class="hero-actions">
          <a class="button-primary" href="#productos">Explorar productos <span aria-hidden="true">→</span></a>
          <a class="button-secondary" href="#beneficios">¿Por qué elegirnos?</a>
        </div>
        <div class="mini-trust">
          <span><b>✓</b> Compra rápida</span>
          <span><b>✓</b> Atención cercana</span>
          <span><b>✓</b> Pago seguro</span>
        </div>
      </div>

      <!-- Producto destacado: el primero de la selección. -->
      <div class="reveal" data-gesicomm-lista="productos" data-gesicomm-limite="1">
        <template>
          <article class="hero-card" data-gesicomm-ver>
            <div class="hero-image-wrap"><img data-gesicomm-bind="imagen" alt=""></div>
            <div class="hero-card-copy">
              <div class="product-kicker">Producto destacado · <span data-gesicomm-bind="categoria"></span></div>
              <h2 data-gesicomm-bind="nombre"></h2>
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

  <section class="trust-strip" aria-label="Beneficios de compra">
    <div class="container trust-grid">
      <div class="trust-item"><span class="trust-icon">✓</span><div><strong>Checkout simple</strong><span>Sin pasos innecesarios</span></div></div>
      <div class="trust-item"><span class="trust-icon">⌁</span><div><strong>Pago seguro</strong><span>Procesado por PagoPar</span></div></div>
      <div class="trust-item"><span class="trust-icon">♡</span><div><strong>Atención cercana</strong><span>Estamos para ayudarte</span></div></div>
      <div class="trust-item"><span class="trust-icon">↗</span><div><strong>Desde cualquier lugar</strong><span>En celular o computadora</span></div></div>
    </div>
  </section>

  <section id="beneficios" class="section">
    <div class="container">
      <div class="section-heading center reveal">
        <p class="eyebrow">Nuestra experiencia</p>
        <h2>Comprar bien también debería sentirse fácil.</h2>
        <p>Todo lo importante está a la vista para que elijas con confianza y avances rápido.</p>
      </div>
      <div class="benefit-grid">
        <article class="benefit-card reveal"><div class="benefit-icon">⌁</div><h3>Elegí sin complicarte</h3><p>Información clara, imágenes del producto y precios visibles desde el primer momento.</p></article>
        <article class="benefit-card reveal"><div class="benefit-icon">⚡</div><h3>Menos vueltas, más acción</h3><p>Encontrá lo que buscás y pasá al pago con un botón directo.</p></article>
        <article class="benefit-card reveal"><div class="benefit-icon">◈</div><h3>Una compra con respaldo</h3><p>Pagás en un entorno seguro, con atención cuando la necesites.</p></article>
      </div>
    </div>
  </section>

  <section id="productos" class="section products-section">
    <div class="container">
      <div class="product-toolbar">
        <div class="section-heading reveal">
          <p class="eyebrow">Ofertas seleccionadas</p>
          <h2>Encontrá tu próximo favorito.</h2>
          <p>Opciones pensadas para hacer más práctico tu día.</p>
        </div>
        <div class="product-count" data-gesicomm-total></div>
      </div>

      <!-- Buscador y filtros: funcionan igual con 10 productos que con 5.000
           (con muchos, Gesicomm pide cada página al servidor). -->
      <div class="catalog-toolbar">
        <input class="catalog-search" type="search" placeholder="Buscar productos" aria-label="Buscar productos" data-gesicomm-buscar>
        <select class="catalog-select" aria-label="Categoría" data-gesicomm-filtro="categoria">
          <option value="">Todas las categorías</option>
        </select>
        <select class="catalog-select" aria-label="Ordenar" data-gesicomm-filtro="orden">
          <option value="">Destacados</option>
          <option value="min-max">Menor precio</option>
          <option value="max-min">Mayor precio</option>
          <option value="az">A → Z</option>
        </select>
      </div>

      <!-- Gesicomm clona el <template> una vez por producto de la página actual. -->
      <div class="product-grid" data-gesicomm-lista="catalogo" data-gesicomm-si-vacio="mostrar">
        <template>
          <!-- Sin .reveal: el catálogo se repinta al filtrar o cambiar de
               página, y la animación de aparición corre una sola vez. -->
          <article class="product-card">
            <div class="product-badge" data-gesicomm-bind="etiqueta"></div>
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <div class="product-category" data-gesicomm-bind="categoria"></div>
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <p class="product-description" data-gesicomm-bind="descripcion"></p>
              <div class="product-footer">
                <div class="product-prices">
                  <span class="price-old" data-gesicomm-bind="precio_antes"></span>
                  <span class="price" data-gesicomm-bind="precio"></span>
                </div>
                <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora</button>
              </div>
            </div>
          </article>
        </template>
      </div>
      <p class="catalog-state" data-gesicomm-cargando style="display:none">Cargando productos…</p>
      <p class="catalog-state" data-gesicomm-sin-resultados style="display:none">No encontramos productos con esa búsqueda.</p>
      <nav class="pagination" aria-label="Páginas del catálogo">
        <button class="button-secondary" type="button" data-gesicomm-pagina="anterior">← Anterior</button>
        <span data-gesicomm-paginacion></span>
        <button class="button-secondary" type="button" data-gesicomm-pagina="siguiente">Siguiente →</button>
      </nav>
    </div>
  </section>

  <!-- Si la landing no tiene combos, esta sección se oculta sola. -->
  <section id="combos" class="section combos-section" data-gesicomm-lista="combos">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Combos</p>
        <h2>Llevá más, pagá menos.</h2>
        <p>Packs armados para que tengas todo junto a mejor precio.</p>
      </div>
      <div class="product-grid" data-gesicomm-lista="combos">
        <template>
          <article class="product-card reveal">
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

  <section id="preguntas" class="section faq-section">
    <div class="container">
      <div class="section-heading center reveal">
        <p class="eyebrow">Preguntas frecuentes</p>
        <h2>Lo que necesitás saber antes de comprar.</h2>
      </div>
      <div class="faq-list reveal">
        <div class="faq-item is-open">
          <button class="faq-question" type="button" aria-expanded="true"><span>¿Cómo realizo mi compra?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Elegí el producto, tocá “Comprar ahora”, completá tus datos de entrega y elegí cómo pagar.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Cómo se procesa el pago?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Podés pagar online con PagoPar (tarjeta, billeteras, transferencia) o en efectivo al recibir, según lo que esté habilitado.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Hacen envíos a todo el país?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Al completar tu pedido vas a ver las ciudades disponibles y el costo de envío antes de confirmar.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Necesito crear una cuenta?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>No. Solo te pedimos los datos necesarios para entregarte el pedido.</p></div></div>
        </div>
      </div>
    </div>
  </section>

  <section id="contacto" class="section contact-section">
    <div class="container contact-layout">
      <div class="reveal">
        <p class="eyebrow">¿Necesitás ayuda?</p>
        <h2>Estamos a un mensaje de distancia.</h2>
        <p class="contact-copy">¿Tenés una duda sobre un producto o tu pedido? Escribinos y te orientamos.</p>
        <div class="contact-list">
          <button class="contact-link" type="button" data-gesicomm-whatsapp="Hola! Tengo una consulta">◌ Escribinos por WhatsApp</button>
          <span class="contact-link">✉ <span data-gesicomm-tienda="email"></span></span>
          <span class="contact-link">⌂ <span data-gesicomm-tienda="direccion"></span></span>
        </div>
      </div>

      <!-- Al enviar: se registra como Lead y se abre el WhatsApp de la tienda con los datos. -->
      <form class="contact-form reveal" data-gesicomm-form="contacto">
        <div class="form-grid">
          <div class="field"><label for="nombre">Nombre</label><input id="nombre" name="nombre" type="text" placeholder="Tu nombre" required></div>
          <div class="field"><label for="telefono">Celular</label><input id="telefono" name="telefono" type="tel" placeholder="0981 123 456" required></div>
          <div class="field full"><label for="mensaje">¿En qué podemos ayudarte?</label><textarea id="mensaje" name="mensaje" placeholder="Escribí tu consulta" required></textarea></div>
        </div>
        <button class="button-primary" type="submit">Enviar consulta <span aria-hidden="true">→</span></button>
        <div class="form-feedback" data-gesicomm-form-ok style="display:none">¡Gracias! Te abrimos WhatsApp para que nos mandes la consulta.</div>
      </form>
    </div>
  </section>
</main>

${FOOTER_HTML}`;

// ─── FICHA DE PRODUCTO ───────────────────────────────────────────────────

const PRODUCTO_CSS = `${TOKENS_CSS}

.breadcrumb { display: flex; flex-wrap: wrap; gap: 8px; padding: 22px 0 0; color: var(--ink-soft); font-size: .82rem; }
.breadcrumb a { color: var(--brand-dark); font-weight: 700; cursor: pointer; }

.pdp { display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; padding: 32px 0 80px; align-items: start; }
.gallery { position: sticky; top: 100px; display: grid; gap: 14px; }
.gallery-main { display: grid; place-items: center; aspect-ratio: 1; padding: 28px; background: #f3f2ee; border-radius: var(--radius-lg); }
.gallery-main img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
.thumbs { display: flex; gap: 10px; overflow-x: auto; }
.thumb { flex: 0 0 76px; height: 76px; padding: 6px; background: #f3f2ee; border: 2px solid transparent; border-radius: 14px; cursor: pointer; }
.thumb:hover { border-color: var(--brand); }
.thumb img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }

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
.qty { width: 92px; min-height: 52px; padding: 0 12px; text-align: center; background: var(--white); border: 1.5px solid var(--line); border-radius: 999px; font-weight: 800; }
.buy-row .button-primary { flex: 1; min-height: 52px; font-size: 1rem; }
.buy-secondary { display: flex; gap: 10px; margin-bottom: 26px; }
.buy-secondary .button-secondary { flex: 1; }

.offers { display: grid; gap: 12px; margin-bottom: 26px; }
/* Order bump. Lo que sostienen los datos: casilla en el mismo lugar de la
   compra, precio anterior tachado, poco texto. El borde punteado y la
   franja de color son la convención del formato para que se note. */
.bumps { display: grid; gap: 12px; margin-bottom: 18px; }
.bump { display: block; overflow: hidden; background: #fffdf5; border: 2px dashed #f0b43c; border-radius: 16px; cursor: pointer; transition: border-color .2s ease, background .2s ease; }
.bump:hover { border-color: #d98f06; }
.bump.is-checked, .bump:has(.bump-check:checked) { background: var(--brand-soft); border-style: solid; border-color: var(--brand); }
.bump-flag { display: block; padding: 7px 14px; color: #6b4a00; background: #ffe3a3; font-size: .72rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.bump.is-checked .bump-flag, .bump:has(.bump-check:checked) .bump-flag { color: var(--white); background: var(--brand); }
.bump-body { display: flex; gap: 12px; align-items: flex-start; padding: 14px; }
.bump-check { flex: 0 0 22px; width: 22px; height: 22px; margin: 2px 0 0; accent-color: var(--brand); cursor: pointer; }
.bump-img { flex: 0 0 56px; width: 56px; height: 56px; object-fit: contain; background: var(--white); border-radius: 10px; }
.bump-copy { display: grid; flex: 1; gap: 4px; min-width: 0; }
.bump-title { font-weight: 800; line-height: 1.25; }
.bump-text { color: var(--ink-soft); font-size: .86rem; }
.bump-prices { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.bump-prices b { font-size: 1.05rem; }
.bump-prices s { color: var(--ink-soft); font-size: .85rem; }
.bump-prices em, .offer-save { color: #b42318; font-size: .82rem; font-style: normal; font-weight: 800; }
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
.description-body { max-width: 760px; color: var(--ink-soft); font-size: 1.02rem; white-space: pre-line; }

.related { padding: 80px 0; }

@media (max-width: 960px) {
  .pdp { grid-template-columns: 1fr; gap: 30px; }
  .gallery { position: static; }
}
@media (max-width: 720px) {
  .mini-trust { grid-template-columns: 1fr; }
  .offer .button-primary, .offer .button-secondary, .upsell .button-primary { flex: 1 1 100%; }
}`;

const PRODUCTO_HTML = `<div class="announcement">
  <strong>Pago seguro.</strong> Pagás online con PagoPar o al recibir, según tu ciudad.
</div>

${HEADER_HTML.replace('__LINKS__', `<a href="#" data-gesicomm-inicio>Inicio</a>
      <a href="#descripcion">Detalles</a>
      <a href="#relacionados">Te puede gustar</a>
      <button class="nav-cta" type="button" data-gesicomm-whatsapp>Consultar</button>`)}

<main class="container">
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
      <div class="pdp-prices">
        <span class="price" data-gesicomm-bind="precio"></span>
        <span class="price-old" data-gesicomm-bind="precio_antes"></span>
        <span class="badge-off" data-gesicomm-bind="descuento"></span>
      </div>
      <p class="pdp-lead" data-gesicomm-bind="descripcion"></p>

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
          <label class="bump">
            <span class="bump-flag">Oferta solo con esta compra</span>
            <span class="bump-body">
              <input class="bump-check" type="checkbox" data-gesicomm-bump>
              <img class="bump-img" data-gesicomm-bind="imagen" alt="">
              <span class="bump-copy">
                <span class="bump-title" data-gesicomm-bind="nombre"></span>
                <span class="bump-text" data-gesicomm-bind="descripcion"></span>
                <span class="bump-prices">
                  <b data-gesicomm-bind="precio"></b>
                  <s data-gesicomm-bind="precio_antes"></s>
                  <em data-gesicomm-bind="ahorro"></em>
                </span>
              </span>
            </span>
          </label>
        </template>
      </div>

      <div class="buy-row">
        <input class="qty" type="number" min="1" max="99" value="1" aria-label="Cantidad" data-gesicomm-cantidad-input>
        <button class="button-primary" type="button" data-gesicomm-comprar>Comprar ahora</button>
      </div>
      <div class="buy-secondary">
        <button class="button-secondary" type="button" data-gesicomm-agregar>Agregar al carrito</button>
        <button class="button-secondary" type="button" data-gesicomm-whatsapp>Consultar por WhatsApp</button>
      </div>

      <!-- Paquetes: el mismo producto en más cantidad. -->
      <div data-gesicomm-lista="ofertas_pack">
        <div class="block-title">Llevá más y ahorrá</div>
        <div class="offers">
          <template>
            <div class="offer">
              <div>
                <h4 data-gesicomm-bind="nombre"></h4>
                <span class="price" data-gesicomm-bind="precio"></span>
                <span class="price-old" data-gesicomm-bind="precio_antes"></span>
                <span class="offer-save" data-gesicomm-bind="ahorro"></span>
              </div>
              <button class="button-secondary" type="button" data-gesicomm-oferta>Elegir</button>
            </div>
          </template>
        </div>
      </div>

      <div class="mini-trust">
        <div><strong>Pago seguro</strong>PagoPar o efectivo</div>
        <div><strong>Envío</strong>Costo visible antes de pagar</div>
        <div><strong>Atención</strong>Te respondemos por WhatsApp</div>
      </div>
    </div>
  </section>
</main>

<section id="descripcion" class="description">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Detalles</p><h2>Todo lo que tenés que saber.</h2></div>
    <p class="description-body" data-gesicomm-bind="descripcion_larga"></p>
  </div>
</section>

<!-- Recomendados: según la configuración de venta de la landing. -->
<section id="relacionados" class="related" data-gesicomm-lista="recomendados">
  <div class="container">
    <div class="section-heading"><p class="eyebrow">Te puede gustar</p><h2>Completá tu compra.</h2></div>
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

${FOOTER_HTML}`;

// ─── PRODUCTO ESTRELLA ───────────────────────────────────────────────────
// Página de venta larga de UN producto: todo empuja a comprar el principal
// (data-gesicomm-comprar="principal" = el primero de la landing, el que se
// eligió como estrella). El resto de la selección va como complemento.

const ESTRELLA_CSS = `${INICIO_CSS}

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
.step::before { counter-increment: paso; content: counter(paso); display: grid; width: 34px; height: 34px; margin-bottom: 14px; place-items: center; color: var(--white); background: var(--brand); border-radius: 50%; font-weight: 900; }
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

const ESTRELLA_HTML = `<div class="announcement">
  <strong>Pago seguro.</strong> Pagás online con PagoPar o al recibir, según tu ciudad.
</div>

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
      <div class="section-heading"><p class="eyebrow">Complementá tu compra</p><h2>Suele llevarse junto.</h2></div>
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

const COMBOS_HTML = `<div class="announcement">
  <strong>Llevá más, pagá menos.</strong> Combos armados con precio especial.
</div>

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

export const PLANTILLA_INICIO = { html: INICIO_HTML, css: INICIO_CSS, js: JS_COMUN };
export const PLANTILLA_ESTRELLA = { html: ESTRELLA_HTML, css: ESTRELLA_CSS, js: JS_COMUN };
export const PLANTILLA_COMBOS = { html: COMBOS_HTML, css: INICIO_CSS, js: JS_COMUN };

/** La página de inicio base de cada formato de venta. */
export function plantillaInicioPara(tipo) {
  if (tipo === 'producto_unico') return PLANTILLA_ESTRELLA;
  if (tipo === 'combos') return PLANTILLA_COMBOS;
  return PLANTILLA_INICIO;
}

/** De qué formato es la base que tiene este HTML (o null si no es una base). */
export function formatoDeBase(html) {
  const m = String(html || '').match(/data-gesicomm-base="([a-z_]+)"/);
  return m ? m[1] : null;
}
export const PLANTILLA_PRODUCTO = { html: PRODUCTO_HTML, css: PRODUCTO_CSS, js: JS_COMUN };
