import { test, expect } from '@playwright/test';
const texto = '# Términos del programa de afiliados\n\n' + Array.from({ length: 18 }, (_, i) =>
  '### ' + (i + 1) + '. ' + (i === 17 ? 'Aceptación' : 'Condiciones del programa') + '\n\n' +
  'La participación requiere una suscripción activa y la aceptación de las condiciones vigentes. '.repeat(6)
).join('\n\n');
const terminos = { version: '1.0', fecha: '2026-10-14', texto };
const afiliado = { id: 3, nombre: 'Ana', codigo: 'ana', estado: 'activo', comision_pct: 10, link: 'https://gesicomm.com/planes?ref=ana', terminos_version: '1.0', terminos_aceptados_en: '2026-10-17T12:00:00Z', requiere_aceptacion: false, cuenta_pago: '123', resumen_comisiones: { total_a_liquidar: 180000, pendiente: 80000, aprobada: 100000, pagada: 50000, total_generado: 230000 } };

async function api(page, initial = false, codigo = 'founders', personal = false) {
  let activa = !initial;
  const posts = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()).pathname;
    let data = {};
    if (url === '/api/auth/me') data = { id: 7, nombre: 'Ana', rol: 'usuario', tiendaId: personal ? null : 1 };
    if (url === '/api/suscripciones/mi-estado') data = { tiene_suscripcion_activa: true, rutas: { fisico: !personal, personal }, suscripcion: { plan: { codigo } } };
    if (url === '/api/mi-tienda') data = { id: 1, nombre: 'Tienda de Ana' };
    if (url === '/api/tiendas/mias') data = [{ id: 1, nombre: 'Tienda de Ana' }];
    // Simula también un catálogo antiguo durante un despliegue gradual.
    if (url === '/api/educacion/progreso-sidebar') data = { modulos: [{ contexto: 'ecommerce', seccion: 'AFILIADOS', path: '/afiliados', label: 'Quiero ser afiliado', icono: 'BadgeDollarSign', menuKey: 'afiliados', requierePlan: 'founders' }], bloqueos: {} };
    if (url.includes('/seguimiento/notificaciones')) data = { data: [], no_leidas: 0 };
    if (url === '/api/afiliados/me') {
      if (route.request().method() === 'POST') {
        posts.push(route.request().postDataJSON());
        activa = true;
        data = { afiliado };
      } else data = {
        afiliado: activa ? afiliado : null, terminos, condiciones_pago: { dias_deposito: null, minimo_liquidacion: null, moneda: 'PYG' },
        metricas: { visitas: 142, visitantes_estimados: 96, registros: 18, clientes_pagados: 9, clientes_activos: 7 },
        movimientos: activa ? [{ id: 1, plan: 'Fundador', monto_base: 1000000, monto_comision: 100000, comision_pct: 10, estado: 'aprobada', created_at: '2026-10-17T12:00:00Z' }, { id: 2, plan: 'Fundador', monto_base: 500000, monto_comision: 50000, comision_pct: 10, estado: 'pagada', created_at: '2026-10-14T12:00:00Z', pagada_en: '2026-10-16T12:00:00Z' }] : [],
      };
    }
    await route.fulfill({ json: data });
  });
  return posts;
}

const planes = ['una-ruta-mensual', 'una-ruta-anual', 'ambas-rutas-mensual', 'ambas-rutas-anual', 'founders'];
for (const codigo of planes) for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`aceptacion y billetera ${codigo} ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const posts = await api(page, true, codigo, codigo === 'una-ruta-anual');
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5181'}/afiliados`);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const aceptar = page.getByRole('button', { name: 'Aceptar y activar mi afiliación' });
    await expect(aceptar).toBeDisabled();
    await expect(page.getByRole('heading', { name: '18. Aceptación' })).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('terminos.png') });
    await page.getByRole('checkbox').check();
    await aceptar.click();
    await expect(dialog).toHaveCount(0);
    expect(posts[0]).toMatchObject({ acepta_terminos: true, terminos_version: '1.0' });
    if (viewport.width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    const enlace = page.getByRole('link', { name: 'Quiero ser afiliado', exact: true });
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute('href', '/afiliados');
    await enlace.click();
    await expect(page.getByText('Total a liquidar', { exact: true })).toBeVisible();
    await expect(page.getByText('142', { exact: true })).toBeVisible();
    await expect(page.getByText('A definir', { exact: true })).toHaveCount(2);
    const title = await page.getByRole('heading', { name: 'Quiero ser afiliado', exact: true }).boundingBox();
    expect(title.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('billetera.png'), fullPage: true, animations: 'disabled' });
    await page.getByLabel('Estado', { exact: true }).selectOption('pagada');
    await expect(page.locator('.af-history tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Términos y condiciones', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Total a liquidar', { exact: true })).toBeVisible();
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
