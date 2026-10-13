import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RahaPortal from './RahaPortal';
import { getRahaPortalToken, rahaPortalApi } from '../../services/rahaPortalApi';

vi.mock('../../services/rahaPortalApi', () => ({
  getRahaPortalToken: vi.fn(),
  setRahaPortalToken: vi.fn(),
  rahaPortalApi: {
    me: vi.fn(),
    listar: vi.fn(),
    detalle: vi.fn(),
    resolver: vi.fn(),
    documento: vi.fn(),
    expediente: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('RahaPortal component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    getRahaPortalToken.mockReturnValue('valid-token');
    rahaPortalApi.me.mockResolvedValue({
      usuario: { id: 1, nombre: 'Operador Raha', email: 'operador@raha.com' },
    });
    rahaPortalApi.listar.mockResolvedValue({
      total: 35,
      page: 1,
      limit: 20,
      totalPaginas: 2,
      resumen: { pendiente: 10, observada: 5, aprobada: 15, rechazada: 5 },
      solicitudes: [
        {
          id: 101,
          estado: 'enviada_raha',
          tienda: 'Tienda Test',
          razon_social: 'Empresa Test S.A.',
          ruc: '80012345-6',
          enviado_at: '2026-10-13T14:30:00Z',
        },
      ],
    });
  });

  it('renders stats, requests, pagination and date filter buttons', async () => {
    render(
      <MemoryRouter>
        <RahaPortal />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Operador Raha/)).toBeInTheDocument();
    expect(screen.getByText('Portal RAHA')).toBeInTheDocument();
    expect(screen.getByText('Nuevas enviadas (Pendientes)')).toBeInTheDocument();

    // Verification of date filters
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Últimos 7 días' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Este mes' })).toBeInTheDocument();

    // Request list
    expect(await screen.findByText(/#101 · Tienda Test/)).toBeInTheDocument();

    // Pagination
    expect(screen.getByText(/Pág\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Items por página')).toHaveValue('20');
  });

  it('filters by date when clicking preset buttons (Hoy, Ayer)', async () => {
    render(
      <MemoryRouter>
        <RahaPortal />
      </MemoryRouter>
    );

    await screen.findByText(/#101 · Tienda Test/);

    // Click on "Hoy"
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          rango_fecha: 'hoy',
          page: 1,
        })
      );
    });

    // Click on "Ayer"
    fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          rango_fecha: 'ayer',
          page: 1,
        })
      );
    });
  });

  it('supports custom date input range and clears filter', async () => {
    render(
      <MemoryRouter>
        <RahaPortal />
      </MemoryRouter>
    );

    await screen.findByText(/#101 · Tienda Test/);

    const inputDesde = screen.getByLabelText('Desde:');
    fireEvent.change(inputDesde, { target: { value: '2026-10-10' } });

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_desde: '2026-10-10',
          page: 1,
        })
      );
    });

    // Clear filter
    const btnLimpiar = screen.getByRole('button', { name: /Limpiar fecha/ });
    fireEvent.click(btnLimpiar);

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.not.objectContaining({
          fecha_desde: '2026-10-10',
        })
      );
    });
  });

  it('navigates pagination pages and updates page size', async () => {
    render(
      <MemoryRouter>
        <RahaPortal />
      </MemoryRouter>
    );

    await screen.findByText(/#101 · Tienda Test/);

    // Next page
    const btnNext = screen.getByLabelText('Página siguiente');
    fireEvent.click(btnNext);

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });

    // Change page size
    const selectSize = screen.getByLabelText('Items por página');
    fireEvent.change(selectSize, { target: { value: '50' } });

    await waitFor(() => {
      expect(rahaPortalApi.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          page: 1,
        })
      );
    });
  });
});
