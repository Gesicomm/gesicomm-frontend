import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AuthTracking from './AuthTracking';
import { authTrackingService as service } from '../../services/authTrackingService';

vi.mock('../../services/authTrackingService', () => ({
  authTrackingService: {
    resumen: vi.fn(),
    eventos: vi.fn(),
    sesiones: vi.fn(),
    notificaciones: vi.fn(),
    resumenPagosAdmin: vi.fn(),
    pagosSuscripcion: vi.fn(),
    consultarPagoSuscripcion: vi.fn(),
    marcarNotificacionesLeidas: vi.fn(),
  },
}));

const vacioPaginacion = { pagina: 1, limite: 10, total: 0, paginas: 1, tiene_siguiente: false, tiene_anterior: false };

beforeEach(() => {
  vi.resetAllMocks();
  service.resumen.mockResolvedValue({ serie: [] });
  service.eventos.mockResolvedValue({ items: [], paginacion: vacioPaginacion });
  service.sesiones.mockResolvedValue({ items: [], paginacion: vacioPaginacion });
  service.notificaciones.mockResolvedValue({ items: [], paginacion: vacioPaginacion });
  service.resumenPagosAdmin.mockResolvedValue({
    periodo_dias: 30,
    moneda: 'MULTI',
    totales: {
      moneda: 'MULTI',
      cantidad_total: 2,
      estados: {
        PAID: { cantidad: 2, bruto: 297047, comision: 0, neto: 297047 },
        PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
        FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
      },
      por_moneda: [
        {
          moneda: 'USD',
          estados: {
            PAID: { cantidad: 1, bruto: 47, comision: 0, neto: 47 },
            PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
            FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
          },
        },
        {
          moneda: 'PYG',
          estados: {
            PAID: { cantidad: 1, bruto: 297000, comision: 0, neto: 297000 },
            PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
            FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
          },
        },
      ],
    },
    tipos: [
      {
        tipo: 'suscripciones',
        label: 'Suscripciones',
        moneda: 'USD',
        cantidad_total: 1,
        estados: {
          PAID: { cantidad: 1, bruto: 47, comision: 0, neto: 47 },
          PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
          FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
        },
        por_moneda: [
          {
            moneda: 'USD',
            estados: {
              PAID: { cantidad: 1, bruto: 47, comision: 0, neto: 47 },
              PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
              FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
            },
          },
        ],
      },
      {
        tipo: 'abastecimiento',
        label: 'Abastecimiento',
        moneda: 'PYG',
        cantidad_total: 1,
        estados: {
          PAID: { cantidad: 1, bruto: 297000, comision: 0, neto: 297000 },
          PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
          FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
        },
        por_moneda: [
          {
            moneda: 'PYG',
            estados: {
              PAID: { cantidad: 1, bruto: 297000, comision: 0, neto: 297000 },
              PENDING: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
              FAILED: { cantidad: 0, bruto: 0, comision: 0, neto: 0 },
            },
          },
        ],
      },
    ],
  });
  service.pagosSuscripcion.mockResolvedValue({
    items: [
      {
        id: 77,
        referencia: 'HOTMART-HP123',
        hash_pedido: 'HP123',
        estado: 'PAID',
        monto: 47,
        monto_bruto: 47,
        comision_pasarela_monto: 0,
        comision_pasarela_pct: 0,
        monto_neto: 47,
        moneda: 'USD',
        created_at: '2026-11-24T10:00:00Z',
        Suscripcion: {
          nombre: 'Martin Rodriguez',
          email: 'martin@example.com',
          Plan: { nombre: 'Starter Founder', moneda: 'USD' },
        },
      },
    ],
    paginacion: { ...vacioPaginacion, total: 1 },
  });
  service.consultarPagoSuscripcion.mockResolvedValue({
    estado_pago: 'PAID',
    estado_suscripcion: 'activa',
    monto: 47,
    moneda: 'USD',
    email: 'martin@example.com',
    plan: { codigo: 'hotmart-starter-founder', nombre: 'Starter Founder', moneda: 'USD' },
  });
});

it('muestra USD 47 en KPIs, tarjetas, tabla y consulta sin convertirlo a Gs. 47 ni mezclar monedas', async () => {
  render(<AuthTracking modo="pagos" />);

  const kpiNeto = (await screen.findByText('Neto Gesicomm')).closest('section');
  expect(kpiNeto).toHaveTextContent(/USD 47/);
  expect(kpiNeto).toHaveTextContent(/297\.000/);
  expect(kpiNeto).not.toHaveTextContent(/297\.047/);
  expect(kpiNeto).not.toHaveTextContent(/Gs\.\s*47\b/i);

  const cardSus = screen.getByText('Suscripciones', { selector: '.at-money-card strong' }).closest('article');
  expect(cardSus).toHaveTextContent('USD 47');
  expect(cardSus).not.toHaveTextContent(/Gs\.\s*47\b/i);

  const cardAba = screen.getByText('Abastecimiento', { selector: '.at-money-card strong' }).closest('article');
  expect(cardAba).toHaveTextContent(/297\.000/);

  const row = screen.getByText('#77').closest('tr');
  expect(row).toHaveTextContent('USD 47');
  expect(row).not.toHaveTextContent(/Gs\.\s*47\b/i);

  fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
  const resultado = (await screen.findByText('Monto')).closest('.at-payment-result');
  expect(resultado).toHaveTextContent('USD 47');
  expect(resultado).not.toHaveTextContent(/Gs\.\s*47\b/i);
});
