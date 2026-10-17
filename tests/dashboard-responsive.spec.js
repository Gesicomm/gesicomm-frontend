import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const producto = {
  producto_id: 1, nombre: 'Cafetera automática premium con espumador y accesorios', unidades: 12,
  venta: 7500000, costo: 5000000, ganancia: 2500000, perdida: 150000, rentabilidad: 50,
  confirmados: 15, entregados: 12, costo_detalle: { mercaderia: 4000000, envio: 300000, fijos: 700000 },
};
const canal = { total: 20, confirmados: 16, preparados: 14, despachados: 13, entregados: 12, cancelados: 2, devueltos: 1, efectividad: 60 };
const ventas = {
  rango_fechas: { desde: '2026-10-01', hasta: '2026-10-17' }, anios_disponibles: [2026, 2025],
  productos_disponibles: [{ producto_id: 1, nombre: producto.nombre }, { producto_id: 2, nombre: 'Producto sin margen' }],
  kpis: { facturacion_entregada: 12500000, ticket_promedio: 625000, ganancia_neta_estimada: 2800000,
    pct_margen_neto: 22.4, pct_margen_bruto: 28, margen_bruto_estimado: 3500000,
    costo_mercaderia_entregada: 7000000, costo_logistico_entregados: 600000, gasto_meta_ads: 400000,
    gastos_fijos_generales: 1000000, gastos_variables_generales: 200000, gastos_operativos: 1200000,
    iva_facturado_total: 700000, gastos_por_categoria: [{ categoria: 'Alquiler', total: 1000000 }],
    punto_equilibrio: 5000000, falta_para_equilibrio: 0, pct_contribucion: 20 },
  comparativo: { facturacion_entregada: 10000000, ganancia_neta_estimada: 2000000 },
  funnel: { entregados: 20, tasa_confirmacion: 80, por_estado_actual: { Pendiente: 5, Confirmado: 4, Preparado: 3, Despachado: 2, Entregado: 20, Cancelado: 2, Devuelto: 1 },
    canales: { web: canal, whatsapp: { ...canal, organico: canal, campana: canal } } },
  canales_disponibles: [{ slug: 'web', nombre: 'Formularios Web' }, { slug: 'whatsapp', nombre: 'WhatsApp' }],
  rentabilidad_canales: { web: { ventas: 7500000, costos_totales: 5000000, utilidad_neta: 2500000, margen_neto: 33.3, roi_canal: 50 }, whatsapp: { ventas: 5000000, costos_totales: 4700000, utilidad_neta: 300000, margen_neto: 6, roi_canal: 6.4 } },
  ranking_productos: [producto, { ...producto, producto_id: 2, nombre: 'Producto sin margen', unidades: 8, venta: 5000000, costo: 5100000, ganancia: -100000, perdida: 0, rentabilidad: -1.96, alerta: 'sin_margen' }],
  couriers: [{ courier_id: 1, nombre: 'Courier de prueba con nombre comercial extenso', total_asignados: 25, entregados: 20, tasa_entrega: 80, monto_recaudado: 13000000, costo_fletes: 600000, saldo_rendicion: 1500000 },
    { courier_id: 2, nombre: 'Courier con saldo a pagar', total_asignados: 2, entregados: 1, tasa_entrega: 50, monto_recaudado: 0, costo_fletes: 30000, saldo_rendicion: -30000 }],
  tendencias: Array.from({ length: 7 }, (_, i) => ({ fecha: `2026-10-${String(i + 11).padStart(2, '0')}`, monto: 1000000 + i * 250000, costo: 850000 + i * 180000, ganancia: i === 0 ? -100000 : 150000 + i * 70000 })),
  pagos_online: { pagos_realizados: 5, monto_pagado: 1200000 },
};

async function preparar(page, { vacio = false } = {}) {
  const consultas = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data = {};
    if (path.endsWith('/auth/me')) data = { id: 1, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
    else if (path.endsWith('/suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true };
    else if (path.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Tienda QA', subdominio: 'qa' };
    else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Tienda QA' }];
    else if (path.endsWith('/envios/metricas-dashboard')) {
      consultas.push(route.request().postDataJSON());
      data = vacio ? { kpis: { facturacion_entregada: 0, ticket_promedio: 0, ganancia_neta_estimada: 0, pct_margen_neto: 0, pct_margen_bruto: 0 }, funnel: { entregados: 0, tasa_confirmacion: 0 } } : ventas;
    } else if (path.endsWith('/estadisticas-rango')) data = vacio ? {} : { visitas: 1200, contactos_whatsapp: 150, checkouts_iniciados: 20, añadidos_carrito: 35, productos_mas_consultados: [{ nombre: producto.nombre, consultas: 35 }] };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  return consultas;
}

async function comprobarAncho(page) {
  const fuera = await page.locator('.md-page').evaluate(root => [root, ...root.querySelectorAll('section, .md-data-card, button, input, select, svg.md-chart-svg')].filter(el => {
    if (el.closest('.md-table-wrap')) return false;
    const r = el.getBoundingClientRect();
    return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1);
  }).map(el => `${el.className?.baseVal ?? el.className}: ${el.getBoundingClientRect().right}`));
  expect(fuera).toEqual([]);
}

for (const width of [320, 375, 390, 768, 1440]) {
  test(`dashboard con vista móvil propia a ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    const consultas = await preparar(page);
    await page.goto(`${baseURL}/mi-dashboard`);
    await expect(page.locator('.md-hero-numero')).toHaveText('Gs 12.500.000');
    await comprobarAncho(page);
    await page.screenshot({ path: testInfo.outputPath('inicio.png'), animations: 'disabled' });

    if (width <= 640) {
      await expect(page.locator('.md-filtros')).not.toBeVisible();
      await page.getByRole('button', { name: /Filtrar/ }).click();
      await page.getByRole('button', { name: '7 días', exact: true }).click();
      await expect.poll(() => consultas.at(-1)?.periodo).toBe('7d');
      await expect(page.locator('.md-updating-overlay')).toHaveCount(0);
      await page.getByRole('button', { name: /Filtrar/ }).click();

      for (const vista of ['Ventas', 'Pedidos', 'Marketing', 'Resumen']) {
        await page.getByRole('navigation', { name: 'Vistas del dashboard' }).getByRole('button', { name: vista, exact: true }).click();
        await comprobarAncho(page);
        await page.locator('.md-header').scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`${vista}.png`), animations: 'disabled' });
        if (vista === 'Ventas') {
          await expect(page.locator('.md-products-card .md-data-card')).toHaveCount(2);
          await expect(page.locator('.md-products-card .md-desktop-data')).not.toBeVisible();
          await page.locator('.md-products-card .md-mobile-cost-detail summary').first().click();
          await expect(page.locator('.md-products-card .md-mobile-cost-detail').first().getByText('Cómo se llega a la ganancia')).toBeVisible();
          await comprobarAncho(page);
        }
        if (vista === 'Pedidos') {
          await expect(page.getByText('Te transfiere', { exact: true })).toBeVisible();
          await expect(page.getByText('Le pagás', { exact: true })).toBeVisible();
        }
        if (vista === 'Marketing') {
          for (const canal of ['Formularios Web', 'Lead Orgánico', 'Lead Campaña WhatsApp', 'Pago Web']) {
            await page.locator('.md-tabs-embudo').getByRole('button', { name: canal, exact: true }).click();
            await comprobarAncho(page);
          }
        }
      }
      expect(consultas.at(-1).periodo).toBe('7d');
    } else {
      await expect(page.locator('.md-mobile-nav')).not.toBeVisible();
      await expect(page.locator('.md-products-card .md-desktop-data')).toBeVisible();
      await page.locator('.md-products-card .md-btn-desglose').first().click();
      await expect(page.locator('.md-detalle-fila')).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
}

test('dashboard móvil sin actividad conserva sus vistas y estados vacíos', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await preparar(page, { vacio: true });
  await page.goto(`${baseURL}/mi-dashboard`);
  await expect(page.locator('.md-hero-numero')).toHaveText('Gs 0');
  for (const vista of ['Ventas', 'Pedidos', 'Marketing']) {
    await page.getByRole('navigation', { name: 'Vistas del dashboard' }).getByRole('button', { name: vista, exact: true }).click();
    await comprobarAncho(page);
    await expect(page.locator('.md-page')).not.toContainText('NaN');
  }
});

test('los filtros de mes y producto funcionan al cambiar de vista y de tamaño', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const consultas = await preparar(page);
  await page.goto(`${baseURL}/mi-dashboard`);
  await expect(page.locator('.md-hero-numero')).toHaveText('Gs 12.500.000');
  await page.getByRole('button', { name: /Filtrar/ }).click();
  await page.getByRole('button', { name: 'Por mes', exact: true }).click();
  await page.getByRole('combobox', { name: 'Mes', exact: true }).selectOption('9');
  await expect.poll(() => consultas.at(-1)?.mes).toBe(9);
  await expect(page.locator('.md-updating-overlay')).toHaveCount(0);
  await page.locator('.md-combo-btn').click();
  await page.getByPlaceholder('Buscar producto…').fill('cafetera');
  await comprobarAncho(page);
  await page.locator('.md-combo-opcion').getByText(producto.nombre, { exact: true }).click();
  await expect.poll(() => consultas.at(-1)?.producto_id).toBe(1);
  await page.getByRole('button', { name: /Filtrar/ }).click();
  await expect(page.locator('.md-mobile-active-product')).toContainText(producto.nombre);
  await page.getByRole('navigation', { name: 'Vistas del dashboard' }).getByRole('button', { name: 'Ventas', exact: true }).click();
  await page.locator('.md-chart-primary').getByRole('button', { name: 'Tabla', exact: true }).click();
  await expect(page.locator('.md-chart-primary table tbody tr')).toHaveCount(7);
  await page.locator('.md-chart-primary').getByRole('button', { name: 'Gráfico', exact: true }).click();
  await expect(page.locator('.md-chart-primary svg.md-chart-svg')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('filtro-producto.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.md-hero')).toBeVisible();
  await expect(page.locator('.md-products-card .md-desktop-data')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator('.md-page')).toHaveAttribute('data-mobile-view', 'ventas');
  await page.getByRole('button', { name: 'Quitar filtro de producto', exact: true }).click();
  await expect.poll(() => consultas.at(-1)?.producto_id).toBeUndefined();
  await expect(page.locator('.md-mobile-active-product')).toHaveCount(0);
  await comprobarAncho(page);
});
