import { test, expect } from '@playwright/test';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5175';
const planes = ['una-ruta', 'ambas-rutas'].flatMap((ruta, i) => ['mensual', 'anual'].map(periodicidad => ({ codigo: `${ruta}-${periodicidad}`, nombre: `${i ? 'Ambas rutas' : 'Una ruta'} · ${periodicidad}`, moneda: 'PYG', precio: (i ? 397000 : 297000) * (periodicidad === 'anual' ? 10 : 1), periodicidad, activo: true, features: [] })));

for (const width of [375, 1280]) for (const ruta of ['una-ruta', 'ambas-rutas']) for (const periodo of ['mensual', 'anual']) {
  test(`${ruta} ${periodo}: landing → checkout → PagoPar a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errores = [], intents = [], pagos = [], contactos = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.route('https://payment.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Pasarela de prueba</h1>' }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path.endsWith('/planes')) data = planes;
      if (path.endsWith('/checkout-intents')) { intents.push(route.request().postDataJSON()); data = { checkout_intent_token: 'intent-del-servidor' }; }
      if (path.endsWith('/suscripciones/checkout')) { pagos.push(route.request().postDataJSON()); data = { payment_url: 'https://payment.example.test/pagar' }; }
      if (path.endsWith('/publico/contacto')) contactos.push(route.request().postDataJSON());
      return route.fulfill({ json: data });
    });
    await page.goto(origin);
    await page.getByRole('button', { name: 'Marca personal y servicios', exact: true }).click();
    if (periodo === 'anual') await page.getByRole('button', { name: 'Anual · ahorrá 2 meses', exact: true }).click();
    if (ruta === 'una-ruta' && periodo === 'anual') await page.getByRole('button', { name: 'Internacional · USD', exact: true }).click();
    await page.getByRole('button', { name: ruta === 'una-ruta' ? 'Contratar una ruta ↗' : 'Contratar ambas rutas ↗', exact: true }).click();
    const codigo = `${ruta}-${periodo}`;
    await expect(page).toHaveURL(new RegExp(`/checkout/public/${codigo}\\?`));
    await expect(page.getByRole('heading', { name: 'Pagá el plan que elegiste' })).toBeVisible();
    await expect(page.locator('.pl-upgrade-summary')).toContainText(periodo === 'anual' ? 'por año' : 'por mes');
    const esperado = planes.find(p => p.codigo === codigo);
    await expect(page.locator('.pl-precio strong')).toContainText(esperado.precio.toLocaleString('es-PY'));
    if (ruta === 'una-ruta') await expect(page.getByLabel('Ruta de tu plan')).toHaveValue('personal');
    for (const [label, value] of Object.entries({ 'Nombre completo': 'Ana Prueba', 'Correo electrónico': 'ana@example.test', 'Teléfono': '0981123456', 'Número de cédula': '1234567' })) await page.getByLabel(label, { exact: true }).fill(value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await page.getByLabel('Nombre completo', { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await page.screenshot({ path: testInfo.outputPath('checkout.png'), fullPage: true });
    if (width === 1280 && ruta === 'una-ruta' && periodo === 'mensual') {
      await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
      await page.screenshot({ path: testInfo.outputPath('checkout-oscuro.png'), fullPage: true });
      await page.evaluate(() => document.documentElement.dataset.theme = 'light');
    }
    await page.getByRole('button', { name: /Pagar con PagoPar/ }).click();
    await expect(page).toHaveURL('https://payment.example.test/pagar');
    expect(intents).toEqual([expect.objectContaining({ plan_codigo: codigo, ruta: ruta === 'una-ruta' ? 'personal' : 'ambas' })]);
    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({ plan_codigo: codigo, checkout_intent_token: 'intent-del-servidor', email: 'ana@example.test' });
    expect(pagos[0]).not.toHaveProperty('precio');
    expect(contactos).toEqual([]);
    expect(errores).toEqual([]);
  });
}
