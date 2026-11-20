import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MovilExpressRendiciones } from './MovilExpressRendiciones';
import { movilExpressService } from '../../services/movilExpressService';

vi.mock('../../services/movilExpressService', () => ({
  movilExpressService: {
    rendiciones: vi.fn(),
    rendicion: vi.fn(),
    decidirRendicion: vi.fn(),
    estadoDeCuenta: vi.fn().mockResolvedValue(undefined),
    comprobante: vi.fn().mockResolvedValue(undefined),
  },
}));

const resumen = (extra = {}) => ({
  rendition_id: 124, reference: 'LIQ-124',
  period: { from: '2026-11-16', to: '2026-11-16' },
  status: 'pending_merchant_review', direction: 'movil_express_pays_merchant',
  net: 127000, currency: 'PYG', orders_count: 1, allowed_actions: ['validate', 'reject'],
  ...extra,
});

const detalle = (extra = {}) => ({
  ...resumen(),
  amounts: { total_collected: 150000, service_cost: 23000, adjustments_net: 0, net: 127000, currency: 'PYG' },
  version: 'b148b6a727e702b5', sequence: 4,
  valid_actions: ['validate', 'reject'],
  allowed_actions: ['validate', 'reject'],
  blocked_actions: [],
  decision_authorization: { authorized: true },
  documentos: { estado_de_cuenta: true, comprobantes: [] },
  history: [{ at: '2026-11-16T17:33:30.000Z', event: 'validated_by_movil_express', by: 'movil_express', reason: null }],
  ...extra,
});

const abrirPrimera = async () => {
  const vista = render(<MovilExpressRendiciones />);
  fireEvent.click(await screen.findByRole('button', { name: /LIQ-124/ }));
  return vista;
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  movilExpressService.rendiciones.mockResolvedValue({ ok: true, financial_model: 'merchant', rendiciones: [resumen()] });
  movilExpressService.rendicion.mockResolvedValue({ ok: true, rendicion: detalle() });
});

describe('rendiciones de Móvil Express', () => {
  it('no se muestra si el comercio no trabaja con Móvil Express', async () => {
    movilExpressService.rendiciones.mockRejectedValue({ response: { status: 409, data: { message: 'Configurá primero la conexión.' } } });
    const { container } = render(<MovilExpressRendiciones />);
    await waitFor(() => expect(movilExpressService.rendiciones).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lista las rendiciones con el sentido del dinero y el neto', async () => {
    render(<MovilExpressRendiciones />);
    const fila = await screen.findByRole('button', { name: /LIQ-124/ });
    expect(within(fila).getByText('Te pagan')).toBeVisible();
    expect(within(fila).getByText(/127\.000/)).toBeVisible();
    expect(within(fila).getByText('Esperando que la valides')).toBeVisible();
  });

  it('los botones salen de allowed_actions, no de valid_actions', async () => {
    // Con las decisiones deshabilitadas por Móvil Express: hay acciones
    // válidas, pero ninguna ejecutable. No puede aparecer ningún botón.
    movilExpressService.rendicion.mockResolvedValue({
      ok: true,
      rendicion: detalle({
        allowed_actions: [],
        valid_actions: ['validate', 'reject'],
        blocked_actions: [{ action: 'validate', code: 'DECISIONS_NOT_ENABLED', resolved_by: 'movil_express', message: 'Disponible cuando Móvil Express habilite las decisiones.' }],
        decision_authorization: { authorized: false, code: 'DECISIONS_NOT_ENABLED' },
      }),
    });
    await abrirPrimera();
    expect(await screen.findByText('Disponible cuando Móvil Express habilite las decisiones.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Validar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    // El PDF se sigue pudiendo ver: lo que está apagado son las decisiones.
    expect(screen.getByRole('button', { name: /Estado de cuenta/ })).toBeVisible();
  });

  it('validar manda el estado y la versión que vio el comerciante', async () => {
    movilExpressService.decidirRendicion.mockResolvedValue({ ok: true, resultado: 'applied', rendicion: detalle({ status: 'pending_transfer', allowed_actions: [], blocked_actions: [] }) });
    await abrirPrimera();
    fireEvent.click(await screen.findByRole('button', { name: 'Validar' }));

    await waitFor(() => expect(movilExpressService.decidirRendicion).toHaveBeenCalled());
    const [id, cuerpo, clave] = movilExpressService.decidirRendicion.mock.calls[0];
    expect(id).toBe(124);
    expect(cuerpo).toMatchObject({ action: 'validate', expected_status: 'pending_merchant_review', expected_version: 'b148b6a727e702b5', expected_net: 127000 });
    expect(clave).toBeTruthy();
    expect(await screen.findByText('Listo, se lo mandamos a Móvil Express.')).toBeVisible();
  });

  it('rechazar exige un motivo antes de salir', async () => {
    await abrirPrimera();
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    // Se abre el formulario; sin motivo no se manda nada.
    fireEvent.click(screen.getByRole('button', { name: /^Rechazar$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/motivo/);
    expect(movilExpressService.decidirRendicion).not.toHaveBeenCalled();

    movilExpressService.decidirRendicion.mockResolvedValue({ ok: true, resultado: 'applied', rendicion: detalle({ status: 'rejected_by_merchant' }) });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'El neto no coincide.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Rechazar$/ }));
    await waitFor(() => expect(movilExpressService.decidirRendicion).toHaveBeenCalled());
    expect(movilExpressService.decidirRendicion.mock.calls[0][1].reason).toBe('El neto no coincide.');
  });

  it('si cambió del otro lado, repinta con el estado vigente', async () => {
    movilExpressService.decidirRendicion.mockRejectedValue({
      response: {
        data: {
          message: 'La rendición cambió de estado: no se aplicó la acción.',
          detalles: { rendicion: detalle({ status: 'pending_transfer', allowed_actions: [], valid_actions: [], blocked_actions: [] }) },
        },
      },
    });
    await abrirPrimera();
    fireEvent.click(await screen.findByRole('button', { name: 'Validar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La rendición cambió de estado');
    // Los botones viejos desaparecen: ya no corresponden.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Validar' })).not.toBeInTheDocument());
    expect(screen.getByText('Ahora le toca a Móvil Express. No hay nada para hacer de tu lado.')).toBeVisible();
  });

  it('nunca expone la URL de la API del proveedor', async () => {
    const { container } = await abrirPrimera();
    await screen.findByRole('button', { name: /Estado de cuenta/ });
    expect(container.innerHTML).not.toMatch(/api\/partner|movil-express-production/);
  });
});
