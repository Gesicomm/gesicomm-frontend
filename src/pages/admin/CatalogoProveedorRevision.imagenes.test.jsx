/**
 * En la cola de revisión, "sin foto" y "la foto no carga" se veían igual:
 * un marco vacío. Son cosas distintas al decidir — una es un producto que
 * llegó incompleto, la otra una URL del proveedor que hay que corregir
 * (Casa Paraná mandó URLs de su Shopify cerrado con contraseña y todas
 * redirigían al login).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CatalogoProveedorRevision from './CatalogoProveedorRevision';
import API from '../../services/api';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const producto = (extra) => ({
  id: 1, nombre: 'Vaso térmico', sku: '2900002540895', descripcion: null, categoria: 'Bazar',
  precio: 64900, stock: 65, estado: 'pendiente', nota_revision: null, revisado_en: null,
  recibido_en: '2026-11-10T19:05:54.000Z', imagenes: [],
  proveedor: { id: 15, nombre: 'Casa Paraná', logo_url: null }, ...extra,
});

function montar(productos, extraData = {}) {
  const payload = {
    data: {
      productos,
      proveedores: [{ id: 15, nombre: 'Casa Paraná', pendientes: productos.length, en_estado: productos.length }],
      categorias: [{ id: 4, nombre: 'Bazar' }, { id: 7, nombre: 'Decoración' }],
      total: productos.length,
      pagina: 1,
      total_paginas: 1,
      resumen: { pendiente: productos.length, aprobado: 0, rechazado: 0 },
      ...extraData,
    },
  };
  API.post.mockResolvedValue(payload);
  API.get.mockResolvedValue(payload);
  return render(<CatalogoProveedorRevision />);
}

beforeEach(() => vi.clearAllMocks());

describe('fotos en la cola de revisión', () => {
  it('un producto sin imágenes dice "Sin foto"', async () => {
    montar([producto({ imagenes: [] })]);
    expect(await screen.findByText('Sin foto')).toBeInTheDocument();
  });

  it('una URL que no carga lo dice y muestra cuál es', async () => {
    const url = 'https://www.casaparana.com.py/fotos/productos/2900002540895.jpg';
    montar([producto({ imagenes: [url] })]);

    await waitFor(() => expect(document.querySelector('.prov-producto-foto img')).not.toBeNull());
    fireEvent.error(document.querySelector('.prov-producto-foto img'));

    expect(await screen.findByText('No carga')).toBeInTheDocument();
    // La URL queda a la vista: es lo que hay que corregirle al proveedor.
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(document.querySelector('.prov-producto-foto img')).toBeNull();
  });

  it('una miniatura que no carga se quita en vez de dejar un marco vacío', async () => {
    const buena = 'https://cdn.ok.test/1.jpg';
    const mala = 'https://cdn.roto.test/2.jpg';
    montar([producto({ imagenes: ['https://cdn.ok.test/portada.jpg', buena, mala] })]);

    await waitFor(() => expect(document.querySelectorAll('.prov-producto-galeria img')).toHaveLength(2));
    fireEvent.error(document.querySelector(`.prov-producto-galeria img[src="${mala}"]`));

    await waitFor(() => expect(document.querySelectorAll('.prov-producto-galeria img')).toHaveLength(1));
    expect(document.querySelector('.prov-producto-galeria img').getAttribute('src')).toBe(buena);
  });

  it('permite filtrar por nombre, proveedor, categoría, fechas y orden y limpiar los filtros', async () => {
    montar([producto()]);
    expect(await screen.findByText('Vaso térmico')).toBeInTheDocument();

    const inputBusqueda = screen.getByLabelText('Buscar producto');
    fireEvent.change(inputBusqueda, { target: { value: 'Bonsai' } });
    fireEvent.keyDown(inputBusqueda, { key: 'Enter' });

    await waitFor(() => {
      expect(API.post).toHaveBeenLastCalledWith(
        '/publico/admin/solicitudes-proveedores/catalogo/buscar',
        expect.objectContaining({ busqueda: 'Bonsai', estado: 'pendiente', page: 1 }),
      );
    });

    fireEvent.change(screen.getByLabelText('Desde fecha'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Hasta fecha'), { target: { value: '2026-11-23' } });
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'nombre' } });

    await waitFor(() => {
      expect(API.post).toHaveBeenLastCalledWith(
        '/publico/admin/solicitudes-proveedores/catalogo/buscar',
        expect.objectContaining({
          busqueda: 'Bonsai',
          categoriaId: '7',
          fechaDesde: '2026-11-01',
          fechaHasta: '2026-11-23',
          ordenarPor: 'nombre',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/i }));
    await waitFor(() => {
      expect(API.post).toHaveBeenLastCalledWith(
        '/publico/admin/solicitudes-proveedores/catalogo/buscar',
        { estado: 'pendiente', page: 1, limit: 20 },
      );
    });
  });
});
