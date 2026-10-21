import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeleccionarTienda from './SeleccionarTienda';
import { tiendaService } from '../../services/tiendaService';

vi.mock('../../services/tiendaService', () => ({ tiendaService: {
  mias: vi.fn(), cambiarEstado: vi.fn(), seleccionar: vi.fn(), eliminar: vi.fn(),
} }));

beforeEach(() => {
  vi.clearAllMocks();
  tiendaService.mias.mockResolvedValue([{ id: 12, nombre: 'Prueba', subdominio: 'prueba', activo: true }]);
});
const mostrar = () => render(<MemoryRouter><SeleccionarTienda /></MemoryRouter>);

describe('estado público de tiendas', () => {
  it('exige inactivar y escribir el nombre antes de eliminar', async () => {
    mostrar();
    expect(await screen.findByRole('button', { name: 'Eliminar Prueba' })).toBeDisabled();
  });

  it('elimina tras confirmar el nombre y actualiza el listado', async () => {
    tiendaService.mias.mockResolvedValue([{ id: 12, nombre: 'Prueba', activo: false }]);
    tiendaService.eliminar.mockResolvedValue({ id: 12 });
    mostrar();
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Prueba' }));
    const boton = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    expect(boton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Escribí «Prueba» para confirmar'), { target: { value: 'Prueba' } });
    fireEvent.click(boton);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Administrar Prueba' })).toBeNull());
    expect(tiendaService.eliminar).toHaveBeenCalledWith(12, 'Prueba');
    expect(screen.getByRole('status')).toHaveTextContent('Prueba fue eliminada.');
  });

  it('conserva la tienda si el servidor bloquea el borrado por historial', async () => {
    tiendaService.mias.mockResolvedValue([{ id: 12, nombre: 'Prueba', activo: false }]);
    tiendaService.eliminar.mockRejectedValue({ response: { data: { message: 'Tiene datos asociados.' } } });
    mostrar();
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Prueba' }));
    fireEvent.change(screen.getByLabelText('Escribí «Prueba» para confirmar'), { target: { value: 'Prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tiene datos asociados.');
    expect(screen.getByRole('button', { name: 'Administrar Prueba' })).toBeInTheDocument();
  });
  it('permite cancelar y exige confirmar antes de inactivar', async () => {
    mostrar();
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar Prueba' }));
    expect(tiendaService.cambiarEstado).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Confirmar inactivación' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inactivar Prueba' }));
    tiendaService.cambiarEstado.mockResolvedValue({ id: 12, activo: false });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inactivación' }));
    expect(await screen.findByRole('button', { name: 'Reactivar Prueba' })).toBeEnabled();
    expect(tiendaService.cambiarEstado).toHaveBeenCalledWith(12, false);
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Administrar Prueba' })).toBeEnabled();
  });

  it('permite reactivar sin perder la tienda del listado', async () => {
    tiendaService.mias.mockResolvedValue([{ id: 12, nombre: 'Prueba', activo: false }]);
    tiendaService.cambiarEstado.mockResolvedValue({ id: 12, activo: true });
    mostrar();
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivar Prueba' }));
    expect(await screen.findByRole('button', { name: 'Inactivar Prueba' })).toBeEnabled();
    expect(tiendaService.cambiarEstado).toHaveBeenCalledWith(12, true);
  });

  it('conserva el estado y permite reintentar cuando la API falla', async () => {
    tiendaService.cambiarEstado.mockRejectedValue(new Error('Sin conexión'));
    mostrar();
    fireEvent.click(await screen.findByRole('button', { name: 'Inactivar Prueba' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inactivación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cambiar el estado');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar inactivación' })).toBeEnabled());
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });
});
