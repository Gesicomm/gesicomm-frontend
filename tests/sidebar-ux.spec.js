import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
const grupos = [
  ['VENTAS', [['Mi negocio', '/mi-tienda', 'Store'], ['Depósitos', '/mi-tienda/depositos', 'MapPin'], ['Productos', '/mi-catalogo', 'Grid']]],
  ['MARKETING', [['Mi E-commerce', '/landing', 'Store'], ['Publicidad', '/mis-anuncios', 'Megaphone']]],
  ['OPERACIONES', [['Gestión Comercial', '/mis-pedidos', 'ShoppingCart'], ['Gestión Logística', '/gestion-logistica', 'Truck'], ['Dashboard Operativo', '/dashboard-operativo', 'LayoutDashboard']]],
  ['ANÁLISIS', [['Dashboard General', '/mi-dashboard', 'LayoutDashboard'], ['Control Financiero', '/finanzas/costos-gastos', 'Receipt']]],
  ['IMPORTACIÓN', [['Proveete con Gesicom', '/importada-de-china', 'Ship']]],
  ['AFILIADOS', [['Quiero ser afiliado', '/afiliados', 'BadgeDollarSign'], ['Partner Certificado', '/partner-certificado', 'BadgeCheck']]],
];

for (const theme of ['light', 'dark']) for (const width of [375, 1280]) {
  test(`Sidebar ${theme} a ${width}px: grupos, selección y navegación`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await prepararUsuario(page, theme);
    await page.route('**/api/educacion/progreso-sidebar', route => route.fulfill({ json: {
      bloqueos: {}, modulos: grupos.flatMap(([seccion, items]) => items.map(([label, path, icono]) => ({
        label, path, icono, seccion, contexto: 'ecommerce', rolesPermitidos: ['usuario'],
      }))),
    } }));
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(`${origin}/mi-catalogo`);
    if (width < 1024) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    const sidebar = page.locator('aside.sidebar');
    const nav = sidebar.getByRole('navigation', { name: 'Navegación de usuario' });
    await expect(nav.locator('.user-sidebar-group')).toHaveCount(6);
    await expect(nav.getByRole('link', { name: 'Productos', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await nav.getByRole('link').allTextContents()).toEqual(grupos.flatMap(([, items]) => items.map(([label]) => label)));
    await expect(sidebar.getByTitle('Cambiar de tienda')).toBeVisible();
    await sidebar.getByTitle('Cambiar de tienda').click();
    await expect(sidebar.getByRole('listbox', { name: 'Tus tiendas' })).toBeVisible();
    await sidebar.getByTitle('Cambiar de tienda').click();
    await expect(sidebar.getByRole('listbox')).toHaveCount(0);
    await expect(sidebar.getByRole('button', { name: 'Salir', exact: true })).toBeVisible();
    expect(await sidebar.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('sidebar.png') });
    await nav.getByRole('link', { name: 'Depósitos', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/mi-tienda/depositos`);
    if (width < 1024) {
      await expect(sidebar).toHaveClass(/-translate-x-full/);
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
    }
    await expect(nav.getByRole('link', { name: 'Depósitos', exact: true })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Partner Certificado', exact: true }).scrollIntoViewIfNeeded();
    await expect(nav.getByRole('link', { name: 'Partner Certificado', exact: true })).toBeInViewport();
    await expect(sidebar.getByRole('button', { name: 'Salir', exact: true })).toBeInViewport();
    if (width >= 1024) {
      await sidebar.getByRole('button', { name: 'Ocultar menú', exact: true }).click();
      await expect(sidebar).toBeHidden();
      await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
      await expect(sidebar).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
}
