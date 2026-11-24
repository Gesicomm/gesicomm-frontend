import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SeleccionarTienda from './SeleccionarTienda';
import { tiendaService } from '../../services/tiendaService';

vi.mock('../../services/tiendaService', () => ({
  tiendaService: {
    mias: vi.fn(),
    cambiarEstado: vi.fn(),
    seleccionar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

describe('SeleccionarTienda — ícono y favicon en Mis tiendas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prioriza favicon_imagen sobre logo_imagen, usa respaldo de logo o Store y aplica has-image', async () => {
    tiendaService.mias.mockResolvedValue([
      {
        id: 1,
        nombre: 'Con ambos',
        subdominio: 'ambos',
        favicon_imagen: 'https://cdn.test/favicon-ambos.png',
        logo_imagen: 'https://cdn.test/logo-ambos.png',
        activo: true,
      },
      {
        id: 2,
        nombre: 'Solo favicon',
        subdominio: 'solo-fav',
        favicon_imagen: 'https://cdn.test/favicon-solo.png',
        logo_imagen: null,
        activo: true,
      },
      {
        id: 3,
        nombre: 'Solo logo',
        subdominio: 'solo-logo',
        favicon_imagen: null,
        logo_imagen: 'https://cdn.test/logo-solo.png',
        activo: true,
      },
      {
        id: 4,
        nombre: 'Sin imagen',
        subdominio: 'sin-img',
        favicon_imagen: null,
        logo_imagen: null,
        activo: true,
      },
    ]);

    render(
      <MemoryRouter>
        <SeleccionarTienda />
      </MemoryRouter>,
    );

    const btnAmbos = await screen.findByRole('button', { name: 'Administrar Con ambos' });
    const cajaAmbos = btnAmbos.querySelector('.st-item-logo');
    expect(cajaAmbos).toHaveClass('has-image');
    expect(cajaAmbos.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/favicon-ambos.png');

    const btnSoloFav = screen.getByRole('button', { name: 'Administrar Solo favicon' });
    const cajaSoloFav = btnSoloFav.querySelector('.st-item-logo');
    expect(cajaSoloFav).toHaveClass('has-image');
    expect(cajaSoloFav.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/favicon-solo.png');

    const btnSoloLogo = screen.getByRole('button', { name: 'Administrar Solo logo' });
    const cajaSoloLogo = btnSoloLogo.querySelector('.st-item-logo');
    expect(cajaSoloLogo).toHaveClass('has-image');
    expect(cajaSoloLogo.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/logo-solo.png');

    const btnSinImg = screen.getByRole('button', { name: 'Administrar Sin imagen' });
    const cajaSinImg = btnSinImg.querySelector('.st-item-logo');
    expect(cajaSinImg).not.toHaveClass('has-image');
    expect(cajaSinImg.querySelector('img')).toBeNull();
    expect(cajaSinImg.querySelector('svg')).not.toBeNull();
  });
});
