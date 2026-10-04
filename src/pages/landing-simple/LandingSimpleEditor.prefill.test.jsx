import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingSimpleEditor from './LandingSimpleEditor';

vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogo: vi.fn().mockResolvedValue({ productos: [], combos: [] }) } }));
vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: vi.fn().mockResolvedValue(null) } }));
vi.mock('./panels/CatalogoPanel', () => ({ default: function Panel({ items }) {
  const [iniciales] = React.useState(items);
  return <div data-testid="catalogo-elegido">{iniciales.map(i => `${i.tipo}:${i.referencia_id}`).join(',')}</div>;
} }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it.each(['fitness-suplementos', 'beauty-skincare', 'tech-electronica', 'basico', 'bazar-hogar', 'moda-indumentaria'])(
  '%s abre el catálogo con todos los productos elegidos y conserva los guardados', async slug => {
    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify([
      { tipo: 'producto', referencia_id: 1 }, { tipo: 'combo', referencia_id: 1 },
    ]));
    const landing = { id: 8, titulo: 'Tienda', template: { slug, kind: 'rigido' }, items: [{ tipo: 'producto', referencia_id: 1 }], faq: [], beneficios: [] };
    render(<MemoryRouter><LandingSimpleEditor landingInicial={landing} /></MemoryRouter>);
    expect(await screen.findByTestId('catalogo-elegido')).toHaveTextContent('producto:1,combo:1');
    expect(sessionStorage.getItem('gesicomm:prefilledLandingItems')).toBeNull();
  },
);
