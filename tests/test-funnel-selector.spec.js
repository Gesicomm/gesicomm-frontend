import { test, expect } from '@playwright/test';

test.describe('Funnel Selector', () => {

  const mockProduct = { id: 10, nombre: 'Producto Test' };
  const mockTemplates = [
    {
      id: 1,
      name: 'Direct Sale Classic',
      description: 'Venta rápida en un solo paso',
      funnel_type: 'direct_sale',
      preview_image: 'template-ds.png'
    },
    {
      id: 2,
      name: 'Educational Funnel',
      description: 'Ideal para explicar beneficios',
      funnel_type: 'educational',
      preview_image: null
    }
  ];

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

    // Mock product fetch
    await page.route('**/api/productos/10', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProduct)
      });
    });

    // Fallback para cualquier otra llamada API
    await page.route('**/api/**', route => {
      // Ignorar llamadas de instanciar y templates porque se mockean en cada test
      if (route.request().url().includes('instanciar-landing') || route.request().url().includes('landing-templates')) {
        return route.fallback();
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });
  });

  test('debe mostrar las tarjetas de los embudos disponibles y destacar el recomendado', async ({ page }) => {
    // Mock templates list
    await page.route('**/api/landing-templates', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');

    // Título principal con el nombre del producto
    await expect(page.locator('h1')).toHaveText('Producto Test');

    // Deben aparecer las dos tarjetas de embudos
    await expect(page.locator('text=Direct Sale Classic')).toBeVisible();
    await expect(page.locator('text=Educational Funnel')).toBeVisible();

    // Debe mostrar la insignia de recomendado para direct_sale
    await expect(page.locator('text=⚡ Más Recomendado')).toBeVisible();
  });

  test('debe instanciar el landing y redirigir al editor al seleccionar un embudo', async ({ page }) => {
    await page.route('**/api/landing-templates', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    let apiCalled = false;
    await page.route('**/api/productos/10/instanciar-landing', route => {
      apiCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success', landing_id: 99, slug: 'p-10-abc' })
      });
    });

    await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');
    await page.waitForSelector('text=Direct Sale Classic');

    // Clic en el primer botón "Usar este embudo"
    await page.click('button:has-text("Usar este embudo") >> nth=0');

    // Verificar que llamó al endpoint
    expect(apiCalled).toBe(true);

    // Debe intentar navegar al editor (la URL cambiará)
    await page.waitForURL('http://localhost:5176/mi-landing/producto/10');
  });

  test('debe manejar errores al cargar la información (caso borde)', async ({ page }) => {
    // Fallar la carga de templates
    await page.route('**/api/landing-templates', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' })
      });
    });

    await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');
    
    // Debe mostrar el cartel de error
    await expect(page.locator('text=Error al cargar la información. Intenta nuevamente.')).toBeVisible();
  });

  test('debe manejar error y restaurar botón al fallar la instanciación (caso borde)', async ({ page }) => {
    await page.route('**/api/landing-templates', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    // Fallar la instanciación
    await page.route('**/api/productos/10/instanciar-landing', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'El producto ya está en uso' })
      });
    });

    await page.goto('http://localhost:5174/mi-landing/producto/10/funnel-selector');
    await page.waitForSelector('text=Direct Sale Classic');

    await page.click('button:has-text("Usar este embudo") >> nth=0');

    // Debe mostrar el mensaje de error de la API
    await expect(page.locator('text=El producto ya está en uso')).toBeVisible();
    
    // El botón debería volver a su estado normal (no decir "Configurando...")
    const boton = page.locator('button:has-text("Usar este embudo")').first();
    await expect(boton).not.toBeDisabled();
  });

});
