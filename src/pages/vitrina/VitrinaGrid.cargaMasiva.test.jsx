import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VitrinaGrid from './VitrinaGrid';
import { vitrinaService } from '../../services/vitrinaService';
import { productService } from '../../services/productService';

vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogoPaginado: vi.fn(), catalogo: vi.fn() } }));
vi.mock('../../services/productService', () => ({ productService: {
  formatoImportacion: vi.fn(), importarMasivo: vi.fn(), descargarPlantillaImportacion: vi.fn(), importarShopify: vi.fn(),
} }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { listar: vi.fn().mockResolvedValue([]), obtener: vi.fn() } }));
vi.mock('../../services/landingService', () => ({ landingService: { paginas: vi.fn().mockResolvedValue([]), obtener: vi.fn() } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 42, rol: 'usuario' }) }));

beforeEach(() => {
  vitrinaService.catalogoPaginado.mockResolvedValue({ items: [], categorias: [], proveedores: [], totalPages: 1, total: 0 });
  productService.formatoImportacion.mockResolvedValue({
    hoja: 'Productos', max_productos: 500, max_imagenes: 6,
    columnas: [{ titulo: 'SKU', obligatoria: true, ayuda: 'Código único del producto.', ejemplo: 'MOUSE-INAL-01' }],
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// El usuario de tienda entra a Productos por la vitrina (/mi-catalogo), no
// por el listado del admin: la carga masiva tiene que estar acá.
describe('Carga masiva desde Productos del panel de usuario', () => {
  it('el botón abre el pop-up con el paso a paso y, al importar, recarga el catálogo', async () => {
    productService.importarMasivo
      .mockResolvedValueOnce({ aplicado: false, total_leidos: 2, listos: 2, creados: 0, imagenes: 0, errores_total: 0, errores: [] })
      .mockResolvedValueOnce({ aplicado: true, total_leidos: 2, listos: 2, creados: 2, imagenes: 3, errores_total: 0, errores: [] });
    render(<BrowserRouter><VitrinaGrid /></BrowserRouter>);
    await screen.findByText('Agregar Mis Productos');
    await waitFor(() => expect(vitrinaService.catalogoPaginado).toHaveBeenCalled());
    const cargasAntes = vitrinaService.catalogoPaginado.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Importar mis productos' }));
    const dialogo = screen.getByRole('dialog', { name: 'Importar mis productos' });
    expect(within(dialogo).getByRole('list', { name: 'Pasos para cargar productos masivamente' })).toBeInTheDocument();
    expect(await within(dialogo).findByRole('rowheader', { name: /SKU \*/ })).toBeInTheDocument();

    const archivo = new File(['x'], 'mis-productos.xlsx');
    fireEvent.change(within(dialogo).getByLabelText('Archivo a importar'), { target: { files: [archivo] } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar archivo' }));
    await within(dialogo).findByText('2 de 2 productos listos para importar.');
    expect(vitrinaService.catalogoPaginado).toHaveBeenCalledTimes(cargasAntes);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Importar 2 productos' }));
    await within(dialogo).findByText(/2 de 2 productos importados\./);
    expect(productService.importarMasivo).toHaveBeenLastCalledWith(archivo, { aplicar: true });
    expect(vitrinaService.catalogoPaginado.mock.calls.length).toBeGreaterThan(cargasAntes);

    fireEvent.click(within(dialogo).getByText('Cerrar'));
    expect(screen.queryByRole('dialog', { name: 'Importar mis productos' })).toBeNull();
  });
});
