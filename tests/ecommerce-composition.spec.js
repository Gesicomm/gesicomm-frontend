import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5176';
const deposito = { id: 1, nombre: 'Depósito Central', activo: true, ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Principal 123' };

for (const width of [375, 900, 1366]) for (const theme of ['light', 'dark']) {
  test(`Composición ${theme} ${width}: listados y editor conservan espacio y contexto`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 768 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await prepararUsuario(page, theme);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (/\/(?:depositos\/listado|fulfillment\/depositos)$/.test(path)) return route.fulfill({ json: { data: [deposito], total: 1, totalPages: 1, filtros: { ciudades: ['Luque'], departamentos: ['Central'] } } });
      if (path.endsWith('/depositos/1/couriers')) return route.fulfill({ json: { couriers: [{ id: 1, nombre: 'Transportista de prueba', habilitado: true, ciudades_cubiertas: 3 }] } });
      if (path.endsWith('/meta-reportes/campanas')) return route.fulfill({ json: [{ id: 1, nombre_display: 'Campaña de prueba', nombre_interno: 'Campaña de prueba', tipo: 'web', estado: 'activa', gasto_total: 0, gasto_registros: 0, productos: [] }] });
      if (path.endsWith('/mis-landings-simples/240')) return route.fulfill({ json: { id: 240, activo: true, template: { kind: 'codigo' }, items: [{ tipo: 'producto', referencia_id: 101 }], content: { venta: { configurado: true, tipo: 'catalogo', seleccion: 'manual' }, codigo: { html: '<main><h1>Tienda de prueba</h1></main>', css: '', js: '' } } } });
      return route.fallback();
    });

    await page.goto(`${base}/mi-tienda/depositos`);
    const first = page.locator('.dep-deposit-card').first();
    await expect(first).toBeVisible();
    await expect(first).toContainText('Transportista de prueba');
    await expect(first).toContainText('3 ciudades cubiertas');
    expect((await first.boundingBox()).y).toBeLessThan(width === 375 ? 720 : 500);
    const depotBox = await first.boundingBox();
    await expect(first.getByRole('button', { name: 'Administrar', exact: true })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath('depositos.png') });

    await page.goto(`${base}/mis-anuncios`);
    await expect(page.getByRole('button', { name: 'Nueva campaña', exact: true })).toHaveCount(1);
    const campaign = page.locator('.ads-campaigns tbody tr').first();
    await expect(campaign).toBeVisible();
    expect((await campaign.boundingBox()).y).toBeLessThan(width === 375 ? 750 : 500);
    const campaignBox = await campaign.boundingBox();
    await expect(campaign.getByRole('button', { name: 'Cargar gasto', exact: true })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath('publicidad.png') });

    await page.goto(`${base}/landing/240`);
    await expect(page.getByLabel('Página de la tienda')).toBeVisible();
    await page.getByLabel('Página de la tienda').selectOption('checkout');
    await expect(page.getByRole('tab', { name: 'Checkout', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Eliminar página', exact: true })).toBeHidden();
    await page.getByText('Herramientas', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Eliminar página', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Eliminar página', exact: true })).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('editor.png') });
    await page.getByRole('group', { name: 'Modo del editor' }).getByRole('button', { name: 'Vista previa', exact: true }).click();
    await expect(page.getByLabel('Página de la tienda')).toHaveValue('checkout');
    const iframe = page.locator('.ecommerce-desktop-preview iframe');
    await page.getByRole('radio', { name: 'Escritorio', exact: true }).click();
    await expect(iframe).toBeVisible();
    await expect.poll(async () => Math.round((await iframe.boundingBox()).width)).toBe(width);
    expect((await iframe.boundingBox()).height).toBeGreaterThan(width === 375 ? 550 : 600);
    await writeFile(testInfo.outputPath('layout.json'), JSON.stringify({ width, theme, depot: depotBox, campaign: campaignBox, preview: await iframe.boundingBox() }, null, 2));
    await page.screenshot({ path: testInfo.outputPath('preview.png') });
    await page.getByRole('group', { name: 'Modo del editor' }).getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByLabel('Página de la tienda')).toHaveValue('checkout');
    expect(errors).toEqual([]);
  });
}
