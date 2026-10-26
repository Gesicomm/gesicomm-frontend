import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { api } from '../utils/api';
import { verificarSesion } from '../utils/auth';

vi.mock('../utils/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('../utils/auth', () => ({ verificarSesion: vi.fn() }));
vi.mock('../components/PrivacidadDatosCard', () => ({ default: () => null }));
vi.mock('../components/PerfilModal', () => ({ default: () => null }));

const renderizar = () => render(<MemoryRouter><Settings /></MemoryRouter>);

describe('Settings: elegir portafolios de Meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificarSesion.mockResolvedValue({ id: 1, nombre: 'Propietario', rol: 'usuario' });
    api.get.mockImplementation(async (ruta) => {
      if (ruta === '/api/meta/stores') return { tiendas: [] };
      if (ruta === '/api/meta/pendiente') {
        return {
          pendiente: true,
          portafolios: [
            { id: '10', nombre: 'Callback Dev', conectado: false },
            { id: '20', nombre: 'Tienda Asunción', conectado: false },
          ],
        };
      }
      return {};
    });
    api.post.mockResolvedValue({ conectados: 1 });
  });

  it('muestra todos los portafolios y conecta solo los marcados', async () => {
    renderizar();
    expect(await screen.findByText('Elegí qué portafolios conectar')).toBeTruthy();
    const casillas = screen.getAllByRole('checkbox');
    expect(casillas).toHaveLength(2);

    fireEvent.click(screen.getByLabelText(/Callback Dev/));
    fireEvent.click(screen.getByRole('button', { name: /Conectar 1 portafolio/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/meta/pendiente/confirmar', { business_ids: ['20'] }));
    expect(await screen.findByText('Tienda conectada exitosamente.')).toBeTruthy();
    expect(screen.queryByText('Elegí qué portafolios conectar')).toBeNull();
  });

  it('sin nada pendiente no muestra el selector', async () => {
    api.get.mockImplementation(async (ruta) => (ruta === '/api/meta/stores' ? { tiendas: [] } : { pendiente: false }));
    renderizar();
    expect(await screen.findByText('No tenés ninguna tienda conectada todavía.')).toBeTruthy();
    expect(screen.queryByText('Elegí qué portafolios conectar')).toBeNull();
  });
  it('solo lectura no permite conectar ni administrar personas', async () => {
    verificarSesion.mockResolvedValue({ id: 2, rol: 'colaborador', tiendaId: 7, accesos: { configuracion: 'ver' } });
    renderizar();
    expect(await screen.findByRole('button', { name: /^Conectar 2 portafolios$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Conectar tienda' })).toBeDisabled();
    expect(screen.queryByText('Personas y permisos')).toBeNull();
  });
});
