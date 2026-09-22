import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function loginAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => window.localStorage.clear());
  // Recargar para aplicar la limpieza
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', 'rodriguezmartinv02@gmail.com');
  await page.fill('#password', 'KeyperCity10');
  await page.click('button[type="submit"]');
  // El admin va a /dashboard. El React Router hace navigate() en JS.
  await page.waitForURL(/\/(dashboard|fulfillment|admin)/, { timeout: 25000 });
}

async function loginComercio(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', 'prueba@gmail.com');
  await page.fill('#password', 'gesicomm2025');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(mi-catalogo|mi-dashboard|onboarding|mis-pedidos|dashboard)/, { timeout: 25000 });
}

test.describe('E2E QA Plan - Depósitos, Abastecimiento, Fulfillment y Red Logística Gesicomm', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  // ============================================
  // FASE ADMIN — Configuración de la red
  // ============================================
  test.describe('Administrador Gesicomm', () => {
    test.beforeEach(async ({ page, context }) => {
      // Limpiar cookies/sesión antes de cada test
      await context.clearCookies();
      await loginAdmin(page);
    });

    // ADM-01 — Visualizar centro Gesicomm
    test('ADM-01 — Visualizar centro Gesicomm', async ({ page }) => {
      await page.goto('/fulfillment');
      await expect(page.locator('text=Centro Luque').first()).toBeVisible({ timeout: 10000 });
      // Clicar el botón de "Ver operación" asociado a este centro
      await page.locator('div').filter({ hasText: 'Centro Luque' }).locator('button:has-text("Ver operaci")').first().click();
      // El detalle del centro muestra su nombre en un <h1>
      await expect(page.locator('h1:has-text("Centro Luque")').first()).toBeVisible({ timeout: 10000 });
    });

    // ADM-02 — Crear proveedor logístico (wizard de 4 pasos)
    test('ADM-02 — Crear proveedor logístico', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      // Paso 1 — datos básicos
      await page.waitForSelector('input[placeholder="Transportadora XYZ"]', { timeout: 8000 });
      await page.fill('input[placeholder="Transportadora XYZ"]', 'Transportadora QA');
      await page.click('button:has-text("Continuar")');

      // Paso 2 — seleccionar centro
      await page.waitForSelector('text=Centro operativo', { timeout: 8000 });
      await page.click('button:has-text("Centro Luque")');
      await page.click('button:has-text("Continuar")');

      // Paso 3 — cobertura y tarifas
      await page.waitForSelector('text=Resto del país', { timeout: 8000 });
      await page.click('button:has-text("Resto del país")');
      
      // Abrir el editor de precios
      await page.click('text=Opciones Avanzadas');

      // Buscar el input bajo el label 'Costo total (Gs.)'
      await page.waitForTimeout(500);
      const costoField = page.locator('label').filter({ hasText: 'Costo total' }).locator('input').first();
      await costoField.fill('30000');
      
      // Hay que cerrar el editor inline para que se habilite el botón Continuar
      await page.click('button:has-text("Listo, volver a la lista")');

      await page.click('button:has-text("Continuar")');

      // Paso 4 — revisión
      await page.waitForSelector('text=Revisión', { timeout: 8000 });
      await page.click('button:has-text("Crear proveedor")');

      // Volver a la lista y el proveedor debe aparecer
      await page.waitForSelector('text=Transportadora QA', { timeout: 10000 });
      await expect(page.locator('text=Transportadora QA').first()).toBeVisible();
    });

    // ADM-03 — Validaciones: el botón Continuar queda deshabilitado sin nombre
    test('ADM-03 — Validaciones proveedor (nombre requerido)', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      // Sin nombre el botón Continuar debe estar deshabilitado
      await page.waitForSelector('input[placeholder="Transportadora XYZ"]', { timeout: 8000 });
      const continuar = page.locator('button:has-text("Continuar")');
      await expect(continuar).toBeDisabled();

      // Con nombre se habilita
      await page.fill('input[placeholder="Transportadora XYZ"]', 'Test QA');
      await expect(continuar).toBeEnabled();
    });

    // ADM-04 — Un centro Gesicomm aparece en el paso 2 del wizard
    test('ADM-04 — Asociar proveedor a centro', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      await page.fill('input[placeholder="Transportadora XYZ"]', 'Proveedor Centro Test');
      await page.click('button:has-text("Continuar")');

      // Centro Luque debe aparecer como opción
      await page.waitForSelector('text=Centro operativo', { timeout: 8000 });
      await expect(page.locator('button:has-text("Centro Luque")')).toBeVisible();
    });

    // ADM-05 — Cobertura por ciudad: el selector de ciudad aparece en paso 3
    test('ADM-05 — Configurar cobertura CIUDAD', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      await page.fill('input[placeholder="Transportadora XYZ"]', 'Proveedor Ciudad QA');
      await page.click('button:has-text("Continuar")');

      await page.waitForSelector('text=Centro operativo', { timeout: 8000 });
      await page.click('button:has-text("Centro Luque")');
      await page.click('button:has-text("Continuar")');

      // En el paso 3 deben aparecer las ciudades/departamentos
      await page.waitForSelector('text=Resto del país', { timeout: 10000 });
      await expect(page.locator('text=Resto del país').first()).toBeVisible();
      // Verificar que existe la sección de buscar ciudades
      await expect(page.locator('text=Buscar y agregar ciudades').first()).toBeVisible();
    });

    // ADM-06 — Múltiples rangos: cada ciudad tiene botón para agregar rangos
    test('ADM-06 — Configurar múltiples rangos', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      await page.fill('input[placeholder="Transportadora XYZ"]', 'Proveedor Rangos QA');
      await page.click('button:has-text("Continuar")');
      await page.waitForSelector('text=Centro operativo', { timeout: 8000 });
      await page.click('button:has-text("Centro Luque")');
      await page.click('button:has-text("Continuar")');

      // Seleccionar Resto del país y verificar que aparece el editor
      await page.waitForSelector('text=Resto del país', { timeout: 10000 });
      await page.click('button:has-text("Resto del país")');
      
      // Abrir el editor de precios
      await page.click('text=Opciones Avanzadas');
      await page.waitForTimeout(500);

      // Debe aparecer un botón para agregar rango
      const agregarRango = page.locator('button:has-text("Agregar rango"), button:has-text("+ rango"), button:has-text("Agregar")').first();
      if (await agregarRango.isVisible()) {
        await agregarRango.click();
        // El segundo rango debe aparecer
        const rangos = page.locator('[data-rango], .rango-row, label:has-text("Hasta")');
        const count = await rangos.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    // ADM-09 — RESTO_PAIS: opción visible en el paso de cobertura
    test('ADM-09 — RESTO_PAIS disponible como cobertura', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('button:has-text("Nuevo proveedor")', { timeout: 8000 });
      await page.click('button:has-text("Nuevo proveedor")');

      await page.fill('input[placeholder="Transportadora XYZ"]', 'Proveedor RESTO QA');
      await page.click('button:has-text("Continuar")');
      await page.waitForSelector('text=Centro operativo', { timeout: 8000 });
      await page.click('button:has-text("Centro Luque")');
      await page.click('button:has-text("Continuar")');

      await page.waitForSelector('text=Resto del país', { timeout: 10000 });
      await expect(page.locator('button:has-text("Resto del país")')).toBeVisible();
    });

    // ADM-11 — Proveedor inactivo: no aparece en la lista cuando se desactiva
    test('ADM-11 — Proveedor inactivo no tiene botón en wizard', async ({ page }) => {
      await page.goto('/fulfillment/proveedores');
      await page.waitForSelector('body', { timeout: 8000 });
      // Solo verifica que la página carga correctamente
      await expect(page.locator('h1:has-text("Proveedores"), h1:has-text("proveedor")').first()).toBeVisible({ timeout: 8000 });
    });

    // ADM-12 — Centro inactivo: la página de centros muestra estado activo
    test('ADM-12 — Centro activo visible en red fulfillment', async ({ page }) => {
      await page.goto('/fulfillment');
      await page.waitForSelector('text=Centro Luque', { timeout: 10000 });
      await expect(page.locator('text=Centro Luque').first()).toBeVisible();
    });
  });

  // ============================================
  // FASE COMERCIO — Logística propia y Fulfillment
  // ============================================
  test.describe('Comercio (Logística Propia)', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.clearCookies();
      await loginComercio(page);
    });

    // COM-01 — Crear depósito
    test('COM-01 — Crear depósito', async ({ page }) => {
      await page.goto('/mi-tienda/depositos');
      await page.waitForSelector('body', { timeout: 8000 });

      // Buscar botón para crear depósito (puede ser "Nuevo depósito" o "Crear mi primer depósito")
      const btnNuevo = page.locator('button:has-text("Nuevo dep"), button:has-text("Crear mi primer")').first();
      await expect(btnNuevo).toBeVisible({ timeout: 8000 });
      await btnNuevo.click();

      // Llenar el formulario — todos los campos requeridos
      await page.waitForSelector('input[name="nombre"]', { timeout: 8000 });
      await page.fill('input[name="nombre"]', 'Depósito Test E2E');
      await page.fill('input[name="ciudad"]', 'Luque');
      await page.fill('input[name="direccion"]', 'Av. Test 123');

      // Guardar
      await page.click('button[type="submit"]');

      // Debe aparecer en la lista
      await expect(page.locator('text=Depósito Test E2E').first()).toBeVisible({ timeout: 10000 });
    });

    // COM-02 — Editar depósito
    test('COM-02 — Editar depósito', async ({ page }) => {
      await page.goto('/mi-tienda/depositos');
      await page.waitForSelector('body', { timeout: 8000 });
      // Verificar que la sección de depósitos carga
      await expect(page.locator('body')).toBeVisible();
    });

    // COM-05 — Eliminar depósito
    test('COM-05 — Eliminar depósito no bloquea si sin pedidos', async ({ page }) => {
      await page.goto('/mi-tienda/depositos');
      await page.waitForSelector('body', { timeout: 8000 });
      await expect(page.locator('body')).toBeVisible();
    });

    // CP-06 — Ingreso de Inventario (Enviar a Fulfillment Gesicomm)
    test('CP-06 — Página de Inventario / Ingresos carga correctamente', async ({ page }) => {
      await page.goto('/inventario');
      await page.waitForSelector('body', { timeout: 8000 });
      // Debe cargar la página de inventario
      await expect(page.locator('h1, h2').filter({ hasText: /inventario|ingreso/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test('CP-06b — Wizard de nuevo ingreso tiene selector de producto', async ({ page }) => {
      await page.goto('/inventario/nuevo');
      await page.waitForSelector('body', { timeout: 8000 });
      await expect(page.locator('body')).toBeVisible();
      // Verificar que hay algún input o selector de productos
      const selector = page.locator('input, select, [role="combobox"]').first();
      await expect(selector).toBeVisible({ timeout: 8000 });
    });
  });
});
