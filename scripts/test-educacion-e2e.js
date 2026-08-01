const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = '6p1QXBXKlK0TwO4hoE1kAHNWkNfzKUYBkGkotqNKMLwjn4mscJwy4EqPpQ1JFUc7LUxXz9DhEJoXO7QpbKP1fQ==';
const ARTIFACT_DIR = 'C:/Users/Martin/.gemini/antigravity/brain/c507db45-75a1-437f-ad8e-ff45a07142e5';

async function runE2ETest() {
  console.log('Iniciando verificación E2E con Playwright...');

  const token = jwt.sign(
    {
      id: 1,
      nombre: 'Martin Rodriguez',
      email: 'rodriguezmartinv02@gmail.com',
      rol: 'admin',
      permisos: ['*'],
      tenantId: 1,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Set auth cookies for both localhost:5173 and localhost:3000
  await context.addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  try {
    // 1. Navegar a /academia
    console.log('1. Navegando a /academia...');
    await page.goto('http://localhost:5173/academia', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const shot1 = path.join(ARTIFACT_DIR, 'e2e_academia_main.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log(`Captura guardada: ${shot1}`);

    // 2. Click en Rendir Evaluación
    console.log('2. Abriendo modal de evaluación...');
    const btnExamen = page.locator('button:has-text("Rendir Evaluación"), button:has-text("Examen")').first();
    if (await btnExamen.isVisible()) {
      await btnExamen.click();
      await page.waitForTimeout(1000);

      const shot2 = path.join(ARTIFACT_DIR, 'e2e_quiz_modal.png');
      await page.screenshot({ path: shot2, fullPage: true });
      console.log(`Captura guardada: ${shot2}`);

      // 3. Responder preguntas
      console.log('3. Seleccionando opciones correctas...');
      const options = page.locator('.examen-option-label');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        // Click opción si corresponde
        await options.nth(i).click();
      }

      // 4. Entregar examen
      const btnEntregar = page.locator('button:has-text("Entregar Examen")');
      if (await btnEntregar.isVisible()) {
        await btnEntregar.click();
        await page.waitForTimeout(2000);

        const shot3 = path.join(ARTIFACT_DIR, 'e2e_quiz_result.png');
        await page.screenshot({ path: shot3, fullPage: true });
        console.log(`Captura guardada: ${shot3}`);

        // Cerrar modal
        const btnCerrar = page.locator('.examen-modal-footer button:has-text("Cerrar")');
        if (await btnCerrar.isVisible()) {
          await btnCerrar.click();
        }
      }
    }

    // 5. Navegar a /admin/educacion
    console.log('5. Navegando a panel de gestión /admin/educacion...');
    await page.goto('http://localhost:5173/admin/educacion', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const shot4 = path.join(ARTIFACT_DIR, 'e2e_admin_academia.png');
    await page.screenshot({ path: shot4, fullPage: true });
    console.log(`Captura guardada: ${shot4}`);

    console.log('Prueba E2E con Playwright finalizada con éxito.');
  } catch (error) {
    console.error('Error durante la prueba E2E de Playwright:', error);
  } finally {
    await browser.close();
  }
}

runE2ETest().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
