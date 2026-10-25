import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingCodigoEditor, { contentConBorrador } from './LandingCodigoEditor';
import { landingSimpleService } from '../../services/landingSimpleService';

vi.mock('./mcpEditorConfig', () => ({ MCP_EDITOR_HABILITADO: false }));
vi.mock('../../utils/auth', () => ({ verificarSesion: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: vi.fn().mockResolvedValue({ id: 5, nombre: 'Tienda' }) } }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: {
  catalogo: vi.fn().mockResolvedValue({ productos: [{ id: 1, tipo: 'producto', slug: 'uno', nombre: 'Uno', precio_efectivo: 10000 }], combos: [] }),
  catalogoPaginado: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 1, categorias: [] }),
} }));
vi.mock('../../services/comboAdminService', () => ({ comboAdminService: { listar: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarTodas: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productService', () => ({ productService: { detalle: vi.fn().mockResolvedValue({}), faq: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: {
  listarPaymentLogos: vi.fn().mockResolvedValue([]),
  actualizar: vi.fn(),
  guardarBorrador: vi.fn(),
  descartarBorrador: vi.fn(),
  obtener: vi.fn(),
} }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));

const publicada = (extra = {}) => ({
  id: 8, titulo: 'Tienda', activo: true, tienda_id: 5,
  content: {
    editor_type: 'code', generado_por_ia: false, bloques_inicio_bloqueados: false, origen: 'plantilla',
    codigo: { html: '<main>Publicado</main>', css: '', js: '' },
    venta: { configurado: true, tipo: 'catalogo', seleccion: 'manual', abrir_en: 'tienda' },
    ...extra,
  },
  items: [{ tipo: 'producto', referencia_id: 1 }],
});

const montar = landing => render(<MemoryRouter><LandingCodigoEditor landingInicial={landing} /></MemoryRouter>);

afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

describe('contentConBorrador', () => {
  it('superpone el borrador sobre lo publicado y respeta las fichas propias borradas', () => {
    const content = {
      codigo: { html: 'viejo' },
      venta: { tipo: 'catalogo' },
      vistas: { checkout: { html: 'chk' }, legales: { a: { html: 'A' }, b: { html: 'B' } }, productos: { p1: { html: 'f1' }, p2: { html: 'f2' } } },
    };
    const r = contentConBorrador(content, {
      codigo: { html: 'nuevo' },
      venta: { tipo: 'producto' },
      vistas: { checkout: { html: 'chk2' }, legales: { b: { html: 'B2' } }, productos: { p1: null, p3: { html: 'f3' } } },
    });
    expect(r.codigo.html).toBe('nuevo');
    expect(r.venta.tipo).toBe('producto');
    expect(r.vistas.checkout.html).toBe('chk2');
    expect(r.vistas.legales).toEqual({ a: { html: 'A' }, b: { html: 'B2' } });
    expect(Object.keys(r.vistas.productos).sort()).toEqual(['p2', 'p3']);
    // Lo publicado no se toca.
    expect(content.codigo.html).toBe('viejo');
  });
});

describe('Borrador del editor de la tienda', () => {
  it('Guardar borrador no publica: usa el endpoint del borrador y avisa que la tienda no cambió', async () => {
    landingSimpleService.guardarBorrador.mockResolvedValue({ guardado_at: '2026-10-25T15:30:00.000Z' });
    montar(publicada());
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(landingSimpleService.guardarBorrador).toHaveBeenCalledTimes(1));
    expect(landingSimpleService.actualizar).not.toHaveBeenCalled();
    const [, payload] = landingSimpleService.guardarBorrador.mock.calls[0];
    expect(payload).toMatchObject({ venta: expect.objectContaining({ tipo: 'catalogo' }), items: expect.any(Array) });
    expect(payload).not.toHaveProperty('limpiar_borrador');
    expect(await screen.findByText('Borrador sin publicar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar borrador' })).toBeInTheDocument();
  });

  it('al reabrir recupera el borrador y Publicar cambios lo aplica y lo limpia', async () => {
    const conBorrador = publicada({
      borrador: {
        guardado_at: '2026-10-25T15:30:00.000Z',
        datos: { titulo: 'Tienda', venta: { configurado: true, tipo: 'catalogo', seleccion: 'manual', abrir_en: 'producto' }, items: [{ tipo: 'producto', referencia_id: 1 }] },
      },
    });
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => ({ ...publicada({ venta: payload.venta }) }));
    montar(conBorrador);
    expect(await screen.findByText('Borrador sin publicar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cambios' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalledTimes(1));
    const [, payload] = landingSimpleService.actualizar.mock.calls[0];
    expect(payload.limpiar_borrador).toBe(true);
    // Se publica lo del borrador, no lo que estaba publicado.
    expect(payload.venta.abrir_en).toBe('producto');
    await waitFor(() => expect(screen.queryByText('Borrador sin publicar')).not.toBeInTheDocument());
  });

  it('descartar vuelve a lo publicado', async () => {
    const conBorrador = publicada({ borrador: { guardado_at: '2026-10-25T15:30:00.000Z', datos: { venta: { configurado: true, tipo: 'catalogo', seleccion: 'manual' } } } });
    landingSimpleService.descartarBorrador.mockResolvedValue({ descartado: true });
    landingSimpleService.obtener.mockResolvedValue(publicada());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    montar(conBorrador);
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar borrador' }));
    await waitFor(() => expect(landingSimpleService.descartarBorrador).toHaveBeenCalledWith(8));
    await waitFor(() => expect(screen.queryByText('Borrador sin publicar')).not.toBeInTheDocument());
    expect(screen.getByText('Publicado')).toBeInTheDocument();
  });

  it('una tienda sin publicar no ofrece borrador: Guardar sigue igual', async () => {
    montar({ ...publicada(), activo: false });
    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();
  });
});
