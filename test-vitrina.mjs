import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to login
  await page.goto('https://app.gesicomm.com/login');
  
  // Fill login
  await page.fill('input[type="email"]', 'admin@gesicom.com');
  await page.fill('input[type="password"]', 'Admin123');
  await page.click('button:has-text("Ingresar")');
  
  // Wait for navigation
  await page.waitForURL('**/dashboard*');
  console.log('Logged in!');
  
  // Go to Vitrina
  await page.goto('https://app.gesicomm.com/vitrina');
  await page.waitForSelector('.vit-card');
  console.log('Vitrina loaded!');
  
  // Find a product and click Analizar Margen
  const btn = await page.locator('button:has-text("Analizar margen")').first();
  
  const start = Date.now();
  
  page.on('response', response => {
    if (response.url().includes('/sensibilidad')) {
      console.log('Sensibilidad response time:', Date.now() - start, 'ms');
      console.log('Status:', response.status());
    }
  });

  await btn.click();
  
  // Wait for the modal to appear with 'An??lisis de sensibilidad'
  await page.waitForSelector('h2:has-text("lisis de sensibilidad")');
  
  console.log('Modal opened in:', Date.now() - start, 'ms');
  
  await browser.close();
})();
