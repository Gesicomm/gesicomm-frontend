import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { RendicionTab } from './RendicionTab';
import { getSaldosPendientesRendicion, previsualizarLiquidacion } from '../../services/courierApi';

vi.mock('../../services/courierApi', () => ({
  getSaldosPendientesRendicion: vi.fn(),
  previsualizarLiquidacion: vi.fn(),
  confirmarLiquidacion: vi.fn(),
  getLiquidacionesPorCourier: vi.fn().mockResolvedValue([]),
}));

afterEach(() => vi.clearAllMocks());

const couriers = [
  { id: 1, nombre: 'Delivery propio', activo: true },
  { id: 2, nombre: 'Courier QA viejo', activo: false },
];

test('arranca mostrando qué falta rendir y "Rendir" precarga courier y fechas', async () => {
  getSaldosPendientesRendicion.mockResolvedValue([
    { courier_id: 1, nombre: 'Delivery propio', cantidad_pedidos: 3, saldo_final: -75000, desde: '2026-10-02', hasta: '2026-10-20' },
  ]);
  previsualizarLiquidacion.mockResolvedValue({ cantidad_pedidos: 3, saldo_final: -75000, mensaje_saldo: 'La tienda debe pagar al courier', detalle: [] });
  render(<RendicionTab couriers={couriers} />);
  expect(await screen.findByText(/Le pagás .*75.000/)).toBeInTheDocument();
  expect(screen.getByText('3 pedidos desde 02/10/2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rendir' }));
  await waitFor(() => expect(previsualizarLiquidacion).toHaveBeenCalledWith(expect.objectContaining({ courier_id: '1', fecha_desde: '2026-10-02' })));
});

test('los couriers archivados no aparecen para elegir si no tienen nada pendiente', async () => {
  getSaldosPendientesRendicion.mockResolvedValue([]);
  render(<RendicionTab couriers={couriers} />);
  expect(await screen.findByText('No hay pedidos entregados ni perdidos pendientes de rendir.')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Courier QA viejo' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Delivery propio' })).toBeInTheDocument();
});
