import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {test,expect,vi} from 'vitest';
import ProductContentBlocks,{BLOQUES_CONTENIDO_PRODUCTO} from './ProductContentBlocks';
function Harness(){const [selected,setSelected]=useState(null);return <ProductContentBlocks seleccionado={selected} onSeleccionar={setSelected} bloques={BLOQUES_CONTENIDO_PRODUCTO.map(b=>({id:b.id,contenido:<label>{b.titulo}<input aria-label={`Campo ${b.id}`}/></label>}))}/>;}
test('abre un bloque por vez y conserva el borrador al avanzar, volver y regresar al listado',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:/Presentación/}));const input=screen.getByRole('textbox',{name:'Campo presentacion'});fireEvent.change(input,{target:{value:'Mi presentación'}});
 expect(screen.getAllByRole('region').map(e=>e.getAttribute('aria-label')).filter(name=>name.startsWith('Editar '))).toEqual(['Editar Presentación']);
 fireEvent.click(screen.getByRole('button',{name:'Siguiente bloque'}));expect(screen.getByRole('region',{name:'Editar Precio y botones'})).toBeVisible();expect(input).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Anterior'}));expect(input.value).toBe('Mi presentación');fireEvent.click(screen.getByRole('button',{name:'Bloques del producto'}));expect(screen.getByRole('button',{name:/Preguntas frecuentes/})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:/Presentación/}));expect(screen.getByRole('textbox',{name:'Campo presentacion'}).value).toBe('Mi presentación');
});
test('último bloque vuelve a la lista sin guardar automáticamente',()=>{
 const select=vi.fn();render(<ProductContentBlocks seleccionado="confianza" onSeleccionar={select} bloques={[]}/>);
 expect(screen.getByText('Bloque 9 de 9')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Volver a bloques'}));expect(select).toHaveBeenCalledWith(null);
});
