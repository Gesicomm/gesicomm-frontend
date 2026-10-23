import {test,expect} from '@playwright/test';import {prepararUsuario} from './fixtures/user-theme-session.js';
const base=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5176';
for(const [width,theme] of [[1366,'light'],[375,'dark']])test(`Contador en seis productos ${width} ${theme}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));await prepararUsuario(page,theme);
 const productos=Array.from({length:7},(_,i)=>({id:101+i,tipo:'producto',nombre:`Producto ${i+1}`,slug:`producto-${i+1}`,categoria:'Hogar',precio_base:100000,precio_efectivo:100000,imagenes:[]}));
 await page.route('**/api/vitrina/catalogo-paginado',route=>route.fulfill({json:{items:productos,total:7,totalPages:1,categorias:['Hogar']}}));
 let saved;let landing={id:240,activo:true,template:{kind:'codigo'},items:productos.map(p=>({tipo:'producto',referencia_id:p.id})),content:{venta:{configurado:true,tipo:'catalogo',seleccion:'manual'},codigo:{html:'',css:'',js:''}}};
 await page.route('**/api/mis-landings-simples/240',async route=>{if(route.request().method()!=='GET'){saved=route.request().postDataJSON();landing={...landing,content:{...landing.content,venta:saved.venta,codigo:saved.codigo||landing.content.codigo,vistas:saved.vistas}};}await route.fulfill({json:landing});});
 await page.goto(`${base}/landing/240`);await page.getByLabel('Página de la tienda').selectOption('producto');await page.getByRole('button',{name:'Editar varios o todos',exact:true}).click();
 for(let id=1;id<=6;id++){const button=page.getByRole('button',{name:new RegExp(`^Producto ${id}`)});if(await button.getAttribute('aria-pressed')!=='true')await button.click();}
 const panel=page.getByRole('region',{name:'Edición de varios productos'});await panel.getByLabel('Horas',{exact:true}).fill('2');await panel.getByLabel('Minutos',{exact:true}).fill('30');await panel.getByLabel('Segundos',{exact:true}).fill('50');await panel.getByRole('button',{name:'Aplicar contador a 6 productos',exact:true}).click();await expect(panel.getByRole('status')).toContainText('2 h 30 min 50 s');
 await panel.locator('.bulk-countdown').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contador.png')});
 await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect.poll(()=>saved?.venta?.presentacion_productos?.['producto:106']?.urgencia_segundos).toBe(50);
 for(let id=101;id<=106;id++)expect(saved.venta.presentacion_productos[`producto:${id}`]).toMatchObject({urgencia_horas:2,urgencia_minutos:30,urgencia_segundos:50});
 expect(saved.venta.presentacion_productos['producto:107']).toBeUndefined();expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
