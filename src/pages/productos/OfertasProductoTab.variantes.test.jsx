import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OfertasProductoTab from './OfertasProductoTab';

vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarPorProducto: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: {
  buscar: vi.fn().mockResolvedValue([{ id: 7, nombre: 'Producto QA', activo: true, precio_base: 10000 }]),
  variantes: vi.fn().mockResolvedValue([{ id: 71, nombre: 'Arena QA', activo: true }, { id: 72, nombre: 'Oliva QA', activo: true }]),
} }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { obtenerConfiguracion: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 201, rol: 'usuario' }) }));
vi.mock('../../components/OfertaImagenPicker', () => ({ default: () => null, subirImagenPendiente: vi.fn() }));
vi.mock('../../services/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }) }, getMediaUrl: value => value }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

async function preparar() {
  const onBorradoresChange = vi.fn();
  render(<OfertasProductoTab productoId={7} productoNombre="Producto QA" productoAnclaPrecioBase={10000} borradores={[]} onBorradoresChange={onBorradoresChange} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Nueva oferta' }));
  await screen.findByRole('combobox', { name: 'Variante del paquete' });
  fireEvent.change(screen.getByPlaceholderText('Ej. Llevá 2 y ahorrá'), { target: { value: 'Pack QA' } });
  const precio = screen.getByText('Precio del paquete', { selector: 'label' }).parentElement.querySelector('input');
  fireEvent.change(precio, { target: { value: '18000' } });
  return onBorradoresChange;
}

describe('Paquetes de productos con variantes', () => {
  it('permite elegir variante fija y la conserva al cambiar unidades', async () => {
    const guardar = await preparar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Variante del paquete' }), { target: { value: '71' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Unidades del paquete' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar oferta al producto' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledWith([expect.objectContaining({
      componentes: [expect.objectContaining({ producto_id: 7, variante_id: 71, cantidad: 3, permite_elegir_variante: false })],
    })]));
  });
  it('permite que el cliente elija y conserva esa decisión al cambiar unidades', async () => {
    const guardar = await preparar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dejar que el cliente elija la variante del paquete' }));
    expect(screen.queryByRole('combobox', { name: 'Variante del paquete' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Unidades del paquete' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar oferta al producto' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledWith([expect.objectContaining({
      componentes: [expect.objectContaining({ producto_id: 7, variante_id: null, cantidad: 4, permite_elegir_variante: true })],
    })]));
  });
});
