import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const output = '../outputs/ux-audit';

for (const width of [375, 1363]) for (const ruta of ['/mis-pedidos', '/gestion-logistica']) {
  test(`Se conserva la vista original ${ruta} a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 936 });
    await prepararUsuario(page, 'light');
    await page.goto(origin + ruta);
    await expect(page.locator('.pt-root')).toBeVisible();
    await expect(page.locator('.pt-spinner')).toHaveCount(0);
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    const medir = () => page.locator('.courier-page').evaluate(root => [...root.querySelectorAll('button, input, select, th, td, .courier-header, .pt-toolbar, .pt-table')].map(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return [el.tagName, el.className, r.x, r.y, r.width, r.height, s.fontSize, s.padding, s.borderRadius, s.boxShadow, s.display];
    }));
    const antes = await medir();
    const hojas = await page.locator('style[data-vite-dev-id]').evaluateAll(styles => {
      const targets = styles.filter(el => /ecommerceWorkspace\.css|panelComponents\.css/.test(el.dataset.viteDevId));
      targets.forEach(el => { el.sheet.disabled = true; });
      return targets.length;
    });
    expect(hojas).toBe(2);
    expect(await medir()).toEqual(antes);
    if (width < 1024) await page.getByRole('button', { name: 'Acciones', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Venta por WhatsApp', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo Pedido', exact: true })).toBeVisible();
  });
}

async function sinDesbordamiento(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.locator('.dashboard-main').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}

for (const theme of ['light', 'dark']) for (const width of [375, 1363]) {
  test(`Auditoría: catálogo ${theme} a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 936 });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    const { requests } = await prepararUsuario(page, theme);
    await page.goto(`${origin}/mi-catalogo`);
    await expect(page.locator('.vit-card').first()).toBeVisible();
    await expect(page.getByRole('group', { name: 'Vista del catálogo' })).toHaveCount(0);
    await expect(page.locator('.vit-grid')).not.toHaveClass(/vit-grid--list/);
    await expect(page.getByRole('button', { name: /Seleccionar todos los resultados/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Seleccionar página/ }).click();
    await expect(page.getByRole('button', { name: /Seleccionar todos los resultados/ })).toBeVisible();
    const precio = page.getByRole('textbox', { name: 'Precio de venta de Producto propio de prueba' });
    await precio.fill('130000');
    const editor = precio.locator('xpath=ancestor::div[contains(@class,"vit-price-editor")]');
    await expect(editor.getByRole('status')).toHaveText('Cambios sin guardar');
    await editor.getByRole('button', { name: 'Guardar cambio', exact: true }).click();
    await expect(editor.getByRole('status')).toHaveText('Precio guardado');
    expect(requests.some(r => r.path === '/vitrina/productos/101/precio' && r.payload.precio === 130000)).toBe(true);
    await sinDesbordamiento(page);
    await page.screenshot({ animations: 'disabled', path: `${output}/catalogo-${theme}-${width}.png` });
    expect(errores).toEqual([]);
  });
}

for (const width of [375, 1363]) {
  test(`Auditoría: formulario de producto a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 936 });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await prepararUsuario(page, 'light');
    await page.goto(`${origin}/products/nuevo`);
    await expect(page.locator('#prod-nombre')).toBeVisible();
    await expect(page.getByPlaceholder('Pegar JSON aquí...')).toBeHidden();
    await expect(page.locator('.prod-requirements')).not.toHaveAttribute('open');
    if (width > 1024) {
      expect((await page.locator('.prod-workspace-main').boundingBox()).width).toBeGreaterThan(850);
    }
    const navegacion = page.getByRole('navigation', { name: 'Flujo de configuracion del producto' });
    await navegacion.getByRole('button', { name: /^Precio/ }).click();
    await expect(page.getByText('Completá el costo y el precio', { exact: false })).toBeVisible();
    await expect(page.locator('.commercial-summary')).toHaveCount(0);
    await sinDesbordamiento(page);
    await page.screenshot({ animations: 'disabled', path: `${output}/producto-${width}.png` });
    await navegacion.getByRole('button', { name: /^Vista del producto/ }).click();
    await expect(page.locator('.product-view-editor')).toBeVisible();
    await expect(page.locator('.product-preview-panel')).toBeVisible();
    if (width >= 1024) {
      expect((await page.locator('.product-view-editor').boundingBox()).height).toBeGreaterThan(300);
    }
    await sinDesbordamiento(page);
    expect(errores).toEqual([]);
  });
}

test('Auditoría: no atribuye pérdidas a un período sin ventas', async ({ page }) => {
  await prepararUsuario(page, 'light');
  await page.route('**/api/envios/metricas-dashboard', route => route.fulfill({ json: {
    kpis: { facturacion_entregada: 0, gastos_fijos_generales: 500000, punto_equilibrio: null },
    funnel: { entregados: 0 },
  } }));
  await page.goto(`${origin}/mi-dashboard`);
  await expect(page.getByText('Sin ventas suficientes para calcularlo')).toBeVisible();
  await expect(page.getByText('No se puede alcanzar el equilibrio con el margen actual')).toHaveCount(0);
});

for (const width of [375, 1363]) {
  test(`Auditoría: disponibilidad de tienda a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 936 });
    const { requests } = await prepararUsuario(page, 'light');
    await page.goto(`${origin}/seleccionar-tienda`);
    await expect(page.getByRole('button', { name: 'Administrar Tienda del usuario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inactivar Tienda del usuario' })).toBeHidden();
    await page.getByLabel('Opciones de Tienda del usuario').click();
    await expect(page.getByRole('button', { name: 'Inactivar Tienda del usuario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar Tienda del usuario' })).toBeDisabled();
    await page.getByRole('button', { name: 'Inactivar Tienda del usuario' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar inactivación' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(requests.some(r => r.method !== 'GET' && /tiendas.*estado/.test(r.path))).toBe(false);
  });
}
