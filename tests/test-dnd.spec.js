import { test, expect } from '@playwright/test';

test.describe('Landing Editor - Drag and Drop', () => {
  test('debe permitir agregar una secci\u00f3n y reordenarla sin trabar el cursor', async ({ page }) => {
    // 1. Navegar al editor
    await page.goto('http://localhost:5174/mi-landing');
    
    // 2. Esperar a que cargue el editor
    await page.waitForSelector('text=P\u00e1gina principal');

    // 3. Agregar una nueva secci\u00f3n
    const btnAgregar = page.locator('button', { hasText: 'Agregar secci\u00f3n' }).first();
    await btnAgregar.click();

    // 4. Hacer clic en una opci\u00f3n del modal (ej. 'Texto Libre' o la primera que aparezca)
    // El modal de SelectorSecciones debe estar abierto
    const opcionSeccion = page.locator('button.group.text-left').first();
    await opcionSeccion.waitFor();
    await opcionSeccion.click();

    // 5. Verificar que se agreg\u00f3 a la lista (buscar el icono de arrastre)
    const dragHandle = page.locator('span:has(svg.lucide-grip-vertical)').last();
    await dragHandle.waitFor({ state: 'visible' });

    // 6. Realizar el Drag and Drop
    // Calculamos las coordenadas del elemento
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('No se encontr\u00f3 el bounding box del elemento arrastrable');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Movemos el mouse hacia abajo 150 pixeles en 10 pasos para simular arrastre humano
    await page.mouse.move(startX, startY + 150, { steps: 10 });
    
    // Soltamos
    await page.mouse.up();

    // 7. Verificar que el cursor no qued\u00f3 trabado
    // Como implementamos dnd-kit, el body deber\u00eda haber limpiado sus estilos de drag
    const hasDraggingClass = await page.evaluate(() => {
      // Dnd-kit inyecta estilos globales durante el arrastre, verificamos que ya no est\u00e9n bloqueando
      return document.body.style.pointerEvents === 'none';
    });

    expect(hasDraggingClass).toBeFalsy();
    console.log('Prueba de Drag and Drop completada exitosamente sin trabas.');
  });
});
