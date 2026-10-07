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
  expect(estilos.navy).toBe(estilos.tiendaBanda);
  expect(estilos.trustBarBackground).not.toBe('rgb(6, 43, 79)');
  expect(estilos.trustBarStrong).not.toBe('rgb(115, 201, 245)');
});
