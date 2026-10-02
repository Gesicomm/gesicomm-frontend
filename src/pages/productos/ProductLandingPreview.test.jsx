import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductLandingPreview from './ProductLandingPreview';
import { resolverFichaModa, fichaModaDesdeProducto } from '../landing-simple/templates/moda/fichaModa';
import { resolverFichaBazar, fichaBazarDesdeProducto } from '../landing-simple/templates/bazar/fichaBazar';
vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarPorProducto: vi.fn().mockResolvedValue([]) }, ofertaAFormaPublica: vi.fn() }));
afterEach(cleanup);
const producto = {
 nombre: 'Prenda QA', ficha_rubro: 'moda', propuesta_valor: 'Promesa propia QA',
 ficha_datos: { cta_principal_texto: 'Comprar mi talle', moda_ficha: {
  materiales: { activo: true, titulo: 'Telas QA', items: [{ nombre: 'Algodón QA', texto: '97% algodón' }] },
  guia_talles: { activo: true, titulo: 'Medidas QA', columnas: ['Talle', 'Busto'], filas: [['M', '90–94']] },
 } },
 confianza: ['Entrega QA', 'Pago QA', 'Cambios QA', 'Atención QA'].map(texto => ({ texto, icono: 'Truck' })),
};
function mount(extra={}) { return render(<MemoryRouter><ProductLandingPreview producto={producto} precioFinal={100000} device="desktop" onDeviceChange={()=>{}} imagenes={[]} imagenesNuevas={[]} tieneVariantes variantes={[
 {id:1,nombre:'S',stock_salon:3,stock_deposito:2,stock:0,precio_diferencial:10000},
 {id:2,nombre:'L',stock_salon:0,stock_deposito:0,stock:99},
]} faq={[{pregunta:'¿Cómo cuidar?',respuesta:'Lavado frío QA'}]} {...extra}/></MemoryRouter>); }
describe('Vista real del producto',()=>{
 it('uses salón + depósito for editable sizes, effective price and sold-out state',()=>{
  mount();
  expect(screen.getByRole('button',{name:'Talle S'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Talle L'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Talle S'}));
  expect(screen.getAllByRole('button',{name:'Comprar mi talle'})[0]).toBeEnabled();
  expect(screen.getAllByText('110.000 Gs').length).toBeGreaterThan(0);
  for(let i=0;i<8;i++) fireEvent.click(screen.getByRole('button',{name:'Sumar uno'}));
  expect(screen.getByRole('button',{name:'Sumar uno'})).toBeDisabled();
 });
 it('shows saved composition, size guide, public copy, FAQ and all four guarantees',()=>{
  mount({tieneVariantes:false});
  for(const text of ['Promesa propia QA','Algodón QA','90–94','Lavado frío QA',...producto.confianza.map(x=>x.texto)]) expect(screen.getByText(text)).toBeInTheDocument();
 });
 it('keeps blank Moda sections empty, with no invented claims',()=>{
  mount({producto:{nombre:'Vacío',ficha_rubro:'moda'},tieneVariantes:false,faq:[]});
  expect(screen.queryByText(/Envío gratis|Soporte 24\/7|Garantía 30/)).toBeNull();
  expect(screen.queryByText(/Sin categoria/i)).toBeNull();
 });
 it.each([[resolverFichaModa,fichaModaDesdeProducto],[resolverFichaBazar,fichaBazarDesdeProducto]])('does not truncate the fourth product guarantee', (resolver,adaptar)=>{
  expect(resolver(null,null,adaptar(producto)).garantias.items).toHaveLength(4);
 });
});
