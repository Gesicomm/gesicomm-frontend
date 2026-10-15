import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';
const origin = process.env.PALETTE_BASE_URL || 'http://localhost:5173';

for (const theme of ['light', 'dark']) {
  test(`vistas del usuario con tienda y plan activos (${theme})`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const session = await prepararUsuario(page, theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const routes = ['/mi-dashboard', '/mi-catalogo', '/combos', '/mis-pedidos', '/gestion-logistica', '/mi-tienda', '/inventario', '/academia', '/configuracion', '/mi-tienda/depositos', '/mi-tienda/couriers', '/finanzas/costos-gastos'];
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(origin + route);
      expect(errors, `Errores al cargar ${route}`).toEqual([]);
      await expect(page.getByRole('navigation', { name: 'Navegación de usuario' })).toBeVisible();
      await expect(page.getByText('Panel de Usuario', { exact: true })).toBeVisible();
      await expect(page.locator('.user-layout-container')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(errors, `Errores en ${route}`).toEqual([]);
      await expect(page.locator('h1,h2').first()).toBeVisible();
      if (route === '/mis-pedidos' || route === '/gestion-logistica') {
        await expect(page.locator('.pt-row').first()).toBeVisible();
        const layout = await page.evaluate(() => ({
          overflowingHeaders: [...document.querySelectorAll('.pt-th')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent),
          overlappingSummaries: [...document.querySelectorAll('.pt-cycle-summary .pt-resumen-item')].filter(el => {
            const label = el.querySelector('span').getBoundingClientRect();
            const value = el.querySelector('strong').getBoundingClientRect();
            return label.right > value.left + 1 || value.right > el.getBoundingClientRect().right + 1;
          }).map(el => el.textContent),
        }));
        expect(layout.overflowingHeaders).toEqual([]);
        expect(layout.overlappingSummaries).toEqual([]);
      }
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1).replaceAll('/', '-')}-${theme}.png`) });
      if (route === '/mis-pedidos') {
        await page.getByRole('button', { name: 'Kanban', exact: true }).click();
        await page.getByRole('button', { name: 'Tabla', exact: true }).click();
        await page.getByRole('button', { name: 'Nuevo Pedido', exact: true }).click();
        await expect(page.locator('#nuevo-pedido-title')).toBeVisible();
        await page.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
        await expect(page.locator('#nuevo-pedido-title')).toHaveCount(0);
        expect(errors).toEqual([]);
      }
    }
    await testInfo.attach('rutas-api-de-prueba', { body: JSON.stringify([...session.unknown], null, 2), contentType: 'application/json' });
  });

  test(`catálogo propio: permisos, selección, búsqueda y precio (${theme})`, async ({ page }) => {
    const session = await prepararUsuario(page, theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/mi-catalogo', { waitUntil: 'networkidle' });
    await expect(page.getByText('Producto Gesicom de prueba', { exact: true })).toBeVisible();
    await expect(page.locator('.vit-card').filter({ hasText: 'Producto Gesicom de prueba' }).getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Productos propios', exact: true }).click();
    const card = page.locator('.vit-card').filter({ hasText: 'Producto propio de prueba' });
    await expect(card).toBeVisible();
    const edit = card.getByRole('button', { name: 'Editar', exact: true });
    await expect(edit).toBeVisible();
    expect(await edit.evaluate(el => el.style.color)).not.toBe('');
    await card.getByRole('button', { name: 'Seleccionar Producto propio de prueba', exact: true }).click();
    await expect(card).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: /Publicar productos en la web/ })).toBeVisible();
    await card.locator('.vit-price-input').fill('135000');
    await card.getByRole('button', { name: /Guardar|Aplicar/ }).click();
    await expect.poll(() => session.requests.filter(r => r.path === '/vitrina/productos/101/precio').length).toBe(1);
    expect(session.requests.find(r => r.path === '/vitrina/productos/101/precio').payload).toEqual({ precio: 135000 });
    await page.getByPlaceholder('Buscar producto o combo...').fill('Sin coincidencias');
    await expect(page.locator('.vit-card')).toHaveCount(0);
    await page.getByPlaceholder('Buscar producto o combo...').fill('');
    await expect(page.locator('.vit-card')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test(`perfil y academia del usuario (${theme})`, async ({ page }) => {
    const session = await prepararUsuario(page, theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/mi-catalogo', { waitUntil: 'networkidle' });
    await page.getByTitle('Editar perfil y contraseña').click();
    await expect(page.getByRole('heading', { name: 'Configuración de Perfil' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configuración de Perfil' })).toHaveCount(0);
    await page.goto(origin + '/academia', { waitUntil: 'networkidle' });
    await expect(page.locator('.aca-player-title')).toHaveText('Primeros pasos');
    await page.getByRole('button', { name: 'Marcar Lección como Vista' }).click();
    await expect(page.getByRole('button', { name: '✓ Lección Completada' })).toBeVisible();
    expect(session.requests.some(r => r.path === '/educacion/lecciones/11/completar' && r.method === 'POST')).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`menú móvil de usuario, navegación y cambio de tema (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepararUsuario(page, theme);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/mi-catalogo', { waitUntil: 'networkidle' });
    expect(await page.locator('.vit-page').evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(false);
    for (const selector of ['.vit-header-actions', '.vit-filters', '.vit-bulk-select', '.vit-card']) {
      expect(await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().right > innerWidth + 1)).toBe(false);
    }
    await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Navegación de usuario' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Mi tienda', exact: true }).click();
    await expect(page).toHaveURL(origin + '/mi-tienda');
    await expect(page.getByRole('heading', { name: 'Configuración de tu tienda' })).toBeVisible();
    const target = theme === 'light' ? 'dark' : 'light';
    await page.getByRole('button', { name: `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}` }).last().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', target);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', target);
    await page.goto(origin + '/mis-pedidos', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Gestión Comercial', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('usuario sin suscripción conserva la redirección a planes', async ({ page }) => {
  await prepararUsuario(page, 'light', { conPlan: false });
  await page.goto(origin + '/mi-catalogo');
  await expect(page).toHaveURL(origin + '/planes');
  await expect(page.getByRole('heading', { name: /Vender online/ })).toBeVisible();
});
