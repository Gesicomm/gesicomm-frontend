import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));

// Tienda grande: 130 de Minorista primero y 20 de Informática después, o
// sea, todos los de Informática caen fuera del corte de la vista previa.
const productos = Array.from({ length: 150 }, (_, idx) => {
  const id = idx + 1;
  const info = id > 130;
  return {
    tipo: 'producto', id, slug: info ? `notebook-${id}` : `minorista-${id}`,
    nombre: info ? `Notebook ${id}` : `Minorista ${id}`,
    categoria: info ? 'Informática y gaming' : 'Minorista', precio_efectivo: 100000,
  };
});

// El servidor de verdad (vitrina/catalogo-paginado): busca, filtra y pagina.
const catalogoPaginado = vi.fn(async (filtros) => {
  let lista = productos;
  if (filtros.filtroCategoria) lista = lista.filter(p => p.categoria === filtros.filtroCategoria);
  if (filtros.busqueda) lista = lista.filter(p => p.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()));
  const desde = (filtros.page - 1) * filtros.limit;
  return {
    items: lista.slice(desde, desde + filtros.limit),
    total: lista.length,
    totalPages: Math.ceil(lista.length / filtros.limit),
    categorias: ['Informática y gaming', 'Minorista'],
  };
});
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogoPaginado: (...a) => catalogoPaginado(...a) } }));

const { default: ConfigurarVentaCodigo } = await import('./ConfigurarVentaCodigo');

afterEach(() => { cleanup(); catalogoPaginado.mockClear(); });

const datosPreview = () => JSON.parse(screen.getAllByTestId('preview-datos')[0].textContent);

function montar() {
  const confirmar = vi.fn().mockResolvedValue(true);
  // La landing vende todo menos el último producto.
  const enLanding = productos.slice(0, 149);
  render(<ConfigurarVentaCodigo catalogo={{ productos, combos: [] }} inicial={{ seleccion: enLanding }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

async function abrirBloqueProductos() {
  fireEvent.click(screen.getByRole('button', { name: /^\d*\s*Productos$/ }));
  await screen.findByPlaceholderText('Buscar producto');
}

describe('Bloque Productos del inicio en una tienda grande', () => {
  it.each(['carrusel', 'filas'])('envía el formato %s a la vista previa y al guardado', async formato => {
    const confirmar = montar();
    await abrirBloqueProductos();
    fireEvent.change(screen.getByLabelText('Mostrar productos como'), { target: { value: formato } });
    expect(datosPreview().venta.inicio.productos_categoria.formato).toBe(formato);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(confirmar.mock.calls[0][0].venta.inicio.productos_categoria.formato).toBe(formato);
  });

  it('pide al servidor de a 10 y pagina', async () => {
    montar();
    await abrirBloqueProductos();
    await waitFor(() => expect(screen.getByText('Página 1 de 15')).toBeTruthy());
    expect(catalogoPaginado).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 10 }), expect.anything());
    expect(screen.getByText('Minorista 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(screen.getByText('Página 2 de 15')).toBeTruthy());
    expect(screen.getByText('Minorista 11')).toBeTruthy();
    expect(screen.queryByText('Minorista 1')).toBeNull();
  });

  it('filtra por categoría y búsqueda en el servidor; lo elegido fuera del corte llega a la vista previa y al guardado', async () => {
    const confirmar = montar();
    await abrirBloqueProductos();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Informática y gaming' })).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Todas las categorías'), { target: { value: 'Informática y gaming' } });
    await waitFor(() => expect(screen.getByText('Página 1 de 2')).toBeTruthy());
    expect(catalogoPaginado).toHaveBeenLastCalledWith(expect.objectContaining({ filtroCategoria: 'Informática y gaming', page: 1 }), expect.anything());

    fireEvent.change(screen.getByPlaceholderText('Buscar producto'), { target: { value: 'Notebook 145' } });
    await waitFor(() => expect(catalogoPaginado).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: 'Notebook 145' }), expect.anything()), { timeout: 2000 });
    const boton = await screen.findByRole('button', { name: /Notebook 145/ });
    await act(async () => { fireEvent.click(boton); });

    const datos = datosPreview();
    const ids = datos.productos.map(p => p.content_id || p.id);
    expect(ids).toContain('notebook-145');
    expect(datos.venta.inicio.productos_categoria.items).toEqual(['notebook-145']);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(confirmar.mock.calls[0][0].venta.inicio.productos_categoria.items).toEqual(['notebook-145']);
  });

  it('un producto que la landing no vende aparece pero no se puede elegir', async () => {
    montar();
    await abrirBloqueProductos();
    fireEvent.change(screen.getByPlaceholderText('Buscar producto'), { target: { value: 'Notebook 150' } });
    const boton = await screen.findByRole('button', { name: /Notebook 150/ }, { timeout: 2000 });
    expect(boton.disabled).toBe(true);
    expect(within(boton).getByText('No está en esta landing')).toBeTruthy();
  });
});
