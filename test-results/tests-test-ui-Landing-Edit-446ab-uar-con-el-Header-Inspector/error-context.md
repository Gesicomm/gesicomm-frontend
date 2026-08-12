# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test-ui.spec.js >> Landing Editor - Multi-view & UI features >> debe poder interactuar con el Header Inspector
- Location: tests\test-ui.spec.js:63:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Página Principal') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension."
  - generic [ref=e5]: C:/Proyectos/Gesicom/gesicomm-frontend/src/page-builder/blocks/legacyBlocks.js:116:47
  - generic [ref=e6]: "114| return ( 115| <div className=\"lp-footer\" style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.8 }}> 116| <h3>{content.titulo || page.titulo}</h3> | ^ 117| <p>{content.descripcion || page.descripcion}</p> 118| </div>"
  - generic [ref=e7]: at TransformPluginContext._formatError (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41) at TransformPluginContext.error (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16) at TransformPluginContext.transform (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64259:14) at async PluginContainer.transform (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18) at async loadAndTransform (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27) at async viteTransformMiddleware (file:///C:/Proyectos/Gesicom/gesicomm-frontend/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:62106:24
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.js
    - text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Editor - Multi-view & UI features', () => {
  4  | 
  5  |   test.beforeEach(async ({ page }) => {
  6  |     // Mock user auth
  7  |     await page.route('**/api/auth/me', route => {
  8  |       route.fulfill({
  9  |         status: 200,
  10 |         contentType: 'application/json',
  11 |         body: JSON.stringify({
  12 |           usuario: { id: 1, nombre: 'Admin', email: 'admin@test.com', rol: 'administrador' },
  13 |           tienda: { id: 1, nombre: 'Mi Tienda', subdominio: 'mi-tienda' }
  14 |         })
  15 |       });
  16 |     });
  17 | 
  18 |     // Mock landing fetch
  19 |     await page.route('**/api/landing/mi-landing', route => {
  20 |       route.fulfill({
  21 |         status: 200,
  22 |         contentType: 'application/json',
  23 |         body: JSON.stringify({
  24 |           id: 1,
  25 |           nombre: 'Landing Test',
  26 |           secciones: [],
  27 |           secciones_producto: []
  28 |         })
  29 |       });
  30 |     });
  31 | 
  32 |     // Mock landing update (if save happens)
  33 |     await page.route('**/api/landing/*', route => {
  34 |       if (route.request().method() === 'PUT') {
  35 |         route.fulfill({
  36 |           status: 200,
  37 |           contentType: 'application/json',
  38 |           body: JSON.stringify({ id: 1, nombre: 'Landing Test' })
  39 |         });
  40 |       } else {
  41 |         route.fallback();
  42 |       }
  43 |     });
  44 |   });
  45 | 
  46 |   test('debe mantener las secciones independientes al cambiar entre Página Principal y Vista de Producto', async ({ page }) => {
  47 |     await page.goto('http://localhost:5174/mi-landing');
  48 |     await page.waitForSelector('text=Página Principal');
  49 | 
  50 |     // 1. Verificar estado inicial
  51 |     await expect(page.locator('button:has-text("Página Principal")')).toHaveClass(/bg-\[var\(--vit-card-bg\)\]/);
  52 | 
  53 |     // 2. Cambiar a Vista de Producto
  54 |     await page.click('button:has-text("Vista de Producto")');
  55 |     
  56 |     // Verificar que cambie el toggle activo
  57 |     await expect(page.locator('button:has-text("Vista de Producto")')).toHaveClass(/bg-\[var\(--vit-card-bg\)\]/);
  58 |     
  59 |     // Debería estar el bloque ProductDetail (viene por defecto si secciones_producto está vacío)
  60 |     await expect(page.locator('text=Detalle de Producto').first()).toBeVisible();
  61 |   });
  62 | 
  63 |   test('debe poder interactuar con el Header Inspector', async ({ page }) => {
  64 |     await page.goto('http://localhost:5174/mi-landing');
> 65 |     await page.waitForSelector('text=Página Principal');
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  66 | 
  67 |     // Seleccionar Header (el Header está en minúsculas usualmente, o "Cabecera")
  68 |     // Note: Since sections are empty, the editor might show default sections (Header, Hero, etc).
  69 |     // The default name for header is 'header' or 'Cabecera'
  70 |     await page.click('text=Cabecera');
  71 |     
  72 |     // Verificar que el InspectorSeccion abrió
  73 |     await expect(page.locator('text=Configurar Nav Links').first()).toBeVisible();
  74 |   });
  75 | 
  76 | });
  77 | 
```