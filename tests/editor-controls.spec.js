import {test,expect} from '@playwright/test';import {prepararUsuario} from './fixtures/user-theme-session.js';
const base=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5176';
for(const width of [375,900,1366])for(const theme of ['light','dark'])test(`Controles del editor ${width} ${theme}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===375?812:900});await prepararUsuario(page,theme);
 await page.route('**/api/mis-landings-simples/240',route=>route.fulfill({json:{id:240,activo:true,template:{kind:'codigo'},items:[{tipo:'producto',referencia_id:101}],content:{venta:{configurado:true,tipo:'catalogo',seleccion:'manual'},codigo:{html:'',css:'',js:''}}}}));
 await page.goto(`${base}/landing/240`);
 const mode=page.getByRole('group',{name:'Modo del editor'});const edit=mode.getByRole('button',{name:'Editar',exact:true});const preview=mode.getByRole('button',{name:'Vista previa',exact:true});
 const summary=page.getByRole('button',{name:'Resumen de productos',exact:true});const tools=page.locator('.ecommerce-editor-tools > summary');
 await expect(edit).toHaveAttribute('aria-pressed','true');await expect(preview).toHaveAttribute('aria-pressed','false');
 for(const control of [preview,summary,tools]){
  await expect(control).toHaveAttribute('title',/.{20,}/);
  await page.mouse.move(0,0);const border=await control.evaluate(e=>getComputedStyle(e).borderColor);await control.hover();
  await expect.poll(()=>control.evaluate(e=>getComputedStyle(e).borderColor)).not.toBe(border);
  await expect(control).toHaveCSS('cursor','pointer');await control.focus();await expect(control).toBeFocused();await expect(control).toHaveCSS('outline-style','solid');
 }
 await summary.click();const region=page.getByRole('region',{name:'Resumen de productos de la landing'});await expect(region).toBeVisible();await expect(summary).toHaveAttribute('aria-expanded','true');await expect(region).toContainText('Productos en esta landing');
 await region.getByRole('button',{name:'Cerrar resumen de productos'}).click();await expect(region).toBeHidden();await expect(summary).toBeFocused();await expect(summary).toHaveAttribute('aria-expanded','false');
 await tools.focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Eliminar página',exact:true})).toBeVisible();
 for(const name of ['Despublicar','Eliminar página']){
  const action=page.getByRole('button',{name,exact:true});await page.mouse.move(0,0);const bg=await action.evaluate(e=>getComputedStyle(e).backgroundColor);await action.hover();
  await expect.poll(()=>action.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(bg);await expect(action).toHaveCSS('cursor','pointer');await action.focus();await expect(action).toHaveCSS('outline-style','solid');
 }
 await page.screenshot({path:info.outputPath('herramientas.png')});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Eliminar página',exact:true})).toBeHidden();await expect(tools).toBeFocused();
 await preview.click();await expect(preview).toHaveAttribute('aria-pressed','true');await expect(edit).toHaveAttribute('aria-pressed','false');await expect(page.locator('.ecommerce-builder-config')).toBeHidden();await edit.click();await expect(page.locator('.ecommerce-builder-config')).toBeVisible();
 await preview.hover();await page.screenshot({path:info.outputPath('controles.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
