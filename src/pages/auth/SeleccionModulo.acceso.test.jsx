import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import SeleccionModulo from './SeleccionModulo';
import Planes from '../planes/Planes';
import RequireRuta from '../../components/RequireRuta';
import { planesService } from '../../services/planesService';
const user = vi.hoisted(() => ({ id: 700, nombre: 'Prueba', rol: 'usuario' }));
const sesion = vi.hoisted(() => ({estado:'autenticado',reintentar:vi.fn()}));
vi.mock('../../hooks/useSesion', () => ({ default: () => ({ ...sesion, usuario: user }) }));
vi.mock('../../services/planesService', () => ({ planesService: { miEstado: vi.fn(), listar: vi.fn(), checkout: vi.fn(), crearCheckoutIntent: vi.fn() } }));
vi.mock('../../utils/auth', () => ({ verificarSesionDetallada: vi.fn(async () => ({ estado: 'autenticado', usuario: user })) }));
beforeEach(() => { vi.clearAllMocks(); user.rol = 'usuario'; sesion.estado='autenticado'; sessionStorage.removeItem('moduloActivo'); });
function DestinoPlanes() { const location = useLocation(); return <p>Planes para {location.state?.rutaRequerida}</p>; }
afterEach(() => vi.useRealTimers());
it.each([
 [{ fisico:true,personal:false }, 'Gestión de E-commerce', 'Marca Personal'],
 [{ fisico:false,personal:true }, 'Marca Personal', 'Gestión de E-commerce'],
])('el selector habilita solo la ruta contratada (%j)', async (rutas, abierto, cerrado) => {
 planesService.miEstado.mockResolvedValue({ rutas, tiene_suscripcion_activa:true });
 render(<MemoryRouter><Routes><Route path="/" element={<SeleccionModulo />} /><Route path="/planes" element={<DestinoPlanes />} /></Routes></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Entrar a '+abierto})).toBeEnabled();
 const card = screen.getByRole('heading',{name:cerrado}).closest('section');
 expect(card).toHaveTextContent('No incluido en tu plan actual');
 fireEvent.click(screen.getByRole('button',{name:'Ver planes para '+cerrado}));
 expect(await screen.findByText('Planes para '+(cerrado==='Marca Personal'?'personal':'fisico'))).toBeInTheDocument();
 expect(sessionStorage.getItem('moduloActivo')).toBeNull();
 expect(planesService.checkout).not.toHaveBeenCalled();
 expect(planesService.crearCheckoutIntent).not.toHaveBeenCalled();
});
it('ambas rutas habilita los dos espacios', async () => {
 planesService.miEstado.mockResolvedValue({ rutas:{fisico:true,personal:true} });
 render(<MemoryRouter><SeleccionModulo /></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Entrar a Gestión de E-commerce'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'Entrar a Marca Personal'})).toBeEnabled();
});
it('una URL directa a e-commerce no saltea la restricción de marca personal', async () => {
 planesService.miEstado.mockResolvedValue({ rutas:{fisico:false,personal:true} });
 render(<MemoryRouter initialEntries={['/privado']}><Routes><Route path="/privado" element={<RequireRuta ruta="fisico"><p>Datos privados</p></RequireRuta>} /><Route path="/seleccionar-modulo" element={<p>Elegir espacio</p>} /></Routes></MemoryRouter>);
 expect(await screen.findByText('Elegir espacio')).toBeInTheDocument();
 expect(screen.queryByText('Datos privados')).not.toBeInTheDocument();
});
it('al vencer revalida y bloquea una pantalla que permanecía abierta', async () => {
 vi.useFakeTimers();
 vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
 planesService.miEstado.mockResolvedValueOnce({rutas:{fisico:true,personal:false},suscripcion:{periodo_fin:'2026-10-27T12:00:01Z'}})
   .mockResolvedValue({rutas:{fisico:false,personal:false}});
 render(<MemoryRouter initialEntries={['/privado']}><Routes><Route path="/privado" element={<RequireRuta ruta="fisico"><p>Datos privados</p></RequireRuta>} /><Route path="/seleccionar-modulo" element={<p>Elegir espacio</p>} /></Routes></MemoryRouter>);
 await act(async()=>{ await Promise.resolve(); });
 expect(screen.getByText('Datos privados')).toBeInTheDocument();
 await act(async()=>{vi.advanceTimersByTime(1100); await Promise.resolve();});
 expect(screen.getByText('Elegir espacio')).toBeInTheDocument();
 expect(screen.queryByText('Datos privados')).not.toBeInTheDocument();
});
it('admin conserva los dos espacios sin depender de un plan comercial', async () => {
 user.rol='administrador';
 render(<MemoryRouter><SeleccionModulo /></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Entrar a Gestión de E-commerce'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'Entrar a Marca Personal'})).toBeEnabled();
 expect(planesService.miEstado).not.toHaveBeenCalled();
});


it('el acceso bloqueado muestra precios de planes que suman la ruta y conservan la actual', async () => {
 const actual = { rutas:{fisico:true,personal:false},tiene_suscripcion_activa:true,tiene_plan_pago:true,suscripcion:{plan:{codigo:'una-ruta',nombre:'Una ruta',equivale_plan:'pago'}} };
 planesService.miEstado.mockResolvedValue(actual);
 planesService.listar.mockResolvedValue([
   {codigo:'ambas-plan',nombre:'Ambas mensual',acceso_rutas:'ambas',precio:397000,moneda:'PYG',periodicidad:'mensual',activo:true,features:['Dos espacios']},
   {codigo:'personal-plan',nombre:'Solo personal',acceso_rutas:'personal',precio:200000,moneda:'PYG',activo:true,features:[]},
   {codigo:'fisico-plan',nombre:'Solo e-commerce',acceso_rutas:'fisico',precio:100000,activo:true,features:[]},
   {codigo:'oculto',nombre:'Plan oculto',acceso_rutas:'ambas',precio:1,activo:false,features:[]},
 ]);
 render(<MemoryRouter><Routes><Route path="/" element={<SeleccionModulo />} /><Route path="/planes" element={<Planes />} /></Routes></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Ver planes para Marca Personal'}));
 expect(await screen.findByRole('heading',{name:'Obtener Marca personal'})).toBeInTheDocument();
 expect(await screen.findByRole('heading',{name:'Ambas mensual'})).toBeInTheDocument();
 expect(screen.getByText(/397.000/)).toBeInTheDocument();
 expect(screen.getByText('por mes')).toBeInTheDocument();
 expect(screen.getByText(/conservan tu acceso a Gestión de E-commerce/)).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Solo personal'})).not.toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Solo e-commerce'})).not.toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Plan oculto'})).not.toBeInTheDocument();
 expect(planesService.checkout).not.toHaveBeenCalled();
 expect(planesService.crearCheckoutIntent).not.toHaveBeenCalled();
});

it('una cuenta sin plan conserva la ruta deseada al continuar al checkout', async () => {
 planesService.miEstado.mockResolvedValue({rutas:{fisico:false,personal:false},tiene_suscripcion_activa:false});
 planesService.listar.mockResolvedValue([{codigo:'una-ruta',nombre:'Una ruta',acceso_rutas:'elegir',precio:150000,moneda:'PYG',activo:true,features:[]}]);
 function Checkout() { const location=useLocation(); return <p>Checkout para {location.state?.ruta}</p>; }
 render(<MemoryRouter initialEntries={[{pathname:'/planes',state:{rutaRequerida:'personal'}}]}><Routes><Route path="/planes" element={<Planes />} /><Route path="/checkout/plan/:codigo" element={<Checkout />} /></Routes></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Continuar con Una ruta'}));
 expect(await screen.findByText('Checkout para personal')).toBeInTheDocument();
 expect(planesService.checkout).not.toHaveBeenCalled();
});


it('si no se puede verificar el plan actual no ofrece un cambio que pierda accesos', async () => {
 planesService.miEstado.mockRejectedValue(new Error('sin conexión'));
 planesService.listar.mockResolvedValue([{codigo:'solo-personal',nombre:'Solo personal',acceso_rutas:'personal',precio:200000,moneda:'PYG',activo:true,features:[]}]);
 render(<MemoryRouter initialEntries={[{pathname:'/planes',state:{rutaRequerida:'personal'}}]}><Routes><Route path="/planes" element={<Planes />} /></Routes></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu plan actual');
 expect(screen.queryByRole('button',{name:'Continuar con Solo personal'})).not.toBeInTheDocument();
});


it('conserva formularios sin guardar durante la revalidación al volver a la pestaña', async () => {
 const cuenta = {rutas:{fisico:true,personal:false},suscripcion:{periodo_fin:null}};
 let responder;
 planesService.miEstado.mockResolvedValueOnce(cuenta).mockImplementationOnce(()=>new Promise(resolve=>{responder=resolve;}));
 render(<MemoryRouter><RequireRuta ruta="fisico"><input aria-label="Cambio sin guardar" defaultValue="Original" /></RequireRuta></MemoryRouter>);
 const campo = await screen.findByLabelText('Cambio sin guardar');
 fireEvent.change(campo,{target:{value:'Edición pendiente'}});
 fireEvent(window,new Event('focus'));
 expect(screen.getByLabelText('Cambio sin guardar')).toBe(campo);
 expect(campo).toHaveValue('Edición pendiente');
 await act(async()=>{responder(cuenta);});
 expect(screen.getByLabelText('Cambio sin guardar')).toBe(campo);
 expect(campo).toHaveValue('Edición pendiente');
});

it('reintentar tras un error de sesión vuelve a verificar la identidad', async () => {
 sesion.estado='error';
 planesService.miEstado.mockResolvedValue({rutas:{fisico:true,personal:false}});
 render(<MemoryRouter><RequireRuta ruta="fisico"><p>Privado</p></RequireRuta></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
 expect(sesion.reintentar).toHaveBeenCalledTimes(1);
});
