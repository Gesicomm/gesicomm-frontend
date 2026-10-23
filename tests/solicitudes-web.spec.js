import { test, expect } from '@playwright/test';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5175';

for (const width of [375, 1280]) test(`Landing a bandeja del administrador a ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  const solicitudes = [];
  let filtro = '';
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data = {};
    if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'Admin', rol: 'administrador' };
    if (path.endsWith('/publico/contacto') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const tipo = body.asunto.includes('prueba gratuita') ? 'prueba' : body.asunto.includes('Postulación') ? 'proveedor' : 'vendedor';
      solicitudes.push({ ...body, id: solicitudes.length + 1, tipo, recibido_en: '2026-10-23T10:00:00Z' });
      data = { mensaje: { id: solicitudes.length } };
    }
    if (path.endsWith('/publico/admin/contacto')) {
      expect(url.searchParams.get('area')).toBe('comercial');
      filtro = url.searchParams.get('tipo') || '';
      const mensajes = solicitudes.filter(s => !filtro || s.tipo === filtro);
      data = { mensajes, total: mensajes.length, total_paginas: 1 };
    }
    return route.fulfill({ json: data });
  });
  await page.goto(origin);
  for (const nombre of ['Realizar prueba gratuita', 'Empezar como vendedor', 'Ser proveedor de servicios']) {
    await page.getByRole('button', { name: new RegExp(nombre) }).click();
    const form = page.locator('dialog form:visible');
    for (const [key, value] of Object.entries({ nombre: 'Ana', apellido: 'Prueba', documento: '1234567', email: 'ana@example.test' })) await form.locator(`[name="${key}"]`).fill(value);
    if (nombre.includes('proveedor')) {
      await form.locator('[name="whatsapp"]').fill('+595981123456');
      await form.locator('[name="categoria"]').selectOption('envios');
    } else await form.locator('[name="uso"]').selectOption('ecommerce');
    await form.locator('[type="submit"]').click();
    await expect(form.getByRole('status')).toContainText('recibida');
    await page.getByRole('button', { name: 'Cerrar formulario' }).click();
  }
  await page.goto(origin + '/admin/solicitudes-web');
  await expect(page.getByRole('heading', { name: 'Solicitudes de la web', exact: true })).toBeVisible();
  await expect(page.locator('.web-request')).toHaveCount(3);
  for (const tipo of ['Prueba gratuita', 'Empezar como vendedor', 'Proveedor de servicios']) await expect(page.locator('.web-request-type').getByText(tipo, { exact: true })).toBeVisible();
  await page.getByLabel('Tipo de solicitud').selectOption('proveedor');
  await expect(page.locator('.web-request')).toHaveCount(1);
  await page.getByText('Ver solicitud completa', { exact: false }).click();
  await expect(page.locator('.web-request-message')).toContainText('+595981123456');
  await expect(page.locator('.web-request-message')).toContainText('Documento: 1234567');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('bandeja-admin.png'), fullPage: true });
  expect(errores).toEqual([]);
});
