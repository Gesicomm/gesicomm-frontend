import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5175';
for (const width of [375, 1280]) {
  test(`Productos: stock según propietario a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.endsWith('/auth/me')) data = { id: 42, nombre: 'QA', rol: 'usuario', tiendaId: 1 };
      else if (path.includes('suscripciones/mi-estado')) data = { tiene_suscripcion_activa: true, suscripcion: { plan: { nombre: 'Pro' } } };
      else if (path.endsWith('/mi-tienda')) data = { id: 1, nombre: 'Tienda QA' };
      else if (path.endsWith('/tiendas/mias')) data = [{ id: 1, nombre: 'Tienda QA' }];
      else if (path.includes('/vitrina/catalogo-paginado')) {
        const base = { tipo: 'producto', precio_base: 50000, precio_efectivo: 70000, categoria: 'Hogar', imagenes: [] };
        data = { items: [
          { ...base, id: 1, nombre: 'Producto propio disponible', creado_por: 42, stock: 8 },
          { ...base, id: 2, nombre: 'Producto propio agotado', creado_por: 42, stock: 0 },
          { ...base, id: 3, nombre: 'Producto de proveedor', creado_por: 7, stock: 0 },
        ], categorias: ['Hogar'], proveedores: [], total: 3, totalPages: 1 };
      }
      return route.fulfill({ json: data });
    });
    await page.goto(`${baseURL}/mi-catalogo`);
    await expect(page.getByText('Stock: 8', { exact: true })).toBeVisible();
    await expect(page.getByText('Stock: 0', { exact: true })).toBeVisible();
    const proveedor = page.locator('.vit-card').filter({ has: page.getByRole('heading', { name: 'Producto de proveedor', exact: true }) });
    await expect(proveedor.getByText('Sin stock', { exact: true })).toHaveCount(0);
    await expect(proveedor.getByText(/Stock:/)).toHaveCount(0);
    await expect(proveedor.locator('.vit-card-meta-sep')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('productos.png'), fullPage: true });
    expect(errores).toEqual([]);
  });
}
