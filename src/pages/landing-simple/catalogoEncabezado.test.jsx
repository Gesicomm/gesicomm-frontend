import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingSimpleEditor from './LandingSimpleEditor';
import CatalogoPublico from '../landing/CatalogoPublico';
import { TEMPLATES_RIGIDOS } from './templates';

vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogo: vi.fn().mockResolvedValue({ productos: [], combos: [] }) } }));
vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../services/landingPublicaService', () => ({
  obtenerCatalogoLandingPublica: vi.fn(),
  // CatalogoPublico cuenta la visita desde el navegador (antes la contaba el
  // backend dentro del GET, lo que lo hacía incacheable). Sin este mock el
  // import queda undefined y el componente explota al cargar.
  registrarVisitaLanding: vi.fn(),
}));
import { obtenerCatalogoLandingPublica } from '../../services/landingPublicaService';

let anchoPreview;
beforeEach(() => {
  anchoPreview = 1600;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback([{ contentRect: { width: anchoPreview } }]); }
    disconnect() {}
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

const landing = slug => ({ id: 194, titulo: 'Tienda QA', template: { slug, kind: 'rigido' }, items: [], faq: [], beneficios: [],
  catalogo_titulo: 'Catálogo escrito por el comercio', catalogo_descripcion: 'Descripción escrita por el comercio.' });

describe.each(Object.keys(TEMPLATES_RIGIDOS))('Encabezado del catálogo: %s', slug => {
  it.each(['desktop', 'escalado', 'mobile'])('reinicia el scroll al abrir Catálogo desde la portada (%s) y refleja cambios manuales', async dispositivo => {
    anchoPreview = dispositivo === 'escalado' ? 900 : 1600;
    const { container } = render(<MemoryRouter><LandingSimpleEditor landingInicial={landing(slug)} /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Tienda QA' });
    if (dispositivo === 'mobile') fireEvent.click(screen.getByRole('button', { name: 'Mobile', exact: true }));
    const exterior = container.querySelector('.flex-1.overflow-y-auto.bg-black\\/30');
    const interior = container.querySelector('.w-full.h-full.overflow-y-auto');
    exterior.scrollTop = 400;
    if (interior) interior.scrollTop = 500;
    fireEvent.click(screen.getByRole('button', { name: 'Catálogo', exact: true }));
    expect(exterior.scrollTop).toBe(0);
    if (interior) expect(interior.scrollTop).toBe(0);
    expect(screen.getByRole('heading', { name: 'Catálogo escrito por el comercio' })).toBeInTheDocument();
    expect(screen.getByText('Descripción escrita por el comercio.', { selector: 'p' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Ej: Catálogo de productos'), { target: { value: 'Título editado' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Todo lo que necesitás para dormir mejor, en un solo lugar.'), { target: { value: 'Descripción editada' } });
    expect(screen.getByRole('heading', { name: 'Título editado' })).toBeInTheDocument();
    expect(screen.getByText('Descripción editada', { selector: 'p' })).toBeInTheDocument();
    // Editar texto no debe devolver el scroll al inicio en cada pulsación.
    exterior.scrollTop = 120;
    fireEvent.change(screen.getByPlaceholderText('Ej: Catálogo de productos'), { target: { value: 'Otro título' } });
    expect(exterior.scrollTop).toBe(120);
  });

  it('muestra el título y la descripción guardados también en el catálogo público', async () => {
    obtenerCatalogoLandingPublica.mockResolvedValue({ ...landing(slug), disponible: true, catalogo_items: [] });
    render(<MemoryRouter><CatalogoPublico /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Catálogo escrito por el comercio' })).toBeInTheDocument();
    expect(screen.getByText('Descripción escrita por el comercio.')).toBeInTheDocument();
  });
});
