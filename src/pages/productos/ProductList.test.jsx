import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductList from './ProductList';
import { productService } from '../../services/productService';

vi.mock('../../services/productService', () => ({ productService: {
  buscar: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
} }));
vi.mock('../../services/catalogoService', () => ({ categoriaService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/costosGastosService', () => ({ proveedoresService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 9, rol: 'tienda' }) }));
vi.mock('../../components/depositos/LogisticaAbastecimientoModal', () => ({ default: () => null }));

function DestinoProducto() {
  const location = useLocation();
  return (
    <div>
      <p>Destino producto</p>
      <p>{location.pathname}</p>
      <p>{sessionStorage.getItem('gesicomm:tabInicial')}</p>
    </div>
  );
}

beforeEach(() => {
  productService.buscar.mockResolvedValue({
    productos: [{
      id: 101,
      nombre: 'Calefactor QA',
      sku: 'QA-101',
      precio_base: 100000,
      cantidad_disponible: 5,
      stock_minimo: 1,
      activo: true,
      creado_por: 9,
      ofertas_count: 0,
      variantes_count: 0,
      tags_count: 0,
      imagenes: [],
    }],
    total: 1,
    total_paginas: 1,
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('ProductList', () => {
  it('abre la pestaña de ofertas del producto desde el botón de etiqueta', async () => {
    render(
      <MemoryRouter initialEntries={['/mi-catalogo']}>
        <Routes>
          <Route path="/mi-catalogo" element={<ProductList />} />
          <Route path="/products/:id/editar" element={<DestinoProducto />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Calefactor QA');
    fireEvent.click(screen.getByTitle('Gestionar ofertas'));

    await screen.findByText('Destino producto');
    expect(screen.getByText('/products/101/editar')).toBeInTheDocument();
    expect(screen.getByText('ofertas')).toBeInTheDocument();
  });
});
