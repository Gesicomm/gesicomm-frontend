import { test, expect } from '@playwright/test';

/**
 * Flujo completo del panel de Ficha (Beauty) dentro del ProductoPanel REAL
 * — no solo FichaBeautyPanel aislado, sino el mismo árbol que monta
 * LandingSimpleEditor en producción: agregar información, ocultar,
 * volver a mostrar.
 *
 * Corre contra /dev/producto-panel. Esa ruta también monta las pestañas
 * "Ofertas" y "Relacionados" con los componentes reales
 * (ProductCheckoutOfertas / ProductPicker), que SÍ pegan a la API real y
 * sin sesión responden 401 — el interceptor global de axios hace
 * `window.location.href = '/login'` ante eso y tira abajo la página. Por
 * eso este test nunca toca esas dos pestañas, y usa selectores EXACTOS
 * (nunca coordenadas ni texto ambiguo) para no caer ahí por accidente.
 */

const RUTA = 'http://localhost:5173/dev/producto-panel';

test('flujo completo: agregar info, ocultar sección, volver a mostrarla', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  // Ninguna pestaña de este test debería llamar a la API real.
  page.on('response', r => {
    if (r.status() === 401) errores.push(`401 inesperado: ${r.url()}`);
  });

  await page.goto(RUTA);
  await expect(page.getByRole('button', { name: 'Ficha', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Ficha', exact: true }).click();

  // Si el tab realmente cambió, el contenido de "Detalles" (el botón
  // "Agregar pregunta" del FAQ) ya no debería estar en pantalla.
  await expect(page.getByRole('button', { name: 'Agregar pregunta' })).toHaveCount(0);
  await expect(page.getByText('Barra superior')).toBeVisible();

  // ── Ocultar una sección ────────────────────────────────────────────
  // La fila de "Encabezado", no `.first()` a ciegas: la primera sección
  // (Barra superior) también está activa y su interruptor también se
  // llama "Ocultar sección" — .first() la agarraba a ELLA, no a
  // Encabezado, y por eso la aserción anterior fallaba.
  const filaEncabezado = page.locator('div').filter({ hasText: /^2\s*Encabezado/ }).last();
  const interruptorEncabezado = filaEncabezado.getByRole('checkbox');

  await expect(interruptorEncabezado).toBeChecked();
  await interruptorEncabezado.uncheck();
  await expect(interruptorEncabezado).not.toBeChecked();
  // El texto de esa fila se tacha cuando la sección está apagada.
  await expect(filaEncabezado.locator('.line-through')).toHaveCount(1);

  // ── Volver a mostrarla ──────────────────────────────────────────────
  await interruptorEncabezado.check();
  await expect(interruptorEncabezado).toBeChecked();
  await expect(filaEncabezado.locator('.line-through')).toHaveCount(0);

  // ── Agregar información en una sección con listas ──────────────────
  await page.getByText('Beneficios clave', { exact: false }).first().click();
  const antesDeAgregar = await page.getByPlaceholder('Piel más joven').count();

  await page.getByRole('button', { name: /Agregar beneficio/i }).click();
  const tituloBeneficio = page.getByPlaceholder('Piel más joven');
  await expect(tituloBeneficio).toHaveCount(antesDeAgregar + 1);

  await tituloBeneficio.last().fill('Ilumina la piel');
  await expect(page.locator('input[value="Ilumina la piel"]')).toHaveCount(1);

  // Agregar una segunda vez confirma que no es casualidad de la primera.
  await page.getByRole('button', { name: /Agregar beneficio/i }).click();
  await expect(tituloBeneficio).toHaveCount(antesDeAgregar + 2);

  expect(errores, 'no debe haber errores de runtime ni 401 en este flujo').toEqual([]);
});
