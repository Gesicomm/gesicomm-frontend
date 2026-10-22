import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const deposito = { id: 1, nombre: 'Depósito Central', activo: true, departamento: 'Central', ciudad: 'Luque', direccion: 'Av. Principal 123', persona_contacto: 'Equipo de despacho' };

for (const width of [375, 1280]) for (const modalidad of ['PROPIA', 'GESICOMM']) {
  test(`Depósitos ${modalidad}: recorrido a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
      else if (path.includes('suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true, suscripcion: { plan: { nombre: 'Pro' } } };
      else if (path.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Tienda de prueba', subdominio: 'prueba' };
      else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Tienda de prueba' }];
      else if (path.endsWith('/depositos/listado') || path.endsWith('/fulfillment/depositos')) data = { data: [deposito], total: 1, totalPages: 1, filtros: { ciudades: ['Luque'], departamentos: ['Central'] } };
      else if (path.endsWith('/depositos/1/couriers')) data = { couriers: [] };
      else if (path.endsWith('/mi-tienda/fulfillment')) data = { modalidad, deposito_fulfillment_id: 1, propia: { disponible: true, total_depositos: 1 }, gesicomm: { disponible: true, costo_desde: 30000 } };
      else if (path.includes('geografia')) data = [{ id: 1, nombre: 'Central', ciudades: [{ id: 10, nombre: 'Luque' }] }];
      else if (path.includes('notificacion')) data = [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto(`${baseURL}/mi-tienda/depositos`);
    await expect(page.getByRole('heading', { name: 'Depósitos', exact: true })).toBeVisible();
    const entrega = page.getByRole('button', { name: /Entrega de pedidos/ });
    await expect(entrega).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.dep-delivery')).toContainText(modalidad === 'PROPIA' ? 'Despachás con tus depósitos' : 'Gesicom-RAHA prepara');
    const aviso = page.getByText('Sin transportista asignado', { exact: true });
    if (modalidad === 'PROPIA') await expect(aviso).toBeVisible();
    else await expect(aviso).toHaveCount(0);
    await comprobarAncho(page, '.dep-page');
    const abrirDeposito = page.locator('.dep-deposit-card > button').first();
    for (const lado of ['top', 'right', 'bottom', 'left']) {
      await expect(abrirDeposito).toHaveCSS(`border-${lado}-width`, '0px');
    }
    await abrirDeposito.focus();
    await expect(abrirDeposito).toHaveCSS('outline-style', 'solid');
    await expect(abrirDeposito).toHaveCSS('outline-width', '2px');
    await abrirDeposito.blur();
    await page.screenshot({ path: testInfo.outputPath('depositos.png'), fullPage: true });
    await page.getByLabel('Buscar depósito', { exact: true }).fill('Central');
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await expect(page.getByLabel('Buscar depósito', { exact: true })).toHaveValue('');
    await page.getByText('Más filtros', { exact: true }).click();
    await expect(page.getByLabel('Persona de contacto', { exact: true })).toBeVisible();
    await entrega.click();
    await expect(page.getByRole('heading', { name: 'Quién entrega cuando vendés' })).toBeVisible();
    await comprobarAncho(page, '.dep-page');
    await entrega.click();
    await page.getByRole('button', { name: 'Administrar', exact: true }).click();
    const detalle = page.getByRole('dialog', { name: 'Administrar Depósito Central' });
    await expect(detalle.getByRole('heading', { name: 'Transportistas y cobertura' })).toBeVisible();
    await comprobarAncho(page, '.dep-detail');
    await page.screenshot({ path: testInfo.outputPath('detalle.png') });
    await detalle.getByRole('button', { name: 'Editar', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Editar depósito', exact: true });
    const nombre = form.getByLabel('Nombre del depósito', { exact: true });
    await expect(nombre).toBeFocused();
    await nombre.fill('Depósito actualizado');
    await form.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(form.getByRole('alert')).toContainText('Tenés cambios sin guardar');
    await form.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(nombre).toHaveValue('Depósito actualizado');
    await comprobarAncho(page, '.dep-form');
    await page.screenshot({ path: testInfo.outputPath('formulario.png') });
    await form.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await form.getByRole('button', { name: 'Descartar cambios' }).click();
    await expect(form).toHaveCount(0);
    expect(errores).toEqual([]);
  });
}

async function comprobarAncho(page, selector) {
  const fuera = await page.locator(selector).evaluate(root => [...root.querySelectorAll('button, input, select, textarea')].filter(el => { const rect = el.getBoundingClientRect(); return rect.width && rect.height && (rect.left < -1 || rect.right > innerWidth + 1); }).map(el => el.outerHTML.slice(0, 160)));
  expect(fuera).toEqual([]);
}
