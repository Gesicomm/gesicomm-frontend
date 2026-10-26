import { describe,it,expect } from 'vitest';
import { destinoColaborador,rutaPermitida, MODULOS_ACCESO } from './accesos';
describe('navegación por permisos',()=>{
 it.each(MODULOS_ACCESO)('$nombre se habilita independientemente',m=>{
  const u={rol:'colaborador',tiendaId:7,accesos:{[m.clave]:'ver'}};
  expect(rutaPermitida(u,m.ruta)).toBe(true);
  expect(destinoColaborador(u)).toBe(m.ruta);
  expect(rutaPermitida({...u,accesos:{}},m.ruta)).toBe(false);
 });
 it('las subrutas no confunden Mi negocio con Depósitos ni consulta con edición',()=>{
  const u={rol:'colaborador',tiendaId:7,accesos:{negocio:'gestionar',productos:'ver'}};
  expect(rutaPermitida(u,'/mi-tienda/depositos')).toBe(false);
  expect(rutaPermitida(u,'/products/7/editar')).toBe(false);
  expect(rutaPermitida({...u,accesos:{productos:'gestionar'}},'/products/7/editar')).toBe(true);
  expect(rutaPermitida({...u,accesos:{depositos:'ver'}},'/inventario/7')).toBe(true);
  expect(rutaPermitida({...u,accesos:{depositos:'ver'}},'/inventario/nuevo')).toBe(false);
 });
 it('solo comercial no abre otras rutas mediante URL',()=>{
  const u={rol:'colaborador',tiendaId:7,accesos:{comercial:'ver'}};
  expect(destinoColaborador(u)).toBe('/mis-pedidos');
  expect(rutaPermitida(u,'/mis-pedidos')).toBe(true);
  for(const ruta of ['/mi-catalogo','/gestion-logistica','/configuracion','/pedidos/configuracion','/onboarding']) expect(rutaPermitida(u,ruta)).toBe(false);
 });
 it('sin tienda pide selección y sin permisos muestra estado explícito',()=>{
  expect(destinoColaborador({})).toBe('/acceso-tiendas');
  expect(destinoColaborador({tiendaId:7,accesos:{}})).toBe('/sin-acceso');
 });
});
