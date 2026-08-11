# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test-dnd.spec.js >> Landing Editor - Drag and Drop >> debe permitir agregar una sección y reordenarla sin trabar el cursor
- Location: tests\test-dnd.spec.js:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Página principal') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Volver" [ref=e4] [cursor=pointer]:
    - /url: /
  - generic [ref=e7]:
    - link "GESICOMM." [ref=e8] [cursor=pointer]:
      - /url: /
    - generic [ref=e9]:
      - heading "Iniciar sesión" [level=2] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]: Correo electrónico
        - textbox "Correo electrónico" [ref=e13]:
          - /placeholder: correo@ejemplo.com
      - generic [ref=e14]:
        - generic [ref=e15]: Contraseña
        - textbox "Contraseña" [ref=e16]:
          - /placeholder: ••••••••
      - button "Ingresar" [ref=e17]
      - generic [ref=e18]:
        - button "¿Olvidaste tu contraseña?" [ref=e19] [cursor=pointer]
        - paragraph [ref=e20]:
          - text: ¿No tenés cuenta?
          - button "Registrate aquí" [ref=e21] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Editor - Drag and Drop', () => {
  4  |   test('debe permitir agregar una secci\u00f3n y reordenarla sin trabar el cursor', async ({ page }) => {
  5  |     // 1. Navegar al editor
  6  |     await page.goto('http://localhost:5174/mi-landing');
  7  |     
  8  |     // 2. Esperar a que cargue el editor
> 9  |     await page.waitForSelector('text=P\u00e1gina principal');
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  10 | 
  11 |     // 3. Agregar una nueva secci\u00f3n
  12 |     const btnAgregar = page.locator('button', { hasText: 'Agregar secci\u00f3n' }).first();
  13 |     await btnAgregar.click();
  14 | 
  15 |     // 4. Hacer clic en una opci\u00f3n del modal (ej. 'Texto Libre' o la primera que aparezca)
  16 |     // El modal de SelectorSecciones debe estar abierto
  17 |     const opcionSeccion = page.locator('button.group.text-left').first();
  18 |     await opcionSeccion.waitFor();
  19 |     await opcionSeccion.click();
  20 | 
  21 |     // 5. Verificar que se agreg\u00f3 a la lista (buscar el icono de arrastre)
  22 |     const dragHandle = page.locator('span:has(svg.lucide-grip-vertical)').last();
  23 |     await dragHandle.waitFor({ state: 'visible' });
  24 | 
  25 |     // 6. Realizar el Drag and Drop
  26 |     // Calculamos las coordenadas del elemento
  27 |     const box = await dragHandle.boundingBox();
  28 |     if (!box) throw new Error('No se encontr\u00f3 el bounding box del elemento arrastrable');
  29 | 
  30 |     const startX = box.x + box.width / 2;
  31 |     const startY = box.y + box.height / 2;
  32 | 
  33 |     await page.mouse.move(startX, startY);
  34 |     await page.mouse.down();
  35 |     
  36 |     // Movemos el mouse hacia abajo 150 pixeles en 10 pasos para simular arrastre humano
  37 |     await page.mouse.move(startX, startY + 150, { steps: 10 });
  38 |     
  39 |     // Soltamos
  40 |     await page.mouse.up();
  41 | 
  42 |     // 7. Verificar que el cursor no qued\u00f3 trabado
  43 |     // Como implementamos dnd-kit, el body deber\u00eda haber limpiado sus estilos de drag
  44 |     const hasDraggingClass = await page.evaluate(() => {
  45 |       // Dnd-kit inyecta estilos globales durante el arrastre, verificamos que ya no est\u00e9n bloqueando
  46 |       return document.body.style.pointerEvents === 'none';
  47 |     });
  48 | 
  49 |     expect(hasDraggingClass).toBeFalsy();
  50 |     console.log('Prueba de Drag and Drop completada exitosamente sin trabas.');
  51 |   });
  52 | });
  53 | 
```