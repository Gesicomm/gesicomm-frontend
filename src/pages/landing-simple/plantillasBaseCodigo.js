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
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; color: var(--gc-texto-sobre-primario); background: var(--brand); border-radius: 12px; box-shadow: 0 8px 18px color-mix(in srgb, var(--brand) 25%, transparent); font-weight: 900; }
.brand-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 10px; }
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
.product-card { position: relative; display: flex; flex-direction: column; overflow: hidden; background: var(--white); border: 1px solid var(--line); border-radius: 22px; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.product-card:hover { border-color: color-mix(in srgb, var(--brand) 38%, transparent); box-shadow: var(--shadow-lg); transform: translateY(-5px); }
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

const LIMITED_OFFER_HTML = `<section class="limited-offer" data-gesicomm-countdown>
  <div class="container limited-offer-card">
    <div>
      <p class="limited-offer-kicker">Oferta por tiempo limitado</p>
      <h2>Comprá hoy con la mejor condición disponible.</h2>
      <p>La fecha real se configura en Gesicomm; el contador se actualiza solo.</p>
    </div>
    <div class="countdown" aria-label="Cuenta regresiva de la oferta">
      <span class="countdown-box"><b data-gesicomm-countdown-parte="horas">--</b><small>horas</small></span>
      <span class="countdown-box"><b data-gesicomm-countdown-parte="minutos">--</b><small>min</small></span>
      <span class="countdown-box"><b data-gesicomm-countdown-parte="segundos">--</b><small>seg</small></span>
    </div>
    <a class="button-primary" href="#productos">Ver ofertas <span aria-hidden="true">→</span></a>
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

const INICIO_CSS = `${TOKENS_CSS}

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
.hero-image-wrap { display: grid; min-height: 345px; padding: 20px; place-items: center; background: linear-gradient(145deg, #f8fafc, #eff6ff); }
.hero-image-wrap img { width: 100%; height: 330px; object-fit: contain; mix-blend-mode: multiply; }
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
.category-media { display: grid; height: 74px; place-items: center; overflow: hidden; background: var(--white); border-radius: 14px; }
.category-media img { width: 100%; height: 74px; object-fit: contain; mix-blend-mode: multiply; }
.category-card strong { font-size: .95rem; line-height: 1.15; }
.category-card small { color: var(--ink-soft); font-weight: 750; }

.showcase-section { background: var(--white); }
.muted-section { background: var(--paper); }
.section-action { margin-top: -18px; text-align: right; }
.spotlight-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.product-grid { grid-template-columns: repeat(4, 1fr); }
.product-card { border-radius: 18px; }
.product-image { height: 220px; background: #f8fafc; }
.product-image img { height: 188px; }
.product-content { padding: 20px; }
.product-content h3 { font-size: 1.05rem; }
.product-footer { align-items: center; }
.product-card .button-primary { min-height: 40px; padding-inline: 13px; }
.combo-includes { margin: 0 0 18px; color: var(--ink-soft); font-size: .82rem; }

.promo-band { padding: 0 0 70px; background: var(--white); }
.promo-inner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr); gap: 30px; align-items: center; padding: 42px; color: var(--ink); background: linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #fff7ed 100%); border: 1px solid var(--line); border-radius: 28px; box-shadow: var(--shadow-lg); }
.promo-inner h2 { margin-bottom: 10px; font-size: clamp(2rem, 4vw, 3.3rem); line-height: 1.02; letter-spacing: -.06em; }
.promo-inner p { max-width: 560px; margin-bottom: 22px; color: var(--ink-soft); }
.promo-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.promo-metrics div { padding: 18px; background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-sm); }
.promo-metrics strong { display: block; font-size: 1.8rem; line-height: 1; }
.promo-metrics span { color: var(--ink-soft); font-size: .82rem; }

.collection-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.collection-card { min-height: 210px; padding: 26px; color: var(--ink); background: #ffffff; border: 1px solid var(--line); border-top: 5px solid #2563eb; border-radius: 22px; box-shadow: var(--shadow-sm); }
.collection-card:nth-child(2) { border-top-color: #f59e0b; background: #fffaf0; }
.collection-card:nth-child(3) { border-top-color: #10b981; background: #f0fdf4; }
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
  .mini-trust, .trust-grid, .category-grid, .spotlight-grid, .product-grid, .collection-grid, .benefit-grid, .promo-metrics { grid-template-columns: 1fr; }
  .spotlight-grid > article:nth-of-type(n+3) { display: none; }
  .product-toolbar { align-items: start; flex-direction: column; gap: 5px; }
  .catalog-toolbar { grid-template-columns: 1fr; }
  .promo-inner { padding: 28px; border-radius: 22px; }
  .form-grid { grid-template-columns: 1fr; }
}`;

const INICIO_HTML = `${ANNOUNCEMENT_HTML}

${HEADER_HTML.replace('__LINKS__', `<a href="#categorias">Categorías</a>
      <a href="#destacados">Destacados</a>
      <a href="#combos">Combos</a>
      <a href="#productos">Catálogo</a>
      <a class="nav-cta" href="#productos">Comprar ahora</a>`)}

<main data-gesicomm-base="catalogo">
  <section id="inicio" class="hero">
    <div class="container hero-grid">
      <div class="reveal">
        <p class="eyebrow">Campañas de la tienda</p>
        <h1>Ofertas, novedades y favoritos <em>en un solo lugar.</em></h1>
        <p class="hero-copy">Una homepage preparada para vender: categorías rápidas, vitrinas comerciales, combos, catálogo completo y ayuda por WhatsApp.</p>
        <div class="hero-actions">
          <a class="button-primary" href="#destacados">Ver destacados <span aria-hidden="true">→</span></a>
          <a class="button-secondary" href="#categorias">Explorar categorías</a>
        </div>
        <div class="mini-trust">
          <span><b>✓</b> Pago seguro</span>
          <span><b>✓</b> Envío coordinado</span>
          <span><b>✓</b> Atención por WhatsApp</span>
        </div>
      </div>

      <!-- Carrusel de campaña: usa productos destacados reales de Configurar venta. -->
      <div class="reveal featured-carousel" data-gesicomm-lista="productos_destacados">
        <template>
          <article class="hero-card" data-gesicomm-ver>
            <div class="hero-image-wrap"><img data-gesicomm-bind="imagen" alt=""></div>
            <div class="hero-card-copy">
              <div class="product-kicker">Campaña · <span data-gesicomm-bind="categoria"></span></div>
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
      <div class="trust-item"><span class="trust-icon">↗</span><div><strong>Envío claro</strong><span>Costo visible antes de confirmar</span></div></div>
      <div class="trust-item"><span class="trust-icon">♡</span><div><strong>Atención cercana</strong><span>Te ayudamos por WhatsApp</span></div></div>
    </div>
  </section>

  <section id="categorias" class="category-strip">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Categorías rápidas</p>
        <h2>Entrá por lo que estás buscando.</h2>
      </div>
      <div class="category-grid" data-gesicomm-lista="categorias" data-gesicomm-limite="6">
        <template>
          <button class="category-card" type="button">
            <span class="category-media"><img data-gesicomm-bind="imagen" alt="" loading="lazy"></span>
            <strong data-gesicomm-bind="nombre"></strong>
            <small data-gesicomm-bind="cantidad_texto"></small>
          </button>
        </template>
      </div>
    </div>
  </section>

  <section id="destacados" class="section showcase-section">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Productos destacados</p>
        <h2>Elegidos para abrir la vidriera.</h2>
        <p>Los productos marcados en Configurar venta aparecen primero para que el cliente no tenga que buscar desde cero.</p>
      </div>
      <div class="spotlight-grid" data-gesicomm-lista="productos_destacados" data-gesicomm-limite="4">
        <template>
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
                <button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  <section class="promo-band">
    <div class="container promo-inner reveal">
      <div>
        <p class="eyebrow">Banner comercial</p>
        <h2>Promoción principal lista para personalizar.</h2>
        <p>Usá este bloque para Semana de cocina, nuevos ingresos, envío gratis o la campaña que más convenga en tu tienda.</p>
        <a class="button-primary" href="#productos">Ver productos</a>
      </div>
      <div class="promo-metrics" aria-label="Datos comerciales">
        <div><strong>24 h</strong><span>para destacar urgencia</span></div>
        <div><strong>+4</strong><span>vitrinas antes del catálogo</span></div>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Más vendidos</p>
        <h2>Lo que conviene mostrar antes del catálogo.</h2>
      </div>
      <!-- "Más vendidos" real no se puede calcular (no hay módulo de ventas
           todavía): el comercio elige acá mismo, desde la pestaña
           "Secciones" del editor, qué productos muestra. Sin elegir
           ninguno, esta grilla queda vacía (ver renderizarLista). -->
      <div class="spotlight-grid" data-gesicomm-lista="productos_manual">
        <template>
          <article class="product-card">
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
              <div class="product-category" data-gesicomm-bind="categoria"></div>
              <h3 data-gesicomm-bind="nombre" data-gesicomm-ver></h3>
              <div class="product-footer">
                <div class="product-prices"><span class="price" data-gesicomm-bind="precio"></span></div>
                <button class="button-primary" type="button" data-gesicomm-comprar>Comprar</button>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  ${LIMITED_OFFER_HTML}

  <section class="section showcase-section">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Colecciones</p>
        <h2>Rutas comerciales para ordenar la compra.</h2>
      </div>
      <div class="collection-grid">
        <a class="collection-card reveal" href="#productos"><h3>Ofertas especiales</h3><p>Productos con precio anterior, packs o campaña activa.</p></a>
        <a class="collection-card reveal" href="#categorias"><h3>Comprar por categoría</h3><p>Un acceso visual para entrar directo a la familia correcta.</p></a>
        <a class="collection-card reveal" href="#combos"><h3>Combos y bundles</h3><p>La sección ideal para aumentar ticket promedio.</p></a>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Nuevos ingresos</p>
        <h2>Más motivos para seguir navegando.</h2>
      </div>
      <div class="spotlight-grid" data-gesicomm-lista="productos_novedades" data-gesicomm-limite="4">
        <template>
          <article class="product-card">
            <div class="product-badge">Nuevo</div>
            <div class="product-image" data-gesicomm-ver><img data-gesicomm-bind="imagen" alt="" loading="lazy"></div>
            <div class="product-content">
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

  <section id="productos" class="section products-section">
    <div class="container">
      <div class="product-toolbar">
        <div class="section-heading reveal">
          <p class="eyebrow">Catálogo completo</p>
          <h2>Ahora sí, todos los productos.</h2>
          <p>Buscá, filtrá y ordená cuando ya viste la vidriera principal.</p>
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
      <p class="catalog-state" data-gesicomm-cargando style="display:none">Cargando productos...</p>
      <p class="catalog-state" data-gesicomm-sin-resultados style="display:none">No encontramos productos con esa búsqueda.</p>
      <nav class="pagination" aria-label="Páginas del catálogo">
        <button class="button-secondary" type="button" data-gesicomm-pagina="anterior">Anterior</button>
        <span data-gesicomm-paginacion></span>
        <button class="button-secondary" type="button" data-gesicomm-pagina="siguiente">Siguiente</button>
      </nav>
    </div>
  </section>

  <section class="section reviews-section">
    <div class="container">
      <div class="section-heading reveal">
        <p class="eyebrow">Confianza</p>
        <h2>Prueba social lista para datos reales.</h2>
      </div>
      <div class="review-grid">
        <div class="rating-card reveal"><strong>4,8</strong><div class="stars">★★★★★</div><p>Promedio de referencia. Reemplazalo por reseñas reales cuando las tengas.</p></div>
        <article class="review-card reveal"><div class="stars">★★★★★</div><p>"Llegó rápido y exactamente como esperaba."</p><b>María G.</b><small>Compra verificada</small></article>
        <article class="review-card reveal"><div class="stars">★★★★★</div><p>"Muy buena atención por WhatsApp."</p><b>Carlos R.</b><small>Compra verificada</small></article>
      </div>
    </div>
  </section>

  <section id="beneficios" class="section">
    <div class="container">
      <div class="section-heading center reveal">
        <p class="eyebrow">Beneficios de compra</p>
        <h2>Las garantías quedan cerca del cierre.</h2>
        <p>Compactas, claras y sin competir con las vitrinas de producto.</p>
      </div>
      <div class="benefit-grid">
        <article class="benefit-card reveal"><div class="benefit-icon">⌁</div><h3>Pago claro</h3><p>Precio y medio de pago visibles antes de confirmar.</p></article>
        <article class="benefit-card reveal"><div class="benefit-icon">↗</div><h3>Envío coordinado</h3><p>Consultá cobertura y costo desde el checkout.</p></article>
        <article class="benefit-card reveal"><div class="benefit-icon">♡</div><h3>Soporte humano</h3><p>WhatsApp disponible para dudas sobre productos o pedidos.</p></article>
        <article class="benefit-card reveal"><div class="benefit-icon">✓</div><h3>Compra simple</h3><p>Sin cuenta obligatoria y con los datos justos.</p></article>
      </div>
    </div>
  </section>

  <section id="preguntas" class="section faq-section">
    <div class="container">
      <div class="section-heading center reveal">
        <p class="eyebrow">Preguntas frecuentes</p>
        <h2>Reducí dudas antes del pago.</h2>
      </div>
      <div class="faq-list reveal">
        <div class="faq-item is-open">
          <button class="faq-question" type="button" aria-expanded="true"><span>¿Cómo realizo mi compra?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Elegí el producto, tocá "Comprar ahora", completá tus datos de entrega y elegí cómo pagar.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Qué medios de pago aceptan?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Podés pagar online con PagoPar o en efectivo al recibir, según lo que esté habilitado por la tienda.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Cuánto tarda la entrega?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>El plazo depende de tu ciudad. Al completar el pedido ves cobertura y costo antes de confirmar.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Tienen cambios o devoluciones?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Revisá la política de reembolso del footer o escribinos por WhatsApp para confirmar las condiciones de tu producto.</p></div></div>
        </div>
        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false"><span>¿Cómo hago seguimiento del pedido?</span><span class="faq-plus" aria-hidden="true">+</span></button>
          <div class="faq-answer"><div><p>Te contactamos por WhatsApp o el canal definido por la tienda cuando el pedido avance.</p></div></div>
        </div>
      </div>
    </div>
  </section>

  <section id="contacto" class="section contact-section">
    <div class="container contact-layout">
      <div class="reveal">
        <p class="eyebrow">CTA final</p>
        <h2>¿Querés ayuda para elegir?</h2>
        <p class="contact-copy">Escribinos por WhatsApp o dejá tu consulta. La última pantalla vuelve a abrir una acción clara.</p>
        <div class="contact-list">
          <button class="contact-link" type="button" data-gesicomm-whatsapp="Hola! Tengo una consulta">Escribinos por WhatsApp</button>
          <span class="contact-link">Email: <span data-gesicomm-tienda="email"></span></span>
          <span class="contact-link">Dirección: <span data-gesicomm-tienda="direccion"></span></span>
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
        <div class="form-feedback" data-gesicomm-form-ok style="display:none">Gracias. Te abrimos WhatsApp para que nos mandes la consulta.</div>
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

export const PLANTILLA_INICIO = { html: INICIO_HTML, css: INICIO_CSS, js: JS_COMUN };
export const PLANTILLA_ESTRELLA = { html: ESTRELLA_HTML, css: ESTRELLA_CSS, js: JS_COMUN };
export const PLANTILLA_COMBOS = { html: COMBOS_HTML, css: INICIO_CSS, js: JS_COMUN };

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
