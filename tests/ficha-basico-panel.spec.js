import { test, expect } from '@playwright/test';

/**
 * Panel de la ficha del template Básico.
 *
 * Cubre el mismo flujo que rompió en Beauty: con `ficha` en null (el estado
 * inicial, cuando el producto todavía no pisó ninguna sección) el panel
 * leía `ficha[key]` antes de comprobarlo y lanzaba un TypeError, así que ni
 * el interruptor ni los botones de agregar respondían.
 *
 * Corre contra /dev/ficha-basico, que monta el panel REAL contra el
 * renderer REAL: no hay API mockeada, así que lo que pasa acá es lo que
 * pasa en el armador.
 */

const RUTA = 'http://localhost:5173/dev/ficha-basico';

async function abrirPanel(page) {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.goto(RUTA);
  await expect(page.locator('.bsc-root')).toBeVisible();
  await page.locator('[data-test="abrir-panel"]').click();
  await expect(page.locator('[data-test="panel-ficha"]')).toBeVisible();
  return errores;
}

test('la ficha tiene las 13 secciones en orden, más el footer', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  await expect(panel.getByText('Barra superior', { exact: true })).toBeVisible();
  await expect(panel.getByText('Cierre y urgencia', { exact: true })).toBeVisible();

  // Los títulos numerados que dibuja el renderer, en el orden de la guía.
  const titulos = await page.locator('.bsc-seccion-titulo h2').allTextContents();
  expect(titulos).toEqual([
    'Oferta y precio',
    'Opciones de compra',
    'Beneficios clave',
    'Descripción del producto',
    'Usos y aplicaciones',
    '¿Por qué elegir este producto?',
    'Preguntas frecuentes',
    'Productos relacionados',
    'Garantía y devoluciones',
  ]);

  // Las cuatro que no llevan encabezado numerado igual tienen que estar.
  await expect(page.locator('.bsc-barra')).toBeVisible();      // 1
  await expect(page.locator('.bsc-hero')).toBeVisible();       // 2
  await expect(page.locator('.bsc-social')).toBeVisible();     // 8
  await expect(page.locator('.bsc-cierre')).toBeVisible();     // 13
  await expect(page.locator('footer')).toBeVisible();          // 14

  expect(errores).toEqual([]);
});

test('ocultar y volver a mostrar una sección', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  // La fila de "Encabezado" (la 2), no `.first()` a ciegas: la sección 1
  // también está activa y su interruptor se llama igual.
  const fila = panel.locator('div').filter({ hasText: /^2\s*Encabezado/ }).last();
  const interruptor = fila.getByRole('checkbox');

  await expect(interruptor).toBeChecked();
  await expect(page.locator('.bsc-hero')).toBeVisible();

  await interruptor.uncheck();
  await expect(interruptor).not.toBeChecked();
  await expect(fila.locator('.line-through')).toHaveCount(1);

  await interruptor.check();
  await expect(interruptor).toBeChecked();
  await expect(fila.locator('.line-through')).toHaveCount(0);

  expect(errores).toEqual([]);
});

test('agregar contenido en una sección con listas', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  await panel.getByText('Beneficios clave', { exact: false }).first().click();
  const titulo = panel.getByPlaceholder('Calidad superior');
  const antes = await titulo.count();

  await panel.getByRole('button', { name: /Agregar beneficio/i }).click();
  await expect(titulo).toHaveCount(antes + 1);

  await titulo.last().fill('Llega en 48 horas');
  // Lo escrito llega al renderer, no se queda solo en el panel.
  await expect(page.locator('.bsc-beneficio', { hasText: 'Llega en 48 horas' })).toBeVisible();

  // El producto ya aportaba 5 beneficios y el máximo son 6: al llegar al
  // tope el botón de agregar desaparece en vez de dejar crecer la lista.
  await expect(panel.getByRole('button', { name: /Agregar beneficio/i })).toHaveCount(0);

  // Agregar en OTRA sección después confirma que el primer cambio no dejó
  // la ficha en un estado que rompa los siguientes.
  await panel.getByText('Usos y aplicaciones', { exact: false }).first().click();
  const paso = panel.getByPlaceholder('Elegí');
  const pasosAntes = await paso.count();
  await panel.getByRole('button', { name: /Agregar paso/i }).click();
  await expect(paso).toHaveCount(pasosAntes + 1);

  expect(errores).toEqual([]);
});

test('editar un título de sección se refleja en la ficha', async ({ page }) => {
  const errores = await abrirPanel(page);
  const panel = page.locator('[data-test="panel-ficha"]');

  await panel.getByText('Usos y aplicaciones', { exact: false }).first().click();
  await panel.getByLabel(/Título de la sección/i).first().fill('Cómo se usa');

  // `.bsc-seccion-titulo` matchea todos los encabezados: hay que apuntar al
  // de la sección que se editó.
  await expect(page.locator('.bsc-seccion-titulo', { hasText: 'Cómo se usa' })).toBeVisible();

  expect(errores).toEqual([]);
});
