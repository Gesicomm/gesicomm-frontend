import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
for (const width of [375, 1280]) {
  test(`Proveete con Gesicom a ${width}px: cotización internacional`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepararUsuario(page, 'light');
    await page.route('**/api/educacion/progreso-sidebar', route => route.fulfill({ json: {
      bloqueos: {}, modulos: [{ etiqueta: 'Importar desde China', path: '/importada-de-china', icono: 'Ship', contexto: 'ecommerce', seccion: 'IMPORTACIÓN' }],
    } }));
    const solicitudes = [];
    await page.route('**/api/importada-china/solicitudes', route => {
      solicitudes.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { ok: true, solicitud: { id: 40, estado: 'Pendiente de cotización' } } });
    });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(`${origin}/importada-de-china`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Proveete con Gesicom.');
    await expect(page.locator('.china-subtitle')).toContainText('Brasil, China, Estados Unidos');
    if (width >= 1024) await expect(page.getByRole('navigation').getByRole('link', { name: 'Proveete con Gesicom', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('abastecimiento.png'), fullPage: true });
    await page.getByRole('link', { name: 'SOLICITAR PRESUPUESTO DE ABASTECIMIENTO' }).click();
    const enlace = page.getByLabel('Enlace del producto o proveedor', { exact: false });
    await expect(enlace).toBeFocused();
    await enlace.fill('https://fornecedor.com.br/produto');
    await page.getByLabel('País de origen', { exact: false }).fill('Brasil');
    await page.getByLabel('Cantidad de unidades', { exact: false }).fill('100');
    await page.getByLabel('Método de transporte preferido').selectOption('terrestre');
    await page.getByRole('button', { name: 'SOLICITAR MI PRESUPUESTO' }).click();
    await expect(page.getByRole('status')).toContainText('Solicitud #40');
    expect(solicitudes).toHaveLength(1);
    expect(solicitudes[0]).toMatchObject({ pais_origen: 'Brasil', producto_url: 'https://fornecedor.com.br/produto', cantidad: 100, transporte: 'terrestre' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errores).toEqual([]);
  });
}
