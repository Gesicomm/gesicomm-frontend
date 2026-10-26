import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdsEnVivo from './AdsEnVivo';
import { api } from '../../utils/api';
import { verificarSesion } from '../../utils/auth';

vi.mock('../../utils/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn() }));

const campaign = {
  id: '456', name: 'Campaña de prueba', status: 'ACTIVE', type: 'web',
  metrics: {
    presupuesto: 10000, importe_gastado: 0, compras: 0, costo_por_compra: 0,
    roas: 0, valor_conversion: 0, porcentaje_conversion: 0,
  },
};

describe('Publicidad: gestión de campaña en Meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificarSesion.mockResolvedValue({ id: 3, rol: 'usuario' });
    api.get.mockResolvedValue({ tiendas: [{ id: 7, nombre: 'Tienda' }] });
    api.post.mockImplementation(async (path) => {
      if (path === '/api/meta/filters') return {
        businesses: [{ id: '10', name: 'BM' }],
        ad_accounts: [{ id: 'act_123', name: 'Cuenta', business: { id: '10' } }],
      };
      if (path === '/api/meta/campaign-list') return { campaigns: [{ id: '456', name: 'Campaña de prueba' }] };
      if (path === '/api/meta/campaigns') return { campaigns: [campaign], paging: null };
      if (path === '/api/meta/campaign-status') return { id: '456', status: 'PAUSED' };
      return {};
    });
  });

  it('pide confirmación y pausa solamente la campaña elegida', async () => {
    render(<AdsEnVivo />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar en Meta' }));
    expect(api.post).not.toHaveBeenCalledWith('/api/meta/campaign-status', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Sí, pausar' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/meta/campaign-status', {
      store_id: 7, ad_account_id: 'act_123', campaign_id: '456', status: 'PAUSED',
    }));
    expect(await screen.findByRole('button', { name: 'Activar en Meta' })).toBeTruthy();
  });

  it('cancelar no envía ningún cambio a Meta', async () => {
    render(<AdsEnVivo />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar en Meta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Sí, pausar' })).toBeNull();
    expect(api.post).not.toHaveBeenCalledWith('/api/meta/campaign-status', expect.anything());
  });

  it('oculta la acción a un colaborador con acceso de lectura', async () => {
    verificarSesion.mockResolvedValue({ id: 4, rol: 'colaborador', accesos: { publicidad: 'ver' } });
    render(<AdsEnVivo />);
    expect(await screen.findByText('Campaña de prueba')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pausar en Meta' })).toBeNull();
  });
});
