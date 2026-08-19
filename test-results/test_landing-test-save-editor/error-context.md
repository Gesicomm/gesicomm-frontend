# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_landing.spec.js >> test save editor
- Location: test_landing.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Editar")').first()

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - complementary [ref=f1e4]:
    - generic [ref=f1e12]:
      - heading "GESICOMM." [level=2] [ref=f1e13]
      - text: Panel de Usuario
    - navigation "Navegación de usuario" [ref=f1e14]:
      - generic [ref=f1e15]: APRENDIZAJE
      - list [ref=f1e17]:
        - listitem [ref=f1e18]:
          - link "Academia & Cursos PRO" [ref=f1e19] [cursor=pointer]:
            - /url: /academia
            - generic [ref=f1e24]: Academia & Cursos
            - generic [ref=f1e25]: PRO
      - generic [ref=f1e26]: GENERAL
      - list [ref=f1e28]:
        - listitem [ref=f1e29]:
          - link "Dashboard" [ref=f1e30] [cursor=pointer]:
            - /url: /mi-dashboard
        - listitem [ref=f1e38]:
          - link "Vitrina B2B" [ref=f1e39] [cursor=pointer]:
            - /url: /mi-catalogo
        - listitem [ref=f1e44]:
          - link "Mis Productos" [ref=f1e45] [cursor=pointer]:
            - /url: /products
        - listitem [ref=f1e52]:
          - link "Config. económica" [ref=f1e53] [cursor=pointer]:
            - /url: /configuracion-economica
        - listitem [ref=f1e59]:
          - link "Mis pedidos & Couriers" [ref=f1e60] [cursor=pointer]:
            - /url: /mis-pedidos
        - listitem [ref=f1e67]:
          - link "Landing" [ref=f1e68] [cursor=pointer]:
            - /url: /landing
        - listitem [ref=f1e74]:
          - link "Mi tienda" [ref=f1e75] [cursor=pointer]:
            - /url: /mi-tienda
      - generic [ref=f1e82]: FINANZAS
      - list [ref=f1e84]:
        - listitem [ref=f1e85]:
          - link "Costos y Gastos" [ref=f1e86] [cursor=pointer]:
            - /url: /finanzas/costos-gastos
      - generic [ref=f1e92]: META
      - list [ref=f1e94]:
        - listitem [ref=f1e95]:
          - link "Ads & Campañas" [ref=f1e96] [cursor=pointer]:
            - /url: /mis-anuncios
    - generic [ref=f1e102]:
      - generic [ref=f1e103]:
        - generic [ref=f1e104]: U
        - generic [ref=f1e105]: usario prueba
      - list [ref=f1e106]:
        - listitem [ref=f1e107]:
          - link "Configuración" [ref=f1e108] [cursor=pointer]:
            - /url: /configuracion
        - listitem [ref=f1e114]:
          - button [ref=f1e115] [cursor=pointer]
  - main [ref=f1e121]:
    - generic [ref=f1e122]:
      - generic [ref=f1e123]:
        - generic [ref=f1e124]:
          - button "Ocultar panel" [ref=f1e125]
          - generic [ref=f1e130]:
            - heading "Básico" [level=1] [ref=f1e131]
            - link "localhost:5173/basico-25eb46" [ref=f1e132] [cursor=pointer]:
              - /url: /basico-25eb46
        - generic [ref=f1e137]:
          - generic [ref=f1e138]:
            - button "Desktop" [ref=f1e139]
            - button "Tablet" [ref=f1e142]
            - button "Mobile" [ref=f1e145]
          - button "Eliminar landing" [ref=f1e148]
          - link "Ver landing pública" [ref=f1e152] [cursor=pointer]:
            - /url: https://sommix.gesicomm.com
          - button "Publicar" [ref=f1e157]
          - button "Guardar" [ref=f1e161]
      - generic [ref=f1e166]:
        - generic [ref=f1e167]:
          - generic [ref=f1e168]:
            - button "Marca" [ref=f1e169]
            - button "Contenido" [ref=f1e170]
            - button "Colores" [ref=f1e171]
            - button "Productos" [ref=f1e172]
            - button "Beneficios" [ref=f1e173]
            - button "Redes sociales" [ref=f1e174]
            - button "Preguntas" [ref=f1e175]
          - generic [ref=f1e177]:
            - generic [ref=f1e178]:
              - generic [ref=f1e179]: Logo
              - button "Cambiar imagen" [ref=f1e187]
            - generic [ref=f1e188]:
              - generic [ref=f1e189]: Nombre del comercio
              - 'textbox "Ej: Fuerza Gym" [ref=f1e190]': Básico
        - generic [ref=f1e194]:
          - generic [ref=f1e195]:
            - generic [ref=f1e196]:
              - link "Básico" [ref=f1e197] [cursor=pointer]:
                - /url: /l/basico-25eb46
              - navigation [ref=f1e204]:
                - link "Catálogo" [ref=f1e205] [cursor=pointer]:
                  - /url: /l/basico-25eb46/catalogo
                - link "Contacto" [ref=f1e206] [cursor=pointer]:
                  - /url: /l/basico-25eb46/contacto
            - generic [ref=f1e207]:
              - button "Ver carrito" [ref=f1e208]
              - link "Ver catálogo" [ref=f1e213] [cursor=pointer]:
                - /url: /l/basico-25eb46/catalogo
          - generic [ref=f1e215]:
            - generic [ref=f1e216]: Bienvenido
            - heading "Todo lo que buscás, en un solo lugar" [level=1] [ref=f1e217]
            - link "Comprar ahora" [ref=f1e218] [cursor=pointer]:
              - /url: "#productos"
          - generic [ref=f1e219]:
            - heading "Productos destacados" [level=2] [ref=f1e220]
            - paragraph [ref=f1e221]: No hay productos para mostrar en esta categoría.
          - generic [ref=f1e222]:
            - generic [ref=f1e223]:
              - heading "Compra segura" [level=3] [ref=f1e227]
              - paragraph [ref=f1e228]: Pagos y datos siempre protegidos.
            - generic [ref=f1e229]:
              - heading "Envío a domicilio" [level=3] [ref=f1e235]
              - paragraph [ref=f1e236]: Recibilo donde estés.
            - generic [ref=f1e237]:
              - heading "Atención personalizada" [level=3] [ref=f1e240]
              - paragraph [ref=f1e241]: Te ayudamos en cada paso.
          - generic [ref=f1e242]: © 2026 Básico
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('test save editor', async ({ page }) => {
  4  |   page.on('response', async response => {
  5  |     if (response.url().includes('/mis-landings-simples/') && response.request().method() === 'PUT') {
  6  |       console.log(`PUT ${response.url()} -> ${response.status()}`);
  7  |       try {
  8  |         console.log(`Response: ${await response.text()}`);
  9  |       } catch(e) {}
  10 |     }
  11 |   });
  12 | 
  13 |   await page.goto('http://localhost:5173/login');
  14 |   await page.fill('input[type="email"]', 'prueba@gmail.com');
  15 |   await page.fill('input[type="password"]', 'Password1!');
  16 |   await page.click('button[type="submit"]');
  17 | 
  18 |   await page.waitForURL('**/mi-catalogo');
  19 |   console.log("Logged in");
  20 |   
  21 |   await page.goto('http://localhost:5173/landing');
  22 |   
  23 |   await page.waitForTimeout(2000);
  24 |   const btnEditar = page.locator('button:has-text("Editar")').first();
> 25 |   await btnEditar.click();
     |                   ^ Error: locator.click: Test timeout of 30000ms exceeded.
  26 | 
  27 |   await page.waitForTimeout(3000);
  28 |   console.log("Editor loaded");
  29 | 
  30 |   const tabProductos = page.locator('button', { hasText: 'Productos' }).first();
  31 |   if (await tabProductos.count() > 0) {
  32 |     await tabProductos.click();
  33 |     console.log("Clicked Productos tab");
  34 |   }
  35 | 
  36 |   await page.waitForTimeout(1000);
  37 | 
  38 |   // Click Save
  39 |   const btnGuardar = page.locator('button:has-text("Guardar")').first();
  40 |   await btnGuardar.click();
  41 |   console.log("Clicked Save");
  42 | 
  43 |   await page.waitForTimeout(2000);
  44 |   console.log("Done");
  45 | });
  46 | 
```