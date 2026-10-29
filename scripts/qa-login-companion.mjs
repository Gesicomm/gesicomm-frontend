import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.MASCOT_QA_URL || 'http://localhost:5179';
const output = join(tmpdir(), 'gesicom-login-ux');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
let registerPayload;
page.on('pageerror', error => errors.push(error.message));

await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/auth/login') {
    return route.fulfill({ status: 403, json: { requiere_verificacion: true, email: 'qa@example.com' } });
  }
  if (path === '/api/auth/register') {
    registerPayload = JSON.parse(route.request().postData() || '{}');
    return route.fulfill({ json: { requiere_verificacion: true, email: registerPayload.email } });
  }
  if (path === '/api/auth/verify-email') {
    await new Promise(resolve => setTimeout(resolve, 1800));
    return route.fulfill({ json: { message: 'Correo verificado', usuario: { rol: 'administrador' } } });
  }
  if (path === '/api/auth/forgot-password') return route.fulfill({ json: { message: 'Revisá tu correo para continuar.' } });
  if (path === '/api/auth/resend-code') return route.fulfill({ json: { message: 'Código reenviado.' } });
  return route.fulfill({ json: [] });
});
await page.route('https://connect.facebook.net/**', route => route.abort());

const companion = page.locator('.login-companion');
const capture = async name => {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.login-companion-avatar').waitFor();
  await page.waitForFunction(() => document.querySelector('.login-companion-avatar')?.naturalWidth > 0);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.login-form-panel').getBoundingClientRect();
    const story = document.querySelector('.login-story').getBoundingClientRect();
    const card = document.querySelector('.login-form-card').getBoundingClientRect();
    const mascot = document.querySelector('.login-companion').getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      story: { left: story.left, right: story.right, top: story.top, bottom: story.bottom },
      panel: { left: panel.left, right: panel.right },
      card: { top: card.top, bottom: card.bottom },
      mascot: { left: mascot.left, right: mascot.right, top: mascot.top, bottom: mascot.bottom },
      controlsInsideCard: [...document.querySelectorAll('.login-form-card input, .login-form-card button[type="submit"]')].every(control => {
        const rect = control.getBoundingClientRect();
        return rect.left >= panel.left - 1 && rect.right <= panel.right + 1;
      }),
      bodyFont: getComputedStyle(document.querySelector('.login-form-card input')).fontSize,
      mascotFont: getComputedStyle(document.querySelector('.login-companion-words p')).fontSize,
    };
  });
  assert(layout.documentWidth <= layout.width, `${name}: horizontal overflow ${JSON.stringify(layout)}`);
  assert(layout.mascot.left >= layout.story.left - 1 && layout.mascot.right <= layout.story.right + 1, `${name}: mascot escaped brand panel`);
  assert(layout.controlsInsideCard, `${name}: a control is clipped by the form panel`);
  assert.equal(layout.bodyFont, '16px', `${name}: input text size`);
  assert(parseFloat(layout.mascotFont) >= 13, `${name}: mascot text size`);
  if (name.startsWith('register-') && layout.width >= 761) assert(layout.card.bottom <= layout.height, `${name}: registration card exceeds first view`);
  await page.screenshot({ path: join(output, `${name}.png`), animations: 'disabled' });
  console.log(`${name}: ${JSON.stringify(layout)}`);
};

try {
  await page.goto(`${base}/login`);
  await page.getByRole('heading', { name: 'Bienvenido de nuevo' }).waitFor();
  assert.equal(await page.locator('.login-segments').count(), 0, 'The duplicate top-level form selector is removed');
  assert.equal(await companion.evaluate(element => element.parentElement.classList.contains('login-story')), true, 'Mascot stays integrated in the identity panel');
  await capture('login-desktop');

  const firstPose = await companion.getAttribute('data-pose');
  const initialFocus = await page.evaluate(() => document.activeElement.id);
  await page.waitForFunction(value => document.querySelector('.login-companion')?.dataset.pose !== value, firstPose, { timeout: 6500 });
  assert.equal(await page.evaluate(() => document.activeElement.id), initialFocus, 'Mascot animation does not steal focus');

  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text', 'Password visibility toggle works');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'password');

  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await companion.getAttribute('data-state'), 'error');
  assert((await companion.innerText()).includes('Revisemos este dato para poder continuar.'));

  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByRole('heading', { name: 'Crear cuenta', exact: true }).waitFor();
  assert((await companion.innerText()).includes('Te acompaño a crear tu espacio de trabajo.'));
  assert.equal(await page.locator('.login-register-trial').getAttribute('open'), null, 'Trial code is initially tucked away');
  assert.equal(await page.locator('.login-password-rule.is-pending').count(), 4, 'Password rules start in a pending state');
  await capture('register-desktop');

  await page.locator('#nombre').fill('Cuenta de Prueba');
  await page.locator('#telefono').fill('0981123456');
  await page.locator('#email').fill('qa@example.com');
  await page.locator('#password').fill('validpass123');
  assert.equal(await page.locator('.login-password-rule.is-invalid').count(), 1, 'Invalid password requirements are explicit');
  await page.locator('#password').fill('ValidPass123');
  await page.locator('#confirmPassword').fill('OtraPass123');
  assert.equal(await page.locator('.login-password-rule.is-invalid').count(), 1, 'Password mismatch is explicit');
  await page.locator('#confirmPassword').fill('ValidPass123');
  assert.equal(await page.locator('.login-password-rule.is-valid').count(), 4, 'All valid requirements are shown as complete');
  await page.locator('.login-register-trial summary').click();
  await page.locator('#codigo_prueba').fill('prueba10');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByRole('heading', { name: 'Verificá tu correo' }).waitFor();
  assert.equal(registerPayload.codigo_prueba, 'PRUEBA10', 'Optional trial code remains in the existing API payload');
  assert.equal(registerPayload.email, 'qa@example.com');
  await page.locator('[aria-label="Dígito 1"]').fill('1');
  await page.locator('[aria-label="Dígito 2"]').fill('2');
  await page.locator('[aria-label="Dígito 3"]').fill('3');
  await page.locator('[aria-label="Dígito 4"]').fill('4');
  await page.locator('[aria-label="Dígito 5"]').fill('5');
  await page.locator('[aria-label="Dígito 6"]').fill('6');
  await page.waitForFunction(() => document.querySelector('.login-companion')?.dataset.state === 'success');
  assert.equal(await companion.getAttribute('data-state'), 'success', 'Email verification success state is reflected by mascot');

  await page.goto(`${base}/login`);
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await page.getByRole('heading', { name: 'Recuperar contraseña' }).waitFor();
  await page.locator('#email').fill('qa@example.com');
  await page.getByRole('button', { name: 'Enviar instrucciones' }).click();
  await page.waitForFunction(() => document.querySelector('.login-companion')?.dataset.state === 'success');
  assert.deepEqual(errors, [], 'No client-side runtime errors');

  await page.goto(`${base}/registro`);
  await page.getByRole('heading', { name: 'Crear cuenta', exact: true }).waitFor();
  assert.equal(await page.locator('.login-register-trial').count(), 1, 'Direct registration route keeps the trial-code path');
  await page.goto(`${base}/registro?token=qa-token`);
  await page.getByRole('heading', { name: 'Crear cuenta', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('#email')?.disabled === true);
  assert.equal(await page.locator('.login-register-trial').count(), 0, 'Paid-plan route keeps its token flow without asking for a trial code');
  assert.equal(await page.locator('.login-register-notice').count(), 0, 'Paid-plan flow does not show the free-account payment reminder');

  for (const [width, height] of [[1100, 900], [900, 900], [800, 900], [761, 900], [760, 844], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/login`);
    await page.getByRole('heading', { name: 'Bienvenido de nuevo' }).waitFor();
    await capture(`login-${width}`);
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await page.getByRole('heading', { name: 'Crear cuenta', exact: true }).waitFor();
    await capture(`register-${width}`);
    if (width === 390) {
      await page.locator('#confirmPassword').scrollIntoViewIfNeeded();
      await page.locator('#confirmPassword').focus();
      await capture('register-mobile-scrolled');
    }
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/login`);
  const reducedPose = await companion.getAttribute('data-pose');
  await page.waitForTimeout(4600);
  assert.equal(await companion.getAttribute('data-pose'), reducedPose, 'Reduced motion stops the automatic pose cycle');
  assert.equal(await page.locator('.login-companion-avatar').evaluate(element => getComputedStyle(element).animationName), 'none');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
  assert.equal(await page.locator('.login-page').evaluate(element => getComputedStyle(element).getPropertyValue('--login-bg').trim()), '#101715');
  await capture('login-dark');
  console.log(`PASS: login, registration validation, optional trial code, verification, recovery, responsive layouts, automatic animation, reduced motion. Captures: ${output}`);
} finally {
  await browser.close();
}
