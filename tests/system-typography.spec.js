import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';

for (const theme of ['light', 'dark']) {
  test(`tipografía compartida del usuario y administrador (${theme})`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await prepararUsuario(page, theme);
    for (const route of ['/mi-dashboard', '/mi-catalogo', '/mis-pedidos', '/mi-tienda', '/mi-tienda/depositos', '/finanzas/costos-gastos']) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await expect(page.locator('.gc-panel')).toBeVisible();
      await comprobarEscala(page);
      if (route === '/mi-catalogo' || route === '/mis-pedidos') await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${theme}.png`) });
    }
    await page.route('**/api/auth/me', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, nombre: 'Administrador de prueba', rol: 'administrador' }) }));
    await page.goto(origin + '/admin/planes', { waitUntil: 'networkidle' });
    await expect(page.locator('.gc-panel')).toBeVisible();
    await comprobarEscala(page);
    await page.screenshot({ path: testInfo.outputPath(`admin-${theme}.png`) });
  });
}

for (const width of [375, 1440]) {
  test(`accesos de usuario, courier y RAHA a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/login', '/courier/login', '/raha/login', '/reset-password']) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await expect(page.locator('.gc-panel')).toBeVisible();
      await comprobarEscala(page);
      const fuera = await page.locator('.gc-panel').evaluate(root => [...root.querySelectorAll('button,input,select')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1); }).map(el => el.outerHTML.slice(0, 100)));
      expect(fuera).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}.png`) });
    }
  });
}

async function comprobarEscala(page) {
  const resultado = await page.locator('.gc-panel').evaluate(root => {
    const visible = el => el.getBoundingClientRect().height && !el.closest('.tn-typography-preview,.monaco-editor,[data-typography-preview]');
    return {
      familia: getComputedStyle(document.body).fontFamily,
      parrafos: [...root.querySelectorAll('p')].filter(visible).map(el => ({ texto: el.textContent.slice(0, 60), size: parseFloat(getComputedStyle(el).fontSize) })).filter(item => item.size < 16),
      campos: [...root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),textarea,select')].filter(visible).map(el => parseFloat(getComputedStyle(el).fontSize)).filter(size => size < 16),
    };
  });
  expect(resultado.familia).toContain('Jakarta');
  expect(resultado.parrafos).toEqual([]);
  expect(resultado.campos).toEqual([]);
}
