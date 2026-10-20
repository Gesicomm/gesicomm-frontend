import { test, expect } from '@playwright/test';

for (const width of [1440, 1024, 390]) {
  test(`contenido y grilla de productos a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5193'}/tests/fixtures/productos-pedido.html`);
    await page.getByRole('button', { name: /Continuar/ }).click();
    await page.getByRole('button', { name: /Continuar/ }).click();
    const panel = page.locator('.np-step-panel.is-active');
    await expect(panel.getByText('Comprado: 1 presentación', { exact: true })).toBeVisible();
    await expect(panel.getByText('Comprado: 2 unidades', { exact: true })).toBeVisible();
    await expect(panel.locator('.np-products-metrics')).toContainText('11 unidades');
    const cards = panel.locator('.np-order-item-card');
    await expect(cards).toHaveCount(4);
    const rects = await cards.evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()));
    if (width > 560) {
      expect(rects[0].y).toBe(rects[1].y);
      expect(rects[2].y).toBe(rects[3].y);
      expect(rects[2].y).toBeGreaterThan(rects[0].y);
    } else expect(rects[1].y).toBeGreaterThan(rects[0].y);
    expect(await panel.evaluate(el => [...el.querySelectorAll('.np-order-item-card')].every(c => c.scrollWidth <= c.clientWidth + 1))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('productos.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Restar Hidrolavadora DV180-1 2800W 180 Bar Alta Presión' }).click();
    await expect(panel.locator('.np-products-metrics')).toContainText('10 unidades');
    await page.getByRole('button', { name: 'Guardar productos' }).click();
    const guardado = await page.evaluate(() => window.__pedidoGuardado);
    expect(guardado.items[1].cantidad).toBe(1);
    expect(guardado.items[1].subtotal).toBe(615858);
    expect(guardado).not.toHaveProperty('estado');
    await panel.getByRole('button', { name: 'Quitar Hidrolavadora DV180-1 2800W 180 Bar Alta Presión' }).click();
    await expect(cards).toHaveCount(3);
    await page.getByRole('button', { name: 'Guardar productos' }).click();
    expect(await page.evaluate(() => window.__pedidoGuardado.items.some(it => it.producto_id === 2))).toBe(false);
  });
}
