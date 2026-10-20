import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import PresentacionProducto from '../../src/pages/landing-simple/PresentacionProducto';
import EditorFichaCombo from '../../src/pages/landing-simple/EditorFichaCombo';
import FichaComboLienzo from '../../src/pages/landing-simple/FichaComboLienzo';
import CodigoPreview from '../../src/pages/landing-simple/CodigoPreview';
import { datosRuntimePreview } from '../../src/pages/landing-simple/datosRuntime';
import { PLANTILLA_PRODUCTO, PLANTILLA_INICIO } from '../../src/pages/landing-simple/plantillasBaseCodigo';
const tienda={nombre:'Sommix',colores:{fondo:'#fff',texto:'#152536',primario:'#155e63'}};
const inicial={producto:{tipo:'producto',id:1,nombre:'Cacerola de prueba',precio:150000,precio_efectivo:150000,v:2,mensaje_comercial:'Descripción original',propuesta_valor:'Cociná con comodidad'},combo:{tipo:'combo',id:2,nombre:'Kit de cocina',precio:190000,precio_efectivo:190000,productos_combo:[{id:1,nombre:'Cacerola',precio:150000,cantidad:1},{id:3,nombre:'Utensilios',precio:50000,cantidad:1}],ficha_combo:{confianza:{activo:true,titulo:'Comprá con confianza',eyebrow:'Compra segura',items:[{icono:'🚚',titulo:'Envíos',texto:'Consultá cobertura'}]}}}};
const params=new URLSearchParams(location.search), publico=params.get('vista')==='publicada';
function Demo(){
 const [tipo,setTipo]=useState(params.get('tipo')||'producto');
 const [items,setItems]=useState(()=>JSON.parse(localStorage.getItem('codigo-bloques-ficha-qa')||'null')||inicial);
 const item=items[tipo];
 const venta={presentacion_productos:{[`${tipo}:${item.id}`]:{...item,v:2}}};
 const datos=datosRuntimePreview({tienda,venta,vista:'producto',productoId:`${tipo}-${item.id}`,productos:[item]});
 const cambiar=(clave,valor)=>setItems(prev=>{const siguiente={...prev,[tipo]:{...prev[tipo],[clave]:valor}};localStorage.setItem('codigo-bloques-ficha-qa',JSON.stringify(siguiente));return siguiente;});
 const preview=tipo==='combo'?<FichaComboLienzo item={item} runtime={datos.producto} content={{venta}} tienda={tienda} codigoInicio={PLANTILLA_INICIO} datos={datos} preview={!publico}/>:<CodigoPreview codigo={PLANTILLA_PRODUCTO} datos={datos}/>;
 return <main style={{height:'100vh',display:'grid',gridTemplateColumns:publico?'1fr':'480px minmax(0,1fr)',overflow:'hidden'}}>
 {!publico&&<aside style={{padding:20,overflowY:'auto'}}><nav className="flex gap-3 mb-4"><button onClick={()=>setTipo('producto')}>Vista producto</button><button onClick={()=>setTipo('combo')}>Vista combo</button></nav><a className="text-xs text-primary-text" href={`?vista=publicada&tipo=${tipo}`}>Página pública local</a>
 {tipo==='producto'?<PresentacionProducto item={item} propio={item} efectivo={datos.producto} onCambiar={cambiar}/>:<EditorFichaCombo item={item} content={{venta}} tienda={tienda} codigoInicio={PLANTILLA_INICIO} onCambiar={cambiar}/>}
 </aside>}<div style={{minWidth:0,overflow:'hidden',height:'100%'}}>{preview}</div></main>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter><Demo/></MemoryRouter>);
