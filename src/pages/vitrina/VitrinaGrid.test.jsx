import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VitrinaGrid from './VitrinaGrid';
import { vitrinaService } from '../../services/vitrinaService';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../services/vitrinaService', () => ({
  vitrinaService: {
    catalogoPaginado: vi.fn(),
    guardarPrecioProducto: vi.fn(),
    guardarPrecioCombo: vi.fn(),
  },
}));

vi.mock('../../utils/auth', () => ({
  verificarSesion: vi.fn().mockResolvedValue({ id: 42, rol: 'usuario' }),
}));

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('VitrinaGrid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vitrinaService.catalogoPaginado.mockResolvedValue({
      items: [
        {
          id: 1,
          tipo: 'producto',
          nombre: 'Producto de Prueba',
          precio_base: 50000,
          precio_efectivo: 50000,
          stock: 10,
          creado_por: 42,
        },
      ],
      categorias: ['Electrónica'],
      proveedores: ['Proveedor X'],
      totalPages: 1,
      total: 1,
    });
  });

  it('renderiza la cabecera con el botón de "Agregar Mis Productos" y la pestaña de "Mis productos"', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Mi catálogo')).toBeInTheDocument();
    });

    const btnAgregar = screen.getByText('Agregar Mis Productos');
    expect(btnAgregar).toBeInTheDocument();

    const btnMisProductos = screen.getByText('Mis productos');
    expect(btnMisProductos).toBeInTheDocument();
  });

  it('activa solamenteMios al presionar "Mis productos" y restablece al presionar "Todos"', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Producto de Prueba')).toBeInTheDocument();
    });

    const btnMisProductos = screen.getByText('Mis productos');
    fireEvent.click(btnMisProductos);

    await waitFor(() => {
      expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
        expect.objectContaining({
          solamenteMios: true,
        })
      );
    });

    const btnTodos = screen.getByText('Todos');
    fireEvent.click(btnTodos);

    await waitFor(() => {
      expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
        expect.objectContaining({
          solamenteMios: false,
          tipo: 'todos',
        })
      );
    });
  });

  it('muestra el botón de Editar en las tarjetas de productos propios o en Mis productos', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Producto de Prueba')).toBeInTheDocument();
    });

    const btnEditar = screen.getByTitle('Editar producto');
    expect(btnEditar).toBeInTheDocument();
  });
});
