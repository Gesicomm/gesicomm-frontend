import { test, expect } from '@playwright/test';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5175';

for (const width of [375, 768, 1280, 1600]) {
  test(`Inicio del HTML de referencia a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.route('**/api/**', route => route.fulfill({ json: {} }));
    await page.goto(origin + '/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Tu empresa digital\.\s*Todo bajo control\./);
    await expect(page.locator('header .home-brand')).toBeVisible();
    expect(await page.locator('.gl-landing').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(8, 17, 31)');
    expect(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(40);
    expect(await page.locator('.gl-landing').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Manrope');
    const columnas = await page.locator('.dashboard-body').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columnas).toBe(width > 800 ? 2 : 1);
    await page.screenshot({ path: testInfo.outputPath('hero.png'), animations: 'disabled' });
    if (width <= 800) {
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toBeHidden();
    }
    await page.getByRole('button', { name: 'Marca personal y servicios', exact: true }).click();
    await expect(page.locator('#route-title')).toHaveText('Del contenido a tus clientes y resultados.');
    await expect(page.getByRole('button', { name: 'Marca personal y servicios', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Anual · ahorrá 2 meses', exact: true }).click();
    await page.getByRole('button', { name: 'Internacional · USD', exact: true }).click();
    await expect(page.locator('#price-one')).toHaveText('US$ 470');
    await expect(page.locator('#price-two')).toHaveText('US$ 670');
    const cambios = await page.locator('.gl-landing').evaluate(el => {
      const previo = getComputedStyle(el.querySelector('h1 em')).color;
      el.style.setProperty('--gc-cyan', 'rgb(255, 200, 0)');
      const nuevo = getComputedStyle(el.querySelector('h1 em')).color;
      el.style.removeProperty('--gc-cyan');
      return { previo, nuevo };
    });
    expect(cambios.nuevo).toBe('rgb(255, 200, 0)');
    expect(cambios.previo).not.toBe(cambios.nuevo);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true, animations: 'disabled' });
    expect(errores).toEqual([]);
  });
}

test('demo, contratación y proveedores se registran en el canal comercial sin perder datos ante fallos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pedidos = [];
  let intentos = 0;
  await page.route('**/api/**', route => {
    if (!route.request().url().includes('/publico/contacto')) return route.fulfill({ json: {} });
    pedidos.push(route.request().postDataJSON());
    if (++intentos === 1) return route.fulfill({ status: 500, json: { message: 'No pudimos recibir tu solicitud. Reintentá.' } });
    return route.fulfill({ status: 201, json: { mensaje: { id: intentos }, message: 'Recibido' } });
  });
  await page.goto(origin + '/');
  await page.getByRole('button', { name: /Realizar prueba gratuita/ }).click();
  const demo = page.locator('#gc-demo-form');
  await demo.locator('[name="nombre"]').fill('Martín');
  await demo.locator('[name="apellido"]').fill('Prueba');
  await demo.locator('[name="documento"]').fill('1234567');
  await demo.locator('[name="email"]').fill('martin@example.test');
  await demo.locator('[name="uso"]').selectOption('ecommerce');
  await expect(demo.locator('[name="solicitud"]')).toHaveValue('prueba_gratuita');
  await demo.getByRole('button', { name: 'Enviar solicitud ↗' }).click();
  await expect(demo.getByRole('alert')).toContainText('Reintentá');
  await expect(demo.locator('[name="nombre"]')).toHaveValue('Martín');
  await demo.getByRole('button', { name: 'Enviar solicitud ↗' }).click();
  await expect(demo.getByRole('status')).toContainText('Solicitud #2 recibida');
  expect(pedidos[1]).toEqual(pedidos[0]);
  expect(pedidos[0]).toMatchObject({ area: 'comercial', nombre: 'Martín Prueba', email: 'martin@example.test' });
  expect(pedidos[0].mensaje).toContain('Código de prueba gratuita');
  await page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click();
  await page.getByRole('button', { name: /Ser proveedor de servicios/ }).click();
  const prov = page.locator('#gc-provider-form');
  for (const [name, value] of Object.entries({ nombre: 'María', apellido: 'Proveedor', documento: '9876543', email: 'proveedor@example.test', whatsapp: '+595981123456', ruc: '123-4', descripcion: 'Servicio de logística' })) await prov.locator(`[name="${name}"]`).fill(value);
  await prov.locator('[name="categoria"]').selectOption('envios');
  await prov.getByRole('button', { name: 'Enviar postulación ↗' }).click();
  await expect(prov.getByRole('status')).toContainText('Solicitud #3 recibida');
  expect(pedidos[2].mensaje).toContain('Envíos y logística');
  expect(pedidos[2].mensaje).toContain('+595981123456');
  await page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click();
  await page.getByRole('button', { name: /Empezar como vendedor/ }).click();
  await demo.locator('[name="uso"]').selectOption('ambas_rutas');
  for (const [name, value] of Object.entries({ nombre: 'Martín', apellido: 'Prueba', documento: '1234567', email: 'martin@example.test' })) await demo.locator(`[name="${name}"]`).fill(value);
  await demo.getByRole('button', { name: 'Enviar solicitud ↗' }).click();
  await expect(demo.getByRole('status')).toContainText('Solicitud #4 recibida');
  expect(pedidos[3].asunto).toContain('Contratar un plan');
  expect(pedidos[3].mensaje).toContain('Uso: Ambas rutas');
});

test('todas las páginas legales y contacto siguen accesibles desde el nuevo pie', async ({ page }, testInfo) => {
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  for (const path of ['/privacy', '/terms', '/cookies', '/data-deletion', '/security', '/compliance', '/contact']) {
    await page.goto(origin + '/');
    await page.locator(`footer a[href="${path}"]`).click();
    await expect(page).toHaveURL(origin + path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.home-document')).toBeVisible();
    expect(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(70);
    expect(await page.locator('.home-document').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(8, 17, 31)');
    if (path === '/privacy' || path === '/contact') await page.screenshot({ path: testInfo.outputPath(path.slice(1) + '.png'), animations: 'disabled' });
  }
});

for (const width of [375, 1280]) {
  test(`Selector de próximos pasos y formularios separados a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/**', route => route.fulfill({ json: {} }));
    await page.goto(origin + '/');
    await expect(page.locator('.gc-leads form')).toHaveCount(0);
    await page.locator('.gc-leads').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('opciones.png') });
    for (const [nombre, titulo, valor] of [
      ['Realizar prueba gratuita', 'Solicitar prueba gratuita', 'prueba_gratuita'],
      ['Empezar como vendedor', 'Empezar como vendedor', 'contratacion'],
      ['Ser proveedor de servicios', 'Ofrecer servicios en Gesicom', null],
    ]) {
      const opcion = page.getByRole('button', { name: new RegExp(nombre) });
      await opcion.click();
      const dialog = page.getByRole('dialog', { name: titulo, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('form:visible')).toHaveCount(1);
      await expect(dialog.locator('input[name="nombre"]:visible')).toBeFocused();
      if (valor) await expect(dialog.locator('[name="solicitud"]')).toHaveValue(valor);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`form-${valor || 'proveedor'}.png`) });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opcion).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.goto(origin + '/#registro-proveedores');
    await expect(page.getByRole('dialog', { name: 'Ofrecer servicios en Gesicom' })).toBeVisible();
  });
}
