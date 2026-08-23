# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test-checkout-ofertas.spec.js >> Landing Editor - Checkout y Ofertas por Producto >> debe permitir ver, asignar y crear ofertas en la vista del producto
- Location: tests\test-checkout-ofertas.spec.js:104:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Producto de Prueba') to be visible

```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - link "Volver" [ref=f2e4] [cursor=pointer]:
    - /url: /
  - generic [ref=f2e7]:
    - link "GESICOMM." [ref=f2e8] [cursor=pointer]:
      - /url: /
    - generic [ref=f2e9]:
      - heading "Iniciar sesión" [level=2] [ref=f2e10]
      - generic [ref=f2e11]:
        - generic [ref=f2e12]: Correo electrónico
        - textbox "Correo electrónico" [ref=f2e13]:
          - /placeholder: correo@ejemplo.com
      - generic [ref=f2e14]:
        - generic [ref=f2e15]: Contraseña
        - textbox "Contraseña" [ref=f2e16]:
          - /placeholder: ••••••••
      - button "Ingresar" [ref=f2e17]
      - generic [ref=f2e18]:
        - button "¿Olvidaste tu contraseña?" [ref=f2e19] [cursor=pointer]
        - paragraph [ref=f2e20]:
          - text: ¿No tenés cuenta?
          - button "Registrate aquí" [ref=f2e21] [cursor=pointer]
```

# Test source

```ts
  17  | 
  18  |     // Mock tienda
  19  |     await page.route('**/api/mi-tienda', route => {
  20  |       route.fulfill({
  21  |         status: 200,
  22  |         contentType: 'application/json',
  23  |         body: JSON.stringify({ id: 1, nombre: 'Mi Tienda', subdominio: 'mi-tienda' })
  24  |       });
  25  |     });
  26  | 
  27  |     // Mock landing del producto
  28  |     await page.route('**/api/productos/10/landing', route => {
  29  |       route.fulfill({
  30  |         status: 200,
  31  |         contentType: 'application/json',
  32  |         body: JSON.stringify({
  33  |           id: 1,
  34  |           nombre: 'Landing Test',
  35  |           slug: 'landing-test',
  36  |           ofertas_carrito: [],
  37  |           ofertas_producto_vista: [],
  38  |           content: {
  39  |             ofertas_carrito: [],
  40  |             ofertas_producto_vista: []
  41  |           }
  42  |         })
  43  |       });
  44  |     });
  45  | 
  46  |     // Mock detalle del producto
  47  |     await page.route('**/api/productos/10', route => {
  48  |       route.fulfill({
  49  |         status: 200,
  50  |         contentType: 'application/json',
  51  |         body: JSON.stringify({
  52  |           id: 10,
  53  |           nombre: 'Producto de Prueba',
  54  |           precio_base: 5000,
  55  |           precio_tachado: 10000,
  56  |           descripcion_corta: 'Desc'
  57  |         })
  58  |       });
  59  |     });
  60  | 
  61  |     // Mock variantes (vacio)
  62  |     await page.route('**/api/productos/10/variantes', route => {
  63  |       route.fulfill({
  64  |         status: 200,
  65  |         contentType: 'application/json',
  66  |         body: JSON.stringify([])
  67  |       });
  68  |     });
  69  | 
  70  |     // Mock ofertas por producto (inicial)
  71  |     await page.route('**/api/productos/10/ofertas', route => {
  72  |       if (route.request().method() === 'GET') {
  73  |         route.fulfill({
  74  |           status: 200,
  75  |           contentType: 'application/json',
  76  |           body: JSON.stringify([
  77  |             { id: 99, estrategia: 'order_bump', tipo_contenido: 'combo', nombre: 'Order Bump Existente', precio: 1500 }
  78  |           ])
  79  |         });
  80  |       } else if (route.request().method() === 'POST') {
  81  |         // Mock crear oferta
  82  |         route.fulfill({
  83  |           status: 201,
  84  |           contentType: 'application/json',
  85  |           body: JSON.stringify({ id: 100, estrategia: 'upsell', nombre: 'Mi Nuevo Upsell Test', precio: 5000 })
  86  |         });
  87  |       }
  88  |     });
  89  | 
  90  |     // Mock save
  91  |     await page.route('**/api/productos/10/landing', route => {
  92  |       if (route.request().method() === 'PUT') {
  93  |         route.fulfill({
  94  |           status: 200,
  95  |           contentType: 'application/json',
  96  |           body: JSON.stringify({ id: 1, nombre: 'Landing Test' })
  97  |         });
  98  |       } else {
  99  |         route.fallback();
  100 |       }
  101 |     });
  102 |   });
  103 | 
  104 |   test('debe permitir ver, asignar y crear ofertas en la vista del producto', async ({ page }) => {
  105 |     // 1. Navegar al MerchantEditor del producto 10
  106 |     
  107 |     // Set token
  108 |     await page.addInitScript(() => {
  109 |       window.localStorage.setItem('token', 'fake-token-123');
  110 |     });
  111 |     
  112 |     // 1. Navegar
  113 |     await page.goto('http://localhost:5174/mi-landing/producto/10');
  114 | 
  115 |     
  116 |     // Esperar a que cargue el editor
> 117 |     await page.waitForSelector('text=Producto de Prueba');
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  118 | 
  119 |     // Verificar que carga el panel de Ofertas de Checkout en el menú izquierdo (abajo de las secciones)
  120 |     await expect(page.locator('h3:has-text("Ofertas de Checkout")')).toBeVisible();
  121 | 
  122 |     // 3. Verificar que aparece la oferta existente
  123 |     await expect(page.locator('text=Order Bump Existente')).toBeVisible();
  124 | 
  125 |     // 4. Asignar la oferta existente al Carrito (checkbox)
  126 |     const checkboxCarrito = page.locator('label:has-text("Carrito Global") input[type="checkbox"]');
  127 |     await checkboxCarrito.check();
  128 |     await expect(checkboxCarrito).toBeChecked();
  129 | 
  130 |     // 5. Crear una nueva oferta
  131 |     await page.click('button:has-text("Nueva")');
  132 | 
  133 |     // Completar el formulario inline
  134 |     await page.selectOption('select', { value: 'upsell' });
  135 |     
  136 |     // Llenar el título
  137 |     await page.fill('input[placeholder*="Ej: Sumá un cargador"]', 'Mi Nuevo Upsell Test');
  138 |     
  139 |     // Llenar precio
  140 |     await page.fill('input[placeholder="Ej: 5000"]', '5000');
  141 |     
  142 |     // Guardar
  143 |     await page.click('button:has-text("Guardar Oferta")');
  144 | 
  145 |     // Verificar que la petición de POST se hizo (el form se cierra)
  146 |     await expect(page.locator('button:has-text("Guardar Oferta")')).not.toBeVisible();
  147 |   });
  148 | });
  149 | 
```