const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    console.log(`[BROWSER EXCEPTION] ${exception}`);
  });

  console.log('Navegando a http://localhost:5174/mi-landing ...');
  try {
    await page.goto('http://localhost:5174/mi-landing', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Error navegando:', e.message);
  }

  // Esperar un par de segundos adicionales para ver si saltan errores de React (useEffect, renders, etc.)
  await page.waitForTimeout(3000);

  await browser.close();
})();
