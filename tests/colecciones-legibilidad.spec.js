import {test,expect} from '@playwright/test';
import {prepararUsuario} from './fixtures/user-theme-session.js';
const base=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5176';
for(const width of [375,900,1366])for(const theme of ['light','dark'])test(`Colecciones legibles ${width} ${theme}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===375?812:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await prepararUsuario(page,theme);
 const typography={headingFont:'titulo-qa',bodyFont:'cuerpo-qa',systemFonts:[{id:'titulo-qa',family:'Georgia',cssFamily:'Georgia, serif',source:'system'},{id:'cuerpo-qa',family:'Arial',cssFamily:'Arial, sans-serif',source:'system'}]};
 await page.route('**/api/mi-tienda',route=>route.fulfill({json:{id:7,nombre:'Tienda QA',subdominio:'qa',color_primario:'#155e63',color_secundario:'#d8a862',color_fondo:theme==='dark'?'#101820':'#ffffff',typography}}));
 let landing={id:240,activo:true,template:{kind:'codigo'},items:[{tipo:'producto',referencia_id:101}],content:{venta:{configurado:true,tipo:'catalogo',seleccion:'manual'},codigo:{html:'',css:'',js:''}}};let saved;
 await page.route('**/api/mis-landings-simples/240',async route=>{
  if(route.request().method()!=='GET'){
   saved=route.request().postDataJSON();landing={...landing,items:saved.items,content:{...landing.content,venta:saved.venta,codigo:saved.codigo||landing.content.codigo,vistas:saved.vistas}};
  }await route.fulfill({json:landing});
 });
 await page.goto(`${base}/landing/240`);await page.getByLabel('Página de la tienda').selectOption('inicio');await page.getByRole('button',{name:'Colecciones',exact:true}).click();
 let panel=page.getByRole('region',{name:'Ajustes de Colecciones',exact:true});
 await panel.getByLabel('Título de Colecciones',{exact:true}).fill('Colecciones para tu casa');
 await panel.getByLabel('Subtítulo de Colecciones',{exact:true}).fill('Encontrá productos que hacen más cómodo tu día.');
 await panel.getByLabel('Tamaño del título',{exact:true}).selectOption('40');await panel.getByLabel('Tamaño del subtítulo',{exact:true}).selectOption('22');
 await expect(panel.locator('.colecciones-image-editor')).toHaveCount(1);
 await expect(panel.getByLabel('Mostrar Hogar',{exact:true})).toBeHidden();
 await panel.locator('.colecciones-selection > summary').click();await panel.getByLabel('Buscar categoría o colección',{exact:true}).fill('inexistente');await expect(panel.getByRole('status')).toContainText('No hay coincidencias');
 await panel.getByLabel('Buscar categoría o colección',{exact:true}).fill('');await panel.locator('.colecciones-selection > summary').click();
 await panel.getByLabel('Subtítulo de Colecciones',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('editor.png')});
 await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Vista previa',exact:true}).click();
 if(width===375)await page.getByRole('radio',{name:'Celular',exact:true}).click();
 const frame=page.frameLocator('aside[aria-label="Vista previa"] iframe');
 const title=frame.locator('[data-gesicomm-bloque="colecciones"] h2');const subtitle=frame.locator('[data-gesicomm-bloque="colecciones"] .section-heading p');
 await expect(title).toHaveCSS('font-size','40px');await expect(subtitle).toHaveCSS('font-size','22px');await expect(title).toHaveCSS('font-family','Georgia, serif');await expect(subtitle).toHaveCSS('font-family','Arial, sans-serif');
 await subtitle.scrollIntoViewIfNeeded();const doc=await page.locator('aside[aria-label="Vista previa"] iframe').elementHandle().then(e=>e.contentFrame());await doc.evaluate(()=>window.scrollBy(0,-130));await page.screenshot({path:info.outputPath('preview.png')});
 await page.getByRole('group',{name:'Modo del editor'}).getByRole('button',{name:'Editar',exact:true}).click();
 await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect.poll(()=>saved?.venta?.inicio?.colecciones?.tipografia).toEqual({titulo:40,subtitulo:22});
 await page.reload();await page.getByLabel('Página de la tienda').selectOption('inicio');await page.getByRole('button',{name:'Colecciones',exact:true}).click();panel=page.getByRole('region',{name:'Ajustes de Colecciones',exact:true});await expect(panel.getByLabel('Tamaño del subtítulo',{exact:true})).toHaveValue('22');await expect(panel.getByLabel('Subtítulo de Colecciones',{exact:true})).toHaveValue('Encontrá productos que hacen más cómodo tu día.');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
