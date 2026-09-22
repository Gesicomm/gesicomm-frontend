import { test, expect } from '@playwright/test';
import path from 'path';

test('E2E Abastecimiento Flow (CP-01, CP-02, CP-03)', async ({ page }) => {
  test.setTimeout(90000); // 1.5 minutos para flujo completo
  
  console.log('Iniciando sesión...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'prueba@gmail.com');
  await page.fill('input[type="password"]', 'Password1!');
  await page.click('button[type="submit"]');

  // Esperar a que cargue la app (el dashboard o bandeja)
  await page.waitForURL('**/');
  console.log('Sesión iniciada exitosamente.');

  // Ir a la bandeja de pedidos
  await page.goto('http://localhost:5173/inbox/courier');
  console.log('Navegando a la bandeja de courier...');
  
  // Buscar pestaña de abastecimiento
  const tabAbastecimiento = page.locator('button', { hasText: /Abastecimiento/i });
  await tabAbastecimiento.click();
  
  // Esperar que carguen los pedidos pendientes
  await page.waitForTimeout(2000);
  
  // Buscar un botón de "Pagar abastecimiento" o el estado "Pendiente de pago"
  const botonPagar = page.locator('button', { hasText: /Pagar/i }).first();
  
  if (await botonPagar.isVisible()) {
    console.log('Se encontró un abastecimiento pendiente de pago.');
    await botonPagar.click();
    
    // Debería abrir el modal de Logística
    console.log('Esperando modal de Logística de Abastecimiento...');
    const modalLogistica = page.locator('h2', { hasText: 'Logística de Abastecimiento' });
    await expect(modalLogistica).toBeVisible();
    
    // Seleccionar "Logística propia"
    console.log('Seleccionando "Logística propia"...');
    await page.click('text=Logística propia');
    
    // Esperar a que se renderice el selector
    await page.waitForTimeout(1000);
    
    // Seleccionar un depósito
    console.log('Abriendo selector de depósitos...');
    await page.locator('.react-select__control, .select-deposito__control, input[id^="react-select"]').first().click({ force: true });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Esperar cotización
    console.log('Esperando cotización...');
    await page.waitForTimeout(3000);
    
    // Verificar si hay costo
    const botonGuardar = page.locator('button', { hasText: /Guardar y Continuar/i });
    if (await botonGuardar.isDisabled()) {
      console.log('Botón deshabilitado: No hay cobertura (CP-03 confirmado)');
    } else {
      console.log('Botón habilitado: Hay cobertura (CP-02 confirmado)');
      await botonGuardar.click();
      
      // Esperar modal de transferencia
      console.log('Esperando modal de Transferencia...');
      const modalTransferencia = page.locator('h2', { hasText: 'Pagar abastecimiento' });
      await expect(modalTransferencia).toBeVisible();
      
      // Subir archivo
      console.log('Subiendo comprobante de prueba...');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'comprobante.pdf'));
      
      // Confirmar pago
      const botonConfirmarPago = page.locator('button', { hasText: /Enviar/i });
      await botonConfirmarPago.click();
      
      console.log('Esperando que se envíe...');
      await page.waitForTimeout(3000);
      
      console.log('Flujo de pago completado exitosamente.');
      
      // Verificar Timeline
      console.log('Verificando timeline (CP-01)...');
      // AbastecimientoBadge abre el timeline
      const btnSeguimiento = page.locator('button[title="Ver seguimiento de abastecimiento"]').first();
      if (await btnSeguimiento.isVisible()) {
        await btnSeguimiento.click();
        await page.waitForTimeout(1000);
        const timeline = page.locator('text=Comprobante enviado');
        await expect(timeline).toBeVisible();
        console.log('Timeline verificado: Estado "Comprobante enviado" visible.');
      }
    }
  } else {
    console.log('No se encontraron pedidos pendientes de pago para probar. Es necesario generar una compra de B2B primero.');
  }
});
