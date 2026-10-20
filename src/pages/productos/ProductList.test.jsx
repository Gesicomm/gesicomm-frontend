import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProductList from './ProductList';
import { productService } from '../../services/productService';

vi.mock('../../services/productService', () => ({ productService: {
  buscar: vi.fn(),
  importarShopify: vi.fn(),
  importarMasivo: vi.fn(),
  formatoImportacion: vi.fn(),
  descargarPlantillaImportacion: vi.fn().mockResolvedValue(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
} }));
vi.mock('../../services/catalogoService', () => ({ categoriaService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/costosGastosService', () => ({ proveedoresService: { buscar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 9, rol: 'tienda' }) }));

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
  productService.formatoImportacion.mockResolvedValue({
    hoja: 'Productos', max_productos: 500, max_imagenes: 6,
    columnas: [
      { titulo: 'SKU', obligatoria: true, ayuda: 'Código único del producto.', ejemplo: 'MOUSE-INAL-01' },
      { titulo: 'Imágenes (links)', obligatoria: true, ayuda: 'Links públicos de las fotos.', ejemplo: 'https://mitienda.com/fotos/mouse-1.jpg' },
      { titulo: 'Precio ancla', obligatoria: false, ayuda: 'Precio tachado.', ejemplo: '116000' },
    ],
  });
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
  const montarLista = () => render(<MemoryRouter><ProductList /></MemoryRouter>);

  it('busca al escribir sin Enter y vuelve a página 1 sin pedir la página anterior con el texto nuevo', async () => {
    const respuesta = await productService.buscar();
    productService.buscar.mockClear();
    productService.buscar.mockResolvedValue({ ...respuesta, total: 30, total_paginas: 3 });
    montarLista();
    await screen.findByText('Calefactor QA');
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(productService.buscar.mock.calls.at(-1)[0].page).toBe(2));
    await screen.findByText('Calefactor QA');
    productService.buscar.mockClear();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar productos' }), { target: { value: 'cale' } });
    expect(screen.getByText('Buscando...')).toBeVisible();
    expect(productService.buscar).not.toHaveBeenCalled();
    await waitFor(() => expect(productService.buscar).toHaveBeenCalledTimes(1));
    expect(productService.buscar.mock.calls[0][0]).toMatchObject({ texto: 'cale', page: 1 });
  });

  it('Enter adelanta la búsqueda y el timer pendiente no la repite', async () => {
    montarLista();
    await screen.findByText('Calefactor QA');
    productService.buscar.mockClear();
    const campo = screen.getByRole('textbox', { name: 'Buscar productos' });
    fireEvent.change(campo, { target: { value: 'calefactor' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(productService.buscar).toHaveBeenCalledTimes(1);
    await act(() => new Promise(resolve => setTimeout(resolve, 250)));
    expect(productService.buscar).toHaveBeenCalledTimes(1);
  });

  it('cancela solicitudes anteriores y descarta su respuesta aunque lleguen después', async () => {
    const respuesta = await productService.buscar();
    productService.buscar.mockClear();
    let responderAnterior;
    productService.buscar.mockImplementationOnce(() => new Promise(resolve => { responderAnterior = resolve; }))
      .mockResolvedValueOnce({ ...respuesta, productos: [{ ...respuesta.productos[0], nombre: 'Resultado actual' }] });
    const { unmount } = montarLista();
    const signalAnterior = productService.buscar.mock.calls[0][1].signal;
    const campo = screen.getByRole('textbox', { name: 'Buscar productos' });
    fireEvent.change(campo, { target: { value: 'actual' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    await screen.findByText('Resultado actual');
    expect(signalAnterior.aborted).toBe(true);
    await act(async () => responderAnterior(respuesta));
    expect(screen.queryByText('Calefactor QA')).toBeNull();
    expect(screen.getByText('Resultado actual')).toBeVisible();
    const signalActual = productService.buscar.mock.calls.at(-1)[1].signal;
    unmount();
    expect(signalActual.aborted).toBe(true);
  });

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

  it('permite abrir el modal para importar CSV o Excel de Shopify', async () => {
    render(
      <MemoryRouter initialEntries={['/mi-catalogo']}>
        <Routes>
          <Route path="/mi-catalogo" element={<ProductList />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Calefactor QA');
    fireEvent.click(screen.getByRole('button', { name: 'Importar mis productos' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Exportación de Shopify' }));

    expect(screen.getByRole('dialog', { name: 'Importar productos desde Shopify' })).toBeInTheDocument();
    expect(screen.getByText('Elegir archivo CSV, XLS o XLSX')).toBeInTheDocument();
  });

  describe('carga masiva con la plantilla de Gesicom', () => {
    const plantilla = new File(['x'], 'plantilla-productos-gesicom.xlsx');
    async function abrirConArchivo() {
      render(
        <MemoryRouter initialEntries={['/mi-catalogo']}>
          <Routes>
            <Route path="/mi-catalogo" element={<ProductList />} />
          </Routes>
        </MemoryRouter>
      );
      await screen.findByText('Calefactor QA');
      fireEvent.click(screen.getByRole('button', { name: 'Importar mis productos' }));
      fireEvent.change(screen.getByLabelText('Archivo a importar'), { target: { files: [plantilla] } });
    }

    it('explica paso a paso el formato del archivo, con las columnas que informa el backend, y ofrece la plantilla', async () => {
      await abrirConArchivo();
      const dialogo = screen.getByRole('dialog', { name: 'Importar mis productos' });
      const pasos = within(dialogo).getByRole('list', { name: 'Pasos para cargar productos masivamente' });
      expect(Array.from(pasos.children).map(li => li.querySelector('strong').textContent)).toEqual([
        'Descargá la plantilla.',
        'Completá una fila por producto',
        'Antes de subirlo, revisá esto:',
        'Subí el archivo acá abajo y tocá “Revisar archivo”.',
        'Confirmá con “Importar productos”.',
        'Después de importar,',
      ]);

      const filaFotos = (await within(dialogo).findByRole('rowheader', { name: /Imágenes \(links\) \*/ })).closest('tr');
      expect(filaFotos).toHaveTextContent('Obligatoria');
      expect(filaFotos).toHaveTextContent('Links públicos de las fotos.');
      expect(filaFotos).toHaveTextContent('https://mitienda.com/fotos/mouse-1.jpg');
      expect(within(dialogo).getByRole('rowheader', { name: /Precio ancla/ })).toHaveTextContent('Opcional');
      expect(within(dialogo).getByText(/hasta 500 productos/)).toBeInTheDocument();

      fireEvent.click(within(dialogo).getByRole('button', { name: 'Descargar plantilla (.xlsx)' }));
      expect(productService.descargarPlantillaImportacion).toHaveBeenCalledTimes(1);
    });

    it('revisa el archivo sin crear nada y recién al confirmar importa las filas sin errores', async () => {
      productService.importarMasivo
        .mockResolvedValueOnce({ aplicado: false, total_leidos: 3, listos: 2, creados: 0, imagenes: 0, errores_total: 1,
          errores: [{ hoja: 'Productos', fila: 4, sku: 'ROTO', error: 'Falta el precio de venta.' }] })
        .mockResolvedValueOnce({ aplicado: true, total_leidos: 3, listos: 2, creados: 2, imagenes: 5, errores_total: 1,
          errores: [{ hoja: 'Productos', fila: 4, sku: 'ROTO', error: 'Falta el precio de venta.' }] });
      await abrirConArchivo();

      fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
      await screen.findByText('2 de 3 productos listos para importar.');
      expect(productService.importarMasivo).toHaveBeenLastCalledWith(plantilla, { aplicar: false });
      expect(screen.getByText('Fila 4 · ROTO')).toBeInTheDocument();
      expect(screen.getByText('Falta el precio de venta.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Importar 2 productos' }));
      await screen.findByText(/2 de 3 productos importados\./);
      expect(productService.importarMasivo).toHaveBeenLastCalledWith(plantilla, { aplicar: true });
      expect(productService.buscar).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: /Importar \d/ })).toBeNull();
    });

    it('con todas las filas con error no deja importar y muestra el motivo del backend', async () => {
      productService.importarMasivo
        .mockResolvedValueOnce({ aplicado: false, total_leidos: 1, listos: 0, creados: 0, imagenes: 0, errores_total: 1,
          errores: [{ hoja: 'Productos', fila: 2, sku: null, error: 'Falta el SKU.' }] })
        .mockRejectedValueOnce({ response: { data: { message: 'Al archivo le faltan columnas obligatorias: SKU.' } } });
      await abrirConArchivo();

      fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
      await screen.findByText(/0 de 1 productos listos para importar\./);
      expect(screen.queryByRole('button', { name: /Importar \d/ })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
      await screen.findByText('Al archivo le faltan columnas obligatorias: SKU.');
    });
  });
});
