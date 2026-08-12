import { test, expect } from '@playwright/test';

test.describe('Landing Editor - Multi-view & UI features', () => {

  test.beforeEach(async ({ page }) => {
    // Mock user auth
    await page.route('**/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          usuario: { id: 1, nombre: 'Admin', email: 'admin@test.com', rol: 'administrador' },
          tienda: { id: 1, nombre: 'Mi Tienda', subdominio: 'mi-tienda' }
        })
      });
    });

    // Mock landing fetch
    await page.route('**/api/landing/mi-landing', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          nombre: 'Landing Test',
          secciones: [],
          secciones_producto: []
        })
      });
    });

    // Mock landing update (if save happens)
    await page.route('**/api/landing/*', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, nombre: 'Landing Test' })
        });
      } else {
        route.fallback();
      }
    });
  });

  test('debe mantener las secciones independientes al cambiar entre Página Principal y Vista de Producto', async ({ page }) => {
    await page.goto('http://localhost:5174/mi-landing');
    await page.waitForSelector('text=Página Principal');

    // 1. Verificar estado inicial
    await expect(page.locator('button:has-text("Página Principal")')).toHaveClass(/bg-\[var\(--vit-card-bg\)\]/);

    // 2. Cambiar a Vista de Producto
    await page.click('button:has-text("Vista de Producto")');
    
    // Verificar que cambie el toggle activo
    await expect(page.locator('button:has-text("Vista de Producto")')).toHaveClass(/bg-\[var\(--vit-card-bg\)\]/);
    
    // Debería estar el bloque ProductDetail (viene por defecto si secciones_producto está vacío)
    await expect(page.locator('text=Detalle de Producto').first()).toBeVisible();
  });

  test('debe poder interactuar con el Header Inspector', async ({ page }) => {
    await page.goto('http://localhost:5174/mi-landing');
    await page.waitForSelector('text=Página Principal');

    // Seleccionar Header (el Header está en minúsculas usualmente, o "Cabecera")
    // Note: Since sections are empty, the editor might show default sections (Header, Hero, etc).
    // The default name for header is 'header' or 'Cabecera'
    await page.click('text=Cabecera');
    
    // Verificar que el InspectorSeccion abrió
    await expect(page.locator('text=Configurar Nav Links').first()).toBeVisible();
  });

});
