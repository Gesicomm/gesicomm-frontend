import React from 'react';
import { beforeEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConexionLogistica from './ConexionLogistica';
import { rahaService } from '../../services/rahaService';
import { speedboxService } from '../../services/speedboxService';

vi.mock('../../services/rahaService', () => ({ rahaService: { obtener: vi.fn() } }));
vi.mock('../../services/speedboxService', () => ({ speedboxService: { obtener: vi.fn() } }));
const solicitud = { id: 1, estado: 'borrador', version: 1, datos: {}, documentos: [], historial: [] };
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  rahaService.obtener.mockResolvedValue({ ...solicitud });
  speedboxService.obtener.mockResolvedValue({ connections: [], checks: {}, events: [], orders: [], production_request_url: 'https://example.test/produccion' });
});

it('shows the provider and opens its existing document application on demand', async () => {
  render(<ConexionLogistica tienda={{ id: 1, nombre: 'Mi negocio' }} />);
  expect(screen.getByAltText('Rahá')).toHaveAttribute('src', '/providers/raha.png');
  expect(screen.getByText('Más de 3.500 productos')).toBeVisible();
  expect(screen.getByText('Entregas de 24 a 48 horas')).toBeVisible();
  expect(screen.queryByLabelText('Razón social')).not.toBeInTheDocument();
  const conectar = await screen.findByRole('button', { name: 'Conectarme a Rahá' });
  await waitFor(() => expect(conectar).toBeEnabled());
  fireEvent.click(conectar);
  expect(await screen.findByLabelText('Razón social')).toHaveValue('Mi negocio');
  expect(screen.getByLabelText('Adjuntar Constancia de RUC')).toBeInTheDocument();
  expect(screen.getByLabelText('Adjuntar Cédula del representante legal')).toBeInTheDocument();
});

it.each(['borrador', 'en_revision', 'enviada_raha', 'observada', 'rechazada'])('blocks validation for %s, including a legacy validation link', async estado => {
  rahaService.obtener.mockResolvedValue({ ...solicitud, estado });
  render(<ConexionLogistica abrirValidacion />);
  await waitFor(() => expect(rahaService.obtener).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Validar cuenta' })).toBeDisabled();
  expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Rahá tiene que aprobar tu solicitud');
  expect(speedboxService.obtener).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Public key')).not.toBeInTheDocument();
});

it('unlocks the real keys and sandbox checks after approval', async () => {
  rahaService.obtener.mockResolvedValue({ ...solicitud, estado: 'aprobada' });
  render(<ConexionLogistica />);
  await screen.findByText('Validación pendiente');
  fireEvent.click(screen.getByRole('button', { name: 'Validar cuenta' }));
  expect(await screen.findByLabelText('Public key')).toBeVisible();
  expect(screen.getByLabelText('Private key')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Solicitar habilitación en producción' })).toBeDisabled();
});

it('refreshes approval and enables the next step without reloading the page', async () => {
  rahaService.obtener.mockResolvedValueOnce({ ...solicitud, estado: 'en_revision' }).mockResolvedValue({ ...solicitud, estado: 'aprobada' });
  render(<ConexionLogistica />);
  await screen.findByText('Enviada a Raha');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado de Rahá' }));
  await screen.findByText('Validación pendiente');
  expect(screen.getByRole('button', { name: 'Validar cuenta' })).toBeEnabled();
});

it('keeps validation locked when the status cannot be fetched and allows retrying', async () => {
  rahaService.obtener.mockRejectedValueOnce(new Error('offline'));
  render(<ConexionLogistica />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Validar cuenta' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado de Rahá' }));
  await screen.findByText('Trámite no iniciado');
  expect(screen.getByRole('button', { name: 'Conectarme a Rahá' })).toBeEnabled();
});

it('opens legacy validation links after approval and allows production only when all checks passed', async () => {
  rahaService.obtener.mockResolvedValue({ ...solicitud, estado: 'aprobada' });
  speedboxService.obtener.mockResolvedValue({ connections: [], checks: { spec: true, store: true, order: true, updates: true, webhook: true }, events: [], orders: [], production_request_url: 'https://example.test/produccion' });
  render(<ConexionLogistica abrirValidacion />);
  expect(await screen.findByLabelText('Public key')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Solicitar habilitación en producción' })).toHaveAttribute('href', 'https://example.test/produccion');
});

it('locks validation again if refreshing an approved application fails', async () => {
  rahaService.obtener.mockResolvedValueOnce({ ...solicitud, estado: 'aprobada' }).mockRejectedValue(new Error('offline'));
  render(<ConexionLogistica />);
  await screen.findByText('Validación pendiente');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado de Rahá' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Validar cuenta' })).toBeDisabled();
});
