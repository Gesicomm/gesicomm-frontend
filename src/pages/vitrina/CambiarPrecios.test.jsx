import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CambiarPrecios from './CambiarPrecios';
import { vitrinaService } from '../../services/vitrinaService';

vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { buscarPrecios: vi.fn(), actualizarPrecios: vi.fn() } }));
const fila = { id: 1, tipo: 'producto', nombre: 'Olla', costo: 100000, precio_minimo: 100000, precio_actual: 150000, sku: 'OL-1', imagen: 'https://media.test/olla.webp' };
const page = items => ({ items, total: 51, totalPages: 3, categorias: ['Hogar'], proveedores: ['Proveedor'] });
const montar = () => render(<BrowserRouter><CambiarPrecios /></BrowserRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  vitrinaService.buscarPrecios.mockImplementation(async query => page(query.page === 1 ? [fila] : [{ ...fila, id: 2, nombre: 'Sartén' }]));
  vitrinaService.actualizarPrecios.mockResolvedValue({ actualizados: 1, sin_cambios: 0 });
});

describe('Cambiar precios', () => {
  it('muestra fotos, una sola acción de guardar y ninguna acción por fila', async () => {
    montar();
    await screen.findByText('Olla');
    expect(screen.getByRole('img', { name: 'Olla' })).toHaveAttribute('src', fila.imagen);
    expect(screen.getAllByRole('button', { name: /Guardar cambios/ })).toHaveLength(1);
    expect(screen.queryByRole('columnheader', { name: 'Acción' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Venta con reajuste' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar precio de Olla' })).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img', { name: 'Olla' }));
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
  });

  it('selecciona con la fila o foto, y editar precios no cambia la selección', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.click(screen.getByText('Olla'));
    expect(screen.getByLabelText('Seleccionar Olla')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Precio de venta de Olla'));
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    expect(screen.getByLabelText('Seleccionar Olla')).toBeChecked();
    fireEvent.click(screen.getByRole('img', { name: 'Olla' }));
    expect(screen.getByLabelText('Seleccionar Olla')).not.toBeChecked();
    fireEvent.keyDown(screen.getByText('Olla').closest('tr'), { key: ' ' });
    expect(screen.getByLabelText('Seleccionar Olla')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Seleccionar Olla'));
    expect(screen.getByLabelText('Seleccionar Olla')).not.toBeChecked();
  });

  it('Enter avanza a la siguiente fila sin guardar', async () => {
    vitrinaService.buscarPrecios.mockResolvedValue(page([fila, { ...fila, id: 2, nombre: 'Sartén' }]));
    montar();
    await screen.findByText('Olla');
    const input = screen.getByLabelText('Precio de venta de Olla');
    fireEvent.change(input, { target: { value: '160000' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(vitrinaService.actualizarPrecios).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Precio de venta de Sartén')).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText('Precio de venta de Sartén'), { key: 'Tab', shiftKey: true });
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.getByLabelText('Precio de venta de Sartén')).toHaveFocus();
  });

  it('conserva ediciones manuales si se cancela el cambio al reajuste', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Reajustar por porcentaje' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Precio de venta de Olla')).toHaveValue('160.000');
    fireEvent.click(screen.getByRole('tab', { name: 'Reajustar por porcentaje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar y continuar' }));
    expect(screen.getByRole('tab', { name: 'Reajustar por porcentaje' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('selecciona todos los resultados, excluye otra página y envía el reajuste sobre el costo', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.click(screen.getByRole('tab', { name: 'Reajustar por porcentaje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos 51' }));
    expect(screen.getByText('105.000 Gs')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await screen.findByText('Sartén');
    fireEvent.click(screen.getByLabelText('Seleccionar Sartén'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (50)' }));
    expect(vitrinaService.actualizarPrecios).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar guardado' }));
    await waitFor(() => expect(vitrinaService.actualizarPrecios).toHaveBeenCalledWith({ modo: 'reajuste', porcentaje: 5, seleccion: { todos: true, filtros: { orden: 'nombre' }, excluidos: [{ tipo: 'producto', id: 2 }] } }));
  });

  it('mantiene cambios al paginar y los guarda juntos', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await screen.findByText('Sartén');
    fireEvent.change(screen.getByLabelText('Precio de venta de Sartén'), { target: { value: '170000' } });
    fireEvent.click(screen.getByLabelText('Página anterior'));
    await screen.findByText('Olla');
    expect(screen.getByLabelText('Precio de venta de Olla')).toHaveValue('160.000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (2)' }));
    await waitFor(() => expect(vitrinaService.actualizarPrecios).toHaveBeenCalledWith({ modo: 'manual', cambios: [{ tipo: 'producto', id: 1, precio: 160000 }, { tipo: 'producto', id: 2, precio: 170000 }] }));
  });

  it('conserva lo editado si falla el guardado y permite reintentar', async () => {
    vitrinaService.actualizarPrecios.mockRejectedValueOnce({ response: { data: { message: 'No se pudo guardar' } } });
    montar();
    await screen.findByText('Olla');
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (1)' }));
    await screen.findByText('No se pudo guardar');
    expect(screen.getByLabelText('Precio de venta de Olla')).toHaveValue('160.000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (1)' }));
    await waitFor(() => expect(vitrinaService.actualizarPrecios).toHaveBeenCalledTimes(2));
  });

  it('al refrescar tras guardar no convierte cambios de props en nuevas ediciones', async () => {
    let precioActual = 150000;
    vitrinaService.buscarPrecios.mockImplementation(async () => page([{ ...fila, precio_actual: precioActual }]));
    vitrinaService.actualizarPrecios.mockImplementation(async body => {
      precioActual = body.cambios[0].precio;
      return { actualizados: 1, sin_cambios: 0 };
    });
    montar();
    await screen.findByText('Olla');
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (1)' }));
    await screen.findByText('Se guardó 1 precio.');
    await waitFor(() => expect(screen.getByLabelText('Precio de venta de Olla')).toHaveValue('160.000'));
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByText('Se guardó 1 precio.')).toBeInTheDocument();
  });

  it('filtra con POST paginado, limpia selección y conserva borradores', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.change(screen.getByLabelText('Precio de venta de Olla'), { target: { value: '160000' } });
    fireEvent.click(screen.getByLabelText('Seleccionar Olla'));
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'Hogar' } });
    await waitFor(() => expect(vitrinaService.buscarPrecios).toHaveBeenLastCalledWith({ categoria: 'Hogar', orden: 'nombre', page: 1, limit: 25 }));
    expect(screen.getByLabelText('Seleccionar Olla')).not.toBeChecked();
    expect(screen.getByLabelText('Precio de venta de Olla')).toHaveValue('160.000');
    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'OL-1' } });
    await waitFor(() => expect(vitrinaService.buscarPrecios).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: 'OL-1', page: 1 })));
  });

  it('valida mínimos y Enter no guarda precios por separado', async () => {
    montar();
    await screen.findByText('Olla');
    const input = screen.getByLabelText('Precio de venta de Olla');
    fireEvent.change(input, { target: { value: '90000' } });
    expect(screen.getByRole('button', { name: 'Guardar cambios (1)' })).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(vitrinaService.actualizarPrecios).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '160000' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(vitrinaService.actualizarPrecios).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (1)' }));
    await waitFor(() => expect(vitrinaService.actualizarPrecios).toHaveBeenCalledWith({ modo: 'manual', cambios: [{ tipo: 'producto', id: 1, precio: 160000 }] }));
  });

  it('la selección de página no selecciona los resultados de otras páginas', async () => {
    montar();
    await screen.findByText('Olla');
    fireEvent.click(screen.getByRole('tab', { name: 'Reajustar por porcentaje' }));
    fireEvent.click(screen.getByLabelText('Seleccionar página'));
    expect(screen.getByText('1 seleccionado')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await screen.findByText('Sartén');
    expect(screen.getByLabelText('Seleccionar Sartén')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '10%' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar guardado' }));
    await waitFor(() => expect(vitrinaService.actualizarPrecios).toHaveBeenCalledWith({ modo: 'reajuste', porcentaje: 10, seleccion: { todos: false, items: [{ tipo: 'producto', id: 1 }] } }));
  });
});
