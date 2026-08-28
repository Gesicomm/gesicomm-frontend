import { test, expect } from '@playwright/test';

test.describe('Products Form - Full flow and Tabs UI tests', () => {

  test.beforeEach(async ({ page }) => {
    // Enable browser console logs printing to terminal
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    // Mock user auth (flat object, exactly what verificarSesion expects)
    await page.route('**/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          nombre: 'Admin',
          email: 'admin@test.com',
          rol: 'administrador'
        })
      });
    });

    // Mock active store
    await page.route('**/api/mi-tienda', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          nombre: 'Mi Tienda',
          subdominio: 'mi-tienda'
        })
      });
    });

    // Mock categories fetch
    await page.route('**/api/categorias/buscar', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          pagina: 1,
          total_paginas: 1,
          categorias: [
            { id: 1, nombre: 'Electrónica', activa: true }
          ]
        })
      });
    });

    // Mock providers fetch
    await page.route('**/api/proveedores/buscar', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          pagina: 1,
          total_paginas: 1,
          proveedores: [
            { id: 1, nombre: 'Proveedor A' }
          ]
        })
      });
    });

    // Mock combo config
    await page.route('**/api/combos/configuracion', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recargo_tc: 5,
          descuento_efectivo: 10
        })
      });
    });

    // Mock product details
    await page.route('**/api/productos/10', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10,
          nombre: 'Producto Existente',
          categoria_id: 1,
          proveedor_id: 1,
          sku: 'SKU123',
          descripcion_corta: 'Corta desc',
          descripcion_larga: 'Larga desc',
          precio_base: 5000,
          precio_ancla: 10000,
          precio_costo: 3000,
          precio_minimo: 4500,
          cantidad_disponible: 50,
          stock_minimo: 5,
          activo: true,
          estado_venta: 'en_venta',
          creado_por: 1
        })
      });
    });

    // Mock product variants
    await page.route('**/api/productos/10/variantes', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nombre: 'Rojo', stock: 20, precio_diferencial: 0 }
        ])
      });
    });

    // Mock product images
    await page.route('**/api/productos/10/imagenes', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, path: '/uploads/image1.png', es_principal: true }
        ])
      });
    });

    // Mock product FAQs
    await page.route('**/api/productos/10/faq', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, pregunta: '¿Tiene garantía?', respuesta: 'Sí, de 1 año' }
        ])
      });
    });

    // Mock updating product
    await page.route('**/api/productos/10', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 10, nombre: 'Producto Existente Modificado' })
        });
      } else {
        route.fallback();
      }
    });
  });

  test('debe navegar por todas las pestañas de ProductForm y permitir guardar los cambios', async ({ page }) => {
    // Establecer token de sesión simulada
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-token-123');
    });

    // Ir a la página de edición del producto
    await page.goto('http://localhost:5174/products/10/editar');

    // 1. Verificar que el formulario se haya cargado con el nombre correcto
    await expect(page.locator('#prod-nombre')).toHaveValue('Producto Existente');

    // 2. Verificar que los botones de tabs sean visibles y tengan sus etiquetas
    const tabs = [
      { id: 'general', label: 'General' },
      { id: 'precio', label: 'Precio' },
      { id: 'inventario', label: 'Inventario' },
      { id: 'variantes', label: 'Variantes' },
      { id: 'multimedia', label: 'Multimedia' },
      { id: 'marketing', label: 'Marketing & Embudo' },
      { id: 'faq', label: 'Todo lo que necesitas saber' },
      { id: 'ofertas', label: 'Ofertas comerciales' },
      { id: 'configuracion', label: 'Configuración' }
    ];

    // Recorrer y hacer clic en cada pestaña para comprobar la interactividad
    for (const tab of tabs) {
      const tabButton = page.locator(`button[role="tab"]:has-text("${tab.label}")`);
      await expect(tabButton).toBeVisible();
      
      // Hacer clic en la pestaña
      await tabButton.click();
      
      // Verificar que quede seleccionada
      await expect(tabButton).toHaveAttribute('aria-selected', 'true');
      await expect(tabButton).toHaveClass(/active/);
    }

    // 3. Volver a la pestaña General para editar un valor
    await page.locator('button[role="tab"]:has-text("General")').click();
    await page.fill('#prod-nombre', 'Producto Existente Modificado');

    // 4. Ir a la pestaña Precio y modificar el precio base
    await page.locator('button[role="tab"]:has-text("Precio")').click();
    const precioBaseInput = page.locator('#prod-precio-base');
    await expect(precioBaseInput).toBeVisible();
    await precioBaseInput.fill('6000');

    // 5. Enviar el formulario haciendo clic en Guardar
    const guardarButton = page.locator('button:has-text("Guardar")').first();
    await expect(guardarButton).toBeVisible();
    
    // Interceptar la petición de actualización (PUT)
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/productos/10') && req.method() === 'PUT'),
      guardarButton.click()
    ]);

    // Verificar que los datos enviados en el payload coincidan con las ediciones hechas
    const payload = JSON.parse(request.postData());
    expect(payload.nombre).toBe('Producto Existente Modificado');
    expect(payload.precio_base).toBe(6000);

    // Verificar redirección tras guardar
    await page.waitForURL('**/products');
  });

});
