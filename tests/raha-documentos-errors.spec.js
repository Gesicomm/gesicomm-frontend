import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';

test('documentos pesados: explica el tamaño y permite reintentar sin perder el formulario', async ({ page }) => {
  let subidas = 0;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data = {};
    if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
    else if (path.includes('/suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true };
    else if (path.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Mi tienda', subdominio: 'mi-tienda', plan: 'pago' };
    else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Mi tienda' }];
    else if (path.endsWith('/integraciones/raha')) data = { id: 1, estado: 'borrador', version: 0, datos: {}, documentos: [], historial: [] };
    else if (path.endsWith('/integraciones/raha/documentos')) {
      subidas += 1;
      return route.fulfill({ status: 413, contentType: 'text/html', body: '<h1>413 Request Entity Too Large</h1>' });
    } else if (path.includes('metodos-pago') || path.includes('notificacion') || path.includes('catalogo')) data = [];
    return route.fulfill({ json: data });
  });
  await page.goto(`${baseURL}/mi-tienda?tab=raha`);
  await page.getByRole('button', { name: 'Conectarme a Rahá' }).click();
  await page.getByLabel('Razón social', { exact: true }).fill('Datos conservados');
  for (const documento of ['Constancia de RUC', 'Cédula del representante legal']) {
    const input = page.getByLabel(`Adjuntar ${documento}`, { exact: true });
    await input.setInputFiles({ name: 'documento.png', mimeType: 'image/png', buffer: Buffer.alloc(9 * 1024 * 1024) });
    const grupo = input.locator('xpath=ancestor::div[contains(@class,"raha-doc-group")]');
    await expect(grupo.getByRole('alert')).toContainText('supera el máximo de 8 MB');
    await expect(grupo.getByRole('alert')).not.toContainText(/servidor|conexión/i);
  }
  expect(subidas).toBe(0);
  const input = page.getByLabel('Adjuntar Constancia de RUC', { exact: true });
  await input.setInputFiles({ name: 'ruc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-prueba') });
  const grupo = input.locator('xpath=ancestor::div[contains(@class,"raha-doc-group")]');
  await expect(grupo.getByRole('alert')).toContainText('El archivo es demasiado pesado para subirlo');
  await expect(grupo.getByRole('alert')).not.toContainText(/servidor|conexión/i);
  await expect(page.getByLabel('Razón social', { exact: true })).toHaveValue('Datos conservados');
  await expect(input).toBeEnabled();
  expect(subidas).toBe(1);
});
