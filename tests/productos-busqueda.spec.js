import { test, expect } from '@playwright/test';

for (const lista of ['productos', 'vitrina']) {
  test(`${lista}: busca sin Enter, vuelve a la primera página y descarta respuestas viejas`, async ({ page }) => {
    const errores = [];
    const pedidos = [];
    const cancelados = [];
    let liberarViejo;
    page.on('pageerror', err => errores.push(err.message));
    page.on('requestfailed', req => cancelados.push(req));
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/auth/me')) return route.fulfill({ json: { id: 42, rol: 'usuario' } });
      if (!url.includes(lista === 'productos' ? '/productos/buscar' : '/vitrina/catalogo-paginado')) return route.fulfill({ json: [] });
      const filtros = route.request().postDataJSON();
      const termino = filtros.texto || filtros.busqueda || '';
      pedidos.push({ termino, pagina: filtros.page });
      if (termino === 'viejo') await new Promise(resolve => { liberarViejo = resolve; });
      const producto = { id: 1, tipo: 'producto', nombre: termino ? `Resultado ${termino}` : 'Producto inicial', sku: 'PR-1', precio_base: 10000, precio_efectivo: 10000, cantidad_disponible: 5, activo: true, creado_por: 42, imagenes: [] };
      await route.fulfill({ json: lista === 'productos'
        ? { productos: [producto], total: 25, total_paginas: 3 }
        : { items: [producto], total: 25, totalPages: 3, categorias: [], proveedores: [] }
      }).catch(() => {});
    });
    await page.goto(`http://localhost:5174/tests/fixtures/productos-busqueda.html?lista=${lista}`);
    await expect(page.getByText('Producto inicial', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: lista === 'productos' ? 'Página siguiente' : 'Siguiente', exact: true }).click();
    await expect.poll(() => pedidos.at(-1).pagina).toBe(2);
    await expect(page.getByText('Producto inicial', { exact: true })).toBeVisible();
    const campo = page.getByRole('textbox', { name: lista === 'productos' ? 'Buscar productos' : 'Buscar productos o combos' });
    const geometria = () => campo.evaluate(el => {
      const rect = el.parentElement.getBoundingClientRect();
      return { x: rect.x, y: rect.y, ancho: rect.width, alto: rect.height, scroll: document.documentElement.scrollWidth };
    });
    const antes = await geometria();
    const cantidad = pedidos.length;
    await campo.fill('adaptador');
    await expect(page.getByText('Resultado adaptador', { exact: true })).toBeVisible();
    expect(pedidos.slice(cantidad)).toEqual([{ termino: 'adaptador', pagina: 1 }]);
    expect(await geometria()).toEqual(antes);

    await campo.fill('viejo');
    await expect.poll(() => pedidos.at(-1).termino).toBe('viejo');
    await campo.fill('nuevo');
    await campo.press('Enter');
    await expect(page.getByText('Resultado nuevo', { exact: true })).toBeVisible();
    expect(cancelados.length).toBeGreaterThan(0);
    liberarViejo();
    await expect(page.getByText('Resultado viejo', { exact: true })).toHaveCount(0);
    expect(pedidos.filter(p => p.termino === 'nuevo')).toHaveLength(1);
    await page.screenshot({ path: `../outputs/buscador-${lista}.png` });
    expect(errores).toEqual([]);
  });
}
