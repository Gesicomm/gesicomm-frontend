import { test, expect } from '@playwright/test';

test.describe('Landing Editor - Checkout y Ofertas por Producto', () => {

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

    // Mock tienda
    await page.route('**/api/mi-tienda', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, nombre: 'Mi Tienda', subdominio: 'mi-tienda' })
      });
    });

    // Mock landing del producto
    await page.route('**/api/productos/10/landing', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          nombre: 'Landing Test',
          slug: 'landing-test',
          ofertas_carrito: [],
          ofertas_producto_vista: [],
          content: {
            ofertas_carrito: [],
            ofertas_producto_vista: []
          }
        })
      });
    });

    // Mock detalle del producto
    await page.route('**/api/productos/10', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10,
          nombre: 'Producto de Prueba',
          precio_base: 5000,
          precio_tachado: 10000,
          descripcion_corta: 'Desc'
        })
      });
    });

    // Mock variantes (vacio)
    await page.route('**/api/productos/10/variantes', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock ofertas por producto (inicial)
    await page.route('**/api/productos/10/ofertas', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 99, estrategia: 'order_bump', tipo_contenido: 'combo', nombre: 'Order Bump Existente', precio: 1500 }
          ])
        });
      } else if (route.request().method() === 'POST') {
        // Mock crear oferta
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 100, estrategia: 'upsell', nombre: 'Mi Nuevo Upsell Test', precio: 5000 })
        });
      }
    });

    // Mock save
    await page.route('**/api/productos/10/landing', route => {
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

  test('debe permitir ver, asignar y crear ofertas en la vista del producto', async ({ page }) => {
    // 1. Navegar al MerchantEditor del producto 10
    
    // Set token
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-token-123');
    });
    
    // 1. Navegar
    await page.goto('http://localhost:5174/mi-landing/producto/10');

    
    // Esperar a que cargue el editor
    await page.waitForSelector('text=Producto de Prueba');

    // Verificar que carga el panel de Ofertas de Checkout en el menú izquierdo (abajo de las secciones)
    await expect(page.locator('h3:has-text("Ofertas de Checkout")')).toBeVisible();

    // 3. Verificar que aparece la oferta existente
    await expect(page.locator('text=Order Bump Existente')).toBeVisible();

    // 4. Asignar la oferta existente al Carrito (checkbox)
    const checkboxCarrito = page.locator('label:has-text("Carrito Global") input[type="checkbox"]');
    await checkboxCarrito.check();
    await expect(checkboxCarrito).toBeChecked();

    // 5. Crear una nueva oferta
    await page.click('button:has-text("Nueva")');

    // Completar el formulario inline
    await page.selectOption('select', { value: 'upsell' });
    
    // Llenar el título
    await page.fill('input[placeholder*="Ej: Sumá un cargador"]', 'Mi Nuevo Upsell Test');
    
    // Llenar precio
    await page.fill('input[placeholder="Ej: 5000"]', '5000');
    
    // Guardar
    await page.click('button:has-text("Guardar Oferta")');

    // Verificar que la petición de POST se hizo (el form se cierra)
    await expect(page.locator('button:has-text("Guardar Oferta")')).not.toBeVisible();
  });
});
