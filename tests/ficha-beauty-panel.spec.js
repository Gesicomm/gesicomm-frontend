import { test, expect } from '@playwright/test';

/**
 * Panel de la ficha Beauty: que se pueda prender/apagar una sección y
 * cargar contenido.
 *
 * Motivo: el panel leía `ficha[key]` antes de comprobar que `ficha` no fuera
 * null — y null es el estado inicial, mientras el producto no pisó ninguna
 * sección. Cada click lanzaba un TypeError y ni el interruptor ni los
 * botones de agregar respondían.
 *
 * Corre contra /dev/ficha-beauty, que monta el panel REAL contra el
 * renderer REAL: no hay API mockeada, así que lo que pasa acá es lo que
 * pasa en el armador.
 */

// Sin baseURL en la config del proyecto: se usa la URL completa del dev
// server, igual que el resto de los tests.
const RUTA = 'http://localhost:5173/dev/ficha-beauty';

async function abrirPanel(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.goto(RUTA);
  await expect(page.locator('.bpp-root')).toBeVisible();
  await page.locator('[data-test="abrir-panel"]').click();
  await expect(page.locator('[data-test="panel-ficha"]')).toBeVisible();
  return errores;
}

test('el interruptor de una sección la prende y la apaga', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  // "Ingredientes premium" viene activa y con datos del producto.
  await expect(page.locator('.bpp-ingredientes')).toBeVisible();

  const interruptor = panel.getByRole('checkbox').nth(5); // sección 6
  await expect(interruptor).toBeChecked();

  await interruptor.uncheck();
  await expect(page.locator('.bpp-ingredientes')).toHaveCount(0);

  await interruptor.check();
  await expect(page.locator('.bpp-ingredientes')).toBeVisible();

  expect(errores, 'el panel no debe lanzar errores').toEqual([]);
});

test('se puede agregar contenido y aparece en la ficha', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  const ingredientesAntes = await page.locator('.bpp-ingrediente').count();

  // Abrir la sección 6 y agregar un ingrediente.
  await panel.getByText('Ingredientes premium', { exact: false }).first().click();
  await panel.getByRole('button', { name: /Agregar ingrediente/i }).click();

  await panel.getByPlaceholder('Ácido hialurónico').last().fill('Retinol encapsulado');
  await panel.getByPlaceholder('Hidratación profunda y rellena arrugas').last()
    .fill('Renueva la piel durante la noche');

  // La ficha lo muestra sin recargar.
  await expect(page.locator('.bpp-ingrediente')).toHaveCount(ingredientesAntes + 1);
  await expect(page.locator('.bpp-ingredientes')).toContainText('Retinol encapsulado');
  await expect(page.locator('.bpp-ingredientes')).toContainText('Renueva la piel durante la noche');

  expect(errores, 'agregar no debe lanzar errores').toEqual([]);
});

test('editar un título de sección se refleja en la ficha', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  await panel.getByText('Beneficios clave', { exact: false }).first().click();
  const campo = panel.getByLabel(/Título de la sección/i).first();
  await campo.fill('Lo que vas a notar');

  // `.bpp-seccion-titulo` matchea los 12 encabezados: hay que apuntar al de
  // la sección que se editó, no a todos.
  await expect(page.locator('.bpp-seccion-titulo', { hasText: 'Lo que vas a notar' })).toBeVisible();

  expect(errores).toEqual([]);
});
