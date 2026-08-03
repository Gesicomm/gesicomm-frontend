const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/login...');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);

  console.log('Logging in as prueba@gmail.com...');
  await page.fill('input#email', 'prueba@gmail.com');
  await page.fill('input#password', '12345678');
  await page.click('button[type="submit"]');

  // Wait for URL to change away from login
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 });
  console.log('LoggedIn! Current URL:', page.url());

  console.log('Navigating to http://localhost:5173/mis-pedidos...');
  await page.goto('http://localhost:5173/mis-pedidos');
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());

  const btnImprimir = page.locator('button:has-text("Imprimir Pedidos")');
  console.log('Is "Imprimir Pedidos" button visible?', await btnImprimir.isVisible());

  if (await btnImprimir.isVisible()) {
    console.log('Clicking "Imprimir Pedidos" button...');
    await btnImprimir.click();
    await page.waitForTimeout(1500);

    const sidebar = page.locator('.imprimir-sidebar');
    const previewArea = page.locator('.imprimir-preview-area');

    console.log('Sidebar visible:', await sidebar.isVisible());
    console.log('Preview area visible:', await previewArea.isVisible());

    // Test custom title input
    const inputTitle = page.locator('input[placeholder="Ej: GESICOMM LOGÍSTICA"]');
    if (await inputTitle.isVisible()) {
      console.log('Filling custom label header title: MI TIENDA LOGÍSTICA...');
      await inputTitle.fill('MI TIENDA LOGÍSTICA');
      await page.waitForTimeout(500);
    }
  }

  const screenshotPath = 'C:/Users/Martin/.gemini/antigravity/brain/a35657ce-8f18-47a2-ab38-3ee275d68748/print_modal_fixed.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('SUCCESS! Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('Playwright test completed!');
})().catch(e => {
  console.error('PLAYWRIGHT TEST FAILED:', e);
  process.exit(1);
});
