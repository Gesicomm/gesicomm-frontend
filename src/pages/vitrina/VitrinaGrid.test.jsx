import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VitrinaGrid from './VitrinaGrid';
import { vitrinaService } from '../../services/vitrinaService';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../services/vitrinaService', () => ({
  vitrinaService: {
    catalogoPaginado: vi.fn(),
    catalogo: vi.fn(),
    guardarPrecioProducto: vi.fn(),
    guardarPrecioCombo: vi.fn(),
    categorizarProductos: vi.fn(),
  },
}));

vi.mock('../../services/landingSimpleService', () => ({
  landingSimpleService: {
    crearDesdeOnboarding: vi.fn(),
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
    vitrinaService.categorizarProductos.mockResolvedValue({
      actualizados: 1,
      categoria: { id: 10, nombre: 'Suplementos' },
      subcategoria: { id: 11, nombre: 'Energía' },
    });
  });

  it('renderiza la cabecera con el botón de "Agregar Mis Productos" y la pestaña de "Mis productos"', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument();
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

  it('separa Combos Gesicom de Mis combos y mantiene ambos en Todos', async () => {
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');
    fireEvent.click(screen.getByRole('button', { name: 'Combos Gesicom', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'combo', solamenteMios: false, origenCatalogo: 'GESICOMM' }),
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Mis combos', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'combo', solamenteMios: true, origenCatalogo: null }),
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Todos', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'todos', solamenteMios: false, origenCatalogo: null }),
    ));
  });

  it('lleva las fotos del catálogo al editor del combo', async () => {
    const items = [1, 2].map(id => ({
      id, tipo: 'producto', nombre: `Producto ${id}`, precio_base: 50000,
      imagen: `/producto-${id}.png`, imagenes: [`/producto-${id}.png`], creado_por: 1,
    }));
    vitrinaService.catalogoPaginado.mockResolvedValue({ items, total: 2, totalPages: 1 });
    renderWithRouter(<VitrinaGrid />);
    for (const item of items) fireEvent.click(await screen.findByRole('checkbox', { name: `Seleccionar ${item.nombre}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Armar combo', exact: true }));
    expect(JSON.parse(sessionStorage.getItem('gesicomm:comboPrefillItems'))).toEqual([
      expect.objectContaining({ id: 1, imagen: '/producto-1.png', imagenes: ['/producto-1.png'] }),
      expect.objectContaining({ id: 2, imagen: '/producto-2.png', imagenes: ['/producto-2.png'] }),
    ]);
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('agrupa productos seleccionados en una categoría interna', async () => {
    renderWithRouter(<VitrinaGrid />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Producto de Prueba' }));

    fireEvent.click(screen.getByRole('button', { name: /Categorizar/i }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Suplementos A del fit'), { target: { value: 'Suplementos' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Baja de peso, energía, proteína'), { target: { value: 'Energía' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar categoría/i }));

    await waitFor(() => expect(vitrinaService.categorizarProductos).toHaveBeenCalledWith({
      categoria_nombre: 'Suplementos',
      subcategoria_nombre: 'Energía',
      producto_ids: [1],
    }));
    expect(await screen.findByText(/Se agruparon 1 producto en Suplementos \/ Energía/)).toBeInTheDocument();
  });
});
