import { test, expect } from '@playwright/test';
import { construirDocumentoCodigo } from '../src/pages/landing-simple/construirDocumentoCodigo.js';
import { PLANTILLA_INICIO, PLANTILLA_CATALOGO } from '../src/pages/landing-simple/plantillasBaseCodigo.js';

const categorias = ['Audio, TV y video', 'Bienestar', 'Diversion', 'Hogar'];
const productos = categorias.map((categoria, indice) => ({
  id: `producto-${indice}`, referencia_id: indice + 1, tipo: 'producto', categoria,
  nombre: `Producto de ${categoria}`, precio: 50000, stock: 5, variantes: [], ofertas: [],
  imagenes_url: [], url: `/producto-${indice}`,
}));

for (const width of [390, 1440]) {
  test(`Colecciones abre solamente productos de la categoría elegida a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/*', route => route.abort());
    for (const categoria of categorias) {
      const datos = { vista: 'inicio', tienda: { nombre: 'Clickazo QA' }, productos,
        catalogo: { paginado: false }, venta: { inicio: { colecciones: { modo: 'categorias', items: categorias, limite: 4 } } } };
      await page.setContent(construirDocumentoCodigo(PLANTILLA_INICIO, { datos }), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        window.navegacionesColecciones = [];
        window.addEventListener('message', event => {
          if (event.data?.tipo === 'gesicomm:navegar') window.navegacionesColecciones.push(event.data);
        });
      });
      await page.locator('[data-gesicomm-bloque="colecciones"] .collection-card').filter({ hasText: categoria }).getByText('Explorar →').click();
      await expect.poll(() => page.evaluate(() => window.navegacionesColecciones)).toEqual([
        { tipo: 'gesicomm:navegar', destino: 'categoria', categoria },
      ]);
      const destino = await page.evaluate(() => window.navegacionesColecciones[0]);
      await page.setContent(construirDocumentoCodigo(PLANTILLA_CATALOGO, {
        datos: { ...datos, vista: 'categoria', categoria: { nombre: destino.categoria } },
      }), { waitUntil: 'domcontentloaded' });
      const nombres = page.locator('[data-gesicomm-lista="catalogo"] [data-gesicomm-bind="nombre"]');
      await expect(nombres).toHaveText([`Producto de ${categoria}`]);
    }
  });
}
