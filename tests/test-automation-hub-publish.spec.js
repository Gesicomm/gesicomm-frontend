const { test, expect } = require('@playwright/test');

test.describe('Automation Hub - Publish Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend calls to mock the items and avoid hitting real DB
    await page.route('**/api/automation-hub/content', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 999,
            tracking_code: 'R-TEST-1234',
            format: 'R',
            topic: 'Prueba de publicacion E2E',
            keyword: 'QUIERO',
            description: 'Caption de prueba muy largo',
            publish_date: '2030-01-01',
            publish_time: '10:00:00',
            status: 'scheduled',
            ManychatLink: null
          }
        ])
      });
    });

    await page.route('**/api/automation-hub/content/999/publish', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/automation-hub/manychat/link/999', async (route) => {
      await route.fulfill({ 
        status: 200, 
        body: JSON.stringify({ link: { tag_name: '[MC] R-TEST-1234' } }) 
      });
    });

    // Mock ManyChat window.open
    await page.addInitScript(() => {
      window.open = (url) => {
        window.__TEST_OPENED_URL = url;
        return null;
      };
    });
  });

  test('debe previsualizar un archivo local y abrir el asistente flotante al publicar', async ({ page }) => {
    // Login mocked si hay algn flow de auth previo, 
    // pero vamos a suponer que la app redirige a login o estamos bypasseando auth en test.
    // Si la ruta requiere auth, puedes inyectar localStorage:
    await page.goto('/automation-hub');

    // Esperar a que se cargue la grilla o el calendario y clickear el item
    await page.click('text=Prueba de publicacion E2E');
    
    // Debera abrirse el modal de detalle
    await expect(page.locator('text=Detalle de contenido')).toBeVisible();
    await expect(page.locator('text=R-TEST-1234')).toBeVisible();

    // El mockup de celular debe decir que subas archivos
    await expect(page.locator('text=Sube fotos o videos localmente')).toBeVisible();

    // Subir un archivo falso al input file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-video-content') // En playwright acepta un buffer para mocks
    });

    // El mockup debe desaparecer el texto de subida y mostrar un video
    await expect(page.locator('text=Sube fotos o videos localmente')).not.toBeVisible();
    await expect(page.locator('video')).toBeVisible();
    await expect(page.locator('text=Caption de prueba muy largo')).toBeVisible();

    // Clic en publicar
    await page.click('text=Marcar como publicado y armar automatizacin en ManyChat');

    // Verificar que window.open fue llamado
    const openedUrl = await page.evaluate(() => window.__TEST_OPENED_URL);
    expect(openedUrl).toBe('https://app.manychat.com/');

    // Verificar que el asistente flotante aparece
    await expect(page.locator('text=Configuracin ManyChat')).toBeVisible();
    await expect(page.locator('text=PLANTILLA - TRACKING REELS / POSTS')).toBeVisible();
    await expect(page.locator('text=QUIERO')).toBeVisible();
    await expect(page.locator('text=[MC] R-TEST-1234')).toBeVisible();

    // Verificar minimizar asistente
    await page.click('button:has(.lucide-chevron-down)');
    await expect(page.locator('text=Asistente ManyChat')).toBeVisible(); // minimizado
    await expect(page.locator('text=PLANTILLA - TRACKING REELS / POSTS')).not.toBeVisible();

    // Restaurar asistente
    await page.click('button:has(.lucide-chevron-up)');
    await expect(page.locator('text=PLANTILLA - TRACKING REELS / POSTS')).toBeVisible();
  });
});
