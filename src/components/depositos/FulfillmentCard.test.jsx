import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import FulfillmentCard from './FulfillmentCard';
import { tiendaService } from '../../services/tiendaService';

vi.mock('../../services/tiendaService', () => ({ tiendaService: {
  obtenerFulfillment: vi.fn(), listarDepositosFulfillment: vi.fn(), guardarFulfillment: vi.fn(),
} }));
vi.mock('../fulfillment/FulfillmentCoverageViewer', () => ({ default: () => null }));
const config = { modalidad: 'PROPIA', deposito_fulfillment_id: 1, propia: { disponible: true, total_depositos: 2 }, gesicomm: { disponible: true, costo_desde: 30000 } };
beforeEach(() => {
  vi.clearAllMocks();
  tiendaService.obtenerFulfillment.mockResolvedValue(config);
  tiendaService.listarDepositosFulfillment.mockResolvedValue({ data: [{ id: 1, nombre: 'Central', ciudad: 'Asunción' }, { id: 2, nombre: 'Sucursal Luque', ciudad: 'Luque' }], total: 2, totalPages: 1 });
});

test('guarda envíos propios sin elegir ni cargar otro listado de depósitos', async () => {
  tiendaService.obtenerFulfillment.mockResolvedValue({ ...config, modalidad: 'GESICOMM' });
  tiendaService.guardarFulfillment.mockResolvedValue({ ...config, deposito_fulfillment_id: null });
  render(<MemoryRouter><FulfillmentCard /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Mis propios envíos/ }));
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByText('Central')).toBeNull();
  expect(tiendaService.listarDepositosFulfillment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
  await waitFor(() => expect(tiendaService.guardarFulfillment).toHaveBeenCalledWith('PROPIA', null));
});

test('solo notifica la nueva modalidad cuando se guarda y Gesicom no exige un depósito propio', async () => {
  const onConfiguracion = vi.fn();
  const guardada = { ...config, modalidad: 'GESICOMM' };
  tiendaService.guardarFulfillment.mockResolvedValue(guardada);
  render(<MemoryRouter><FulfillmentCard onConfiguracion={onConfiguracion} /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Gesicom-RAHA gestiona la entrega/ }));
  expect(screen.queryByRole('heading', { name: 'Depósito de referencia para los envíos de tu tienda' })).toBeNull();
  expect(onConfiguracion).not.toHaveBeenCalledWith(guardada);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
  await waitFor(() => expect(tiendaService.guardarFulfillment).toHaveBeenCalledWith('GESICOMM', null));
  await waitFor(() => expect(onConfiguracion).toHaveBeenCalledWith(guardada));
});
