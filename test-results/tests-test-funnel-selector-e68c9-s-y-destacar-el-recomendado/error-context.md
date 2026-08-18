# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test-funnel-selector.spec.js >> Funnel Selector >> debe mostrar las tarjetas de los embudos disponibles y destacar el recomendado
- Location: tests\test-funnel-selector.spec.js:59:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('h1')
Expected: "Producto Test"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="text-lg font-bold text-gray-900 truncate max-w-md"></h1>
       - unexpected value ""

```

```yaml
- complementary:
  - heading "GESICOMM." [level=2]
  - text: Panel de Usuario
  - navigation "Navegación de usuario":
    - text: APRENDIZAJE
    - list:
      - listitem:
        - link "Academia & Cursos PRO":
          - /url: /academia
    - text: GENERAL
    - list:
      - listitem:
        - link "Dashboard":
          - /url: /mi-dashboard
      - listitem:
        - link "Vitrina B2B":
          - /url: /mi-catalogo
      - listitem:
        - link "Mis Productos":
          - /url: /products
      - listitem:
        - link "Config. económica":
          - /url: /configuracion-economica
      - listitem:
        - link "Mis pedidos & Couriers":
          - /url: /mis-pedidos
      - listitem:
        - link "Mi landing":
          - /url: /mi-landing
      - listitem:
        - link "Mi tienda":
          - /url: /mi-tienda
    - text: META
    - list:
      - listitem:
        - link "Ads & Campañas":
          - /url: /mis-anuncios
  - list:
    - listitem:
      - link "Configuración":
        - /url: /configuracion
    - listitem:
      - button "Salir"
- main:
  - button
  - paragraph: Estrategia de Venta
  - heading [level=1]
  - main:
    - heading "Elegí cómo querés vender" [level=2]
    - paragraph: Seleccioná la estructura de página que mejor se adapte a tu producto. Nosotros nos encargamos del diseño técnico para que convierta más.
    - paragraph: Error al cargar la información. Intenta nuevamente.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Funnel Selector', () => {
  4   | 
  5   |   const mockProduct = { id: 10, nombre: 'Producto Test' };
  6   |   const mockTemplates = [
  7   |     {
  8   |       id: 1,
  9   |       name: 'Direct Sale Classic',
  10  |       description: 'Venta rápida en un solo paso',
  11  |       funnel_type: 'direct_sale',
  12  |       preview_image: 'template-ds.png'
  13  |     },
  14  |     {
  15  |       id: 2,
  16  |       name: 'Educational Funnel',
  17  |       description: 'Ideal para explicar beneficios',
  18  |       funnel_type: 'educational',
  19  |       preview_image: null
  20  |     }
  21  |   ];
  22  | 
  23  |   test.beforeEach(async ({ page }) => {
  24  |     // Mock user auth
  25  |     await page.route('**/api/auth/me', route => {
  26  |       route.fulfill({
  27  |         status: 200,
  28  |         contentType: 'application/json',
  29  |         body: JSON.stringify({
  30  |           usuario: { id: 1, nombre: 'Admin', email: 'admin@test.com', rol: 'administrador' },
  31  |           tienda: { id: 1, nombre: 'Mi Tienda', subdominio: 'mi-tienda' }
  32  |         })
  33  |       });
  34  |     });
  35  | 
  36  |     // Mock product fetch
  37  |     await page.route('**/api/productos/10', route => {
  38  |       route.fulfill({
  39  |         status: 200,
  40  |         contentType: 'application/json',
  41  |         body: JSON.stringify(mockProduct)
  42  |       });
  43  |     });
  44  | 
  45  |     // Fallback para cualquier otra llamada API
  46  |     await page.route('**/api/**', route => {
  47  |       // Ignorar llamadas de instanciar y templates porque se mockean en cada test
  48  |       if (route.request().url().includes('instanciar-landing') || route.request().url().includes('landing-templates')) {
  49  |         return route.fallback();
  50  |       }
  51  |       route.fulfill({
  52  |         status: 200,
  53  |         contentType: 'application/json',
  54  |         body: JSON.stringify({})
  55  |       });
  56  |     });
  57  |   });
  58  | 
  59  |   test('debe mostrar las tarjetas de los embudos disponibles y destacar el recomendado', async ({ page }) => {
  60  |     // Mock templates list
  61  |     await page.route('**/api/landing-templates', route => {
  62  |       route.fulfill({
  63  |         status: 200,
  64  |         contentType: 'application/json',
  65  |         body: JSON.stringify(mockTemplates)
  66  |       });
  67  |     });
  68  | 
  69  |     await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');
  70  | 
  71  |     // Título principal con el nombre del producto
> 72  |     await expect(page.locator('h1')).toHaveText('Producto Test');
      |                                      ^ Error: expect(locator).toHaveText(expected) failed
  73  | 
  74  |     // Deben aparecer las dos tarjetas de embudos
  75  |     await expect(page.locator('text=Direct Sale Classic')).toBeVisible();
  76  |     await expect(page.locator('text=Educational Funnel')).toBeVisible();
  77  | 
  78  |     // Debe mostrar la insignia de recomendado para direct_sale
  79  |     await expect(page.locator('text=⚡ Más Recomendado')).toBeVisible();
  80  |   });
  81  | 
  82  |   test('debe instanciar el landing y redirigir al editor al seleccionar un embudo', async ({ page }) => {
  83  |     await page.route('**/api/landing-templates', route => {
  84  |       route.fulfill({
  85  |         status: 200,
  86  |         contentType: 'application/json',
  87  |         body: JSON.stringify(mockTemplates)
  88  |       });
  89  |     });
  90  | 
  91  |     let apiCalled = false;
  92  |     await page.route('**/api/productos/10/instanciar-landing', route => {
  93  |       apiCalled = true;
  94  |       route.fulfill({
  95  |         status: 200,
  96  |         contentType: 'application/json',
  97  |         body: JSON.stringify({ message: 'Success', landing_id: 99, slug: 'p-10-abc' })
  98  |       });
  99  |     });
  100 | 
  101 |     await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');
  102 |     await page.waitForSelector('text=Direct Sale Classic');
  103 | 
  104 |     // Clic en el primer botón "Usar este embudo"
  105 |     await page.click('button:has-text("Usar este embudo") >> nth=0');
  106 | 
  107 |     // Verificar que llamó al endpoint
  108 |     expect(apiCalled).toBe(true);
  109 | 
  110 |     // Debe intentar navegar al editor (la URL cambiará)
  111 |     await page.waitForURL('http://localhost:5176/mi-landing/producto/10');
  112 |   });
  113 | 
  114 |   test('debe manejar errores al cargar la información (caso borde)', async ({ page }) => {
  115 |     // Fallar la carga de templates
  116 |     await page.route('**/api/landing-templates', route => {
  117 |       route.fulfill({
  118 |         status: 500,
  119 |         contentType: 'application/json',
  120 |         body: JSON.stringify({ message: 'Internal Server Error' })
  121 |       });
  122 |     });
  123 | 
  124 |     await page.goto('http://localhost:5176/mi-landing/producto/10/funnel-selector');
  125 |     
  126 |     // Debe mostrar el cartel de error
  127 |     await expect(page.locator('text=Error al cargar la información. Intenta nuevamente.')).toBeVisible();
  128 |   });
  129 | 
  130 |   test('debe manejar error y restaurar botón al fallar la instanciación (caso borde)', async ({ page }) => {
  131 |     await page.route('**/api/landing-templates', route => {
  132 |       route.fulfill({
  133 |         status: 200,
  134 |         contentType: 'application/json',
  135 |         body: JSON.stringify(mockTemplates)
  136 |       });
  137 |     });
  138 | 
  139 |     // Fallar la instanciación
  140 |     await page.route('**/api/productos/10/instanciar-landing', route => {
  141 |       route.fulfill({
  142 |         status: 400,
  143 |         contentType: 'application/json',
  144 |         body: JSON.stringify({ message: 'El producto ya está en uso' })
  145 |       });
  146 |     });
  147 | 
  148 |     await page.goto('http://localhost:5174/mi-landing/producto/10/funnel-selector');
  149 |     await page.waitForSelector('text=Direct Sale Classic');
  150 | 
  151 |     await page.click('button:has-text("Usar este embudo") >> nth=0');
  152 | 
  153 |     // Debe mostrar el mensaje de error de la API
  154 |     await expect(page.locator('text=El producto ya está en uso')).toBeVisible();
  155 |     
  156 |     // El botón debería volver a su estado normal (no decir "Configurando...")
  157 |     const boton = page.locator('button:has-text("Usar este embudo")').first();
  158 |     await expect(boton).not.toBeDisabled();
  159 |   });
  160 | 
  161 | });
  162 | 
```