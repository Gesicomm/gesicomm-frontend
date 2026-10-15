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
    despublicarLanding: vi.fn(),
    organizarLanding: vi.fn(),
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
    vitrinaService.despublicarLanding.mockResolvedValue({
      landing_id: 10,
      despublicados: 1,
      restantes: 0,
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

  it('agrupa las teclas de la búsqueda en una petición', async () => {
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');
    vitrinaService.catalogoPaginado.mockClear();
    const campo = screen.getByPlaceholderText('Buscar producto o combo...');
    fireEvent.change(campo, { target: { value: 'p' } });
    fireEvent.change(campo, { target: { value: 'pr' } });
    fireEvent.change(campo, { target: { value: 'producto' } });
    expect(vitrinaService.catalogoPaginado).not.toHaveBeenCalled();
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenCalledTimes(1));
    expect(vitrinaService.catalogoPaginado.mock.calls[0][0].busqueda).toBe('producto');
  });

  it('cancela la carga anterior al cambiar de pestaña y al desmontar', async () => {
    const { unmount } = renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');
    const primera = vitrinaService.catalogoPaginado.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole('button', { name: 'Productos propios', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado.mock.calls.length).toBe(2));
    expect(primera.aborted).toBe(true);
    const segunda = vitrinaService.catalogoPaginado.mock.calls[1][1].signal;
    unmount();
    expect(segunda.aborted).toBe(true);
  });

  it('renderiza la cabecera con el botón de "Agregar Mis Productos", la pestaña de landing y la pestaña de productos propios', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Catálogo de Productos')).toBeInTheDocument();
    });

    const btnAgregar = screen.getByText('Agregar Mis Productos');
    expect(btnAgregar).toBeInTheDocument();

    const btnEnLanding = screen.getByText('Productos en mi landing');
    expect(btnEnLanding).toBeInTheDocument();

    const btnMisProductos = screen.getByText('Productos propios');
    expect(btnMisProductos).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Importar mis productos/i })).toBeNull();
  });

  it('muestra "Importar mis productos" junto al orden solo en Productos propios', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Producto de Prueba')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Importar mis productos/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Productos propios', exact: true }));

    await waitFor(() => {
      expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tipo: 'producto',
          solamenteMios: true,
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    const orden = screen.getByTitle('Ordenar por');
    const importar = screen.getByRole('button', { name: /Importar mis productos/i });
    expect(importar).toBeInTheDocument();
    expect(orden.compareDocumentPosition(importar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Todos', exact: true }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Importar mis productos/i })).toBeNull();
    });
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

    fireEvent.click(screen.getByRole('button', { name: 'Productos en mi landing', exact: true }));

    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tipo: 'landing',
        solamenteMios: false,
        origenCatalogo: null,
      }),
   expect.objectContaining({ signal: expect.any(AbortSignal) }),
));
    expect(await screen.findByText('Producto en Landing')).toBeInTheDocument();
    expect(await screen.findByText('Combo en Landing')).toBeInTheDocument();
    expect(screen.queryByText('Producto fuera de Landing')).toBeNull();
    expect(screen.getByRole('button', { name: /Seleccionar página/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seleccionar todo/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Seleccionar Producto en Landing/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Despublicar seleccionados/i })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar Producto en Landing/i }));
    expect(screen.getByRole('region', { name: 'Productos seleccionados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Despublicar seleccionados/i })).toBeInTheDocument();
    expect(vitrinaService.catalogo).not.toHaveBeenCalled();
    expect(landingSimpleService.obtener).not.toHaveBeenCalled();
    expect(landingService.obtener).not.toHaveBeenCalled();
  });
  it('despublica masivamente desde Productos en mi landing y refresca el listado', async () => {
    vitrinaService.catalogoPaginado
      .mockResolvedValueOnce({
        items: [{ id: 99, tipo: 'producto', nombre: 'Producto inicial', precio_base: 50000, precio_efectivo: 50000, stock: 10 }],
        categorias: [],
        proveedores: [],
        totalPages: 1,
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [{ id: 1, tipo: 'producto', nombre: 'Producto en Landing', precio_base: 50000, precio_efectivo: 50000, stock: 10 }],
        categorias: [],
        proveedores: [],
        totalPages: 1,
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        categorias: [],
        proveedores: [],
        totalPages: 1,
        total: 0,
      });
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto inicial');
    fireEvent.click(screen.getByRole('button', { name: 'Productos en mi landing', exact: true }));
    expect(await screen.findByText('Producto en Landing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar Producto en Landing/i }));
    expect(screen.getByRole('region', { name: 'Productos seleccionados' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Despublicar seleccionados/i }));
    await waitFor(() => expect(vitrinaService.despublicarLanding).toHaveBeenCalledWith([
      { tipo: 'producto', id: 1 },
    ]));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Productos seleccionados' })).toBeNull();
    });
    expect(await screen.findByText('Todavía no tenés productos seleccionados para vender en tu landing.')).toBeInTheDocument();
  });
  it('en Productos en mi landing marca varios como oferta, muestra sus marcas y quita una colección con la ×', async () => {
    const enLanding = {
      items: [
        { id: 1, tipo: 'producto', nombre: 'Producto en Landing', precio_base: 50000, precio_efectivo: 80000, stock: 10,
          en_landing: { precio_ancla: 100000, colecciones: ['Novedades'], badge: 'Oferta', contador: true } },
        { id: 2, tipo: 'producto', nombre: 'Otro en Landing', precio_base: 50000, precio_efectivo: 60000, stock: 10, en_landing: { precio_ancla: null, colecciones: [], badge: '', contador: false } },
      ],
      colecciones_landing: ['Novedades'],
      categorias: [], proveedores: [], totalPages: 1, total: 2,
    };
    vitrinaService.catalogoPaginado
      .mockResolvedValueOnce({ items: [], categorias: [], proveedores: [], totalPages: 1, total: 0 })
      .mockResolvedValue(enLanding);
    vitrinaService.organizarLanding.mockResolvedValue({ actualizados: 2, sin_lugar: 0, contador_lleno: 0 });
    renderWithRouter(<VitrinaGrid />);
    fireEvent.click(await screen.findByRole('button', { name: 'Productos en mi landing', exact: true }));
    expect(await screen.findByText('Producto en Landing')).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
    expect(screen.getByText('Contador')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Producto en Landing de Novedades' }));
    await waitFor(() => expect(vitrinaService.organizarLanding).toHaveBeenCalledWith({
      accion: 'quitar_coleccion', coleccion: 'Novedades', items: [{ tipo: 'producto', id: 1 }],
    }));

    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar Producto en Landing/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar Otro en Landing/i }));
    fireEvent.click(screen.getByRole('button', { name: /Marcar como oferta/ }));
    const modal = within(screen.getByRole('dialog', { name: 'Marcar como oferta' }));
    fireEvent.click(within(modal.getByRole('group', { name: 'Descuento' })).getByRole('button', { name: '30%' }));
    fireEvent.click(modal.getByRole('button', { name: /Aplicar a 2/ }));
    await waitFor(() => expect(vitrinaService.organizarLanding).toHaveBeenLastCalledWith(expect.objectContaining({
      accion: 'oferta', pct: 30, items: [{ tipo: 'producto', id: 1 }, { tipo: 'producto', id: 2 }],
      fin_at: expect.stringMatching(/T/),
    })));
    expect(await screen.findByText(/2 productos en oferta/)).toBeInTheDocument();
  });
  it('activa solamenteMios al presionar "Productos propios" y restablece al presionar "Todos"', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Producto de Prueba')).toBeInTheDocument();
    });

    const btnMisProductos = screen.getByText('Productos propios');
    fireEvent.click(btnMisProductos);

    await waitFor(() => {
      expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
        expect.objectContaining({
          solamenteMios: true,
        })
      ,
   expect.objectContaining({ signal: expect.any(AbortSignal) })
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
      ,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('muestra el botón de Editar en las tarjetas de productos propios', async () => {
    renderWithRouter(<VitrinaGrid />);

    await waitFor(() => {
      expect(screen.getByText('Producto de Prueba')).toBeInTheDocument();
    });

    const btnEditar = screen.getByTitle('Editar producto');
    expect(btnEditar).toBeInTheDocument();
  });

  it('separa Combos Gesicom de Combos propios y mantiene ambos en Todos', async () => {
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');
    fireEvent.click(screen.getByRole('button', { name: 'Combos Gesicom', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'combo', solamenteMios: false, origenCatalogo: 'GESICOMM' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
));
    fireEvent.click(screen.getByRole('button', { name: 'Combos propios', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'combo', solamenteMios: true, origenCatalogo: null }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
));
    fireEvent.click(screen.getByRole('button', { name: 'Todos', exact: true }));
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'todos', solamenteMios: false, origenCatalogo: null }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
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
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
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

  it('Cambiar precios lleva solo los seleccionados, por router state y sin tocar la URL', async () => {
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Producto de Prueba' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar precios (1)' }));

    expect(window.location.pathname).toBe('/mi-catalogo/precios');
    expect(window.location.search).toBe('');
    expect(window.history.state.usr).toEqual({ seleccion: [{ tipo: 'producto', id: 1 }] });
    window.history.replaceState(null, '', '/');
  });

  it('publica la selección de 4000 desde Vitrina guardando solo sus referencias', async () => {
    sessionStorage.clear();
    const productos = Array.from({ length: 4000 }, (_, i) => ({
      id: i + 1, tipo: 'producto', nombre: `Producto volumen ${i + 1}`,
      descripcion: 'Descripción extensa '.repeat(100), imagen: 'https://cdn.test/foto.jpg', precio_base: 50000,
    }));
    vitrinaService.catalogoPaginado.mockImplementation(async filtros => ({
      items: filtros.limit === 4000 ? productos : productos.slice(0, 10),
      total: 4000, totalPages: 400, categorias: [], proveedores: [],
    }));
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto volumen 1');
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar todo/i }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Productos seleccionados' })).getByText('4000')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Publicar productos en la web/i }));
    const guardados = JSON.parse(sessionStorage.getItem('gesicomm:prefilledLandingItems'));
    expect(guardados).toHaveLength(4000);
    expect(guardados.at(-1)).toEqual({ tipo: 'producto', referencia_id: 4000 });
    expect(new TextEncoder().encode(JSON.stringify(guardados)).length).toBeLessThan(200 * 1024);
    sessionStorage.clear();
  });

  it('Cambiar precios sin selección abre el catálogo completo', async () => {
    renderWithRouter(<VitrinaGrid />);
    await screen.findByText('Producto de Prueba');

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar precios' }));

    expect(window.location.pathname).toBe('/mi-catalogo/precios');
    expect(window.history.state.usr ?? null).toBeNull();
    window.history.replaceState(null, '', '/');
  });
});
