import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const producto = { id: 3, nombre: 'Termo de prueba', activo: true, imagenes: [] };

async function preparar(page, { fallo = false } = {}) {
  await page.addInitScript(() => {
    window.adsCopiasDePrueba = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async texto => { window.adsCopiasDePrueba.push(texto); } } });
  });
  await prepararUsuario(page, 'light');
  await page.route('**/api/suscripciones/mi-estado', route => route.fulfill({ json: { rutas: { fisico: true, personal: false }, tiene_suscripcion_activa: true, suscripcion: { estado: 'activa', plan: { codigo: 'una-ruta', nombre: 'Una ruta' } } } }));
  let campanas = [];
  let gastos = [];
  let creativos = [];
  let ventasMeta = [];
  let solapado = false;
  await page.route('**/api/productos/buscar', route => route.fulfill({ json: { productos: [producto] } }));
  await page.route('**/api/meta*/**', route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let payload = {};
    if (method !== 'GET') { try { payload = route.request().postDataJSON(); } catch { /* archivo multipart */ } }
    let body = {};
    if (path === '/api/meta/stores') body = { tiendas: [] };
    else if (path === '/api/meta-reportes/campanas') {
      if (method === 'GET') {
        if (fallo) return route.fulfill({ status: 500, json: { message: 'Error de prueba' } });
        body = campanas;
      } else { body = { id: 7, ...payload, nombre_interno: payload.nombre_display, estado: 'borrador', productos: [producto], creativos, ventas_conjuntos: ventasMeta, gasto_total: 0, gasto_registros: 0 }; campanas = [body]; }
    } else if (/\/conjuntos\/\d+\/creativos$/.test(path)) {
      body = { id: 55, campana_id: 7, conjunto_id: Number(path.match(/\/conjuntos\/(\d+)\/creativos$/)[1]), nombre: 'creativo.png', mime: 'image/png' };
      creativos.push(body);
      campanas[0].creativos = [...creativos];
    } else if (/\/conjuntos\/\d+\/ventas$/.test(path)) {
      const conjuntoId = Number(path.match(/\/conjuntos\/(\d+)\/ventas$/)[1]);
      body = { id: 91, campana_id: 7, conjunto_id: conjuntoId, ...payload };
      ventasMeta = [...ventasMeta.filter(v => v.id !== body.id), body];
      campanas[0].ventas_conjuntos = [...ventasMeta];
    } else if (path.endsWith('/gastos/listar')) {
      const total = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);
      body = { gastos, resumen: { total_gastado: total, registros: gastos.length, dias_cargados: 3, promedio_diario: total / 3, primer_dia: '2026-10-01', ultimo_dia: '2026-10-03' }, total: gastos.length, pagina: 1, total_paginas: 1 };
    } else if (path.endsWith('/7/gastos')) {
      if (solapado) return route.fulfill({ status: 409, json: { message: 'Ya registraste gasto en estas fechas. Elegí otro período.' } });
      body = { id: 31, ...payload, dias: 3, promedio_diario: payload.monto / 3, created_at: '2026-10-03T12:00:00Z' }; gastos.push(body);
      campanas[0] = { ...campanas[0], gasto_total: gastos.reduce((a, g) => a + g.monto, 0), gasto_registros: gastos.length, gasto_ultimo_dia: payload.fecha_hasta };
    } else if (path === '/api/meta-reportes/gastos/31') { gastos = [{ ...gastos[0], ...payload }]; campanas[0].gasto_total = payload.monto; body = gastos[0]; }
    else if (path === '/api/meta-reportes/campanas/7') { campanas[0] = { ...campanas[0], ...payload, nombre_interno: payload.nombre_display || campanas[0].nombre_interno }; body = campanas[0]; }
    return route.fulfill({ json: body });
  });
  return { rechazarSolapamiento: value => { solapado = value; }, campanas: () => campanas, gastos: () => gastos, creativos: () => creativos, ventasMeta: () => ventasMeta };
}

test('Publicidad: un conjunto ABO completo entra en el modal móvil sin scroll inicial', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await preparar(page);
  await page.goto(origin + '/mis-anuncios');
  await page.getByRole('button', { name: 'Nueva campaña', exact: true }).first().click();
  const modal = page.getByRole('dialog', { name: 'Nueva campaña interna' });
  await modal.getByRole('button', { name: 'Termo de prueba' }).click();
  await modal.getByRole('button', { name: 'Siguiente' }).click();
  await modal.getByRole('button', { name: /Venta Web/ }).click();
  await modal.getByRole('button', { name: 'Siguiente' }).click();
  await modal.getByRole('button', { name: /^Conversión/ }).click();
  await modal.getByRole('button', { name: 'Siguiente' }).click();
  await modal.getByRole('button', { name: 'Ventas', exact: true }).click();
  await modal.getByRole('button', { name: 'Siguiente' }).click();
  await modal.getByRole('button', { name: /ABO/ }).click();
  await modal.getByRole('button', { name: 'Siguiente' }).click();
  const body = modal.locator('.ads-wizard-body');
  const alto = await body.evaluate(elemento => ({ contenido: elemento.scrollHeight, visible: elemento.clientHeight }));
  expect(alto.contenido).toBeLessThanOrEqual(alto.visible + 2);
});

for (const width of [375, 1280]) {
  test(`Publicidad: crear, editar, cargar gasto y consultar historial a ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: width === 375 ? 812 : 768 });
    const datos = await preparar(page);
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(origin + '/mis-anuncios');
    await expect(page.getByRole('heading', { name: 'Publicidad', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Nueva campaña', exact: true }).first().click();
    let modal = page.getByRole('dialog', { name: 'Nueva campaña interna', exact: true });
    await expect(modal.getByRole('button', { name: 'Siguiente', exact: true })).toBeDisabled();
    await modal.getByRole('button', { name: 'Termo de prueba', exact: true }).click();
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByRole('button', { name: /Venta Web/ }).click();
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByRole('button', { name: /^Conversión/ }).click();
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(modal.getByRole('heading', { name: 'Tipo de campaña en Meta' })).toBeVisible();
    const opcionVentas = modal.getByRole('button', { name: 'Ventas', exact: true });
    await opcionVentas.hover();
    await expect(opcionVentas).toHaveCSS('cursor', 'pointer');
    await modal.getByRole('button', { name: 'Ventas', exact: true }).click();
    await expect(opcionVentas).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByRole('button', { name: /CBO/ }).click();
    await modal.getByText('Presupuesto diario de la campaña').locator('input').fill('50000');
    await expect(modal.getByText('Presupuesto diario de la campaña').locator('input')).toHaveValue('50.000');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByText('Nombre', { exact: true }).locator('input').fill('Público nuevo');
    const altoInicial = await modal.locator('.ads-wizard-body').evaluate(elemento => ({ contenido: elemento.scrollHeight, visible: elemento.clientHeight }));
    expect(altoInicial.contenido).toBeLessThanOrEqual(altoInicial.visible + 2);
    const cuerpoAsistente = modal.locator('.ads-wizard-body');
    await cuerpoAsistente.evaluate(elemento => { elemento.scrollTop = elemento.scrollHeight; });
    await modal.getByRole('button', { name: 'Agregar conjunto', exact: true }).click();
    await expect(modal.locator('[data-conjunto-id]').first()).toHaveAttribute('data-conjunto-id', '2');
    const nombreNuevo = modal.locator('[data-conjunto-id="2"] input').first();
    await expect(nombreNuevo).toBeFocused();
    expect(await cuerpoAsistente.evaluate(elemento => elemento.scrollTop)).toBe(0);
    await nombreNuevo.fill('Público recurrente');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await comprobarAncho(page, '.ads-wizard');
    await modal.locator('input[type="file"]').first().setInputFiles({ name: 'creativo.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
    await page.screenshot({ path: testInfo.outputPath('asistente.png') });
    await modal.getByRole('button', { name: 'Generar nombre y crear', exact: true }).click();
    await expect(modal).toContainText('Campaña creada');
    expect(datos.campanas()[0].tipo).toBe('web');
    expect(datos.creativos()).toHaveLength(1);
    expect(datos.campanas()[0].configuracion_anuncios.conjuntos.map(c => c.nombre)).toEqual(['Público recurrente', 'Público nuevo']);
    await modal.getByTitle('Copiar', { exact: true }).click();
    expect(await page.evaluate(() => window.adsCopiasDePrueba.at(-1))).toBe(datos.campanas()[0].nombre_interno);
    await modal.getByRole('button', { name: 'Listo', exact: true }).click();
    await expect(page.locator('.ads-campaigns')).toContainText('Termo de prueba');
    await comprobarAncho(page, '.ads-page');
    await page.screenshot({ path: testInfo.outputPath('campanas.png') });
    await page.locator('.ads-actions summary').click();
    await page.getByTitle('Editar campaña', { exact: true }).click();
    modal = page.getByRole('dialog', { name: 'Editar campaña', exact: true });
    await expect(modal.getByRole('button', { name: 'Ir a conjuntos y ventas de Meta' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Termo de prueba', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(modal.getByRole('button', { name: /Venta Web/ })).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: /WhatsApp/ }).click();
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(modal.getByRole('button', { name: /^Conversión/ })).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(modal.getByRole('button', { name: /CBO/ })).toHaveAttribute('aria-pressed', 'true');
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.locator('[data-conjunto-id="2"] .ads-meta-sales').getByRole('button', { name: 'Cargar ventas' }).click();
    const ventasForm = modal.locator('[data-conjunto-id="2"] .ads-meta-sales-form');
    await ventasForm.getByText('Desde').locator('input').fill('2026-11-01');
    await ventasForm.getByText('Hasta').locator('input').fill('2026-11-07');
    await ventasForm.getByRole('spinbutton', { name: 'Compras', exact: true }).fill('3');
    await ventasForm.getByRole('button', { name: 'Guardar compras' }).click();
    await expect(modal.locator('[data-conjunto-id="2"] .ads-meta-sales')).toContainText('3 compras');
    expect(datos.ventasMeta()[0].conjunto_id).toBe(2);
    await modal.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(datos.campanas()[0].tipo).toBe('whatsapp');
    await page.getByRole('button', { name: 'Cargar gasto', exact: true }).click();
    modal = page.getByRole('dialog', { name: 'Cargar gasto', exact: true });
    await modal.getByLabel('Desde', { exact: true }).fill('2026-10-01');
    await modal.getByLabel('Hasta', { exact: true }).fill('2026-10-03');
    await modal.getByLabel('Monto gastado', { exact: true }).fill('90000');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('cambios sin guardar');
    await modal.getByRole('button', { name: 'Seguir editando', exact: true }).click();
    datos.rechazarSolapamiento(true);
    await modal.getByRole('button', { name: 'Cargar gasto', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Ya registraste');
    await expect(modal.getByLabel('Desde', { exact: true })).toHaveValue('2026-10-01');
    await comprobarAncho(page, '[role="dialog"]');
    await page.screenshot({ path: testInfo.outputPath('gasto-validacion.png') });
    datos.rechazarSolapamiento(false);
    await modal.getByRole('button', { name: 'Cargar gasto', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(datos.gastos()[0].monto).toBe(90000);
    await page.getByTitle('Ver histórico de gasto', { exact: true }).click();
    await expect(page.locator('.ads-history')).toContainText('90.000');
    await page.getByTitle('Corregir', { exact: true }).click();
    modal = page.getByRole('dialog', { name: 'Corregir gasto', exact: true });
    await modal.getByLabel('Monto gastado', { exact: true }).fill('120000');
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('.ads-history')).toContainText('120.000');
    await page.screenshot({ path: testInfo.outputPath('historial.png') });
    await page.getByRole('button', { name: 'Campañas', exact: true }).click();
    await page.locator('.ads-actions summary').click();
    await page.getByTitle('Archivar', { exact: true }).click();
    await expect(page.locator('.ads-campaigns')).toHaveCount(0);
    await page.getByLabel('Filtrar campañas por estado', { exact: true }).selectOption('archivadas');
    await expect(page.locator('.ads-campaigns')).toContainText('Termo de prueba');
    expect(datos.campanas()[0].estado).toBe('archivada');
    await page.getByRole('button', { name: 'Métricas de Meta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Conectá Meta para ver tus métricas' })).toBeVisible();
    expect(errores).toEqual([]);
  });
}

test('Publicidad: un fallo de carga no se presenta como una cuenta sin campañas', async ({ page }) => {
  await preparar(page, { fallo: true });
  await page.goto(origin + '/mis-anuncios');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar tus campañas');
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
  await expect(page.getByText('Todavía no creaste ninguna campaña', { exact: true })).toHaveCount(0);
});

test('Publicidad: explica una conexión vencida sin exponer el error técnico como mensaje principal', async ({ page }, testInfo) => {
  await preparar(page);
  await page.route('**/api/meta/stores', route => route.fulfill({ json: { tiendas: [{ id: 1, nombre: 'Cuenta de prueba' }] } }));
  await page.route('**/api/meta/filters', route => route.fulfill({ status: 500, json: { message: 'Error validating access token: session invalidated' } }));
  await page.goto(origin + '/mis-anuncios');
  await page.getByRole('button', { name: 'Métricas de Meta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Necesitamos revisar tu conexión con Meta' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ir a Configuración/ })).toBeVisible();
  await expect(page.getByText(/Error validating access token/)).not.toBeVisible();
  await page.getByText('Ver detalle técnico', { exact: true }).click();
  await expect(page.getByText(/Error validating access token/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('conexion-meta.png') });
});

async function comprobarAncho(page, selector) {
  const fuera = await page.locator(selector).evaluate(root => [...root.querySelectorAll('button,input,select,textarea,summary')].filter(el => { if (el.closest('.ads-history table')) return false; const r = el.getBoundingClientRect(); return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1); }).map(el => el.outerHTML.slice(0, 140)));
  expect(fuera).toEqual([]);
}
