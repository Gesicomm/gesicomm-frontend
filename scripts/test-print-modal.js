const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/orders...');
  await page.goto('http://localhost:5173/orders');
  await page.waitForTimeout(1000);

  // If redirected to login, perform login
  if (page.url().includes('login') || page.url().includes('auth')) {
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'admin@gesicomm.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:5173/orders');
    await page.waitForTimeout(1000);
  }

  console.log('Clicking Imprimir Pedidos button...');
  const btnImprimir = page.locator('button:has-text("Imprimir Pedidos")');
  if (await btnImprimir.isVisible()) {
    await btnImprimir.click();
    await page.waitForTimeout(1000);
  }

  console.log('Verifying ImprimirPedidosModal layout...');
  const sidebar = page.locator('.imprimir-sidebar');
  const previewArea = page.locator('.imprimir-preview-area');

  console.log('Sidebar visible:', await sidebar.isVisible());
  console.log('Preview area visible:', await previewArea.isVisible());

  // Test custom title input
  const inputTitle = page.locator('input[placeholder="Ej: GESICOMM LOGÍSTICA"]');
  if (await inputTitle.isVisible()) {
    console.log('Changing label title to: MI EMPRESA LOGÍSTICA...');
    await inputTitle.fill('MI EMPRESA LOGÍSTICA');
    await page.waitForTimeout(500);
  }

  // Take screenshot of fixed modal
  const screenshotPath = 'C:/Users/Martin/.gemini/antigravity/brain/a35657ce-8f18-47a2-ab38-3ee275d68748/print_modal_fixed.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('Playwright test completed successfully!');
})().catch(e => {
  console.error('PLAYWRIGHT TEST FAILED:', e);
  process.exit(1);
});
