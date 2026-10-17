import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
  render(<ConfigurarVentaCodigo catalogo={{ productos: [...productos, { tipo: 'producto', id: 151, slug: 'externo', nombre: 'Producto ajeno', categoria: 'Categoría ajena', precio_efectivo: 100000 }], combos: [] }} inicial={{ seleccion: enLanding }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

async function abrirBloqueProductos() {
  fireEvent.click(screen.getByRole('button', { name: /^\d*\s*Productos$/ }));
  await screen.findByPlaceholderText('Buscar producto');
}

describe('Bloque Productos del inicio en una tienda grande', () => {
  it('Colecciones guarda sus textos y recibe categorías fuera del recorte de la vista previa', async () => {
    const confirmar = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Colecciones', exact: true }));
    fireEvent.change(screen.getByLabelText('Título de Colecciones'), { target: { value: 'Elegí tu categoría' } });
    fireEvent.change(screen.getByLabelText('Subtítulo de Colecciones'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Mostrar Informática y gaming'));
    const datos = datosPreview();
    expect(datos.categorias).toEqual(expect.arrayContaining([
      expect.objectContaining({ nombre: 'Informática y gaming', cantidad: 19 }),
      expect.objectContaining({ nombre: 'Minorista', cantidad: 130 }),
    ]));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(confirmar.mock.calls[0][0].venta.inicio.colecciones).toMatchObject({
      titulo: 'Elegí tu categoría', subtitulo: '', items: ['Informática y gaming'],
    });
  });

  it.each(['carrusel', 'filas'])('envía el formato %s a la vista previa y al guardado', async formato => {
    const confirmar = montar();
    await abrirBloqueProductos();
    fireEvent.change(screen.getByLabelText('Mostrar productos como'), { target: { value: formato } });
    expect(datosPreview().venta.inicio.productos_categoria.formato).toBe(formato);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(confirmar.mock.calls[0][0].venta.inicio.productos_categoria.formato).toBe(formato);
  });

  it('pagina de a 10 únicamente la selección de la landing sin consultar el catálogo general', async () => {
    montar();
    await abrirBloqueProductos();
    await waitFor(() => expect(screen.getByText('Página 1 de 15')).toBeTruthy());
    expect(catalogoPaginado).not.toHaveBeenCalled();
    expect(screen.getAllByText('149 productos').length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: 'Categoría ajena' })).toBeNull();
    expect(screen.getByText('Minorista 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(screen.getByText('Página 2 de 15')).toBeTruthy());
    expect(screen.getByText('Minorista 11')).toBeTruthy();
    expect(screen.queryByText('Minorista 1')).toBeNull();
    for (let pagina = 2; pagina < 15; pagina++) fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('Página 15 de 15')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Notebook 149/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Notebook 150/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(true);
  });

  it('filtra la selección por categoría y búsqueda; lo elegido fuera del corte llega a la vista previa y al guardado', async () => {
    const confirmar = montar();
    await abrirBloqueProductos();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Informática y gaming' })).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Todas las categorías'), { target: { value: 'Informática y gaming' } });
    await waitFor(() => expect(screen.getByText('Página 1 de 2')).toBeTruthy());
    expect(screen.getByText('19 productos')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Buscar producto'), { target: { value: 'Notebook 145' } });
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

  it('no muestra productos que la landing no vende, ni al buscarlos', async () => {
    montar();
    await abrirBloqueProductos();
    fireEvent.change(screen.getByPlaceholderText('Buscar producto'), { target: { value: 'Notebook 150' } });
    await waitFor(() => expect(screen.getByText('No hay productos que coincidan.')).toBeTruthy(), { timeout: 2000 });
    expect(screen.queryByRole('button', { name: /Notebook 150/ })).toBeNull();
    expect(screen.queryByText('No está en esta landing')).toBeNull();
    expect(screen.getByText('0 productos')).toBeTruthy();
    expect(catalogoPaginado).not.toHaveBeenCalled();
  });
});
