import { test, expect } from '@playwright/test';

const baseURL = process.env.SPEEDBOX_PREVIEW_URL || 'http://127.0.0.1:5187';
const config = {
  environment: 'sandbox', credentials_configured: true, webhook_configured: true, automatic_enabled: true,
  connection: { tienda_id: '54', courier_id: 2, activo: true },
  checks: { spec: true, order: true, updates: true, webhook: false },
  available_orders: [{ id: 32, numero_pedido: 5, cliente: 'Cliente de prueba' }],
  orders: [
    { id: 1, envio_id: 31, envio: { numero_pedido: 4 }, external_order_id: 'GESICOMM-sandbox-7-31', order_id: '900000000123456', estado: 'enviado', status: 'en_camino' },
    { id: 2, envio_id: 30, envio: { numero_pedido: 3 }, external_order_id: 'GESICOMM-sandbox-7-30', order_id: null, estado: 'incierto', status: null, error: 'No se pudo confirmar la respuesta de Speedbox.' },
  ],
  events: [
    { id: 1, tipo: 'shipment.status_changed', order_id: '900000000123456', estado: 'revision', detalle: 'Devolucion pendiente de inspeccion por producto; registra la condicion fisica antes de reponer stock.' },
    { id: 2, tipo: 'wallet.transaction', estado: 'procesado', occurred_at: '2026-10-02T12:00:00Z', payload: { data: { direction: 'credit', amount: 85000, currency: 'PYG' } } },
  ],
};

async function mockAPI(page) {
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let body = {};
    if (pathname === '/api/auth/me') body = { id: 7, nombre: 'Comercio prueba', rol: 'usuario' };
    if (pathname === '/api/mi-tienda') body = { id: 7, nombre: 'Tienda prueba', subdominio: 'prueba', documento: '1234567', ruc: '80000000-0' };
    if (pathname === '/api/suscripciones/mi-estado') body = { tiene_suscripcion_activa: true, suscripcion: { plan: { nombre: 'Pro' } } };
    if (pathname === '/api/educacion/progreso-sidebar') body = { menusDesbloqueados: [], bloqueos: {} };
    if (pathname === '/api/couriers') body = [{ id: 2, nombre: 'Speedbox', activo: true }];
    if (pathname === '/api/integraciones/speedbox') body = config;
    if (pathname.endsWith('/reintentar')) body = { ok: true, estado: 'enviado', order_id: '900000000000030' };
    if (pathname.endsWith('/updates')) body = { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/connect.facebook.net/**', route => route.abort());
  await page.route('**/facebook.com/**', route => route.abort());
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`Speedbox settings ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockAPI(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseURL}/mi-tienda?tab=speedbox`);
    await expect(page.getByLabel('Courier Speedbox')).toHaveValue('2');
    await expect(page.getByText('900000000123456').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`speedbox-${viewport.name}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.dashboard-main').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('heading', { name: 'Movimientos de billetera' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`speedbox-${viewport.name}-orders.png`) });
    await page.getByRole('button', { name: 'Reintentar pedido 30' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.y).toBeGreaterThan(0);
    expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(2);
    await expect(dialog.getByRole('button', { name: 'Reintentar', exact: true })).toBeDisabled();
    await dialog.getByRole('checkbox').check();
    await expect(dialog.getByRole('button', { name: 'Reintentar', exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`speedbox-${viewport.name}-retry.png`) });
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}
