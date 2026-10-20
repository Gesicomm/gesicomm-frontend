import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5188';
const deposito = { id: 6, nombre: 'Depósito Central Luque', ciudad: 'Luque', direccion: 'Av. General Aquino 1240', activo: true };
const pedido = { id: 44, producto_id: 3, cantidad: 12, costo_producto: 420000, costo_logistico: 25000,
  precio_unitario: 35000, es_raha: true, modalidad_pago: 'CONTRA_ENTREGA', estado_seguimiento: 'en_camino',
  created_at: '2026-10-16T14:30:00Z', producto: { nombre: 'Termo de acero inoxidable 1 litro', sku: 'TRM-1000' },
  variante: { nombre: 'Negro mate', sku_variante: 'TRM-1000-NG' }, depositoDestino: deposito,
  pedidoRaha: { order_id: '900000000123456', status: 'en_camino', status_at: '2026-10-18T12:00:00Z' },
  inventario: { disponible: 28, reservado: 6 }, ventas_producto: { unidades: 34, importe: 2040000 },
  historial: [{ id: 1, created_at: '2026-10-16T14:30:00Z', comentario: 'Abastecimiento RAHA solicitado. Pago contra entrega, sin comprobante.' }],
  historial_raha: [
    { id: 'raha-1', origen: 'RAHA', estado: 'cargado', created_at: '2026-10-17T15:00:00Z' },
    { id: 'raha-2', origen: 'RAHA', estado: 'en_camino', created_at: '2026-10-18T12:00:00Z' },
  ] };

async function preparar(page) {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const ruta = url.pathname;
    let respuesta = {};
    if (ruta.endsWith('/auth/me')) respuesta = { id: 7, nombre: 'Comercio de prueba', rol: 'usuario', tiendaId: 1 };
    else if (ruta.endsWith('/mi-tienda')) respuesta = { id: 1, nombre: 'Casa Norte', subdominio: 'casa-norte' };
    else if (ruta.endsWith('/tiendas/mias')) respuesta = [{ id: 1, nombre: 'Casa Norte' }];
    else if (ruta.endsWith('/suscripciones/mi-estado')) respuesta = { tiene_suscripcion_activa: true };
    else if (ruta.endsWith('/educacion/progreso-sidebar')) respuesta = { menusDesbloqueados: [], bloqueos: {}, modulos: [] };
    else if (ruta.endsWith('/depositos/listado')) respuesta = { data: [deposito], total: 1, totalPages: 1 };
    else if (ruta.endsWith('/solicitudes-abastecimiento/44')) respuesta = pedido;
    else if (ruta.endsWith('/solicitudes-abastecimiento')) respuesta = { solicitudes: [pedido], total: 42, total_paginas: 3 };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(respuesta) });
  });
  await page.route('**/connect.facebook.net/**', route => route.abort());
}

for (const width of [390, 1440]) {
  test(`Abastecimientos RAHA: listado y seguimiento a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page);
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(`${baseURL}/mis-abastecimientos`);
    await expect(page.getByRole('heading', { name: 'Abastecimientos RAHA' })).toBeVisible();
    await expect(page.getByText('Termo de acero inoxidable 1 litro')).toBeVisible();
    await expect(page.getByRole('button', { name: /comprobante/i })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('listado.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Estado RAHA').selectOption('en_camino');
    await expect(page).toHaveURL(/estado=en_camino/);
    await page.getByLabel('Depósito de destino').selectOption('6');
    await expect(page).toHaveURL(/depositoId=6/);
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole('link', { name: '#44', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Seguimiento del pedido' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Historial de movimientos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirmar recepción/ })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('seguimiento.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Volver a abastecimientos' }).click();
    await expect(page).toHaveURL(/estado=en_camino.*depositoId=6.*page=2/);
    expect(errores).toEqual([]);
  });
}
