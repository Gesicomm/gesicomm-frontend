import React, { useState } from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import EditorCodigoBloqueFicha from './EditorCodigoBloqueFicha';
afterEach(cleanup);
it('copia todas las instrucciones, aplica la respuesta y restaura solo este bloque', async()=>{
 const clipboard={writeText:vi.fn().mockResolvedValue()}; Object.defineProperty(navigator,'clipboard',{configurable:true,value:clipboard});
 const html='<section data-gesicomm-ficha-bloque="confianza"><h2>Confianza</h2></section>';
 function Demo(){const [codigo,setCodigo]=useState(null); return <EditorCodigoBloqueFicha clave="confianza" titulo="Zona de confianza" tipo="producto" base={{html,css:'.base{color:red}',js:'',motor:'// motor completo'}} propio={codigo} contexto={{nombre:'Producto real'}} onGuardar={setCodigo}/>;}
 render(<Demo/>);
 fireEvent.click(screen.getByRole('button',{name:'Diseño (código) de este bloque'}));
 fireEvent.click(screen.getByRole('button',{name:'Copiar prompt para IA'}));
 expect(await screen.findByText('Prompt copiado')).toBeInTheDocument();
 const prompt=clipboard.writeText.mock.calls[0][0]; expect(prompt).toContain(html);expect(prompt).toContain('.base{color:red}');expect(prompt).toContain('// motor completo');expect(prompt).toContain('Producto real');
 fireEvent.change(screen.getByLabelText('Respuesta de IA para Zona de confianza'),{target:{value:'```html\n'+html+'\n```\n```css\n.nuevo { padding: 24px }\n```\n```js\nbloque.dataset.listo="si";\n```'}});
 fireEvent.click(screen.getByRole('button',{name:'Aplicar a este bloque'}));expect(screen.getByText('Diseño aplicado a este bloque')).toBeInTheDocument();
 expect(screen.getByLabelText('JS actual del bloque')).toHaveValue('bloque.dataset.listo="si";');
 fireEvent.click(screen.getByRole('button',{name:'Restaurar diseño del bloque'}));expect(screen.getByText('Diseño original restaurado')).toBeInTheDocument();
});
