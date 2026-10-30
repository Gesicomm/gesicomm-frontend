import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`solicitud aprobada: completar cuenta y descargar contratos (${viewport.width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let solicitud = { id: 1, estado: 'aprobada', version: 4, datos: {
      razon_social: 'Comercio de prueba', banco: 'Banco de prueba', titular_cuenta: 'Comercio de prueba',
      numero_cuenta: '123456', moneda: 'PYG',
    }, documentos: [], historial: [] };
    let guardados = 0;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
      else if (path.includes('/suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true, rutas: { fisico: true, personal: false } };
      else if (path.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Mi tienda', subdominio: 'mi-tienda', plan: 'pago' };
      else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Mi tienda' }];
      else if (path.endsWith('/integraciones/raha')) data = solicitud;
      else if (path.endsWith('/integraciones/raha/tipo-cuenta')) {
        expect(route.request().method()).toBe('PATCH');
        expect(route.request().postDataJSON()).toEqual({ tipo_cuenta: 'Caja de ahorro', version: 4 });
        guardados += 1;
        solicitud = { ...solicitud, version: 5, datos: { ...solicitud.datos, tipo_cuenta: 'Caja de ahorro' } };
        data = solicitud;
      } else if (path.endsWith('/integraciones/raha/contrato')) {
        expect(solicitud.datos.tipo_cuenta).toBe('Caja de ahorro');
        return route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: 'contrato de prueba' });
      } else if (path.endsWith('/integraciones/raha/documentos/9')) {
        return route.fulfill({ contentType: 'application/pdf', body: '%PDF-firmado de prueba' });
      } else if (path.includes('metodos-pago') || path.includes('notificacion') || path.includes('catalogo')) data = [];
      return route.fulfill({ json: data });
    });
    await page.goto(`${baseURL}/mi-tienda?tab=raha`);
    await page.getByRole('button', { name: 'Ver solicitud', exact: true }).click();
    const tipo = page.getByLabel('Tipo de cuenta', { exact: true });
    await expect(tipo).toBeEnabled();
    await expect(page.getByLabel('Banco', { exact: true })).toBeDisabled();
    await tipo.selectOption('Caja de ahorro');
    await tipo.scrollIntoViewIfNeeded();
    expect(await tipo.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: testInfo.outputPath('cuenta-pendiente.png') });
    const contrato = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar contrato para firmar' }).click();
    expect((await contrato).suggestedFilename()).toBe('contrato-marco-raha.docx');
    await expect(tipo).toBeDisabled();
    expect(guardados).toBe(1);
    expect(solicitud.estado).toBe('aprobada');

    // Un PDF ya firmado no depende del campo pendiente ni del generador DOCX.
    solicitud = { ...solicitud, datos: { ...solicitud.datos, tipo_cuenta: '' }, documentos: [{ id: 9, tipo: 'contrato', nombre: 'contrato-firmado.pdf', size: 100 }] };
    await page.reload();
    await page.getByRole('button', { name: 'Ver solicitud', exact: true }).click();
    const firmado = page.getByRole('button', { name: 'Descargar contrato firmado', exact: true });
    await firmado.scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Banco', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Ver datos enviados')).toBeVisible();
    await expect(page.getByLabel('Tipo de cuenta', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('contrato-firmado.png') });
    const pdf = page.waitForEvent('download');
    await firmado.click();
    expect((await pdf).suggestedFilename()).toBe('contrato-firmado.pdf');
    expect(guardados).toBe(1);
    expect(await page.locator('.raha').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
