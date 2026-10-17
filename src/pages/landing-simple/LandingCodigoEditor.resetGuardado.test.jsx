import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingCodigoEditor from './LandingCodigoEditor';
import { landingSimpleService } from '../../services/landingSimpleService';
import { plantillaInicioPara } from './plantillasBaseCodigo';

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
  listarPaymentLogos: vi.fn().mockResolvedValue([]), actualizar: vi.fn(),
} }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));

const inicial = () => ({
  id: 8, titulo: 'Tienda', activo: true, tienda_id: 5,
  content: {
    editor_type: 'code', generado_por_ia: true, bloques_inicio_bloqueados: true, origen: 'mcp',
    codigo: { html: '<main>Diseño anterior MCP</main>', css: '.mcp{color:red}', js: '', generado_por_mcp: true },
    venta: { configurado: true, tipo: 'catalogo', seleccion: 'manual', abrir_en: 'tienda' },
  },
  items: [{ tipo: 'producto', referencia_id: 1 }],
});

const montar = landing => render(<MemoryRouter><LandingCodigoEditor landingInicial={landing} /></MemoryRouter>);
async function resetear() {
  fireEvent.click(await screen.findByRole('button', { name: /Resetear página a plantilla por defecto/i }));
  fireEvent.click(screen.getByRole('button', { name: /Sí, resetear página/i }));
}

afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });

describe('Resetear el diseño MCP y guardar la landing publicada', () => {
  it('envía el código restaurado y conserva la plantilla al volver a abrir', async () => {
    let persistida = inicial();
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => {
      persistida = {
        ...persistida, items: payload.items,
        content: {
          ...persistida.content, venta: payload.venta,
          codigo: payload.codigo ?? persistida.content.codigo,
          vistas: { ...persistida.content.vistas, ...payload.vistas },
          generado_por_ia: payload.generado_por_ia,
          bloques_inicio_bloqueados: payload.bloques_inicio_bloqueados, origen: payload.origen,
        },
      };
      return structuredClone(persistida);
    });
    const vista = montar(persistida);
    await resetear();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalled());
    const payload = landingSimpleService.actualizar.mock.calls[0][1];
    expect(payload.codigo).toMatchObject(plantillaInicioPara('catalogo'));
    expect(payload).toMatchObject({ generado_por_ia: false, bloques_inicio_bloqueados: false, origen: 'plantilla' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' }).disabled).toBe(false));
    vista.unmount();
    montar(persistida);
    await screen.findByRole('button', { name: 'Guardar' });
    expect(screen.queryByText(/Bloques estándar bloqueados/)).toBeNull();
    expect(persistida.content.codigo.html).toBe(plantillaInicioPara('catalogo').html);
    expect(persistida.content.codigo.generado_por_mcp).not.toBe(true);
  });

  it('permite reintentar el guardado del reseteo si falla el servidor', async () => {
    landingSimpleService.actualizar.mockRejectedValue(new Error('sin conexión'));
    montar(inicial());
    await resetear();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText(/no hay conexión con el servidor/);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalledTimes(2));
    for (const [, payload] of landingSimpleService.actualizar.mock.calls) {
      expect(payload.codigo).toMatchObject(plantillaInicioPara('catalogo'));
    }
  });

  it('guarda el desbloqueo de bloques y lo recupera sin reemplazar el diseño MCP', async () => {
    let persistida = inicial();
    const codigoOriginal = { ...persistida.content.codigo };
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => {
      persistida = {
        ...persistida,
        content: { ...persistida.content,
          codigo: payload.codigo ?? persistida.content.codigo,
          venta: payload.venta, vistas: payload.vistas,
          generado_por_ia: payload.generado_por_ia,
          origen: payload.origen, bloques_inicio_bloqueados: payload.bloques_inicio_bloqueados,
        },
      };
      return structuredClone(persistida);
    });
    const vista = montar(persistida);
    fireEvent.click(await screen.findByRole('button', { name: /Desbloquear de todas formas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalled());
    expect(landingSimpleService.actualizar.mock.calls[0][1]).toMatchObject({ bloques_inicio_bloqueados: false });
    expect(persistida.content.codigo).toEqual(codigoOriginal);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' }).disabled).toBe(false));
    vista.unmount();
    montar(persistida);
    await screen.findByRole('button', { name: 'Guardar' });
    expect(screen.queryByText(/Bloques estándar bloqueados/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Desbloquear de todas formas/ })).toBeNull();
    expect(persistida.content.codigo).toEqual(codigoOriginal);
  });
});
