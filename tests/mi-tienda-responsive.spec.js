import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const secciones = ['Tienda', 'Contacto', 'Pagos', 'Costos', 'Analítica', 'Conexión Logística'];

for (const width of [375, 1440]) {
  test(`Estado de configuración: check y pendientes a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page);
    await page.goto(`${baseURL}/mi-tienda`);
    const menu = width <= 640
      ? page.getByRole('tablist', { name: 'Secciones de configuración móvil' })
      : page.getByRole('tablist', { name: 'Secciones de configuración', exact: true });
    if (width <= 640) await page.locator('.tn-mobile-navigation summary').click();
    await expect(menu.getByRole('tab', { name: 'Tienda', exact: true })).toHaveAttribute('aria-description', /^Completo/);
    await expect(menu.getByRole('tab', { name: 'Contacto', exact: true })).toHaveAttribute('aria-description', /^Completo/);
    await expect(menu.getByRole('tab', { name: 'Analítica', exact: true })).toHaveAttribute('aria-description', /^Pendiente/);
    await expect(menu.getByRole('tab', { name: 'Tienda', exact: true }).locator('.tn-section-status.complete')).toBeVisible();
    await expect(menu.getByRole('tab', { name: 'Analítica', exact: true }).locator('.tn-section-status.pending')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('estados-configuracion.png') });
    await menu.getByRole('tab', { name: 'Contacto', exact: true }).click();
    const grupos = page.locator('.tn-group-toggle[aria-expanded="false"]');
    if (width <= 640) while (await grupos.count()) await grupos.first().click();
    await page.getByPlaceholder('Ej: 595981234567').fill('');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    if (width <= 640) await page.locator('.tn-mobile-navigation summary').click();
    await expect(menu.getByRole('tab', { name: 'Contacto', exact: true })).toHaveAttribute('aria-description', /^Pendiente/);
    if (width <= 640) await page.locator('.tn-mobile-navigation summary').click();
    await comprobarAncho(page);
  });

  test(`Conexión Logística: solicitud y bloqueo a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page);
    await page.goto(`${baseURL}/mi-tienda?tab=speedbox`);
    const conectar = page.getByRole('button', { name: 'Conectarme a Rahá' });
    await expect(conectar).toBeEnabled();
    const validar = page.getByRole('button', { name: 'Validar cuenta', exact: true });
    await expect(validar).toBeDisabled();
    const logo = page.getByRole('img', { name: 'Rahá', exact: true });
    await expect(logo).toBeVisible();
    expect(await logo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.locator('.logistica-validation-action').hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(page.getByRole('tooltip')).toContainText('Rahá tiene que aprobar tu solicitud');
    await comprobarAncho(page);
    await page.screenshot({ path: testInfo.outputPath('proveedor-logistico.png') });
    await conectar.click();
    await expect(page.getByLabel('Razón social', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Adjuntar Constancia de RUC', { exact: true })).toBeAttached();
    await comprobarAncho(page);
    await page.screenshot({ path: testInfo.outputPath('solicitud-logistica.png') });
  });
  test(`Conexión Logística: validación aprobada a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page, { estadoRaha: 'aprobada' });
    await page.goto(`${baseURL}/mi-tienda?tab=raha`);
    await expect(page.getByText('Validación pendiente', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Validar cuenta', exact: true }).click();
    await expect(page.getByLabel('Public key', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Private key', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solicitar habilitación en producción' })).toBeDisabled();
    await comprobarAncho(page);
    await page.screenshot({ path: testInfo.outputPath('validacion-logistica.png') });
  });
}

async function preparar(page, { estadoRaha = 'borrador' } = {}) {
  let cambiosTienda = {};
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data = {};
    if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
    else if (path.endsWith('/mi-tienda')) {
      if (route.request().method() === 'PUT') cambiosTienda = { ...cambiosTienda, ...route.request().postDataJSON() };
      data = {
      id: 1, nombre: 'Tienda de prueba', subdominio: 'tienda-de-prueba', dominio_base: 'gesicomm.com',
      plan: 'pago', whatsapp: '595981111222', documento: '4123456',
      typography: { headingFont: 'outfit', bodyFont: 'outfit' },
      ...cambiosTienda,
    };
    }
    else if (path.includes('suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true, suscripcion: { plan: { nombre: 'Pro' } } };
    else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Tienda de prueba' }];
    else if (path.endsWith('/integraciones/raha')) data = { id: 1, estado: estadoRaha, version: 1, datos: {}, documentos: [], historial: [] };
    else if (path.endsWith('/integraciones/speedbox')) data = { connections: [], checks: {}, orders: [], events: [], reviews: [], webhook_url: 'https://api.gesicomm.com/api/webhooks/speedbox?environment=production' };
    else if (path.includes('metodos-pago')) data = [{ id: 1, nombre: 'Transferencia bancaria', comision_porcentaje: 0, activo: true }];
    else if (path.endsWith('/combos/configuracion')) data = { cpa_porcentaje: 10, costo_envio: 20000, costo_confirmacion: 5000, costo_empaque: 2000, metodos_pago: [] };
    else if (path.includes('notificacion') || path.includes('catalogo') || path.includes('fonts')) data = [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
}

// El layout global recorta overflow: scrollWidth por sí solo no detecta que
// el panel o un control está fuera de pantalla. Medimos sus límites reales.
async function comprobarAncho(page, scope = '.tn-page') {
  const fuera = await page.locator(scope).evaluate(root => {
    const elements = [root, ...root.querySelectorAll('input:not([type="hidden"]), select, textarea, button, .tn-group, .tn-shell, .horario-picker-popover')];
    return elements.filter(el => {
      if (el.closest('.tn-tabs, .prod-table, .spb-table')) return false;
      const r = el.getBoundingClientRect();
      return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1);
    }).map(el => `${el.tagName}.${el.className}: ${el.getBoundingClientRect().left}..${el.getBoundingClientRect().right}`);
  });
  expect(fuera).toEqual([]);
}

for (const width of [320, 375, 390, 768, 1440]) {
  test(`Mi tienda: todas las secciones caben a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await preparar(page);
    await page.goto(`${baseURL}/mi-tienda`);
    await expect(page.getByRole('heading', { name: 'Mi tienda', exact: true })).toBeVisible();

    for (const nombre of secciones) {
      if (width <= 640) await page.locator('.tn-mobile-navigation summary').click();
      const tab = page.getByRole('tab', { name: nombre, exact: true });
      await tab.click();
      if (width <= 640) {
        await expect(page.locator('.tn-mobile-section-label strong')).toHaveText(nombre);
        await expect(page.locator('.tn-mobile-navigation')).not.toHaveAttribute('open');
      } else await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.tn-loading, .spb-loading, .raha-loading, .combo-loading')).toHaveCount(0);
      await page.waitForTimeout(250); // Fin de la transición de entrada del panel.
      await comprobarAncho(page);
      await page.screenshot({ path: testInfo.outputPath(`${nombre}-resumen.png`) });
      if (width <= 640) {
        const plegados = page.locator('.tn-group-toggle[aria-expanded="false"]');
        while (await plegados.count()) await plegados.first().click();
        await comprobarAncho(page);
        if (nombre === 'Tienda') {
          const campo = page.locator('.tn-group').filter({ has: page.getByRole('heading', { name: 'Identidad', exact: true }) }).locator('input').first();
          await campo.fill('Mi negocio móvil');
          await page.getByRole('button', { name: 'Contraer Identidad', exact: true }).click();
          await expect(campo).not.toBeVisible();
          await page.getByRole('button', { name: 'Expandir Identidad', exact: true }).click();
          await expect(campo).toHaveValue('Mi negocio móvil');
          await campo.fill('Tienda de prueba');
        }
      }

      if (nombre === 'Contacto') {
        await page.locator('.tn-input-like').click();
        await comprobarAncho(page);
        const limites = await page.locator('.horario-picker-popover').evaluate(el => {
          const r = el.getBoundingClientRect();
          return [...el.querySelectorAll('input, select, button')].every(control => {
            const c = control.getBoundingClientRect();
            return c.left >= r.left && c.right <= r.right;
          });
        });
        expect(limites).toBe(true);
        await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
        await expect(page.locator('.tn-input-like')).toContainText('Lunes a Viernes');
      }
      if (nombre === 'Pagos') {
        await expect(page.locator('.tn-footer')).toHaveCount(0);
        const tabla = page.locator('.tn-embed-metodos-pago table');
        if (width <= 640) {
          await expect(page.locator('.tn-payment-card').getByText('Transferencia bancaria')).toBeVisible();
          await expect(tabla).not.toBeVisible();
          await page.getByRole('button', { name: 'Editar Transferencia bancaria', exact: true }).click();
          await expect(page.getByRole('heading', { name: 'Editar método de pago', exact: true })).toBeVisible();
          await comprobarAncho(page, '.modal-overlay');
          await page.locator('.modal-overlay').click({ position: { x: 2, y: 2 } });
        } else await expect(tabla.getByText('Transferencia bancaria')).toBeVisible();
        await page.getByRole('button', { name: 'Nuevo método', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Nuevo método de pago', exact: true })).toBeVisible();
        await comprobarAncho(page, '.modal-overlay');
        await page.keyboard.press('Escape');
        // El modal usa cierre por overlay.
        if (await page.locator('.modal-overlay').count()) await page.locator('.modal-overlay').click({ position: { x: 2, y: 2 } });
        await page.locator('.tn-payment-integration summary').click();
        await expect(page.getByText('Integración PagoPar', { exact: true })).toBeVisible();
        await comprobarAncho(page);
      }
      if (nombre === 'Costos') {
        await expect(page.locator('.tn-footer')).toHaveCount(0);
        await page.getByRole('tab', { name: /Operacion Gesicom-RAHA/ }).click();
        await comprobarAncho(page);
        await expect(page.locator('.combo-cost-panel[data-tipo="raha"]')).toBeVisible();
      }
      await page.locator('.tn-page-head').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${nombre}.png`) });
    }
  });
}
