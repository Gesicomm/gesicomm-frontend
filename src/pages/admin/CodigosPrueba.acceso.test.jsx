import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodigosPrueba from './CodigosPrueba';
import API from '../../services/api';
vi.mock('../../services/api',()=>({default:{get:vi.fn(),post:vi.fn()}}));
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
