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

test('el borrador de nombre y estrellas se refleja aunque la landing tenga otros valores',async()=>{
 tiendaService.obtener.mockResolvedValue({nombre:'Tienda'});
 const landing={content:{venta:{presentacion_productos:{'producto:12':{v:2,titulo_comercial:'Nombre anterior',resenas_calificacion:5}}}}};
 landingSimpleService.obtener.mockResolvedValue(landing);
 const seleccionar=vi.fn();
 const props={productoId:12,producto:{nombre:'Producto',ficha_datos:{presentacion:{titulo_comercial:'Nuevo nombre',resenas_calificacion:'3.5'}}},onSeleccionarBloque:seleccionar};
 const {rerender}=render(<ProductLandingPreview {...props}/>);
 await screen.findByTitle('Ficha preparada');
 expect(capture.props.datos.producto).toMatchObject({titulo_comercial:'Nuevo nombre',resenas_calificacion:3.5});
 expect(capture.props.datos.editor_bloques.resenas_comerciales).toBe('Opiniones y estrellas');
 capture.props.onBloque('resenas_comerciales');expect(seleccionar).toHaveBeenCalledWith('opiniones');
 capture.props.onBloque('nombre_comercial');expect(seleccionar).toHaveBeenCalledWith('presentacion');
 rerender(<ProductLandingPreview {...props} producto={{...props.producto,ficha_datos:{presentacion:{titulo_comercial:'Otro nombre',resenas_calificacion:'2.5'}}}}/>);
 await waitFor(()=>expect(capture.props.datos.producto).toMatchObject({titulo_comercial:'Otro nombre',resenas_calificacion:2.5}));
 expect(landing.content.venta.presentacion_productos['producto:12'].titulo_comercial).toBe('Nombre anterior');
});

test('informa al formulario el texto real resuelto y respeta cuando se borra',async()=>{
 tiendaService.obtener.mockResolvedValue({nombre:'Tienda'});
 const onTextoResenas=vi.fn();
 const producto={nombre:'Producto',ficha_datos:{product_page_opiniones:[{comentario:'Excelente',calificacion:5},{comentario:'Bueno',calificacion:4}]}};
 const {rerender}=render(<ProductLandingPreview producto={producto} onTextoResenas={onTextoResenas}/>);
 await waitFor(()=>expect(onTextoResenas).toHaveBeenLastCalledWith('4,5 de 5 · 2 opiniones'));
 rerender(<ProductLandingPreview producto={{...producto,ficha_datos:{...producto.ficha_datos,presentacion:{resenas_texto:''}}}} onTextoResenas={onTextoResenas}/>);
 await waitFor(()=>expect(onTextoResenas).toHaveBeenLastCalledWith(''));
 expect(capture.props.datos.producto.resenas_texto).toBe('');
});
