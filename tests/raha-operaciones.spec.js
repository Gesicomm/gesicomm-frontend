import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5188';
const origen = { id: 6, nombre: 'Depósito Central Luque', ciudad: 'Luque', direccion: 'Av. General Aquino 1240' };
const destino = { id: 2, nombre: 'Centro de recepción RAHA', ciudad: 'Asunción', direccion: 'Av. España 2800',
  persona_contacto: 'Recepción de mercadería', telefono_contacto: '0981123456', activo: true };
const abastecimiento = { id: 24, usuario_id: 7, cantidad: 3, producto_id: 3, precio_unitario: 35000,
  costo_producto: 105000, costo_logistico: 25000, created_at: '2026-10-19T12:00:00Z',
  producto: { nombre: 'Termo de acero inoxidable', sku: 'TRM-1000' }, variante: { nombre: 'Negro mate' },
  depositoDestino: { ...origen, tienda: { nombre: 'Casa Norte' } }, Usuario: { nombre: 'Martín de prueba' },
  estado_seguimiento: 'en_camino', pedidoRaha: { order_id: '9000000000216185', status: 'en_camino' },
  historial_raha: [{ id: 'raha-1', estado: 'en_camino', created_at: '2026-10-19T12:00:00Z' }] };

async function preparar(page) {
  let solicitud = null;
  await page.addInitScript(() => localStorage.setItem('gesicomm:rahaPortalToken', 'portal-de-prueba'));
  await page.route('**/api/**', async route => {
    const ruta = new URL(route.request().url()).pathname;
    const metodo = route.request().method();
    const body = metodo === 'POST' || metodo === 'PUT' ? route.request().postDataJSON() : {};
    let data = {};
    if (ruta === '/api/auth/me') data = { id: 7, nombre: 'Martín de prueba', rol: 'usuario', tiendaId: 1 };
    else if (ruta === '/api/raha-portal/me') data = { usuario: { id: 5, nombre: 'Operador RAHA', email: 'operador@example.test' } };
    else if (ruta.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Casa Norte', subdominio: 'casa-norte' };
    else if (ruta.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Casa Norte' }];
    else if (ruta.endsWith('/suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true };
    else if (ruta.endsWith('/educacion/progreso-sidebar')) data = { menusDesbloqueados: [], bloqueos: {}, modulos: [] };
    else if (ruta.endsWith('/operaciones/origenes')) data = [origen];
    else if (ruta.endsWith('/operaciones/destinos') && metodo === 'GET') data = [destino];
    else if (ruta.endsWith('/operaciones/stock')) data = { registros: [{ producto_id: 3, variante_id: null,
      producto: { nombre: 'Termo de acero inoxidable', sku: 'TRM-1000' }, disponible: 20 }], total: 1, totalPaginas: 1 };
    else if (ruta.endsWith('/operaciones/envios') && metodo === 'POST') {
      solicitud = { id: 15, version: 0, estado: 'solicitada', created_at: '2026-10-19T12:00:00Z', origen_snapshot: origen,
        destino_snapshot: destino, tienda: { nombre: 'Casa Norte' }, comercio: { nombre: 'Martín de prueba' },
        items: body.items.map(item => ({ ...item, nombre: 'Termo de acero inoxidable', sku: 'TRM-1000' })),
        observacion: body.observacion, historial: [{ estado: 'solicitada', fecha: '2026-10-19T12:00:00Z', autor: 'Comercio' }] };
      data = solicitud;
    } else if (ruta.endsWith('/operaciones/envios/listado')) data = { registros: solicitud ? [solicitud] : [], total: solicitud ? 1 : 0, totalPaginas: 1 };
    else if (ruta.endsWith('/operaciones/envios/15/resolver')) {
      solicitud = { ...solicitud, estado: body.estado, version: solicitud.version + 1,
        historial: [...solicitud.historial, { estado: body.estado, autor: 'RAHA · Operador', fecha: '2026-10-19T12:30:00Z', comentario: body.comentario }] };
      data = solicitud;
    } else if (ruta.endsWith('/operaciones/envios/15')) data = solicitud;
    else if (ruta.endsWith('/operaciones/abastecimientos')) data = { registros: [abastecimiento], total: 1, totalPaginas: 1 };
    else if (ruta.endsWith('/operaciones/abastecimientos/24')) data = abastecimiento;
    else if (ruta.endsWith('/raha-portal/solicitudes')) data = { solicitudes: [], total: 0, totalPaginas: 1 };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/connect.facebook.net/**', route => route.abort());
}

for (const width of [390, 1440]) {
  test(`Portal y comercio coordinan mercadería a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await preparar(page);
    const errores = [];
    page.on('pageerror', fallo => errores.push(fallo.message));
    await page.goto(`${baseURL}/mis-envios-raha`);
    await page.getByRole('button', { name: 'Nueva solicitud', exact: true }).click();
    await page.getByLabel('Depósito de origen').selectOption('6');
    await page.getByLabel('Depósito RAHA de destino').selectOption('2');
    await page.getByRole('button', { name: /Termo de acero inoxidable/ }).click();
    await page.getByLabel('Cantidad', { exact: true }).fill('3');
    await page.getByLabel('Observaciones para RAHA').fill('Enviar embalado y coordinar recepción por la mañana.');
    await page.screenshot({ path: testInfo.outputPath('comercio-seleccion.png'), fullPage: true });
    await page.getByRole('button', { name: 'Enviar solicitud a RAHA' }).click();
    await expect(page.getByText('Solicitud #15 enviada a RAHA.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solicitud #15' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto(`${baseURL}/raha/solicitudes?tab=envios`);
    await page.getByRole('button', { name: 'Ver solicitud de envío 15' }).click();
    await expect(page.getByText('Enviar embalado y coordinar recepción por la mañana.', { exact: false }).last()).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar para coordinar', exact: true }).click();
    await page.getByLabel('Comentario de coordinación (opcional)').fill('Coordinar recepción en el centro de Asunción.');
    await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
    await expect(page.getByText('Estado de la solicitud actualizado.')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('portal-envios.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.getByRole('button', { name: 'Abastecimientos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ver abastecimiento 24' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver abastecimiento 24' }).click();
    await expect(page.getByRole('heading', { name: 'Historial logístico' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('portal-abastecimientos.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByText('Subir comprobante')).toHaveCount(0);

    await page.getByRole('button', { name: 'Depósitos RAHA', exact: true }).click();
    await expect(page.getByText('Centro de recepción RAHA', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Editar depósito Centro de recepción RAHA' }).click();
    await expect(page.getByLabel('Dirección de recepción')).toHaveValue(destino.direccion);
    await page.screenshot({ path: testInfo.outputPath('portal-depositos.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => page.locator('.rp-root').evaluate(root => getComputedStyle(root).backgroundColor === getComputedStyle(document.body).backgroundColor)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('portal-depositos-oscuro.png'), fullPage: true });

    await page.goto(`${baseURL}/mis-envios-raha`);
    await expect(page.getByRole('table').getByText('Aceptada para coordinar', { exact: true })).toBeVisible();
    expect(errores).toEqual([]);
  });
}
