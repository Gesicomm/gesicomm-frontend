import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Sidebar from './Sidebar';
vi.mock('../utils/auth',()=>({verificarSesion:vi.fn(async()=>({id:1,nombre:'Admin',rol:'administrador'})),cerrarSesion:vi.fn()}));
vi.mock('../services/authTrackingService',()=>({authTrackingService:{notificaciones:vi.fn(async()=>({paginacion:{total:0}}))}}));
vi.mock('./PerfilModal',()=>({default:()=>null}));
it('admin conserva General y Productos, sin secciones operativas, comercio, finanzas ni Meta',async()=>{
 render(<MemoryRouter><Sidebar mobileOpen/></MemoryRouter>);
 expect(await screen.findByTitle('Editar perfil y contraseña')).toBeInTheDocument();
 for(const label of ['Dashboard','Clientes','Planes','Códigos de acceso','Tutoriales','Solicitudes de proveedores']) expect(screen.getByRole('link',{name:label})).toBeInTheDocument();
 for(const label of ['Operación','Mi comercio','Finanzas','Meta','Abastecimiento','Fulfillment','Depósitos','Inventario y envíos']) expect(screen.queryByText(label)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Productos'}));
 expect(screen.getByRole('link',{name:'Listado'})).toHaveAttribute('href','/products');
});
