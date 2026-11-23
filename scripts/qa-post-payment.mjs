import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const base = process.env.QA_URL || 'http://127.0.0.1:5187';
const output = join(tmpdir(), 'gesicom-post-payment');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const compra = { nombre: 'Ana Compradora', telefono: '0981123456', email: 'ana@example.com', plan: { nombre: 'Starter' } };
const usuario = { id: 21, nombre: compra.nombre, rol: 'usuario', tipo_ingreso_inicial: 'usuario', rutas: { fisico: true, personal: true } };
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    let registro;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://connect.facebook.net/**', route => route.abort());
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith('/api/suscripciones/token/')) return route.fulfill({ json: compra });
      if (path.startsWith('/api/suscripciones/activacion/')) return route.fulfill({ json: { ...compra, correo_verificado_por_enlace: true } });
      if (path.startsWith('/api/suscripciones/estado/')) return route.fulfill({ json: { estado_pago: 'PAID', token_registro: 'qa-token', email: compra.email, plan: compra.plan } });
      if (path === '/api/auth/register') {
        registro = route.request().postDataJSON();
        return route.fulfill({ json: { cuenta_activada: true, requiere_verificacion: false, email: compra.email } });
      }
      if (path === '/api/auth/login') return route.fulfill({ json: { usuario, tiendas: [] } });
      if (path === '/api/auth/me') return route.fulfill({ json: { usuario } });
      if (path === '/api/suscripciones/mi-estado') return route.fulfill({ json: { rutas: usuario.rutas, suscripcion: { periodo_fin: null } } });
      return route.fulfill({ json: {} });
    });
    // Hotmart continúa en la confirmación de correo con el comprobante
    // entregado por /registro/oferta; esta es la entrada pública vigente.
    await page.goto(`${base}/activar-cuenta#comprobante=qa-token`);
    await page.getByRole('heading', { name: 'Revisá tu correo para activar tu cuenta' }).waitFor();
    await page.goto(`${base}/registro#activacion=qa-enlace-correo`);
    await page.getByRole('heading', { name: 'Creá tu contraseña' }).waitFor();
    assert(new URL(page.url()).pathname === '/registro');
    assert(!page.url().includes('qa-enlace-correo'), 'el enlace conserva el token fuera de la URL');
    assert(await page.locator('.login-register-fields input').count() === 2);
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth,
      inputs: [...document.querySelectorAll('.login-register-fields input')].map(input => getComputedStyle(input).fontSize),
      paragraphs: [...document.querySelectorAll('.login-activation-summary p')].map(p => getComputedStyle(p).fontSize),
    }));
    assert(layout.document <= layout.viewport, JSON.stringify(layout));
    assert(layout.inputs.every(size => size === '16px'), JSON.stringify(layout));
    assert(layout.paragraphs.every(size => size === '16px'), JSON.stringify(layout));
    assert(await page.locator('.login-activation-summary').evaluate(el => el.getBoundingClientRect().width >= el.parentElement.getBoundingClientRect().width - 2), 'el resumen usa todo el ancho disponible');
    await page.screenshot({ path: join(output, `activation-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(output, `activation-dark-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
    await page.waitForTimeout(350);
    await page.getByLabel('Contraseña', { exact: true }).focus();
    await page.keyboard.press('Tab');
    assert(await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).evaluate(el => el === document.activeElement), 'el control de contraseña es accesible con teclado');
    await page.getByLabel('Contraseña', { exact: true }).fill('Segura123');
    await page.getByLabel('Repetir contraseña', { exact: true }).fill('Segura123');
    await page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
    await page.getByRole('button', { name: 'Entrar a Productos digitales' }).waitFor();
    assert(await page.getByRole('button', { name: 'Entrar a Servicios' }).isVisible());
    assert.deepEqual(registro, { nombre: compra.nombre, telefono: compra.telefono, email: compra.email, password: 'Segura123', token_activacion: 'qa-enlace-correo' });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, widths: [1440, 390], screenshots: output }));
} finally { await browser.close(); }
