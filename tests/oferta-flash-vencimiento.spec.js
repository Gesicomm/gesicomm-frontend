import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let bundle;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `export { construirDocumentoCodigo } from './src/pages/landing-simple/construirDocumentoCodigo.js'; export { PLANTILLA_INICIO } from './src/pages/landing-simple/plantillasBaseCodigo.js';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'pruebaFlash', loader: { '.css': 'empty' } });
  bundle = result.outputFiles[0].text;
});

const producto = { id: 'oferta-prueba', referencia_id: 1, tipo: 'producto', nombre: 'Oferta de prueba de un segundo', precio: 100000, precio_antes: 150000, descuento_pct: 33, etiqueta: 'Oferta', stock: 10, imagenes_url: [], ofertas: [], variantes: [] };

async function montar(page, renovar) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const datos = {
    vista: 'inicio', productos: [producto], tienda: { nombre: 'Prueba de vencimiento' },
    venta: { urgencia: { activo: true, productos: [producto.id], renovar_cada_visita: renovar, duracion_horas: 0, duracion_minutos: 0, duracion_segundos: 1, fin_at: new Date(Date.now() + 60000).toISOString() } },
  };
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: bundle });
  const html = await page.evaluate(datos => window.pruebaFlash.construirDocumentoCodigo(window.pruebaFlash.PLANTILLA_INICIO, { datos }), datos);
  await page.setContent(html);
  const flash = page.locator('[data-gesicomm-bloque="ofertas_urgencia"]');
  await expect(flash).toBeVisible();
  await flash.scrollIntoViewIfNeeded();
  return flash;
}

test('una oferta fija de un segundo desaparece sin recargar y pierde descuento y etiqueta', async ({ page }, testInfo) => {
  const flash = await montar(page, false);
  await page.screenshot({ path: testInfo.outputPath('antes.png') });
  const inicio = await page.evaluate(() => {
    const inicio = Date.now();
    window.Gesicomm.datos.venta.urgencia.fin_at = new Date(inicio + 1000).toISOString();
    window.dispatchEvent(new Event('gesicomm:actualizar-countdowns'));
    return inicio;
  });
  await expect(flash).toBeVisible();
  await expect(flash).toBeHidden({ timeout: 5000 });
  const resultado = await page.evaluate(() => ({ transcurrido: Date.now(), producto: window.Gesicomm.datos.productos[0] }));
  expect(resultado.transcurrido - inicio).toBeGreaterThanOrEqual(1000);
  expect(resultado.producto).toMatchObject({ precio_antes: null, descuento_pct: 0, etiqueta: '' });
  await page.screenshot({ path: testInfo.outputPath('despues.png') });
  await testInfo.attach('resultado', { body: JSON.stringify({ milisegundos: resultado.transcurrido - inicio, seccionOculta: true, descuento: resultado.producto.descuento_pct }), contentType: 'application/json' });
});

test('una oferta renovable de un segundo sigue por varios ciclos y vence al desactivar renovar', async ({ page }) => {
  const flash = await montar(page, true);
  const primerFin = Date.parse(await flash.getAttribute('data-gesicomm-countdown-fin'));
  await expect.poll(async () => Date.parse(await flash.getAttribute('data-gesicomm-countdown-fin')), { timeout: 7000 }).toBeGreaterThanOrEqual(primerFin + 2000);
  await expect(flash).toBeVisible();
  expect(await page.evaluate(() => window.Gesicomm.datos.productos[0].descuento_pct)).toBe(33);
  await page.evaluate(() => {
    Object.assign(window.Gesicomm.datos.venta.urgencia, { renovar_cada_visita: false, fin_at: new Date(Date.now() + 1000).toISOString() });
    window.dispatchEvent(new Event('gesicomm:actualizar-countdowns'));
  });
  await expect(flash).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => window.Gesicomm.datos.productos[0].descuento_pct)).toBe(0);
});
