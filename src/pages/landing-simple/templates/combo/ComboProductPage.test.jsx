import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComboProductPage from './ComboProductPage';
import { resolverFichaCombo } from './fichaCombo';
import { armarItemFicha } from '../fichaComun';

vi.mock('../../../../services/api', () => ({
  getMediaUrl: value => value,
}));

const ficha = resolverFichaCombo(null, null, {
  hero: {
    titulo: 'Kit bienestar completo',
    lead: 'Tres productos para resolver la rutina en una sola compra.',
    etiqueta_oferta: '',
    contador: { activo: false },
  },
  prueba_social: { activo: false },
});

const item = armarItemFicha({
  nombre: 'Kit bienestar completo',
  precio: 288000,
  precioAntes: 509000,
  imagenes: ['https://cdn.test/combo.jpg'],
  productosIncluidos: [
    { id: 1, nombre: 'AdelFit', cantidad: 1, precio: 169000, imagen: 'https://cdn.test/adelfit.jpg' },
    { id: 2, nombre: 'Articumina', cantidad: 2, precio: 170000, imagen: 'https://cdn.test/articumina.jpg' },
  ],
  faq: [],
});

describe('ComboProductPage', () => {
  it('muestra una vista de combo con productos incluidos y ahorro antes del CTA', () => {
    const onAgregar = vi.fn();

    const { container } = render(
      <MemoryRouter>
      <ComboProductPage
        item={item}
        ficha={ficha}
        tema={{ fondo: '#ffffff', texto: '#111827', acento: '#168a74' }}
        templateSlug="basico"
        previewMode
        onAgregar={onAgregar}
      />
      </MemoryRouter>
    );

    expect(screen.getByText('Combo armado')).toBeInTheDocument();
    expect(screen.getByText('3 productos incluidos')).toBeInTheDocument();
    expect(screen.getAllByText('AdelFit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Articumina').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ahorrás 221\.000 Gs/i).length).toBeGreaterThan(0);

    fireEvent.click(container.querySelector('.cmb-hero-accion .cmb-cta'));
    expect(onAgregar).toHaveBeenCalledWith({ variante: null, pack: null, precio: 288000 });
  });
});
