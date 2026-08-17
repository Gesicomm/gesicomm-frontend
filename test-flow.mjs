import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to local gesicomm frontend...');
  await page.goto('http://localhost:5173/login');
  
  try {
    await page.fill('input[type="email"]', 'martin@gesicom.com'); 
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch (e) {
    console.log('Login failed or not needed, proceeding...', e.message);
  }

  await page.goto('http://localhost:5173/mi-landing/producto/14'); 
  console.log('Navigated to builder.');

  await page.waitForSelector('text=DISEÑO', { timeout: 10000 }).catch(() => console.log('Timeout waiting for inspector'));
  await page.waitForTimeout(5000); 
  
  const screenshotPath = 'C:\\Users\\Martin\\.gemini\\antigravity\\brain\\1172c3f1-1e97-4249-8c79-020fec2fd082\\test-order-bump.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to: ' + screenshotPath);

  await browser.close();
})();
