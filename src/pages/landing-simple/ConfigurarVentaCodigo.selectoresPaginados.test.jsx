import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { catalogoPaginadoFalso, usarCatalogoPaginado } from './catalogoPaginadoFalso';

vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listarPaymentLogos: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: { detalle: vi.fn().mockResolvedValue({}), faq: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: ({ datos }) => <output data-testid="preview-datos">{JSON.stringify(datos)}</output> }));
vi.mock('../../services/vitrinaService', async () => ({ vitrinaService: { catalogoPaginado: (await import('./catalogoPaginadoFalso')).catalogoPaginadoFalso } }));

const { default: ConfigurarVentaCodigo, PanelOfertas } = await import('./ConfigurarVentaCodigo');

/**
 * Los selectores de productos del editor (ficha, recomendados, recomendados
 * del checkout, panel de ofertas) usan el buscador paginado del servidor. Antes cortaban la lista en el cliente (300, 80, 200 productos):
 * en una tienda grande, lo que quedaba atrás no se podía elegir. Acá el
 * producto buscado está en el puesto 345, detrás de todos esos cortes.
 */
const productos = Array.from({ length: 350 }, (_, idx) => {
  const id = idx + 1;
  const info = id > 330;
  return {
    tipo: 'producto', id, slug: info ? `notebook-${id}` : `minorista-${id}`,
    nombre: info ? `Notebook ${id}` : `Minorista ${id}`,
    categoria: info ? 'Informática y gaming' : 'Minorista', precio_efectivo: 100000,
  };
});
// La landing vende todo menos el último.
const enLanding = productos.slice(0, 349);

afterEach(() => { cleanup(); catalogoPaginadoFalso.mockClear(); });

const datosPreview = () => JSON.parse(screen.getAllByTestId('preview-datos')[0].textContent);

function montar() {
  const confirmar = vi.fn().mockResolvedValue(true);
  usarCatalogoPaginado(productos);
  render(<ConfigurarVentaCodigo catalogo={{ productos, combos: [] }} inicial={{ seleccion: enLanding }} onConfirmar={confirmar} cargarOfertas={vi.fn().mockResolvedValue([])} onVolver={vi.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Celular', exact: true }));
  return confirmar;
}

function abrirPestana(nombre) {
  fireEvent.click(within(screen.getByRole('tablist', { name: 'Área de configuración' })).getByRole('tab', { name: nombre }));
}

// Busca en el buscador paginado número `indice` de la pantalla y devuelve el
// botón del resultado, que llega del servidor.
async function buscar(texto, indice = 0) {
  const buscadores = await waitFor(() => {
    const encontrados = screen.getAllByPlaceholderText('Buscar producto');
    expect(encontrados.length).toBeGreaterThan(indice);
    return encontrados;
  });
  fireEvent.change(buscadores[indice], { target: { value: texto } });
  await waitFor(() => expect(catalogoPaginadoFalso).toHaveBeenCalledWith(expect.objectContaining({ busqueda: texto, page: 1, limit: 10 }), expect.anything()), { timeout: 2000 });
  return waitFor(() => {
    const botones = screen.getAllByRole('button', { name: new RegExp(`^${texto}`), hidden: true });
    return botones[botones.length - 1];
  });
}

async function guardar(confirmar) {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(confirmar).toHaveBeenCalled());
  return confirmar.mock.calls[0][0].venta;
}

describe('Selectores de productos del editor en una tienda grande', () => {
  it('ficha de producto: el producto a editar se elige en el buscador paginado', async () => {
    montar();
    abrirPestana('Vista producto');
    const boton = await buscar('Notebook 345', 0);
    await act(async () => { fireEvent.click(boton); });
    await waitFor(() => expect(datosPreview().producto?.id).toBe('notebook-345'));
  });

  it('recomendados de la ficha: elige uno que estaba detrás del corte de 80', async () => {
    const confirmar = montar();
    abrirPestana('Vista producto');
    fireEvent.click(screen.getAllByRole('radio', { name: /Elegidos por vos/, hidden: true })[0]);
    // El primer buscador es el de la ficha; el segundo, el de recomendados.
    const boton = await buscar('Notebook 345', 1);
    await act(async () => { fireEvent.click(boton); });
    const venta = await guardar(confirmar);
    expect(venta.recomendados.items).toEqual(['notebook-345']);
  });

  it('recomendados del checkout: elige uno que estaba detrás del corte de 80', async () => {
    const confirmar = montar();
    abrirPestana('Checkout');
    const boton = await buscar('Notebook 345');
    await act(async () => { fireEvent.click(boton); });
    const venta = await guardar(confirmar);
    expect(venta.checkout_recomendados.items).toEqual(['notebook-345']);
  });

  it('un producto que la landing no vende aparece pero no se puede elegir', async () => {
    montar();
    abrirPestana('Checkout');
    const boton = await buscar('Notebook 350');
    expect(boton.disabled).toBe(true);
    expect(within(boton).getByText('No está en esta landing')).toBeTruthy();
  });
});

describe('Panel de ofertas: elegir el producto', () => {
  it('pagina en el servidor y entrega el producto de la landing, aunque esté detrás del corte de 200', async () => {
    usarCatalogoPaginado(productos);
    const onElegir = vi.fn();
    render(
      <PanelOfertas
        producto={null}
        productos={enLanding}
        enLanding={new Set(enLanding.map(p => p.id))}
        onElegir={onElegir}
        onCambiarProducto={vi.fn()}
        onCerrar={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('Página 1 de 35')).toBeTruthy());
    expect(catalogoPaginadoFalso).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 10, tipo: 'producto' }), expect.anything());
    fireEvent.click(await buscar('Notebook 345'));
    expect(onElegir).toHaveBeenCalledWith(expect.objectContaining({ id: 345, nombre: 'Notebook 345' }));
  });
});
