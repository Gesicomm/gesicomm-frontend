import { test, expect } from '@playwright/test';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5175';

test('la cuenta administradora entra directamente al panel admin', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { usuario: { id: 31, nombre: 'Admin', rol: 'administrador' } } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 31, nombre: 'Admin', rol: 'administrador' } });
    return route.fulfill({ json: {} });
  });
  await page.goto(origin + '/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@gesicom.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('ClavePrueba123');
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Códigos de acceso' })).toBeVisible();
});

for (const width of [375, 1280]) test(`Admin genera duración y usuario ingresa código al registrarse a ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  const codigos = [];
  let admin = true;
  const registros = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let data = {};
    if (path.endsWith('/auth/me')) {
      if (!admin) return route.fulfill({ status: 401, json: { message: 'No autenticado' } });
      data = { id: 1, nombre: 'Admin', rol: 'administrador' };
    }
    if (path.endsWith('/publico/admin/contacto')) data = { mensajes: [], total: 0, total_paginas: 0 };
    if (path.endsWith('/admin/codigos-prueba')) {
      if (method === 'POST') {
        const body = route.request().postDataJSON();
        codigos.unshift({ ...body, id: codigos.length + 1, codigo: `GESI-TEST${body.dias}`, activo: true });
        data = codigos[0];
      } else data = { codigos, planes: [{ id: 3, nombre: 'Plan de prueba' }] };
    }
    if (path.endsWith('/auth/register')) {
      const body = route.request().postDataJSON();
      registros.push(body);
      const codigo = codigos.find(c => c.codigo === body.codigo_prueba);
      if (!codigo) return route.fulfill({ status: 400, json: { message: 'El código de prueba no está disponible.' } });
      data = { requiere_verificacion: true, email: body.email, prueba: { dias: codigo.dias, periodo_fin: new Date(Date.now() + codigo.dias * 86400000).toISOString() } };
    }
    return route.fulfill({ json: data });
  });
  await page.goto(origin + '/');
  await expect(page.getByRole('link', { name: 'Activar mi código' })).toHaveAttribute('href', '/registro');
  await page.goto(origin + '/admin/codigos-prueba');
  await expect(page.getByRole('heading', { name: 'Códigos de acceso' })).toBeVisible();
  for (const dias of [14, 20]) {
    await page.getByLabel('Plan de la prueba', { exact: true }).selectOption('3');
    await page.getByLabel('Duración en días', { exact: true }).fill(String(dias));
    await page.getByLabel('Correo del destinatario (opcional)', { exact: true }).fill('ana@example.test');
    await page.getByRole('button', { name: 'Generar código de prueba', exact: true }).click();
    await expect(page.locator('.trial-code-result')).toContainText(`Prueba de ${dias} días`);
    await expect(page.locator('.trial-code-result code')).toHaveText(`GESI-TEST${dias}`);
  }
  expect(codigos[0]).toMatchObject({ dias: 20, email: 'ana@example.test', plan_id: 3 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('codigos-admin.png'), fullPage: true });
  admin = false;
  await page.goto(origin + '/registro');
  for (const [label, value] of Object.entries({ 'Nombre completo': 'Ana Prueba', 'Teléfono de contacto': '0981123456', 'Correo electrónico': 'ana@example.test', 'Contraseña': 'ClavePrueba123', 'Repetir contraseña': 'ClavePrueba123', 'Código de prueba (opcional)': 'INVALIDO' })) await page.getByLabel(label, { exact: true }).fill(value);
  await page.locator('form').getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText('El código de prueba no está disponible.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Ana Prueba');
  await page.getByLabel('Código de prueba (opcional)', { exact: true }).fill('gesi-test20');
  await page.locator('form').getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('prueba de 20 días');
  await expect(page.getByRole('heading', { name: 'Verificá tu correo' })).toBeVisible();
  expect(registros[1].codigo_prueba).toBe('GESI-TEST20');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('registro-prueba.png'), fullPage: true });
  expect(errores).toEqual([]);
});
