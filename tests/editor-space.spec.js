import {test, expect} from '@playwright/test';
import {prepararUsuario} from './fixtures/user-theme-session.js';
const base=process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5176';
for(const width of [375,900,1366]) for(const theme of ['light','dark']) {
 test(`Espacio de edición ${width} ${theme}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:width===375?812:768});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const {requests}=await prepararUsuario(page,theme);
  await page.route('**/api/mis-landings-simples/240',route=>route.fulfill({json:{id:240,activo:true,template:{kind:'codigo'},items:[{tipo:'producto',referencia_id:101}],content:{venta:{configurado:true,tipo:'catalogo',seleccion:'manual'},codigo:{html:'',css:'',js:''}}}}));
  await page.goto(`${base}/landing/240`);
  await page.getByLabel('Página de la tienda').selectOption('inicio');
  const config=page.locator('.ecommerce-builder-config');
  const row=page.locator('[data-bloque-inicio="banner"]');
  const title=row.getByRole('button',{name:'Banner principal',exact:true});
  await title.scrollIntoViewIfNeeded();
  const titleBox=await title.boundingBox();const toggleBox=await row.getByText('Mostrar',{exact:true}).boundingBox();
  expect(titleBox.width).toBeGreaterThan(width===375?90:300);
  expect(toggleBox.x).toBeGreaterThanOrEqual(titleBox.x+titleBox.width);
  expect(Math.abs(toggleBox.y+toggleBox.height/2-titleBox.y-titleBox.height/2)).toBeLessThan(2);
  if(width===1366)expect((await config.boundingBox()).width).toBeGreaterThanOrEqual(560);
  await page.screenshot({path:testInfo.outputPath('listado.png')});
  await title.click();
  const settings=page.getByRole('region',{name:'Ajustes de Banner principal',exact:true});
  await expect(settings).toBeVisible();
  const titleField=settings.getByLabel('Título',{exact:true});
  await expect(titleField).toHaveJSProperty('tagName','TEXTAREA');
  await titleField.fill('Una campaña promocional con un título largo que se puede leer completo');
  await settings.getByLabel('Subtítulo',{exact:true}).fill('Un subtítulo extenso que se mantiene visible y permite editar el texto con comodidad.');
  const target=settings.getByLabel('Destino del botón',{exact:true});
  await target.selectOption('#colecciones');
  await expect(settings.getByLabel('Dirección del enlace',{exact:true})).toHaveCount(0);
  await target.selectOption('__categoria__');
  await expect(settings.getByLabel('Categoría de destino',{exact:true})).toHaveValue('Hogar');
  await target.selectOption('__personalizado__');
  await settings.getByLabel('Dirección del enlace',{exact:true}).fill('https://example.test/promocion');
  await settings.getByRole('button',{name:'Minimizar',exact:true}).click();
  await settings.getByRole('button',{name:'Agrandar',exact:true}).click();
  await expect(settings.getByLabel('Dirección del enlace',{exact:true})).toHaveValue('https://example.test/promocion');
  await expect(titleField).toHaveValue('Una campaña promocional con un título largo que se puede leer completo');
  await titleField.scrollIntoViewIfNeeded();
  const font=await titleField.evaluate(el=>getComputedStyle(el).fontSize);expect(parseFloat(font)).toBeGreaterThanOrEqual(16);
  await page.screenshot({path:testInfo.outputPath('banner.png')});
  if(width===1366){
   await page.getByRole('button',{name:'Ampliar edición',exact:true}).click();
   expect((await config.boundingBox()).width).toBe(width);
   await expect(settings.getByLabel('Destino del botón',{exact:true})).toHaveValue('__personalizado__');
   await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Vista previa',exact:true}).click();
   await expect(page.locator('aside[aria-label="Vista previa"]')).toBeVisible();
   await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Editar',exact:true}).click();
   await page.getByRole('button',{name:'Ver edición y lienzo',exact:true}).click();
   expect((await config.boundingBox()).width).toBeLessThan(width);
   await expect(titleField).toHaveValue('Una campaña promocional con un título largo que se puede leer completo');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(errors).toEqual([]);
  expect(requests.filter(r=>r.path==='/mis-landings-simples/240'&&r.method!=='GET')).toEqual([]);
 });
}
