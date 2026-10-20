import { createRequire } from 'node:module';
import { codigoFichaCombo } from './codigoFichaCombo';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extraerBloqueFicha, prepararMoldeCombo, completarMoldeCombo, validarRespuestaBloque, armarPromptBloqueFicha } from './codigoBloquesFicha';
import { PLANTILLA_PRODUCTO } from './plantillasBaseCodigo';
import { construirDocumentoCodigo } from './construirDocumentoCodigo';
const root = '<section data-gesicomm-ficha-bloque="confianza"><h2 class="titulo">Confianza</h2><div class="cmb-trust-grid"><article class="tarjeta"><h3>Envíos</h3><p>Todo Paraguay</p></article></div></section>';
describe('Código por bloque: recorrido de prompt, respuesta, parseo y datos', () => {
 it.each(['unido','separado'])('acepta una respuesta completa %s y no pierde CSS ni JS', formato => {
  const base = { html: extraerBloqueFicha(PLANTILLA_PRODUCTO.html,'descripcion'), css: PLANTILLA_PRODUCTO.css, js: '', motor: PLANTILLA_PRODUCTO.js };
  const prompt = armarPromptBloqueFicha({clave:'descripcion',titulo:'Descripción',tipo:'producto',base,contexto:{nombre:'Cacerola',precio:100}});
  expect(prompt).toContain(base.html); expect(prompt).toContain(base.css); expect(prompt).toContain(base.motor); expect(prompt).toContain('"nombre": "Cacerola"');
  const respuesta = formato === 'unido' ? '<style>.ia { color: red }</style>'+base.html+'<script>bloque.dataset.prueba="lista";</script>' : '```html\n'+base.html+'\n```\n```css\n.ia { color: red }\n```\n```javascript\nbloque.dataset.prueba="lista";\n```';
  expect(validarRespuestaBloque(respuesta,'descripcion',base)).toMatchObject({html:base.html,css:'.ia { color: red }',js:'bloque.dataset.prueba="lista";'});
 });
 it('rechaza raíces incorrectas, pérdida de binds y JavaScript que no parsea',()=>{
  const base={html:extraerBloqueFicha(PLANTILLA_PRODUCTO.html,'descripcion')};
  expect(()=>validarRespuestaBloque('<section data-gesicomm-ficha-bloque="precio"></section>','descripcion',base)).toThrow(/único bloque raíz/);
  expect(()=>validarRespuestaBloque('<section data-gesicomm-ficha-bloque="descripcion"></section>','descripcion',base)).toThrow(/conexión/);
  expect(()=>validarRespuestaBloque(base.html+'<script>const = ;</script>','descripcion',base)).toThrow(/JavaScript/);
 });
 it('el molde del combo mantiene datos y repite nuevas tarjetas sin congelar sus textos',()=>{
  const molde=prepararMoldeCombo(root).replace('class="titulo"','class="titulo ia-titulo"');
  expect(molde).toContain('data-gc-filas');
  validarRespuestaBloque(molde,'confianza',{html:prepararMoldeCombo(root)},true);
  const nueva=root.replace('Confianza</h2>','Título actualizado</h2>').replace('Envíos','Atención').replace('</article>','</article><article class="tarjeta"><h3>Garantía</h3><p>Condiciones reales</p></article>');
  const doc=new DOMParser().parseFromString(completarMoldeCombo(molde,nueva),'text/html');
  expect(doc.querySelector('.ia-titulo').textContent).toBe('Título actualizado');
  expect(doc.querySelectorAll('.tarjeta')).toHaveLength(2);
  expect(doc.querySelectorAll('.tarjeta')[1].textContent).toContain('Garantía');
 });
 it('producto actualiza binds y conserva JS una sola vez, estilo local y restauración del bloque',()=>{
  const base=extraerBloqueFicha(PLANTILLA_PRODUCTO.html,'descripcion');
  const codigo={html:base.replace('class="','class="ia-descripcion '),css:'.ia-descripcion { border: 3px solid red; }',js:'bloque.dataset.montajes=String(Number(bloque.dataset.montajes||0)+1);'};
  const Servicio=createRequire(import.meta.url)('../../../..'+'/gesicomm-backend/src/services/landingCodigo.service.js');
  const guardado=Servicio.limpiarVenta({presentacion_productos:{'producto:1':{v:2,codigo_bloques:{descripcion:codigo}}}}).presentacion_productos['producto:1'].codigo_bloques;
  const datos={vista:'producto',tienda:{nombre:'Prueba'},venta:{},productos:[],producto:{id:'producto-1',nombre:'Cacerola',mensaje_comercial:'Descripción inicial',codigo_bloques:guardado}};
  const dom=new JSDOM(construirDocumentoCodigo(PLANTILLA_PRODUCTO,{datos}),{runScripts:'dangerously',pretendToBeVisual:true});
  try{
   const w=dom.window, doc=w.document;
   const nodo=()=>doc.querySelector('[data-gesicomm-ficha-bloque="descripcion"]');
   expect(nodo()).toHaveTextContent('Descripción inicial'); expect(nodo().dataset.montajes).toBe('1');
   expect(doc.querySelector('[data-gc-estilo-bloque="descripcion"]').textContent).toContain('[data-gesicomm-ficha-bloque="descripcion"]');
   w.dispatchEvent(new w.MessageEvent('message',{data:{tipo:'gesicomm:datos',datos:{...datos,producto:{...datos.producto,mensaje_comercial:'Descripción nueva'}}},source:w.parent}));
   expect(nodo()).toHaveTextContent('Descripción nueva'); expect(nodo().dataset.montajes).toBe('1');
   w.dispatchEvent(new w.MessageEvent('message',{data:{tipo:'gesicomm:datos',datos:{...datos,producto:{...datos.producto,codigo_bloques:{}}}},source:w.parent}));
   expect(nodo().classList.contains('ia-descripcion')).toBe(false);
   expect(doc.querySelector('[data-gc-estilo-bloque="descripcion"]')).toBeNull();
  }finally{dom.window.close();}
 }); it('combo conserva datos dinámicos, tarjetas y JavaScript después del guardado real del backend',()=>{
  const Servicio=createRequire(import.meta.url)('../../../../gesicomm-backend/src/services/landingCodigo.service.js');
  const item={tipo:'combo',id:8,nombre:'Combo',precio:100,ficha_combo:{confianza:{activo:true,titulo:'Confianza',items:[{icono:'truck',titulo:'Envíos',texto:'Condiciones'}]}}};
  const base=codigoFichaCombo({item,content:{},preview:false});
  const html=prepararMoldeCombo(extraerBloqueFicha(base.html,'confianza')).replace('cmb-seccion cmb-wrap','cmb-seccion cmb-wrap ia-combo');
  const codigo=validarRespuestaBloque('<style>.ia-combo{padding:24px}</style>'+html+'<script>bloque.dataset.listo="combo";</script>','confianza',{html:prepararMoldeCombo(extraerBloqueFicha(base.html,'confianza'))},true);
  const guardado=Servicio.limpiarVenta({presentacion_productos:{'combo:8':{v:2,codigo_bloques:{confianza:codigo}}}}).presentacion_productos['combo:8'].codigo_bloques;
  const cambiado={...item,codigo_bloques:guardado,ficha_combo:{confianza:{activo:true,titulo:'Título cambiado',items:[{icono:'💚',titulo:'Tarjeta cambiada',texto:'Texto nuevo'},{titulo:'Otra tarjeta',texto:'Segunda'}]}}};
  const publico=codigoFichaCombo({item:cambiado,content:{},preview:false});
  const datos={vista:'producto',tienda:{nombre:'Prueba'},venta:{},productos:[],producto:{id:'combo-8',tipo:'combo',nombre:'Combo',precio:100,codigo_bloques:guardado}};
  const dom=new JSDOM(construirDocumentoCodigo(publico,{datos}),{runScripts:'dangerously',pretendToBeVisual:true});
  try{
   const root=dom.window.document.querySelector('.ia-combo');
   expect(root.textContent).toContain('Título cambiado'); expect(root.textContent).toContain('Tarjeta cambiada');
   expect(root.textContent).toContain('💚'); expect(root.querySelectorAll('.cmb-trust-item')).toHaveLength(2);
   expect(root.dataset.listo).toBe('combo');
  }finally{dom.window.close();}
 });

});
