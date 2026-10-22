import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const deposito = { id: 1, nombre: 'Depósito Central', activo: true, ciudad: 'Luque', departamento: 'Central', direccion: 'Av. Principal 123' };

for (const theme of ['light', 'dark']) for (const width of [375, 1280]) {
  test(`Crear courier ${theme} a ${width}px: datos, ciudades, resumen y reintentos`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 950 });
    await prepararUsuario(page, theme);
    const escrituras = [];
    let intentosGeo = 0, intentosAlta = 0;
    await page.route('**/api/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, json: body });
      if (path.endsWith('/depositos/listado')) return json({ data: [deposito], total: 1, totalPages: 1 });
      if (path.endsWith('/depositos/1/couriers')) {
        if (req.method() === 'PUT') escrituras.push({ path, body: req.postDataJSON() });
        return json({ couriers: [] });
      }
      if (path.endsWith('/couriers/geografia')) {
        if (++intentosGeo === 1) return json({ message: 'Error de prueba' }, 500);
        return json([{ id: 10, nombre: 'Central', pais_id: 1, ciudades: [{ id: 100, nombre: 'Luque' }, { id: 101, nombre: 'San Lorenzo' }] }]);
      }
      if (path.endsWith('/couriers') && req.method() === 'POST') {
        if (++intentosAlta === 1) return json({ message: 'Error de prueba' }, 500);
        escrituras.push({ path, body: req.postDataJSON() });
        return json({ id: 8, ...req.postDataJSON() }, 201);
      }
      if (path.endsWith('/couriers/zonas-delivery') && req.method() === 'PUT') {
        escrituras.push({ path, body: req.postDataJSON() });
        return json(req.postDataJSON().zonas);
      }
      return route.fallback();
    });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(`${origin}/mi-tienda/depositos`);
    await page.getByRole('button', { name: 'Administrar', exact: true }).click();
    await page.getByRole('button', { name: 'Crear courier', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Datos del courier', exact: true });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('alert')).toHaveCount(0);
    await modal.getByRole('button', { name: 'Continuar con ciudades' }).click();
    const nombre = modal.getByRole('textbox', { name: 'Nombre del courier o empresa' });
    await expect(nombre).toHaveAttribute('aria-invalid', 'true');
    await expect(nombre).toBeFocused();
    await nombre.fill('Entregas Central');
    await modal.getByRole('textbox', { name: 'Teléfono de contacto' }).fill('0981123456');
    await modal.getByRole('combobox', { name: 'Tipo de vehículo' }).selectOption('Camioneta');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal.getByRole('alertdialog')).toContainText('¿Salir sin guardar?');
    await modal.getByRole('button', { name: 'Seguir editando', exact: true }).click();
    await expect(nombre).toHaveValue('Entregas Central');
    await comprobarAncho(modal);
    await page.screenshot({ path: testInfo.outputPath('datos.png'), animations: 'disabled' });
    await modal.getByRole('button', { name: 'Continuar con ciudades' }).click();
    const wizard = page.locator('.cw-dialog');
    await expect(wizard.getByRole('alert')).toContainText('No se pudo cargar el catálogo');
    await wizard.getByRole('button', { name: 'Reintentar carga' }).click();
    await wizard.getByRole('button', { name: 'Luque', exact: true }).click();
    await expect(wizard.getByRole('button', { name: 'Luque', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await wizard.getByRole('textbox', { name: 'Costo total (Gs.)', exact: true }).fill('25000');
    await comprobarAncho(wizard);
    await page.screenshot({ path: testInfo.outputPath('ciudades.png'), animations: 'disabled' });
    await wizard.getByRole('button', { name: 'Revisar', exact: true }).click();
    await expect(wizard).toContainText('Entregas Central');
    await expect(wizard).toContainText('25.000');
    expect(escrituras).toHaveLength(0);
    await expect(wizard.locator('[aria-current="step"]')).toHaveText('3Resumen');
    await page.screenshot({ path: testInfo.outputPath('resumen.png'), animations: 'disabled' });
    await wizard.getByRole('button', { name: 'Volver a editar', exact: true }).click();
    await expect(wizard.getByRole('textbox', { name: 'Costo total (Gs.)', exact: true })).toHaveValue('Gs 25.000');
    await wizard.getByRole('button', { name: 'Revisar', exact: true }).click();
    await wizard.getByRole('button', { name: 'Guardar courier y ciudades', exact: true }).click();
    await expect(wizard.getByRole('alert')).toContainText('No pudimos guardar');
    await expect(wizard).toContainText('Entregas Central');
    await wizard.getByRole('button', { name: 'Guardar courier y ciudades', exact: true }).click();
    await expect(wizard).toHaveCount(0);
    expect(escrituras).toHaveLength(3);
    expect(escrituras[0].body).toMatchObject({ nombre: 'Entregas Central', telefono: '0981123456', vehiculo: 'Camioneta', activo: true });
    expect(escrituras[1].body).toMatchObject({ courierIds: [8], zonas: [expect.objectContaining({ ciudad: 'Luque', ciudad_id: 100, costo: 25000 })] });
    expect(escrituras[2].body).toEqual({ courierIds: [8] });
    expect(errores).toEqual([]);
  });
}

async function comprobarAncho(modal) {
  expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const fuera = await modal.locator('input, select, button').evaluateAll(els => els.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1);
  }).map(el => el.outerHTML.slice(0, 150)));
  expect(fuera).toEqual([]);
}
