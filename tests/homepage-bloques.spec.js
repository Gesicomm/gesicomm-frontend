import { test, expect } from '@playwright/test';
import { construirDocumentoCodigo } from '../src/pages/landing-simple/construirDocumentoCodigo.js';

async function montar(page, width = 1600) {
  await page.setViewportSize({ width, height: 900 });
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/auth/me') ? { id: 1, rol: 'administrador' } : [] }));
  await page.goto('http://localhost:5174/tests/fixtures/homepage-bloques.html');
  if (width < 1280) await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
  await expect(page.frameLocator('iframe:visible').locator('[data-gesicomm-bloque="banner"]')).toBeVisible();
  await page.frameLocator('iframe:visible').locator('body').evaluate(() => document.fonts.ready);
}

async function geometria(page) {
  return page.evaluate(() => ({
    y: scrollY,
    doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    contenedores: [...document.querySelectorAll('[data-testid="contenedor"], main, aside, iframe')].map(el => {
      const r = el.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height, el.scrollTop];
    }),
  }));
}

for (const width of [1600, 1305, 768, 390]) {
  test(`Inicio: identifica y abre bloques sin desplazar contenedores a ${width}px`, async ({ page }) => {
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await montar(page, width);
    const frame = page.frameLocator('iframe:visible');
    for (const [tipo, nombre] of [['anuncios', 'Barra de anuncios'], ['encabezado', 'Encabezado'], ['banner', 'Banner principal'], ['productos_categoria', 'Productos'], ['confianza', 'Zona de confianza'], ['testimonios', 'Testimonios'], ['marca', 'Nuestra marca']]) {
      const bloque = frame.locator(`[data-gesicomm-bloque="${tipo}"]`);
      // Evitar que el auto-scroll de Playwright ponga el punto de clic debajo del header sticky.
      await bloque.evaluate(async el => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: Math.max(0, scrollY + el.getBoundingClientRect().top - 240), behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const antes = await geometria(page);
      const medidas = await bloque.evaluate(el => ({ ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, y: scrollY, rect: el.getBoundingClientRect().toJSON() }));
      await bloque.hover({ position: { x: 5, y: 5 } });
      await expect(frame.locator('[data-gesicomm-rotulo-bloque]')).toContainText(nombre + ' · clic para editar');
      if (width === 1305 && tipo === 'banner') await page.screenshot({ path: '../outputs/homepage-resaltado.png' });
      expect(await geometria(page)).toEqual(antes);
      expect(await bloque.evaluate(el => ({ ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, y: scrollY, rect: el.getBoundingClientRect().toJSON() }))).toEqual(medidas);
      await bloque.click({ position: { x: 5, y: 5 } });
      const fila = page.locator(`[data-bloque-inicio="${tipo === 'encabezado' ? '__menu__' : tipo}"]`);
      await expect(fila.locator(':scope > div').first().locator('button[aria-expanded="true"]')).toBeVisible();
      await expect.poll(() => fila.evaluate(el => {
        let panel = el.parentElement;
        while (panel && getComputedStyle(panel).overflowY !== 'auto') panel = panel.parentElement;
        return panel ? Math.round(el.getBoundingClientRect().top - panel.getBoundingClientRect().top) : -1;
      })).toBeGreaterThanOrEqual(0);
      // El scroll permitido es solo el panel izquierdo. Ningún ancestro oculto se mueve.
      await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).overflowY === 'hidden' && el.scrollTop !== 0).length)).toBe(0);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await expect(page.getByText('Inventario de la landing ·')).toBeVisible();
      if (width >= 1280) {
        expect(await geometria(page)).toEqual(antes);
        expect(await bloque.evaluate(() => scrollY)).toBe(medidas.y);
      } else {
        await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
      }
    }
    expect(errores).toEqual([]);
    await page.screenshot({ path: `../outputs/homepage-bloques-${width}.png` });
  });
}

test('Vista producto conserva el resaltado y la apertura de su bloque', async ({ page }) => {
  await montar(page);
  await page.getByRole('tablist', { name: 'Pantalla', exact: true }).getByRole('tab', { name: 'Vista producto' }).click();
  const nombre = page.frameLocator('iframe:visible').locator('[data-gesicomm-ficha-bloque="nombre_comercial"]');
  await nombre.hover();
  await expect(page.frameLocator('iframe:visible').locator('[data-gesicomm-rotulo-bloque]')).toContainText('Nombre comercial · clic para editar');
  const antes = await geometria(page);
  await nombre.click();
  await expect(page.getByRole('textbox', { name: 'Nombre comercial', exact: true })).toBeVisible();
  await page.screenshot({ path: '../outputs/producto-bloques.png', fullPage: true });
  expect(await geometria(page)).toEqual(antes);
});

test('el runtime conserva los enlaces y solo habilita la edición con el mapa del editor', async ({ page }) => {
  const codigo = { html: '<section data-gesicomm-bloque="banner"><h1>Promoción</h1><a href="#" data-gesicomm-link="catalogo">Ver productos</a></section>' };
  for (const editor of [true, false]) {
    await page.setContent(construirDocumentoCodigo(codigo, { datos: { vista: 'inicio', ...(editor ? { editor_bloques_inicio: { banner: '3 · Banner principal' } } : {}) } }));
    await page.evaluate(() => {
      window.mensajesBloques = [];
      window.addEventListener('message', e => window.mensajesBloques.push(e.data));
    });
    await page.locator('h1').hover();
    if (editor) await expect(page.locator('[data-gesicomm-rotulo-bloque]')).toHaveText('3 · Banner principal · clic para editar');
    else await expect(page.locator('[data-gesicomm-rotulo-bloque]')).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver productos' }).click();
    await expect.poll(() => page.evaluate(() => window.mensajesBloques.some(m => m.tipo === 'gesicomm:navegar'))).toBe(true);
    expect(await page.evaluate(() => window.mensajesBloques.filter(m => m.tipo === 'gesicomm:bloque'))).toEqual([]);
  }
});
