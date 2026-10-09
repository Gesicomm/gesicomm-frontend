import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import VitrinaGrid from './VitrinaGrid';
import { vitrinaService } from '../../services/vitrinaService';
import { landingService } from '../../services/landingService';
import { landingSimpleService } from '../../services/landingSimpleService';
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
    listar: vi.fn(),
    obtener: vi.fn(),
    crearDesdeOnboarding: vi.fn(),
  },
}));

vi.mock('../../services/landingService', () => ({
  landingService: {
    paginas: vi.fn(),
    obtener: vi.fn(),
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
    vitrinaService.catalogo.mockResolvedValue({
      productos: [
        {
          id: 1,
          tipo: 'producto',
          nombre: 'Producto de Prueba',
          precio_base: 50000,
          precio_efectivo: 50000,
          stock: 10,
          creado_por: 42,
          categoria: 'Electrónica',
        },
      ],
      combos: [],
    });
    landingSimpleService.listar.mockResolvedValue([
      { id: 10, activo: true, items: [{ id: 101 }] },
    ]);
    landingSimpleService.obtener.mockResolvedValue({
      id: 10,
      items: [
        { tipo: 'producto', referencia_id: 1, orden: 0 },
      ],
    });
    landingService.paginas.mockResolvedValue([
      { id: 1, tipo_pagina: 'inicio', slug: 'sommix-inicio', es_home: true },
      { id: 2, tipo_pagina: 'catalogo', slug: 'sommix-catalogo' },
    ]);
    landingService.obtener.mockResolvedValue({
      id: 1,
      items: [],
      secciones: [
        {
          tipo: 'productos',
          contenido: {
            productos: [
              { tipo: 'producto', referencia_id: 1 },
              { tipo: 'producto', referencia_id: 999 },
            ],
          },
        },
      ],
    });
  });

  it('renderiza la cabecera con el botón de "Agregar Mis Productos", la pestaña de landing y la pestaña de "Mis productos"', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument();
    });

    const btnAgregar = screen.getByText('Agregar Mis Productos');
    expect(btnAgregar).toBeInTheDocument();

    const btnEnLanding = screen.getByText('En mi landing');
    expect(btnEnLanding).toBeInTheDocument();

    const btnMisProductos = screen.getByText('Mis productos');
    expect(btnMisProductos).toBeInTheDocument();
  });

  it('muestra solo los productos seleccionados para vender en la landing', async () => {
    vitrinaService.catalogoPaginado
      .mockResolvedValueOnce({
        items: [
          {
            id: 99,
            tipo: 'producto',
            nombre: 'Producto inicial',
            precio_base: 50000,
            precio_efectivo: 50000,
            stock: 10,
          },
        ],
        categorias: ['Electrónica'],
        proveedores: ['Proveedor X'],
        totalPages: 1,
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 1, tipo: 'producto', nombre: 'Producto en Landing', precio_base: 50000, precio_efectivo: 50000, stock: 10 },
          { id: 3, tipo: 'combo', nombre: 'Combo en Landing', precio_base: 90000, precio_efectivo: 90000 },
        ],
        categorias: ['Electrónica'],
        proveedores: [],
        totalPages: 1,
        total: 2,
      });

    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto inicial');

    fireEvent.click(screen.getByRole('button', { name: 'En mi landing', exact: true }));

    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tipo: 'landing',
        solamenteMios: false,
        origenCatalogo: null,
      }),
    ));
    expect(await screen.findByText('Producto en Landing')).toBeInTheDocument();
    expect(await screen.findByText('Combo en Landing')).toBeInTheDocument();
    expect(screen.queryByText('Producto fuera de Landing')).toBeNull();
    expect(screen.queryByRole('button', { name: /Seleccionar página/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Seleccionar todo/i })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /Seleccionar Producto en Landing/i })).toBeNull();

    fireEvent.click(screen.getByRole('article', { name: 'Producto en Landing' }));

    expect(screen.queryByRole('region', { name: 'Productos seleccionados' })).toBeNull();
    expect(vitrinaService.catalogo).not.toHaveBeenCalled();
    expect(landingSimpleService.obtener).not.toHaveBeenCalled();
    expect(landingService.obtener).not.toHaveBeenCalled();
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

  it('selecciona todos los productos de la página visible', async () => {
    vitrinaService.catalogoPaginado.mockResolvedValue({
      items: [
        { id: 1, tipo: 'producto', nombre: 'Producto 1', precio_base: 50000, precio_efectivo: 50000, stock: 10 },
        { id: 2, tipo: 'producto', nombre: 'Producto 2', precio_base: 60000, precio_efectivo: 60000, stock: 8 },
      ],
      categorias: ['Electrónica'],
      proveedores: ['Proveedor X'],
      totalPages: 1,
      total: 2,
    });

    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto 1');

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar página/i }));

    const barraSeleccion = screen.getByRole('region', { name: 'Productos seleccionados' });
    expect(within(barraSeleccion).getByText('2')).toBeInTheDocument();
    expect(within(barraSeleccion).getByText('productos seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitar página/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Quitar página/i }));
    expect(screen.queryByRole('region', { name: 'Productos seleccionados' })).toBeNull();
    expect(screen.getByRole('button', { name: /Seleccionar página/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selecciona todo el catálogo respetando los filtros actuales', async () => {
    vitrinaService.catalogoPaginado.mockResolvedValue({
      items: [
        { id: 1, tipo: 'combo', nombre: 'Combo Filtrado', descripcion: 'Combo premium', precio_base: 50000, precio_efectivo: 50000 },
      ],
      categorias: ['Electrónica'],
      proveedores: ['Proveedor X'],
      totalPages: 2,
      total: 12,
    });

    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Combo Filtrado');

    fireEvent.change(screen.getByPlaceholderText('Buscar producto o combo...'), { target: { value: 'premium' } });
    fireEvent.click(screen.getByRole('button', { name: 'Combos Gesicom', exact: true }));
    fireEvent.change(screen.getByTitle('Filtrar por categoría'), { target: { value: 'Electrónica' } });
    fireEvent.change(screen.getByTitle('Filtrar por proveedor'), { target: { value: 'Proveedor X' } });

    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({
        busqueda: 'premium',
        filtroCategoria: 'Electrónica',
        filtroProveedor: 'Proveedor X',
        tipo: 'combo',
        solamenteMios: false,
        origenCatalogo: 'GESICOMM',
      }),
    ));

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar todo/i }));

    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 12,
        busqueda: 'premium',
        filtroCategoria: 'Electrónica',
        filtroProveedor: 'Proveedor X',
        tipo: 'combo',
        solamenteMios: false,
        origenCatalogo: 'GESICOMM',
      }),
    ));
    const barraSeleccion = screen.getByRole('region', { name: 'Productos seleccionados' });
    expect(within(barraSeleccion).getByText('1')).toBeInTheDocument();
    expect(within(barraSeleccion).getByText('producto seleccionado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitar todo/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Quitar todo/i }));
    expect(screen.queryByRole('region', { name: 'Productos seleccionados' })).toBeNull();
    expect(screen.getByRole('button', { name: /Seleccionar todo/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
