/**
 * Mi catálogo tiene que dejar claro de qué proveedor viene cada producto:
 * los que sube un proveedor por su API llegan con el logo cargado al dar
 * de alta su API Key, y la tarjeta lo muestra. Sin logo queda el nombre
 * solo — nunca una tarjeta muda.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import VitrinaGrid from './VitrinaGrid';
import { vitrinaService } from '../../services/vitrinaService';
import { landingService } from '../../services/landingService';
import { landingSimpleService } from '../../services/landingSimpleService';
import { metaFeedService } from '../../services/metaFeedService';
import { verificarSesion } from '../../utils/auth';

vi.mock('../../services/metaFeedService', () => ({ metaFeedService: { estadoActual: vi.fn(), activar: vi.fn(), actualizar: vi.fn(), estado: vi.fn() } }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: {
  catalogoPaginado: vi.fn(), catalogo: vi.fn(), guardarPrecioProducto: vi.fn(), guardarPrecioCombo: vi.fn(),
  categorizarProductos: vi.fn(), despublicarLanding: vi.fn(), organizarLanding: vi.fn(),
} }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listar: vi.fn(), obtener: vi.fn(), crearDesdeOnboarding: vi.fn() } }));
vi.mock('../../services/landingService', () => ({ landingService: { paginas: vi.fn(), obtener: vi.fn() } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn() }));

const producto = (extra) => ({
  id: 1, tipo: 'producto', nombre: 'Taza Ceraflame', precio_base: 85000, precio_efectivo: 85000,
  stock: 10, creado_por: null, categoria: 'Cocina y comedor', ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  verificarSesion.mockResolvedValue({ id: 42, rol: 'usuario' });
  metaFeedService.estadoActual.mockResolvedValue({ landing_id: 91, url: '', activo: false, seleccionados: 0, cantidad: 0, limite: 5000, omitidos: [] });
  landingSimpleService.listar.mockResolvedValue([]);
  landingSimpleService.obtener.mockResolvedValue({ id: 10, items: [] });
  landingService.paginas.mockResolvedValue([]);
  vitrinaService.catalogo.mockResolvedValue({ productos: [], combos: [] });
});

function montar(items, proveedores) {
  vitrinaService.catalogoPaginado.mockResolvedValue({ items, categorias: [], proveedores, totalPages: 1, total: items.length });
  return render(<BrowserRouter><VitrinaGrid /></BrowserRouter>);
}

describe('de qué proveedor es cada producto', () => {
  it('muestra el logo del proveedor sobre la tarjeta', async () => {
    montar([producto({ proveedor: 'Quanta', proveedor_logo: 'https://cdn.quanta.test/logo.png' })], ['Quanta']);

    const chip = await screen.findByTitle('Proveedor: Quanta');
    expect(chip).toHaveTextContent('Quanta');
    expect(chip.querySelector('img')).toHaveAttribute('src', 'https://cdn.quanta.test/logo.png');
  });

  it('sin logo cargado, igual dice de quién es', async () => {
    montar([producto({ proveedor: 'Ceraflame', proveedor_logo: null })], ['Ceraflame']);

    const chip = await screen.findByTitle('Proveedor: Ceraflame');
    expect(chip).toHaveTextContent('Ceraflame');
    expect(chip.querySelector('img')).toBeNull();
  });

  it('un producto propio, sin proveedor, no muestra nada', async () => {
    montar([producto({ proveedor: null, proveedor_logo: null })], []);

    await screen.findByText('Taza Ceraflame');
    expect(screen.queryByTitle(/^Proveedor:/)).toBeNull();
  });

  it('el filtro lista los proveedores que llegan del backend', async () => {
    montar([producto({ proveedor: 'Quanta', proveedor_logo: null })], ['Quanta', 'Ceraflame']);

    await waitFor(() => expect(screen.getByTitle('Filtrar por proveedor')).toBeInTheDocument());
    const filtro = screen.getByTitle('Filtrar por proveedor');
    expect([...filtro.options].map(o => o.textContent))
      .toEqual(['Todos los proveedores', 'Quanta', 'Ceraflame']);
  });
});
