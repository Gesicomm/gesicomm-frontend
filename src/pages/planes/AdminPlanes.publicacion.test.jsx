import {beforeEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {Link,MemoryRouter,Route,Routes} from 'react-router-dom';
import AdminPlanes from './AdminPlanes';
import PublicPlans from '../public/PublicPlans';
import {PLANES_DEFAULT,cargarPlanes} from '../../lib/planesCatalogo';
import {planesService} from '../../services/planesService';
vi.mock('../../services/planesService',()=>({planesService:{
  planesAdmin:vi.fn(),guardarPlanesAdmin:vi.fn(),listar:vi.fn(),afiliadosConfig:vi.fn(async()=>({})),
}}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();});
it('muestra cuatro tarjetas claras y publica precio y visibilidad sin cambiar su identidad',async()=>{
 let catalogo=PLANES_DEFAULT.map(plan=>({...plan,features:[...plan.features]}));
 planesService.planesAdmin.mockImplementation(async()=>catalogo);
 planesService.guardarPlanesAdmin.mockImplementation(async data=>{catalogo=data;return data;});
 planesService.listar.mockImplementation(async()=>catalogo.filter(p=>p.activo!==false));
 render(<MemoryRouter><Link to="/landing">Ver landing</Link><Link to="/">Editar planes</Link><Routes><Route path="/" element={<AdminPlanes/>}/><Route path="/landing" element={<PublicPlans/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar planes'})).toBeEnabled());
 expect(screen.getAllByRole('region')).toHaveLength(4);
 const card=within(screen.getByRole('region',{name:'Una ruta mensual'}));
 fireEvent.change(card.getByLabelText('Precio del plan'),{target:{value:'777000'}});
 fireEvent.click(screen.getByRole('button',{name:'Guardar planes'}));
 await screen.findByText('Guardado');
 expect(planesService.guardarPlanesAdmin).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({codigo:'una-ruta-mensual',nombre:'Una ruta mensual',precio:777000,periodicidad:'mensual',acceso_rutas:'elegir'})]));
 expect(planesService.guardarPlanesAdmin.mock.calls[0][0]).toHaveLength(4);
 fireEvent.click(screen.getByRole('link',{name:'Ver landing'}));
 await screen.findByRole('heading',{name:'Una ruta mensual'});
 expect(screen.getByText(/777.000/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('link',{name:'Editar planes'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar planes'})).toBeEnabled());
 fireEvent.click(within(screen.getByRole('region',{name:'Una ruta mensual'})).getByLabelText('Visible en landing y /planes'));
 fireEvent.click(screen.getByRole('button',{name:'Guardar planes'}));
 await screen.findByText('Guardado');
 fireEvent.click(screen.getByRole('link',{name:'Ver landing'}));
 await screen.findByRole('heading',{name:'Ambas rutas mensual'});
 expect(screen.queryByRole('heading',{name:'Una ruta mensual'})).not.toBeInTheDocument();
});
it('una copia local de Fundadores no vuelve a introducir planes retirados',()=>{
 localStorage.setItem('gesicomm.planes.catalogo.v1',JSON.stringify([{id:'founders',codigo:'founders',nombre:'Miembros Fundadores',features:[]}]));
 expect(cargarPlanes().map(p=>p.codigo)).toEqual(PLANES_DEFAULT.map(p=>p.codigo));
});
it('un error de carga no permite publicar precios de respaldo como si fueran los del servidor',async()=>{
 planesService.planesAdmin.mockRejectedValue(new Error('offline'));
 render(<MemoryRouter><AdminPlanes/></MemoryRouter>);
 await screen.findByRole('alert');
 expect(screen.getByRole('button',{name:'Guardar planes'})).toBeDisabled();
 expect(screen.queryByRole('button',{name:'Borrar plan'})).not.toBeInTheDocument();
});
