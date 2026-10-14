import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import SpeedboxConfig from './SpeedboxConfig';
import { speedboxService } from '../../services/speedboxService';
vi.mock('../../services/speedboxService', () => ({ speedboxService: { obtener: vi.fn(), guardar: vi.fn(), vincular: vi.fn(), probar: vi.fn(), enviarPrueba: vi.fn(), sincronizar: vi.fn(), reintentar: vi.fn(), enviar: vi.fn(), conciliar: vi.fn() } }));
const config = { environment: 'sandbox', credentials_configured: true, webhook_configured: true, automatic_enabled: true,
  sandbox_endpoint: 'https://speedboxpy.com/api/speedbox_sandbox.php', production_request_url: 'https://speedboxpy.com/speedbox_api_cliente.php',
  create_store_endpoint: '/api/integraciones/speedbox/store',
  webhook_url: 'https://api.example.test/api/webhooks/speedbox?environment=sandbox&token=12345678901234567890123456789012',
  production_webhook_url: 'https://api.example.test/api/webhooks/speedbox?environment=production&token=12345678901234567890123456789012',
  sandbox_webhook_url: 'https://api.example.test/api/webhooks/speedbox?environment=sandbox&token=12345678901234567890123456789012',
  public_key: 'sbx_saved_public', has_private_key: true,
  connection: { environment: 'sandbox', tienda_id: '54', courier_id: 2, activo: true, public_key: 'sbx_saved_public', has_private_key: true },
  connections: [
    { environment: 'sandbox', tienda_id: '54', courier_id: 2, activo: true, public_key: 'sbx_saved_public', has_private_key: true },
    { environment: 'production', tienda_id: 'prod-54', courier_id: null, activo: true, public_key: 'sbx_live_saved', has_private_key: true },
  ],
  checks: { spec: true, store: true, order: false, updates: false, webhook: false }, orders: [], events: [], available_orders: [] };
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
  speedboxService.obtener.mockResolvedValue(structuredClone(config));
});
describe('Speedbox settings', () => {
  it('conciles only with an explicit concept, reference and note', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config,
      solicitudes_abastecimiento: [{ id: 4, estado: 'pago_validado', costo_producto: 50000, costo_logistico: 12000 }],
      events: [{ id: 3, event_key: 'id:evt-3', tipo: 'wallet.transaction', payload: { data: { amount: 50000, direction: 'debit' } } }] });
    render(<SpeedboxConfig />);
    fireEvent.click(await screen.findByRole('button', { name: 'Conciliar movimiento 3' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('button', { name: 'Conciliar' })).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText('Concepto'), { target: { value: 'pago_proveedor' } });
    expect(within(modal).queryByRole('option', { name: 'Cobro al cliente' })).not.toBeInTheDocument();
    fireEvent.change(within(modal).getByLabelText('Referencia'), { target: { value: 'solicitud:4' } });
    fireEvent.change(within(modal).getByLabelText('Nota de conciliacion'), { target: { value: 'Comprobante cotejado' } });
    fireEvent.submit(within(modal).getByRole('button', { name: 'Conciliar' }).closest('form'));
    await waitFor(() => expect(speedboxService.conciliar).toHaveBeenCalledWith(3, { concepto: 'pago_proveedor', envio_id: null, solicitud_id: 4, nota: 'Comprobante cotejado' }));
  });
  it('keeps an observation without remote ID unavailable for reconciliation', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config, events: [{ id: 3, event_key: 'hash:observation', tipo: 'wallet.transaction', estado: 'revision', payload: { data: { amount: 5000, direction: 'credit' } } }] });
    render(<SpeedboxConfig />);
    await screen.findByText('Sin conciliar');
    expect(screen.queryByRole('button', { name: 'Conciliar movimiento 3' })).not.toBeInTheDocument();
  });
  it('saves activation without asking for a local courier', async () => {
    render(<SpeedboxConfig />);
    await screen.findByText(/RAHA gestiona su propio despacho/);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar producción' }));
    await waitFor(() => expect(speedboxService.guardar).toHaveBeenCalledWith({ environment: 'production', activo: true, public_key: 'sbx_live_saved' }));
    expect(screen.queryByLabelText('Courier RAHA')).not.toBeInTheDocument();
  });
  it('keeps inputs after a validation failure', async () => {
    speedboxService.guardar.mockRejectedValue({ response: { data: { message: 'Configura el token privado del webhook en el servidor.' } } });
    render(<SpeedboxConfig />);
    await screen.findByText(/RAHA gestiona su propio despacho/);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sandbox' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Configura el token privado del webhook en el servidor.');
    expect(screen.getByLabelText('Public key')).toHaveValue('sbx_saved_public');
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
  it('shows the RAHA traceability fields for sent orders', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config, orders: [{
      id: 1,
      envio_id: 31,
      envio: { numero_pedido: 903144 },
      external_order_id: 'GESICOMM-sandbox-7-31',
      order_id: '900000000123456',
      environment: 'sandbox',
      raha_tienda_id: '65',
      raha_store_name: 'sommix',
      estado: 'enviado',
      status: 'pendiente_confirmacion',
      remote_http_status: 201,
    }] });
    render(<SpeedboxConfig />);
    expect(await screen.findByText('Tienda RAHA')).toBeInTheDocument();
    expect(screen.getByText('#65 · sommix')).toBeInTheDocument();
    expect(screen.getByText('GESICOMM-sandbox-7-31')).toBeInTheDocument();
    expect(screen.getByText('900000000123456')).toBeInTheDocument();
    expect(screen.getByText('201')).toBeInTheDocument();
  });
  it('shows a pending order check until a real reception is recorded', async () => {
    render(<SpeedboxConfig />);
    const label = await screen.findByText('Recepción de pedido');
    expect(label.parentElement).toHaveTextContent('Pendiente');
  });

  it('shows the RAHA store creation endpoint and calls it from the validation panel', async () => {
    render(<SpeedboxConfig />);
    expect(await screen.findByText('/api/integraciones/speedbox/store')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear tienda sandbox en RAHA' }));
    await waitFor(() => expect(speedboxService.vincular).toHaveBeenCalledWith({ environment: 'sandbox', public_key: 'sbx_saved_public' }));
  });

  it('opens the official RAHA portal without leaking session or personal data', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config, production_request_url: 'https://speedboxpy.com/speedbox_api_cliente.php' });
    render(<SpeedboxConfig />);
    const link = await screen.findByRole('link', { name: /Abrir portal RAHA/ });
    expect(link).toHaveAttribute('href', 'https://speedboxpy.com/speedbox_api_cliente.php');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('keeps registration disabled until an official URL is configured', async () => {
    speedboxService.obtener.mockResolvedValue({ ...config, production_request_url: null });
    render(<SpeedboxConfig />);
    expect(await screen.findByRole('button', { name: 'Portal RAHA no disponible' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Abrir portal RAHA/ })).not.toBeInTheDocument();
  });

  it('uses pasted sandbox keys for validation and saves them for automatic orders', async () => {
    render(<SpeedboxConfig />);
    const publicInput = await screen.findByLabelText('Public key');
    fireEvent.change(publicInput, { target: { value: ' sbx_public ' } });
    fireEvent.change(screen.getByLabelText('Private key'), { target: { value: ' private_secret ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Probar autenticación' }));
    await waitFor(() => expect(speedboxService.probar).toHaveBeenCalledWith({ environment: 'sandbox', public_key: 'sbx_public', private_key: 'private_secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear tienda sandbox en RAHA' }));
    await waitFor(() => expect(speedboxService.vincular).toHaveBeenCalledWith({ environment: 'sandbox', public_key: 'sbx_public', private_key: 'private_secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido sandbox' }));
    await waitFor(() => expect(speedboxService.enviarPrueba).toHaveBeenCalledWith({ environment: 'sandbox', public_key: 'sbx_public', private_key: 'private_secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sandbox' }));
    await waitFor(() => expect(speedboxService.guardar).toHaveBeenCalledWith({ environment: 'sandbox', activo: true, public_key: 'sbx_public', private_key: 'private_secret' }));
  });

  it('stores production credentials separately from sandbox', async () => {
    render(<SpeedboxConfig />);
    fireEvent.change(await screen.findByLabelText('Public key producción'), { target: { value: ' sbx_live_public ' } });
    fireEvent.change(screen.getByLabelText('Private key producción'), { target: { value: ' live_private ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar producción' }));
    await waitFor(() => expect(speedboxService.guardar).toHaveBeenCalledWith({ environment: 'production', activo: true, public_key: 'sbx_live_public', private_key: 'live_private' }));
  });

  it('copies the webhook URL for RAHA', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<SpeedboxConfig />);
    await screen.findByText(config.production_webhook_url);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar webhook' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(config.production_webhook_url));
    expect(screen.getByRole('status')).toHaveTextContent('Webhook copiado.');
  });

  it('builds and copies a production webhook even when the backend response has no URL', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    speedboxService.obtener.mockResolvedValue({ ...config, webhook_url: null, production_webhook_url: null, webhook_configured: false });
    render(<SpeedboxConfig />);
    const fallback = await screen.findByText(/\/api\/webhooks\/speedbox\?environment=production/);
    expect(fallback).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Copiar webhook' });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/api\/webhooks\/speedbox\?environment=production$/)));
  });

  it('normalizes an old sandbox webhook response before copying it for clients', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    speedboxService.obtener.mockResolvedValue({ ...config, production_webhook_url: null });
    render(<SpeedboxConfig />);
    await screen.findByText('https://api.example.test/api/webhooks/speedbox?environment=production&token=12345678901234567890123456789012');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar webhook' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://api.example.test/api/webhooks/speedbox?environment=production&token=12345678901234567890123456789012'));
  });

  it('shows saved private key state without revealing the secret', async () => {
    render(<SpeedboxConfig />);
    expect(await screen.findByText('Guardadas o listas para validar')).toBeInTheDocument();
    expect(screen.getByLabelText('Private key')).toHaveAttribute('placeholder', 'Private key guardada. Pegá una nueva para reemplazarla.');
    expect(screen.getByLabelText('Private key')).toHaveValue('');
  });
});
