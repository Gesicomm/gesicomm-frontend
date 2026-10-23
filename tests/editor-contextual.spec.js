import { test, expect } from '@playwright/test';
import { prepararUsuario } from './fixtures/user-theme-session.js';
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5176';
for (const width of [375, 900, 1366]) for (const theme of ['light', 'dark']) {
 test(`Editor contextual ${width} ${theme}: selección, borrador y navegación`, async ({page}, testInfo) => {
  await page.setViewportSize({width,height:width===375?812:768});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const {requests}=await prepararUsuario(page,theme);
  await page.route('**/api/mis-landings-simples/240', route=>route.fulfill({json:{id:240,activo:true,template:{kind:'codigo'},items:[{tipo:'producto',referencia_id:101}],content:{venta:{configurado:true,tipo:'catalogo',seleccion:'manual'},codigo:{html:'',css:'',js:''}}}}));
  await page.goto(`${base}/landing/240`);
  await page.getByLabel('Página de la tienda').selectOption('inicio');
  const scroll=page.locator('.ecommerce-builder-config');
  await page.getByRole('button',{name:'Colecciones',exact:true}).scrollIntoViewIfNeeded();
  const initialScroll=await scroll.evaluate(e=>e.scrollTop);
  await page.getByRole('button',{name:'Colecciones',exact:true}).click();
  const settings=page.getByRole('region',{name:'Ajustes de Colecciones',exact:true});
  await expect(settings).toBeVisible();
  await expect(page.getByRole('button',{name:'Bloques de Inicio',exact:true})).toBeInViewport();
  await settings.getByLabel('Título de Colecciones',{exact:true}).fill('Colecciones editadas QA');
  await page.getByRole('button',{name:'Bloques de Inicio',exact:true}).click();
  await expect.poll(()=>scroll.evaluate(e=>e.scrollTop)).toBe(initialScroll);
  await page.getByRole('button',{name:'Colecciones',exact:true}).click();
  await expect(settings.getByLabel('Título de Colecciones',{exact:true})).toHaveValue('Colecciones editadas QA');
  await page.screenshot({path:testInfo.outputPath('ajustes.png')});
  if(width===1366){
   const iframe=page.locator('aside[aria-label="Vista previa"] iframe');
   const frame=page.frameLocator('aside[aria-label="Vista previa"] iframe');
   const target=frame.locator('[data-gesicomm-bloque="colecciones"]');
   await expect(target).toHaveCSS('outline-width','1px');
   const scrollY=await iframe.evaluate(el=>el.getBoundingClientRect().height);
   expect(scrollY).toBeGreaterThan(500);
   const doc=await iframe.elementHandle().then(el=>el.contentFrame());
   const before=await doc.evaluate(()=>window.scrollY);
   await settings.getByLabel('Título de Colecciones',{exact:true}).fill('Colecciones actualizadas QA');
   await expect(frame.getByText('Colecciones actualizadas QA',{exact:true})).toBeVisible();
   await expect.poll(()=>doc.evaluate(()=>window.scrollY)).toBe(before);
   await page.getByRole('button',{name:'Bloques de Inicio',exact:true}).click();
   await target.locator('a').first().click();
   await expect(settings).toBeVisible();
   await expect(page.getByLabel('Página de la tienda')).toHaveValue('inicio');
  }
  await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Vista previa',exact:true}).click();
  const previewFrame=page.frameLocator('.ecommerce-desktop-preview iframe');
  await previewFrame.locator('[data-gesicomm-bloque="colecciones"] a').first().click();
  await expect(page.getByLabel('Página de la tienda')).toHaveValue('categoria');
  await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Editar',exact:true}).click();
  await expect(page.getByRole('note',{name:'Alcance del guardado'})).toContainText('Guardar actualiza la tienda publicada.');
  expect(requests.filter(r=>r.path==='/mis-landings-simples/240'&&r.method!=='GET')).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
