import React from 'react';
import {render,screen,waitFor,act,fireEvent} from '@testing-library/react';
import {test,expect,vi,beforeEach} from 'vitest';
import ProductLandingPreview from './ProductLandingPreview';
import {tiendaService} from '../../services/tiendaService';
import {landingSimpleService} from '../../services/landingSimpleService';
const capture=vi.hoisted(()=>({props:null}));
vi.mock('../landing-simple/CodigoPreview',()=>({default:props=>{capture.props=props;return <iframe title="Ficha preparada"/>;}}));
vi.mock('../landing-simple/usePagoparConectado',()=>({usePagoparConectado:()=>false}));
vi.mock('../../services/tiendaService',()=>({tiendaService:{obtener:vi.fn()}}));
vi.mock('../../services/landingSimpleService',()=>({landingSimpleService:{listar:vi.fn(),obtener:vi.fn()}}));
vi.mock('../../services/ofertaService',()=>({ofertaService:{listarPorProducto:vi.fn().mockResolvedValue([])},ofertaAFormaPublica:vi.fn()}));
const mount=()=>render(<ProductLandingPreview producto={{nombre:'Producto'}} imagenes={[]} imagenesNuevas={[]} device="desktop" onDeviceChange={()=>{}}/>);
beforeEach(()=>{vi.clearAllMocks();capture.props=null;landingSimpleService.listar.mockResolvedValue([{id:7}]);landingSimpleService.obtener.mockResolvedValue({content:{},typography:{resolved:{headingFont:'Inter',bodyFont:'Roboto'}}});});
test('espera colores y diseño antes de montar la ficha y transmite la tipografía',async()=>{
 let resolver;tiendaService.obtener.mockReturnValue(new Promise(resolve=>{resolver=resolve;}));mount();
 expect(screen.getByRole('status')).toHaveTextContent('Cargando el diseño');expect(screen.queryByTitle('Ficha preparada')).toBeNull();
 await act(async()=>resolver({nombre:'Tienda',color_primario:'#543210',color_fondo:'#131313'}));
 await waitFor(()=>expect(screen.getByTitle('Ficha preparada')).toBeInTheDocument());
 expect(capture.props.datos.tienda.colores.primario).toBe('#543210');expect(capture.props.typography.bodyFont).toBe('Roboto');
});
test('un error ofrece reintentar y evita mostrar colores predeterminados',async()=>{
 tiendaService.obtener.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({nombre:'Tienda',color_primario:'#123456'});mount();
 await screen.findByRole('alert');expect(screen.queryByTitle('Ficha preparada')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Reintentar vista previa'}));await screen.findByTitle('Ficha preparada');expect(capture.props.datos.tienda.colores.primario).toBe('#123456');
});
