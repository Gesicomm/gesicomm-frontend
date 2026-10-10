import { test, expect } from '@playwright/test';
import { construirDocumentoCodigo } from '../src/pages/landing-simple/construirDocumentoCodigo.js';
import { PLANTILLA_CATALOGO, PLANTILLA_CATEGORIA, PLANTILLA_INICIO, PLANTILLA_PRODUCTO } from '../src/pages/landing-simple/plantillasBaseCodigo.js';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const coloresTienda = {
  primario: '#155E63',
  secundario: '#D8A862',
  fondo: '#101A21',
};

const producto = {
  id: 10,
  nombre: 'Calefactor QA',
  categoria: 'Climatizacion',
  categoria_id: 1,
  precio_base: 138859,
  precio_efectivo: 138859,
  precio_ancla: 350000,
  imagen: 'https://cdn.gesicomm.com/qa/calefactor.webp',
  imagenes: [{ id: 1, url: 'https://cdn.gesicomm.com/qa/calefactor.webp', es_principal: true, orden: 0 }],
  tipo: 'producto',
};

function contraste(a, b) {
  const canal = color => color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = ([r, g, bl]) => 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  const [l1, l2] = [lum(canal(a)), lum(canal(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('la vista previa de configurar landing recibe los colores anidados de Mi tienda', async ({ page }) => {
  await page.route('**/api/**', route => json(route, {}));
  await page.route('**/api/auth/me', route => json(route, {
    id: 1,
    nombre: 'Admin QA',
    email: 'admin.qa@test.local',
    rol: 'administrador',
  }));
  await page.route('**/api/mi-tienda', route => json(route, {
    id: 1,
    nombre: 'sommix',
    subdominio: 'sommix',
    colores: coloresTienda,
    whatsapp: '+595981000000',
  }));
  await page.route('**/api/vitrina/catalogo-paginado', route => json(route, {
    items: [producto],
    total: 1,
    page: 1,
    limit: 10000,
  }));
  await page.route('**/api/ofertas**', route => json(route, []));
  await page.route('**/api/mis-landings-simples/991', route => json(route, {
    id: 991,
    titulo: 'Landing QA',
    template: { kind: 'codigo', slug: 'codigo' },
    content: {
      venta: { configurado: false, tipo: 'catalogo', seleccion: 'manual' },
      codigo: {
        html: '<main><section id="productos">HTML viejo sin branding</section></main>',
        css: '',
        js: '',
      },
    },
    items: [{ tipo: 'producto', referencia_id: 10, orden: 0 }],
  }));

  await page.goto('http://127.0.0.1:5174/landing/991');
  await expect(page.getByRole('heading', { name: 'Configurar tienda' })).toBeVisible();

  const iframe = page.locator('iframe').first();
  await expect(iframe).toBeVisible();
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.locator('body').waitFor();

  const estilos = await frame.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);

    return {
      tiendaPrimario: root.getPropertyValue('--tienda-primario').trim(),
      tiendaSecundario: root.getPropertyValue('--tienda-secundario').trim(),
      tiendaFondo: root.getPropertyValue('--tienda-fondo').trim(),
      gcPrimario: root.getPropertyValue('--gc-primario').trim(),
      bodyBackground: body.backgroundColor,
    };
  });

  expect(estilos.tiendaPrimario).toBe(coloresTienda.primario);
  expect(estilos.tiendaSecundario).toBe(coloresTienda.secundario);
  expect(estilos.tiendaFondo).toBe(coloresTienda.fondo);
  expect(estilos.gcPrimario).toBe(coloresTienda.primario);
  expect(estilos.bodyBackground).toBe('rgb(16, 26, 33)');
});

test('la plantilla base visible no deja la barra superior con colores default', async ({ page }) => {
  const html = construirDocumentoCodigo(PLANTILLA_INICIO, {
    datos: { tienda: { nombre: 'sommix', colores: coloresTienda }, productos: [], catalogo: {} },
  });

  await page.setContent(html);
  await expect(page.locator('.trust-bar')).toBeVisible();

  const estilos = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const trustBar = getComputedStyle(document.querySelector('.trust-bar'));
    const strong = getComputedStyle(document.querySelector('.trust-item strong'));
    return {
      tiendaPrimario: root.getPropertyValue('--tienda-primario').trim(),
      tiendaBanda: root.getPropertyValue('--tienda-banda').trim(),
      navy: root.getPropertyValue('--navy').trim(),
      trustBarBackground: trustBar.backgroundColor,
      trustBarStrong: strong.color,
    };
  });

  expect(estilos.tiendaPrimario).toBe(coloresTienda.primario);
  expect(estilos.navy).not.toBe(estilos.tiendaBanda);
  expect(estilos.trustBarBackground).not.toBe('rgb(6, 43, 79)');
  expect(estilos.trustBarStrong).not.toBe('rgb(115, 201, 245)');
});

test('textos de productos y Nuestra marca mantienen contraste con fondo oscuro', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main data-gesicomm-base="catalogo">
        <section data-gesicomm-lista="productos">
          <article class="product-card">
            <div class="product-image"><img data-gesicomm-bind="imagen" src="${producto.imagen}" alt=""></div>
            <div class="product-content">
              <div class="product-category">Climatizacion</div>
              <h3>${producto.nombre}</h3>
              <div class="product-footer">
                <span class="price">Gs 138.859</span>
                <button class="button-primary" type="button">Comprar con pago anticipado</button>
              </div>
            </div>
          </article>
        </section>
        <div class="page-content">
          <section class="brand-section">
            <div class="brand-layout">
              <div class="brand-media"><div class="brand-medio"><img src="${producto.imagen}" alt=""></div></div>
              <div class="brand-copy">
                <p class="eyebrow">Nuestra marca</p>
                <h2>Comprá con confianza en nuestra tienda.</h2>
                <p>Seleccionamos productos pensados para resolver compras reales.</p>
                <div class="brand-badges"><span class="brand-badge">Atención personalizada</span></div>
              </div>
            </div>
          </section>
        </div>
      </main>
    `,
    css: `
      .product-card { background: #18232a; color: var(--navy); }
      .product-content { background: #18232a; }
      .brand-section { background: #fff; }
      .brand-copy h2, .brand-copy p, .brand-badge { color: var(--navy); }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.product-card h3').first()).toHaveText(producto.nombre);
  await expect(page.locator('.brand-copy h2')).toBeVisible();

  const estilos = await page.evaluate(() => {
    const productoTitulo = document.querySelector('.product-card h3');
    const productoPanel = productoTitulo.closest('.product-content');
    const marcaTitulo = document.querySelector('.brand-copy h2');
    const marcaSeccion = marcaTitulo.closest('.brand-section');
    const c = el => getComputedStyle(el);

    return {
      productoTitulo: c(productoTitulo).color,
      productoFondo: c(productoPanel).backgroundColor,
      productoCategoria: c(document.querySelector('.product-card .product-category')).color,
      marcaTitulo: c(marcaTitulo).color,
      marcaFondo: c(marcaSeccion).backgroundColor,
      marcaTexto: c(document.querySelector('.brand-copy p:not(.eyebrow)')).color,
    };
  });

  expect(contraste(estilos.productoTitulo, estilos.productoFondo)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.productoCategoria, estilos.productoFondo)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.marcaTitulo, estilos.marcaFondo)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.marcaTexto, estilos.marcaFondo)).toBeGreaterThanOrEqual(4.5);
});

test('el fondo oscuro de la tienda cubre la seccion de productos seleccionados', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main class="storefront" data-gesicomm-base="catalogo">
        <div class="page-content">
          <section id="productos-categoria" class="section pc-section">
            <div class="section-heading pc-head">
              <div>
                <h2>Productos seleccionados</h2>
                <p>Elegí por categoría y buscá rápido.</p>
              </div>
              <label class="pc-search">
                <span>Buscar</span>
                <input type="search" placeholder="Buscar en esta selección">
              </label>
            </div>
            <div class="pc-tabs">
              <button class="is-active" type="button">Todos</button>
              <button type="button">Climatización</button>
              <button type="button">Automotor y movilidad</button>
            </div>
          </section>
        </div>
      </main>
    `,
    css: `
      .storefront { min-height: 100vh; background: #f6fafc; color: var(--navy); }
      .section-heading h2 { color: var(--navy); }
      .section-heading p, .pc-search span { color: var(--muted); }
      .pc-tabs button { color: var(--navy); background: #fff; border: 1px solid var(--line); border-radius: 999px; }
      .pc-tabs button.is-active { color: #fff; background: var(--blue); }
      .pc-search input { color: var(--navy); background: #fff; border: 1px solid var(--line); }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('#productos-categoria h2')).toHaveText('Productos seleccionados');

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const page = document.querySelector('.storefront');
    const titulo = document.querySelector('#productos-categoria h2');
    const subtitulo = document.querySelector('#productos-categoria .section-heading p');
    const tab = document.querySelector('.pc-tabs button:not(.is-active)');
    const active = document.querySelector('.pc-tabs button.is-active');
    const input = document.querySelector('.pc-search input');
    return {
      pageBackground: c(page).backgroundColor,
      titleColor: c(titulo).color,
      subtitleColor: c(subtitulo).color,
      tabColor: c(tab).color,
      tabBackground: c(tab).backgroundColor,
      activeColor: c(active).color,
      activeBackground: c(active).backgroundColor,
      inputColor: c(input).color,
      inputBackground: c(input).backgroundColor,
    };
  });

  expect(estilos.pageBackground).toBe('rgb(16, 26, 33)');
  expect(contraste(estilos.titleColor, estilos.pageBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.subtitleColor, estilos.pageBackground)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.tabColor, estilos.tabBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.activeColor, estilos.activeBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.inputColor, estilos.inputBackground)).toBeGreaterThanOrEqual(4.5);
});

test('confianza y botones promocionales respetan los colores de la tienda', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main class="storefront" data-gesicomm-base="catalogo">
        <div class="page-content">
          <section class="trust-section">
            <div class="trust-grid">
              <article class="trust-card">
                <span class="trust-card-icon">💳</span>
                <div>
                  <h3>Opciones de pago</h3>
                  <p>Consultá los medios de pago disponibles para tu compra.</p>
                </div>
              </article>
            </div>
          </section>
          <section id="banner-promocional" class="mid-banner-section">
            <article class="mid-banner">
              <div class="mid-banner-copy">
                <p class="eyebrow">Promo</p>
                <h2>Nueva campaña promocional</h2>
                <p>Mostrá una oferta, colección o beneficio importante.</p>
                <a class="button-secondary" href="/catalogo">Ver productos →</a>
              </div>
            </article>
          </section>
        </div>
      </main>
    `,
    css: `
      .storefront { min-height: 100vh; background: #f6fafc; color: var(--navy); }
      .trust-section { background: var(--home-superficie); border: 1px solid var(--line); border-radius: 9px; padding: 24px; }
      .trust-card-icon { background: var(--sky); color: var(--blue); }
      .trust-card h3 { color: var(--navy); }
      .trust-card p { color: var(--muted); }
      .mid-banner { color: #fff; background: #082947; padding: 24px 38px; }
      .mid-banner .button-secondary { color: var(--navy); background: #fff; border: 0; }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.trust-card h3')).toHaveText('Opciones de pago');
  await expect(page.locator('.mid-banner .button-secondary')).toHaveText('Ver productos →');

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const trust = document.querySelector('.trust-section');
    const trustTitle = document.querySelector('.trust-card h3');
    const trustText = document.querySelector('.trust-card p');
    const icon = document.querySelector('.trust-card-icon');
    const button = document.querySelector('.mid-banner .button-secondary');
    return {
      trustBackground: c(trust).backgroundColor,
      trustTitle: c(trustTitle).color,
      trustText: c(trustText).color,
      iconBackground: c(icon).backgroundColor,
      iconColor: c(icon).color,
      buttonBackground: c(button).backgroundColor,
      buttonColor: c(button).color,
    };
  });

  expect(estilos.trustBackground).not.toBe('rgb(255, 255, 255)');
  expect(contraste(estilos.trustTitle, estilos.trustBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.trustText, estilos.trustBackground)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.iconColor, estilos.iconBackground)).toBeGreaterThanOrEqual(4.5);
  expect(estilos.buttonBackground).toBe('rgb(21, 94, 99)');
  expect(contraste(estilos.buttonColor, estilos.buttonBackground)).toBeGreaterThanOrEqual(4.5);
});

test('encabezado publico mantiene contraste y usa el acento solo en estados activos', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <header class="commerce-header">
        <div class="container header-main">
          <a class="brand brand-mark" href="/"><span data-gesicomm-tienda="nombre">sommix</span></a>
          <nav class="header-nav">
            <div class="nav-links">
              <a class="active" href="/">Inicio</a>
              <a href="/catalogo">Productos</a>
            </div>
          </nav>
          <div class="header-actions">
            <button class="search-toggle" type="button" aria-expanded="false">⌕</button>
            <button class="cart-button" type="button"><span>🛒</span><strong>Carrito</strong></button>
          </div>
        </div>
      </header>
    `,
    css: `
      .commerce-header { background:#26333a; border-bottom:1px solid #18242b; }
      .brand-mark { color:#10202f; }
      .nav-links a { color:var(--ink-soft); border-bottom:2px solid transparent; }
      .nav-links a.active { color:var(--brand); border-bottom-color:var(--brand); }
      .search-toggle { color:var(--blue); background:#eef8ff; }
      .cart-button strong { color:#10202f; }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.commerce-header .brand-mark')).toContainText('sommix');

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const header = document.querySelector('.commerce-header');
    const brand = document.querySelector('.brand-mark');
    const active = document.querySelector('.nav-links a.active');
    const inactive = document.querySelector('.nav-links a:not(.active)');
    const search = document.querySelector('.search-toggle');
    const cart = document.querySelector('.cart-button strong');
    return {
      headerBackground: c(header).backgroundColor,
      brandColor: c(brand).color,
      activeColor: c(active).color,
      activeBorder: c(active).borderBottomColor,
      inactiveColor: c(inactive).color,
      searchColor: c(search).color,
      searchBackground: c(search).backgroundColor,
      cartColor: c(cart).color,
    };
  });

  expect(contraste(estilos.brandColor, estilos.headerBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.inactiveColor, estilos.headerBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.activeColor, estilos.headerBackground)).toBeGreaterThanOrEqual(4.5);
  expect(estilos.activeBorder).toBe(estilos.activeColor);
  expect(contraste(estilos.searchColor, estilos.searchBackground)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.cartColor, estilos.headerBackground)).toBeGreaterThanOrEqual(4.5);
});

test('encabezado permite logo mas grande junto al nombre de la tienda', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <header class="commerce-header">
        <div class="container header-main">
          <a class="brand brand-mark" href="#">
            <img class="brand-logo" data-gesicomm-tienda="logo" alt="">
            <span data-gesicomm-tienda="nombre">llévalo fácil</span>
          </a>
        </div>
      </header>
    `,
    css: `
      .brand-logo { width: 29px; height: 29px; }
      .brand-mark { font-size: 12px; color: #10202f; }
    `,
    js: '',
  }, {
    datos: {
      tienda: { nombre: 'llévalo fácil', logo: producto.imagen, colores: coloresTienda },
      venta: { inicio: { encabezado: { logo_tamano: 56, logo_rotacion: -8, logo_posicion: 'izquierda' } } },
    },
  });

  await page.setContent(html);
  await expect(page.locator('.brand-logo')).toBeVisible();

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const brand = document.querySelector('.brand-mark');
    const logo = document.querySelector('.brand-logo');
    const nombre = document.querySelector('[data-gesicomm-tienda="nombre"]');
    const header = document.querySelector('.commerce-header');
    return {
      direction: c(brand).flexDirection,
      logoWidth: logo.getBoundingClientRect().width,
      logoHeight: logo.getBoundingClientRect().height,
      headerHeight: header.getBoundingClientRect().height,
      nombreHeight: nombre.getBoundingClientRect().height,
      separacion: nombre.getBoundingClientRect().left - logo.getBoundingClientRect().right,
      transform: c(logo).transform,
    };
  });

  expect(estilos.direction).toBe('row');
  expect(estilos.logoHeight).toBeGreaterThanOrEqual(55);
  expect(estilos.logoWidth).toBeGreaterThanOrEqual(55);
  expect(estilos.logoHeight).toBeGreaterThan(estilos.nombreHeight);
  expect(estilos.separacion).toBeGreaterThanOrEqual(14);
  expect(estilos.headerHeight).toBeLessThanOrEqual(80);
  expect(estilos.transform).not.toBe('none');
});

test('encabezado movil compacta logo y acciones sin apretar la marca', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 640 });
  const html = construirDocumentoCodigo({
    html: `
      <header class="commerce-header">
        <div class="container header-main">
          <div class="brand-column">
            <a class="brand brand-mark" href="#">
              <img class="brand-logo" data-gesicomm-tienda="logo" alt="">
              <span data-gesicomm-tienda="nombre">sommix</span>
            </a>
          </div>
          <div class="header-actions">
            <span class="search-wrap"><button class="search-toggle" type="button">Buscar</button></span>
            <button class="cart-button" type="button"><span aria-hidden="true">🛒</span><strong>Carrito</strong><span data-gesicomm-cart-badge>1</span></button>
            <button class="menu-toggle" type="button" aria-expanded="false">Menú</button>
          </div>
        </div>
      </header>
    `,
    css: `
      .commerce-header { background:#26333a; color:#f8fafc; }
      .header-main { display:flex; align-items:center; justify-content:space-between; }
      .brand-column, .header-actions { display:flex; align-items:center; }
      .brand-logo { width: 76px; height: 76px; }
      .brand-mark { color:#f8fafc; font-size: 20px; font-weight: 900; }
    `,
    js: '',
  }, {
    previewDevice: 'mobile',
    datos: {
      tienda: { nombre: 'sommix', logo: producto.imagen, colores: coloresTienda },
      venta: { inicio: { encabezado: { logo_tamano: 76, logo_rotacion: 0, logo_posicion: 'izquierda' } } },
    },
  });

  await page.setContent(html);
  await expect(page.locator('.brand-logo')).toBeVisible();

  const estilos = await page.evaluate(() => {
    const logo = document.querySelector('.brand-logo');
    const nombre = document.querySelector('[data-gesicomm-tienda="nombre"]');
    const header = document.querySelector('.commerce-header');
    const marca = document.querySelector('.brand-column');
    const acciones = document.querySelector('.header-actions');
    const lr = logo.getBoundingClientRect();
    const nr = nombre.getBoundingClientRect();
    const hr = header.getBoundingClientRect();
    const mr = marca.getBoundingClientRect();
    const ar = acciones.getBoundingClientRect();
    return {
      logoHeight: lr.height,
      nombreWidth: nr.width,
      headerHeight: hr.height,
      marcaRight: mr.right,
      accionesLeft: ar.left,
      accionesWidth: ar.width,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(estilos.logoHeight).toBeLessThanOrEqual(43);
  expect(estilos.nombreWidth).toBeGreaterThanOrEqual(52);
  expect(estilos.headerHeight).toBeLessThanOrEqual(60);
  expect(estilos.accionesWidth).toBeLessThanOrEqual(114);
  expect(estilos.marcaRight).toBeLessThanOrEqual(estilos.accionesLeft + 1);
  expect(estilos.scrollWidth).toBeLessThanOrEqual(estilos.viewportWidth + 1);
});

test('las vistas internas no muestran la franja fija de beneficios sin configurar', async ({ page }) => {
  for (const plantilla of [PLANTILLA_CATEGORIA, PLANTILLA_CATALOGO, PLANTILLA_PRODUCTO]) {
    const html = construirDocumentoCodigo(plantilla, {
      datos: { tienda: { nombre: 'sommix', colores: coloresTienda }, productos: [producto], catalogo: {} },
    });

    await page.setContent(html);
    await expect(page.locator('.announcement')).toHaveCount(0);
    await expect(page.getByText('Pago seguro online o al recibir')).toHaveCount(0);
    await expect(page.getByText('Envío rápido a tu ciudad')).toHaveCount(0);
    await expect(page.getByText('Atención por WhatsApp te ayudamos a elegir')).toHaveCount(0);
  }
});

test('colecciones ganan altura para que las imagenes no queden cortadas', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main class="storefront" data-gesicomm-base="catalogo">
        <section id="colecciones" class="section">
          <div class="section-heading"><h2>Colecciones</h2></div>
          <div class="collection-grid">
            <a class="collection-card" href="/catalogo" style="background-image:url('${producto.imagen}')">
              <h3>Climatización</h3>
              <p>Explorar →</p>
            </a>
          </div>
        </section>
      </main>
    `,
    css: `
      .collection-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:13px; }
      .collection-card { min-height:135px; padding:13px; background-size:cover; background-position:center; color:#fff; }
      .collection-card h3 { color:#fff; }
      .collection-card p { color:#fff; }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.collection-card h3')).toHaveText('Climatización');

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const card = document.querySelector('.collection-card');
    const title = document.querySelector('.collection-card h3');
    return {
      height: card.getBoundingClientRect().height,
      backgroundSize: c(card).backgroundSize,
      titleColor: c(title).color,
    };
  });

  expect(estilos.height).toBeGreaterThanOrEqual(190);
  expect(estilos.backgroundSize).toBe('cover');
  expect(estilos.titleColor).toBe('rgb(255, 255, 255)');
});

test('vista de categoria usa fondo y superficies de Mi tienda', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main class="storefront" data-gesicomm-base="catalogo">
        <section class="hero">
          <div class="hero-shell">
            <div class="hero-banners" data-gesicomm-lista="banners_inicio"></div>
          </div>
        </section>
      </main>
      <div class="lv-shell">
        <main class="lv-page lv-shop-page">
          <section class="lv-shop-hero">
            <p class="lv-kicker">Encontrá tu próximo favorito</p>
            <h1 class="lv-title">Automotor y movilidad</h1>
            <p class="lv-copy">Encontrá lo que necesitás para hacer tu día a día más fácil.</p>
          </section>
          <section class="lv-shop-layout">
            <aside class="lv-filters">
              <h2>Filtros</h2>
              <label class="lv-filter-field">
                <span>Categoría</span>
                <select><option>Automotor y movilidad</option></select>
              </label>
            </aside>
            <div class="lv-results">
              <label class="lv-search"><input placeholder="¿Qué estás buscando?"></label>
              <article class="lv-shop-card">
                <div class="lv-shop-media"><img src="${producto.imagen}" alt=""></div>
                <div class="lv-shop-card-body">
                  <div class="lv-shop-category">Automotor y movilidad</div>
                  <h3 class="lv-shop-title">Autoradio Multimedia</h3>
                  <p class="lv-shop-description">Pantalla para el auto.</p>
                  <strong class="lv-shop-price">Gs 275.854</strong>
                  <button class="lv-primary" type="button">Agregar al carrito</button>
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>
    `,
    css: `
      .hero-shell { min-height: 520px; background: #091820; }
      .lv-shell:has(.lv-shop-page) { background: #fff; }
      .lv-shop-page { --shop-text:#10201d; --shop-muted:#62706b; --shop-surface:#ffffff; --shop-line:#dfe5dc; background:#fff; color:var(--shop-text); }
      .lv-filters, .lv-shop-media, .lv-search input { background:#fff; color:var(--shop-text); border:1px solid var(--shop-line); }
      .lv-title, .lv-shop-title, .lv-filter-head, .lv-shop-price { color:var(--shop-text); }
      .lv-copy, .lv-shop-category, .lv-shop-description, .lv-filter-field { color:var(--shop-muted); }
      .lv-shop-card .lv-primary { background:var(--shop-accent, #143f3a); color:#fff; }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.lv-title')).toHaveText('Automotor y movilidad');

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const hero = document.querySelector('.hero');
    const page = document.querySelector('.lv-shop-page');
    const filters = document.querySelector('.lv-filters');
    const title = document.querySelector('.lv-title');
    const copy = document.querySelector('.lv-copy');
    const productTitle = document.querySelector('.lv-shop-title');
    const category = document.querySelector('.lv-shop-category');
    const input = document.querySelector('.lv-search input');
    const button = document.querySelector('.lv-primary');
    return {
      heroDisplay: c(hero).display,
      pageBackground: c(page).backgroundColor,
      filtersBackground: c(filters).backgroundColor,
      titleColor: c(title).color,
      copyColor: c(copy).color,
      productTitle: c(productTitle).color,
      categoryColor: c(category).color,
      inputBackground: c(input).backgroundColor,
      inputColor: c(input).color,
      buttonBackground: c(button).backgroundColor,
      buttonColor: c(button).color,
    };
  });

  expect(estilos.heroDisplay).toBe('none');
  expect(estilos.pageBackground).toBe('rgb(16, 26, 33)');
  expect(estilos.filtersBackground).not.toBe('rgb(255, 255, 255)');
  expect(contraste(estilos.titleColor, estilos.pageBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.copyColor, estilos.pageBackground)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.productTitle, estilos.pageBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.categoryColor, estilos.pageBackground)).toBeGreaterThanOrEqual(3);
  expect(contraste(estilos.inputColor, estilos.inputBackground)).toBeGreaterThanOrEqual(4.5);
  expect(estilos.buttonBackground).toBe('rgb(21, 94, 99)');
  expect(contraste(estilos.buttonColor, estilos.buttonBackground)).toBeGreaterThanOrEqual(4.5);
});

test('tarjetas de productos no dejan franja blanca ni banda de precio pesada', async ({ page }) => {
  const html = construirDocumentoCodigo({
    html: `
      <main class="storefront" data-gesicomm-base="catalogo">
        <section data-gesicomm-lista="productos_categoria">
          <article class="product-card">
            <div class="product-image"><img data-gesicomm-bind="imagen" src="${producto.imagen}" alt=""></div>
            <div class="product-content">
              <h3>${producto.nombre}</h3>
              <p class="product-description">Equipo para climatizar ambientes.</p>
              <div class="product-footer">
                <span class="price">Gs 138.859</span>
                <button class="button-primary" type="button">Comprar con pago anticipado</button>
              </div>
            </div>
          </article>
        </section>
      </main>
    `,
    css: `
      .product-card { width: 310px; min-height: 380px; background: #fff; border: 1px solid #dbe8ef; border-radius: 7px; overflow: hidden; }
      .product-image { height: 190px; background: #fff; }
      .product-content { padding: 12px; background: #26333a; color: var(--navy); }
      .product-content h3 { color: var(--navy); }
      .product-description { color: var(--muted); }
      .product-footer { margin-top: 10px; padding: 0; background: #b80f45; }
      .price { display: block; color: #fff; background: #b80f45; }
      .button-primary { width: 100%; color: #b80f45; background: #fff; border: 0; }
    `,
    js: '',
  }, { datos: { tienda: { nombre: 'sommix', colores: coloresTienda } } });

  await page.setContent(html);
  await expect(page.locator('.product-card h3')).toHaveText(producto.nombre);

  const estilos = await page.evaluate(() => {
    const c = el => getComputedStyle(el);
    const card = document.querySelector('.product-card');
    const content = document.querySelector('.product-content');
    const footer = document.querySelector('.product-footer');
    const price = document.querySelector('.price');
    const button = document.querySelector('.button-primary');
    return {
      cardBackground: c(card).backgroundColor,
      cardDisplay: c(card).display,
      contentDisplay: c(content).display,
      contentBackground: c(content).backgroundColor,
      footerBackground: c(footer).backgroundColor,
      priceColor: c(price).color,
      priceBackground: c(price).backgroundColor,
      buttonColor: c(button).color,
      buttonBackground: c(button).backgroundColor,
    };
  });

  expect(estilos.cardBackground).not.toBe('rgb(255, 255, 255)');
  expect(estilos.cardDisplay).toBe('flex');
  expect(estilos.contentDisplay).toBe('flex');
  expect(estilos.footerBackground).toBe('rgba(0, 0, 0, 0)');
  expect(contraste(estilos.priceColor, estilos.priceBackground)).toBeGreaterThanOrEqual(3);
  expect(estilos.buttonBackground).toBe('rgb(21, 94, 99)');
  expect(contraste(estilos.buttonColor, estilos.buttonBackground)).toBeGreaterThanOrEqual(4.5);
  expect(contraste(estilos.priceColor, estilos.contentBackground)).toBeGreaterThanOrEqual(3);
});
