import { test, expect } from '@playwright/test';

const origin = process.env.PALETTE_BASE_URL || 'http://localhost:5173';

async function openStore(page, { css, js = '' }) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto(origin + '/login');
  const document = await page.evaluate(async ({ css, js }) => {
    const { construirDocumentoCodigo } = await import('/src/pages/landing-simple/construirDocumentoCodigo.js');
    return construirDocumentoCodigo({
      html: '<footer><div class="footer-bottom">Llevalofacil · Tecnología de <a href="https://gesicomm.com">Gesicom</a></div></footer>',
      css: '',
      js,
    }, { extras: { css: `* { box-sizing:border-box; } body { margin:0; padding:24px; font:700 14px Arial; } footer { padding:24px; text-align:center; background:transparent !important; } ${css}` } });
  }, { css, js });
  await page.setContent(document);
  expect(errors).toEqual([]);
}

async function expectLogo(page, color) {
  const link = page.locator('[data-gesicomm-credit]');
  await expect(link.locator('svg')).toHaveCSS('color', color);
  await expect(link.locator('path')).toHaveCSS('stroke', color);
  await expect(link.locator('circle')).toHaveCSS('fill', 'rgb(255, 92, 69)');
  await expect(link.locator('span')).toHaveCSS('color', 'rgb(255, 92, 69)');
}

test('elige por el fondo real aunque el texto sea oscuro sobre negro', async ({ page }, testInfo) => {
  await openStore(page, { css: 'body { background:#000; color:#08111f; }' });
  await expectLogo(page, 'rgb(247, 250, 252)');
  await page.screenshot({ path: testInfo.outputPath('footer-oscuro.png') });
});

test('compone transparencias y responde a cambios posteriores del fondo', async ({ page }) => {
  await openStore(page, { css: 'body { background:#000; color:#fff; } footer { background:rgba(255,255,255,.1) !important; }' });
  await expectLogo(page, 'rgb(247, 250, 252)');
  await page.evaluate(() => { document.body.style.backgroundColor = '#fff'; });
  await expectLogo(page, 'rgb(8, 17, 31)');
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = 'body { background:#000 !important; }';
    document.head.append(style);
  });
  await expectLogo(page, 'rgb(247, 250, 252)');
});

test('detecta el fondo aplicado por el JS de la tienda después de la firma', async ({ page }) => {
  await openStore(page, {
    css: 'body { background:#fff; color:#000; }',
    js: "document.body.style.backgroundColor = '#000000';",
  });
  await expectLogo(page, 'rgb(247, 250, 252)');
  await page.setViewportSize({ width: 390, height: 844 });
  await expectLogo(page, 'rgb(247, 250, 252)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('usa Ink sobre un footer claro aunque el resto de la página sea oscuro', async ({ page }, testInfo) => {
  await openStore(page, { css: 'body { background:#000; color:#fff; } footer { background:#fff !important; }' });
  await expectLogo(page, 'rgb(8, 17, 31)');
  await page.screenshot({ path: testInfo.outputPath('footer-claro.png') });
});
