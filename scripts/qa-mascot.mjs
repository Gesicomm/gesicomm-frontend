import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.MASCOT_QA_URL || 'http://localhost:5179';
const output = new URL('../../outputs/mascota-gesicom/', import.meta.url);
await mkdir(output, { recursive: true });
console.log('Starting mascot browser checks');
const browser = await chromium.launch({ headless: true, timeout: 15000 });
const errors = [];
const report = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  // All API responses are local fixtures: no account, email or lead is created.
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/login') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return route.fulfill({ status: 403, json: { requiere_verificacion: true, email: 'prueba@example.com' } });
    }
    if (path === '/api/auth/forgot-password') return route.fulfill({ json: { message: 'Revisá tu correo para continuar.' } });
    return route.fulfill({ json: [] });
  });
  await page.route('https://connect.facebook.net/**', route => route.abort());
  const checkLayout = async name => {
    console.log(`Checking ${name}`);
    await page.locator('.gc-mascot img.is-active').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll('.gc-mascot img')].every(img => img.complete && img.naturalWidth > 0));
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, paragraph: getComputedStyle(document.querySelector('.hero-sub, .login-form-card p')).fontSize }));
    assert(sizes.scroll <= sizes.width, `${name}: horizontal overflow ${JSON.stringify(sizes)}`);
    assert(parseFloat(sizes.paragraph) >= 16, `${name}: body text too small`);
    report.push({ name, ...sizes });
    await page.screenshot({ path: new URL(`${name}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: false, animations: 'disabled' });
  };

  await page.goto(base);
  await checkLayout('landing-desktop');
  const waitForPose = pose => page.waitForFunction(value => document.querySelector('.gc-mascot')?.dataset.pose === value, pose);
  assert.equal(await page.locator('.gc-mascot-steps button').count(), 0);
  await waitForPose('analizando');
  await waitForPose('confirmando');
  await waitForPose('pensando');
  await page.getByRole('button', { name: 'Pausar animación de la mascota' }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.gc-mascot-character').evaluate(el => getComputedStyle(el).animationName), 'none');
  const pausedPose = await page.locator('.gc-mascot').getAttribute('data-pose');
  await page.waitForTimeout(4800);
  assert.equal(await page.locator('.gc-mascot').getAttribute('data-pose'), pausedPose);
  await page.getByRole('button', { name: 'Activar animación de la mascota' }).click();
  await waitForPose('analizando');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await checkLayout('landing-mobile');
  await page.locator('.gc-mascot').scrollIntoViewIfNeeded();
  await page.screenshot({ path: new URL('landing-mobile-mascota.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'), animations: 'disabled' });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  await checkLayout('landing-small');
  const reducedPose = await page.locator('.gc-mascot').getAttribute('data-pose');
  await page.waitForTimeout(4800);
  assert.equal(await page.locator('.gc-mascot').getAttribute('data-pose'), reducedPose);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await waitForPose('analizando');
  await checkLayout('landing-small-analizando');
  await waitForPose('confirmando');
  await checkLayout('landing-small-confirmando');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await writeFile(new URL('report.json', output), JSON.stringify({ report, errors, interactions: 'landing automatic full loop without clicks, keyboard pause and resume, mobile layouts, reduced motion stops cycle' }, null, 2));
  console.log(JSON.stringify({ report, errors }, null, 2));
} finally {
  await browser.close();
}
