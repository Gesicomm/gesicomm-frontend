import { test, expect } from '@playwright/test';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const producto = {
  id: 10,
  nombre: 'Producto QA Banner',
  categoria: 'QA',
  categoria_id: 1,
  precio_base: 100000,
  precio_efectivo: 100000,
  precio_ancla: 130000,
  imagen: 'https://cdn.gesicomm.com/qa/producto.webp',
  imagenes: [{ id: 1, url: 'https://cdn.gesicomm.com/qa/producto.webp', es_principal: true, orden: 0 }],
  tipo: 'producto',
};

test('guardar y armar diseño conserva el banner configurado y actualiza la base si el HTML viejo no tiene slot', async ({ page }) => {
  let landingGuardada = null;

  await page.route('**/api/**', route => json(route, {}));
  await page.route('**/api/auth/me', route => json(route, {
    id: 1,
    nombre: 'Admin QA',
    email: 'admin.qa@test.local',
    rol: 'administrador',
  }));
  await page.route('**/api/mi-tienda', route => json(route, {
    id: 1,
    nombre: 'Sommi QA',
    subdominio: 'sommi-qa',
    color_primario: '#1d4ed8',
    whatsapp: '+595981000000',
  }));
  await page.route('**/api/vitrina/catalogo-paginado', route => json(route, {
    items: [producto],
    total: 1,
    page: 1,
    limit: 10000,
  }));
  await page.route('**/api/ofertas**', route => json(route, []));
  await page.route('**/api/mis-landings-simples/991', async route => {
    if (route.request().method() === 'PUT') {
      landingGuardada = JSON.parse(route.request().postData() || '{}');
      return json(route, {
        id: 991,
        titulo: 'Landing QA',
        template: { kind: 'codigo', slug: 'codigo' },
        content: {
          codigo: landingGuardada.codigo,
          vistas: landingGuardada.vistas,
          venta: landingGuardada.venta,
        },
        items: landingGuardada.items,
      });
    }

    return json(route, {
      id: 991,
      titulo: 'Landing QA',
      template: { kind: 'codigo', slug: 'codigo' },
      content: {
        venta: { configurado: false, tipo: 'catalogo', seleccion: 'manual' },
        codigo: {
          html: '<main><section id="productos">HTML viejo sin carrusel de banners</section></main>',
          css: '',
          js: '',
        },
      },
      items: [{ tipo: 'producto', referencia_id: 10, orden: 0 }],
    });
  });

  await page.goto('http://localhost:5174/landing/991');

  await expect(page.getByRole('heading', { name: 'Configurar tienda' })).toBeVisible();
  await page.getByRole('button', { name: 'Agregar banner' }).first().click();

  await page.getByLabel('Etiqueta').first().fill('Promo QA');
  await page.getByLabel('CTA').first().fill('Ver productos');
  await page.getByLabel('Título').first().fill('Banner guardado con Playwright');
  await page.getByLabel('Subtítulo').first().fill('Debe aparecer después de guardar.');
  await page.getByLabel('URL del medio').first().fill('https://cdn.gesicomm.com/qa/banner-playwright.webp');

  const [put] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/mis-landings-simples/991') && req.method() === 'PUT'),
    page.getByRole('button', { name: /Guardar y armar el diseño/ }).click(),
  ]);

  expect(put).toBeTruthy();
  expect(landingGuardada?.venta?.inicio?.banners?.[0]).toMatchObject({
    etiqueta: 'Promo QA',
    titulo: 'Banner guardado con Playwright',
    subtitulo: 'Debe aparecer después de guardar.',
    imagen: 'https://cdn.gesicomm.com/qa/banner-playwright.webp',
  });
  expect(landingGuardada?.venta?.inicio_comercial?.banners?.[0]?.titulo).toBe('Banner guardado con Playwright');
  expect(landingGuardada?.codigo?.html).toContain('data-gesicomm-lista="banners_inicio"');
  expect(landingGuardada?.codigo?.html).not.toContain('data-gesicomm-lista="catalogo"');
  expect(landingGuardada?.codigo?.html).toContain('data-gesicomm-link="catalogo"');

  await expect(page.getByText(/actualizamos la base de inicio\/ficha/)).toBeVisible();
  await expect(page.frameLocator('iframe').getByText('Banner guardado con Playwright')).toBeVisible();
});
