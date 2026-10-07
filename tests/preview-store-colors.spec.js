import { test, expect } from '@playwright/test';
import { construirDocumentoCodigo } from '../src/pages/landing-simple/construirDocumentoCodigo.js';
import { PLANTILLA_INICIO } from '../src/pages/landing-simple/plantillasBaseCodigo.js';

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
