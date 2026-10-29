import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodigosPrueba from './CodigosPrueba';
import API from '../../services/api';
vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn()}}));
beforeEach(()=>vi.resetAllMocks());
it('admin genera el código de una ruta con el acceso que seleccionó',async()=>{
 API.get.mockResolvedValue({data:{planes:[{id:3,nombre:'Una ruta',acceso_rutas:'elegir'}],codigos:[]}});
 API.post.mockImplementation(async(path,data)=>({data:{codigo:'GESI-PRUEBA',...data}}));
 render(<CodigosPrueba/>);
 await screen.findByRole('option',{name:'Una ruta'});
 fireEvent.change(screen.getByLabelText('Plan de la prueba'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Acceso del código'),{target:{value:'personal'}});
 fireEvent.change(screen.getByLabelText('Duración en días'),{target:{value:'14'}});
 fireEvent.click(screen.getByRole('button',{name:'Generar código de prueba'}));
 await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/publico/admin/codigos-prueba',expect.objectContaining({dias:14,plan_id:3,ruta_acceso:'personal'})));
 expect(await screen.findByText('Acceso: Marca personal.')).toBeInTheDocument();
});

it.each([true,false])('informar el envío real del código sin regenerar cuando emailEnviado=%s',async enviado=>{
 API.get.mockResolvedValue({data:{planes:[{id:3,nombre:'Ambas rutas',acceso_rutas:'ambas'}],codigos:[]}});
 API.post.mockImplementation(async(path,data)=>({data:path.endsWith('/enviar-correo') ? {emailEnviado:true} : {id:12,codigo:'GESI-PRUEBA',...data,emailEnviado:enviado}}));
 render(<CodigosPrueba/>);
 await screen.findByRole('option',{name:'Ambas rutas'});
 fireEvent.change(screen.getByLabelText('Plan de la prueba'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Duración en días'),{target:{value:'14'}});
 fireEvent.change(screen.getByLabelText('Correo del destinatario (opcional)'),{target:{value:'ana@example.test'}});
 fireEvent.click(screen.getByRole('button',{name:'Generar y enviar código'}));
 expect(await screen.findByText('GESI-PRUEBA')).toBeInTheDocument();
 if(enviado) expect(screen.getByText(/Correo enviado a ana@example.test con el código/)).toBeInTheDocument();
 else {
   expect(screen.getByText(/El código quedó creado, pero no se confirmó/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Reintentar envío'}));
   expect(await screen.findByText(/Correo enviado a ana@example.test con el código/)).toBeInTheDocument();
   expect(API.post.mock.calls.filter(([path])=>path==='/publico/admin/codigos-prueba')).toHaveLength(1);
   expect(API.post).toHaveBeenLastCalledWith('/publico/admin/codigos-prueba/12/enviar-correo');
 }
});
