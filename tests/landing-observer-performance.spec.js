import { test, expect } from '@playwright/test';
import { construirDocumentoCodigo } from '../src/pages/landing-simple/construirDocumentoCodigo.js';

test('los observadores de descuentos no bloquean la landing y siguen reaccionando a precios reales', async ({ page }) => {
  // Mismo patrón que la landing Sommix: el observer escribe dentro de lo
  // que observa. El corte permite demostrar la regresión sin colgar el test.
  const codigo = {
    html: `<section id="outlet"><article><span id="precio">100</span><b id="badge"></b></article></section><button id="cambiar">Cambiar precio</button>`,
    js: `
      window.actualizaciones = 0;
      var tarjeta = document.querySelector('article');
      function actualizar() {
        document.querySelector('#badge').textContent = '-' + document.querySelector('#precio').textContent + '%';
      }
      var observador = new MutationObserver(function () {
        window.actualizaciones++;
        if (window.actualizaciones >= 50) { observador.disconnect(); return; }
        actualizar();
      });
      observador.observe(tarjeta, { childList: true, subtree: true, characterData: true });
      var outlet = new MutationObserver(function () {
        window.actualizaciones++;
        if (window.actualizaciones >= 50) { outlet.disconnect(); return; }
        actualizar();
      });
      outlet.observe(document.querySelector('#outlet'), { childList: true, subtree: true, characterData: true });
      document.querySelector('#cambiar').onclick = function () { document.querySelector('#precio').textContent = '25'; };
      actualizar();
      setTimeout(function () { window.lista = true; }, 0);
    `,
  };
  await page.setContent(construirDocumentoCodigo(codigo));
  await expect.poll(() => page.evaluate(() => window.lista)).toBe(true);
  expect(await page.evaluate(() => window.actualizaciones)).toBeLessThan(5);
  await page.locator('#cambiar').click();
  await expect(page.locator('#badge')).toHaveText('-25%');
  expect(await page.evaluate(() => window.actualizaciones)).toBeLessThan(10);
});

test('conserva observaciones de atributos, texto y elementos, y la API nativa', async ({ page }) => {
  await page.setContent(construirDocumentoCodigo({ html: '<main id="zona">Inicial</main>' }));
  const resultado = await page.evaluate(async () => {
    const zona = document.querySelector('#zona');
    const tipos = [];
    let contextoCorrecto = false;
    const observer = new MutationObserver(function (records, self) {
      contextoCorrecto = this === observer && self === observer;
      tipos.push(...records.map(r => r.type));
    });
    observer.observe(zona, { attributes: true, childList: true, characterData: true, subtree: true });
    zona.setAttribute('data-precio', '200');
    zona.firstChild.data = 'Actualizado';
    zona.appendChild(document.createElement('b'));
    await new Promise(resolve => setTimeout(resolve, 0));
    zona.setAttribute('data-precio', '300');
    const pendientes = observer.takeRecords().length;
    observer.disconnect();
    zona.setAttribute('data-precio', '400');
    await new Promise(resolve => setTimeout(resolve, 0));
    return { tipos, contextoCorrecto, pendientes, nativo: observer instanceof MutationObserver };
  });
  expect(resultado).toEqual({ tipos: ['attributes', 'characterData', 'childList'], contextoCorrecto: true, pendientes: 1, nativo: true });
});

test('un catálogo de 3401 productos mantiene páginas pequeñas y permite avanzar', async ({ page }) => {
  const productos = Array.from({ length: 3401 }, (_, i) => ({ id: 'p-' + i, tipo: 'producto', nombre: 'Producto ' + i, precio: 10000, categoria: 'Catálogo' }));
  await page.setContent(construirDocumentoCodigo({
    html: `<div data-gesicomm-lista="catalogo"><template><article><span data-gesicomm-bind="nombre"></span></article></template></div><button id="siguiente" data-gesicomm-pagina="siguiente">Siguiente</button>`,
  }, { datos: { vista: 'catalogo', productos, catalogo: { total: 3401, paginado: false } } }));
  await expect(page.locator('article')).toHaveCount(25);
  await page.locator('#siguiente').click();
  await expect(page.locator('article')).toHaveCount(25);
  await expect(page.locator('article').first()).toHaveText('Producto 25');
});
