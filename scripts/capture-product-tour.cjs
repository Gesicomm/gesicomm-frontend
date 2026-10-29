// Capture actual dashboard components using fictional, local-only responses.
// Start Vite on localhost:5173 first. Never connects to a live account.
const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(__dirname, '../public/brand/landing/product-tour');
const ventas = {
  rango_fechas: { desde: '2026-10-01', hasta: '2026-10-29' },
  kpis: { facturacion_entregada: 12000000, ticket_promedio: 150000, ganancia_neta_estimada: 2400000,
    pct_margen_neto: 20, margen_bruto_estimado: 4200000, pct_margen_bruto: 35, costo_productos_vendidos: 7200000,
    gastos_envio_netos: 600000, gastos_fijos_generales: 1800000, gastos_operativos: 1800000 },
  comparativo: { facturacion_entregada: 10000000, ganancia_neta_estimada: 2000000 },
  funnel: { entregados: 80, confirmados: 90, total_creados: 100, tasa_confirmacion: 90,
    por_estado_actual: { Pendiente: 8, Confirmado: 4, Preparado: 3, Despachado: 3, Entregado: 80, Cancelado: 2, Devuelto: 0 },
    canales: { web: { total: 100, cancelados: 2, confirmados: 90, entregados: 80 } } },
  tendencias: [],
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.routeWebSocket('**', () => {});
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('metricas-dashboard') ? ventas : route.request().url().includes('estadisticas-rango') ? { visitas: 1200, contactos_whatsapp: 140, clics_whatsapp_sin_producto: 40, clics_whatsapp_con_producto: 100 } : { data: [] } }));
    await page.route('**/__capture-product-tour', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="es" data-theme="light"><meta name="viewport" content="width=device-width, initial-scale=1"><body class="gc-panel"><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
      await import('/scripts/product-tour-fixture.jsx');
    </script></body></html>` }));
    await page.goto('http://localhost:5173/__capture-product-tour');
    await page.getByText('Resumen Ejecutivo', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    // Preserve the real UI; only crop the relevant parts and pad to one aspect ratio.
    const hero = await page.locator('.md-hero').boundingBox();
    const summary = await page.locator('.md-summary-card').boundingBox();
    const resumen = await page.screenshot({ clip: { x: Math.min(hero.x, summary.x), y: Math.min(hero.y, summary.y), width: Math.max(hero.x + hero.width, summary.x + summary.width) - Math.min(hero.x, summary.x), height: Math.max(hero.y + hero.height, summary.y + summary.height) - Math.min(hero.y, summary.y) }, animations: 'disabled' });
    const capturas = [ ['resumen', resumen], ['pedidos', await page.getByText('Resumen de Pedidos', { exact: true }).locator('xpath=ancestor::section[1]').screenshot({ animations: 'disabled' })], ['seguimiento', await page.locator('.md-funnel-card').screenshot({ animations: 'disabled' })] ];
    for (const [name, buffer] of capturas) await sharp(buffer).resize(1200, 750, { fit: 'contain', background: '#f5f8f6' }).webp({ quality: 92 }).toFile(path.join(out, name + '.webp'));
    assert.deepEqual(errors, []);
    console.log('Captured three real dashboard views with fictional data:', out);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
