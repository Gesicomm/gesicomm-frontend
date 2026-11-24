import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { authTrackingService as service } from '../../services/authTrackingService';

vi.mock('../../services/authTrackingService', () => ({
  authTrackingService: {
    resumen: vi.fn(),
    resumenPagosAdmin: vi.fn(),
    topProductosAdmin: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  service.resumen.mockResolvedValue({
    usuarios_total: 120,
    usuarios_verificados: 110,
    usuarios_pendientes: 10,
    registros_periodo: 20,
    sesiones_activas: 3,
    onboarding_iniciados_periodo: 12,
    onboarding_landings_periodo: 8,
    fallos_periodo: 1,
  });
  service.resumenPagosAdmin.mockResolvedValue({
    totales: { estados: { PAID: { bruto: 999999 } } },
    tipos: [{ tipo: 'suscripciones', estados: { PAID: { bruto: 297000, cantidad: 1 }, PENDING: { cantidad: 2 }, FAILED: { cantidad: 0 } } }],
  });
});

it('muestra únicamente ingresos de suscripciones y acciones generales de administración', async () => {
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  expect(await screen.findByText(/297.000/)).toBeInTheDocument();
  expect(screen.queryByText(/999.999/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Dar acceso de prueba/ })).toHaveAttribute('href', '/admin/codigos-prueba');
  expect(screen.getByRole('link', { name: /Actualizar tutoriales/ })).toHaveAttribute('href', '/admin/tutoriales');
  expect(screen.queryByText('Abastecimiento')).not.toBeInTheDocument();
  expect(service.topProductosAdmin).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7' } });
  await waitFor(() => expect(service.resumen).toHaveBeenLastCalledWith(7));
});

it('un fallo parcial conserva los datos disponibles y permite reintentar', async () => {
  service.resumenPagosAdmin.mockRejectedValueOnce(new Error('offline'));
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar todos los datos');
  expect(screen.getByText('120')).toBeInTheDocument();
  expect(screen.getByText('Cobrado en suscripciones').closest('article')).toHaveTextContent('—');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(await screen.findByText(/297.000/)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('muestra USD 47 en Cobrado en suscripciones cuando el pago es en dólares y nunca Gs. 47', async () => {
  service.resumenPagosAdmin.mockResolvedValue({
    moneda: 'USD',
    totales: {
      moneda: 'USD',
      estados: { PAID: { bruto: 47, cantidad: 1 } },
      por_moneda: [{ moneda: 'USD', estados: { PAID: { bruto: 47, cantidad: 1 } } }],
    },
    tipos: [{
      tipo: 'suscripciones',
      moneda: 'USD',
      estados: { PAID: { bruto: 47, cantidad: 1 }, PENDING: { cantidad: 0 }, FAILED: { cantidad: 0 } },
      por_moneda: [{ moneda: 'USD', estados: { PAID: { bruto: 47, cantidad: 1 } } }],
    }],
  });

  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  const card = (await screen.findByText('Cobrado en suscripciones')).closest('article');
  expect(card).toHaveTextContent('USD 47');
  expect(card).not.toHaveTextContent(/Gs\.\s*47\b/i);
});

it('muestra monedas separadas cuando hay cobros de suscripciones en USD y PYG sin sumarlos', async () => {
  service.resumenPagosAdmin.mockResolvedValue({
    moneda: 'MULTI',
    totales: { moneda: 'MULTI', estados: { PAID: { bruto: 297047, cantidad: 2 } } },
    tipos: [{
      tipo: 'suscripciones',
      moneda: 'MULTI',
      estados: { PAID: { bruto: 297047, cantidad: 2 }, PENDING: { cantidad: 0 }, FAILED: { cantidad: 0 } },
      por_moneda: [
        { moneda: 'USD', estados: { PAID: { bruto: 47, cantidad: 1 } } },
        { moneda: 'PYG', estados: { PAID: { bruto: 297000, cantidad: 1 } } },
      ],
    }],
  });

  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  const card = (await screen.findByText('Cobrado en suscripciones')).closest('article');
  expect(card).toHaveTextContent(/USD 47/);
  expect(card).toHaveTextContent(/297\.000/);
  expect(card).not.toHaveTextContent(/297\.047/);
});
