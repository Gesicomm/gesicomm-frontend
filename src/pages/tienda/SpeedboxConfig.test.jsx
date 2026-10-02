import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import SpeedboxConfig from './SpeedboxConfig';
import { speedboxService } from '../../services/speedboxService';
import { getCouriers } from '../../services/courierApi';
vi.mock('../../services/speedboxService', () => ({ speedboxService: { obtener: vi.fn(), guardar: vi.fn(), vincular: vi.fn(), probar: vi.fn(), sincronizar: vi.fn(), reintentar: vi.fn(), enviar: vi.fn() } }));
vi.mock('../../services/courierApi', () => ({ getCouriers: vi.fn() }));
const config = { environment: 'sandbox', credentials_configured: true, webhook_configured: true, automatic_enabled: true,
  connection: { tienda_id: '54', courier_id: 2, activo: true }, checks: { spec: true, order: false, updates: false, webhook: false }, orders: [], events: [], available_orders: [] };
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
  speedboxService.obtener.mockResolvedValue(structuredClone(config));
  getCouriers.mockResolvedValue([{ id: 2, nombre: 'Speedbox', activo: true }, { id: 3, nombre: 'Otro', activo: true }]);
});
describe('Speedbox settings', () => {
  it('saves the chosen courier and activation without any credentials', async () => {
    render(<SpeedboxConfig />);
    fireEvent.change(await screen.findByLabelText('Courier Speedbox'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(speedboxService.guardar).toHaveBeenCalledWith({ courier_id: 3, activo: true }));
  });
  it('keeps inputs after a validation failure', async () => {
    speedboxService.guardar.mockRejectedValue({ response: { data: { message: 'Courier no disponible.' } } });
    render(<SpeedboxConfig />);
    fireEvent.change(await screen.findByLabelText('Courier Speedbox'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Courier no disponible.');
    expect(screen.getByLabelText('Courier Speedbox')).toHaveValue('3');
  });
  it('requires reconciliation before resending an uncertain submission', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config, orders: [{ id: 1, envio_id: 31, external_order_id: 'GESICOMM-sandbox-7-31', estado: 'incierto' }] });
    render(<SpeedboxConfig />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar pedido 31' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('button', { name: 'Reintentar' })).toBeDisabled();
    fireEvent.click(within(modal).getByRole('checkbox'));
    fireEvent.click(within(modal).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(speedboxService.reintentar).toHaveBeenCalledWith(31, true));
  });
  it('shows a pending order check until a real reception is recorded', async () => {
    render(<SpeedboxConfig />);
    const label = await screen.findByText('Recepción de pedido');
    expect(label.parentElement).toHaveTextContent('Pendiente');
  });
});
