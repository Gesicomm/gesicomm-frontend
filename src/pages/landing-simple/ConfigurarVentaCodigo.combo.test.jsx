import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ConfigurarVentaCodigo from './ConfigurarVentaCodigo';
import { comboAdminService } from '../../services/comboAdminService';
import { ofertaService } from '../../services/ofertaService';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 10, rol: 'usuario' }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: {
  listar: vi.fn().mockResolvedValue([]), obtener: vi.fn(), crear: vi.fn(), cambiarEstado: vi.fn(),
  obtenerConfiguracion: vi.fn().mockResolvedValue({ cpa_porcentaje: 0, costo_envio: 0, costo_confirmacion: 0, costo_empaque: 0, margen_minimo: 15 }),
} }));
const productos = [
  { id: 7, tipo: 'producto', slug: 'cacerola', nombre: 'Cacerola', categoria: 'Cocina', imagen: '/cacerola.png', precio_base: 50000, precio_efectivo: 100000 },
  { id: 8, tipo: 'producto', slug: 'utensilios', nombre: 'Utensilios', categoria: 'Cocina', imagen: '/utensilios.png', precio_base: 15000, precio_efectivo: 30000 },
];
vi.mock('../../services/productService', () => ({ productService: {
  buscar: vi.fn(async () => ({ productos })), variantes: vi.fn().mockResolvedValue([]),
} }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: {
  listarPorProducto: vi.fn().mockResolvedValue([]), crear: vi.fn(),
} }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="datos-combo">{JSON.stringify(datos)}</output> }));

const catalogo = { productos, combos: [] };
const confirmar = vi.fn();
const recargar = vi.fn();
const cargarOfertas = vi.fn().mockResolvedValue([]);
const datos = () => JSON.parse(screen.getByTestId('datos-combo').textContent);
function montar(venta = { seleccion: 'manual' }) {
  render(<MemoryRouter initialEntries={['/landing/201']}><Routes><Route path="/landing/:id" element={<ConfigurarVentaCodigo
    catalogo={catalogo} codigos={{ inicio: { html: '<h1>Inicio personalizado</h1>' }, producto: { html: '<h1>Ficha personalizada</h1>', css: '.mi-combo { color: purple; }' } }} inicial={{ venta, seleccion: [{ ...productos[0], precio_ancla: 120000, etiqueta: 'Oferta' }] }}
    cargarOfertas={cargarOfertas} onConfirmar={confirmar} onVolver={vi.fn()} onRecargarCatalogo={recargar}
  />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
}
async function abrir(tipo = 'Combo') {
  fireEvent.click(await within(screen.getByRole('group', { name: 'Crear oferta por tipo' })).findByRole('button', { name: new RegExp(tipo) }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Ofertas' })).getByRole('button', { name: /Cacerola/ }));
}
async function completar() {
  const armador = await screen.findByRole('dialog', { name: 'Armar combo' });
  fireEvent.change(await within(armador).findByPlaceholderText('Ej: Pack Detox 3 en 1'), { target: { value: 'Combo desde landing' } });
  fireEvent.click(within(armador).getByRole('button', { name: /Siguiente: producto principal/ }));
  expect(within(armador).getByRole('textbox', { name: 'Precio de venta de Cacerola' })).toHaveValue('Gs 100.000');
  fireEvent.click(within(armador).getByRole('button', { name: /Siguiente: complementarios/ }));
  const campo = await within(armador).findByRole('textbox', { name: 'Precio de venta de Utensilios' });
  fireEvent.click(within(campo.closest('li')).getByRole('button', { name: /Sumar/ }));
  await waitFor(() => expect(within(armador).getByRole('button', { name: /Vista del combo/ })).toBeEnabled());
  fireEvent.click(within(armador).getByRole('button', { name: /Vista del combo/ }));
  expect(within(armador).getByText('Fase 7 de 7 · Vista del combo')).toBeInTheDocument();
  const vista = within(armador).getByRole('region', { name: 'Vista del combo en el HTML de la landing' });
  const datosCombo = JSON.parse(within(vista).getByTestId('datos-combo').textContent);
  expect(datosCombo.producto.combo_incluye.map(p => p.nombre)).toEqual(['Cacerola', 'Utensilios']);
  expect(within(armador).queryByRole('region', { name: 'Vista pública del combo' })).toBeNull();
  return armador;
}
beforeEach(() => {
  vi.clearAllMocks();
  comboAdminService.crear.mockResolvedValue({ id: 99, nombre: 'Combo desde landing', precio_total: 130000, estado: 'BORRADOR', creado_por: 10 });
  comboAdminService.cambiarEstado.mockResolvedValue({ estado: 'ACTIVO' });
  recargar.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); sessionStorage.clear(); });

describe('Armador compartido de combos en la landing', () => {
  it('abre siete pasos, conserva la selección y suma el combo activo a la vista y al guardado', async () => {
    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify([{ id: 111, nombre: 'Otra selección' }]));
    montar();
    await abrir();
    const armador = await completar();
    expect(comboAdminService.obtener).not.toHaveBeenCalled(); // /landing/201 no es un combo 201
    expect(sessionStorage.getItem('gesicomm:comboPrefillItems')).toContain('Otra selección');
    fireEvent.click(within(armador).getByRole('button', { name: 'Crear combo y sumarlo a la landing' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Armar combo' })).toBeNull());
    expect(comboAdminService.crear).toHaveBeenCalledWith(expect.objectContaining({ principalProductId: 7, upsells: [{ productId: 8, discountPercentage: 0 }], precio_total: 130000 }));
    expect(comboAdminService.cambiarEstado).toHaveBeenCalledWith(99, 'ACTIVO');
    expect(ofertaService.crear).not.toHaveBeenCalled();
    expect(datos().productos.map(p => p.id)).toEqual(['cacerola', 'combo-99']);
    expect(datos().productos[1]).toMatchObject({ precio: 130000, combo_productos: [7, 8], productos_incluidos: 'Cacerola, Utensilios' });
    expect(datos().productos[1].combo_incluye).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].items[0]).toMatchObject({ id: 7, precio_ancla: 120000, etiqueta: 'Oferta' });
    expect(confirmar.mock.calls[0][0].items[1]).toMatchObject({ id: 99, tipo: 'combo' });
    expect(recargar).toHaveBeenCalledOnce();
  });
  it('redirige Combo desde Nueva oferta al mismo armador y deja el borrador fuera de la landing', async () => {
    montar();
    await abrir('Paquete');
    const modal = await screen.findByRole('radio', { name: /Combo/ }, { timeout: 5000 });
    fireEvent.click(modal);
    expect(document.querySelector('.modal-overlay')).toBeNull();
    const armador = await completar();
    fireEvent.click(within(armador).getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Armar combo' })).toBeNull());
    expect(comboAdminService.crear).toHaveBeenCalledOnce();
    expect(comboAdminService.cambiarEstado).not.toHaveBeenCalled();
    expect(datos().productos).toHaveLength(1);
  });
  it('cancelar conserva los productos y las etiquetas sin crear un combo', async () => {
    montar();
    await abrir();
    const armador = await screen.findByRole('dialog', { name: 'Armar combo' });
    await within(armador).findByPlaceholderText('Ej: Pack Detox 3 en 1');
    fireEvent.click(within(armador).getByRole('button', { name: 'Cancelar', exact: true }));
    expect(screen.queryByRole('dialog', { name: 'Armar combo' })).toBeNull();
    expect(datos().productos[0]).toMatchObject({ id: 'cacerola', etiqueta: 'Oferta', precio_antes: 120000 });
    expect(comboAdminService.crear).not.toHaveBeenCalled();
  });
  it('incluye el combo creado sin convertir una selección por categorías en manual', async () => {
    montar({ seleccion: 'categoria', categorias: ['Cocina'], incluir_combos: false });
    await abrir();
    const armador = await completar();
    fireEvent.click(within(armador).getByRole('button', { name: 'Crear combo y sumarlo a la landing' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Armar combo' })).toBeNull());
    expect(datos().productos.map(p => p.id)).toEqual(['cacerola', 'utensilios', 'combo-99']);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y armar el diseño' }));
    expect(confirmar.mock.calls[0][0].venta).toMatchObject({ seleccion: 'categoria', categorias: ['Cocina'], incluir_combos: true });
  });
});
