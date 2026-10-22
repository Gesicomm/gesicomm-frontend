import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingCodigoEditor from './LandingCodigoEditor';
import { landingSimpleService } from '../../services/landingSimpleService';
import { vitrinaService } from '../../services/vitrinaService';
import { plantillaInicioPara } from './plantillasBaseCodigo';
vi.mock('./mcpEditorConfig', () => ({ MCP_EDITOR_HABILITADO: true }));

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
  it('edita páginas legales desde la vista de venta y recupera el texto al reabrir', async () => {
    let persistida = inicial();
    persistida.content.vistas = { legales: {
      politica_privacidad: { html: '<main><h1>Privacidad vigente</h1><p>Texto actual de la tienda</p></main>', css: '', js: '' },
      politica_envio: { html: '<main><h1>Envíos propios</h1><p>Entregamos en 48 horas</p></main>', css: '', js: '' },
    } };
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => {
      persistida = { ...persistida, content: { ...persistida.content, venta: payload.venta,
        codigo: payload.codigo ?? persistida.content.codigo,
        vistas: { ...persistida.content.vistas, ...payload.vistas, legales: { ...persistida.content.vistas.legales, ...payload.vistas?.legales } },
      } };
      return structuredClone(persistida);
    });
    const vista = montar(persistida);
    fireEvent.change(await screen.findByLabelText('Página de la tienda'), { target: { value: 'legal:politica_privacidad' } });
    const editor = screen.getByRole('textbox', { name: 'Contenido de Política de privacidad' });
    expect(editor).toHaveTextContent('Texto actual de la tienda');
    editor.innerHTML = '<p><u>Privacidad editada</u></p><ul><li>Condición propia</li></ul>';
    fireEvent.input(editor);
    fireEvent.change(screen.getByLabelText('Página que querés editar'), { target: { value: 'politica_envio' } });
    expect(screen.getByRole('textbox', { name: 'Contenido de Política de envío' })).toHaveTextContent('Entregamos en 48 horas');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar', exact: true }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalled());
    const payload = landingSimpleService.actualizar.mock.calls[0][1];
    expect(payload.vistas.legales.politica_privacidad.html).toContain('<u>Privacidad editada</u>');
    expect(payload.vistas.legales.politica_privacidad.html).toContain('<ul><li>Condición propia</li></ul>');
    expect(payload.vistas.legales.politica_envio).toBeUndefined();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled());
    vista.unmount();
    montar(persistida);
    fireEvent.change(await screen.findByLabelText('Página de la tienda'), { target: { value: 'legal:politica_privacidad' } });
    expect(screen.getByRole('textbox', { name: 'Contenido de Política de privacidad' })).toHaveTextContent('Privacidad editada');
  });
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

  it('conserva el botón del banner quitado después de guardar y volver a entrar', async () => {
    let persistida = inicial();
    persistida.content = {
      ...persistida.content, generado_por_ia: false, bloques_inicio_bloqueados: false, origen: 'plantilla',
      codigo: plantillaInicioPara('catalogo'),
      venta: { ...persistida.content.venta, inicio: { banners: [{ id: 'promo', titulo: 'Promoción', cta_texto: 'Ver productos' }] } },
    };
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => {
      persistida = { ...persistida, content: { ...persistida.content, venta: payload.venta, codigo: payload.codigo ?? persistida.content.codigo } };
      return structuredClone(persistida);
    });
    const vista = montar(persistida);
    fireEvent.click(await screen.findByRole('button', { name: 'Banner principal', exact: true }));
    fireEvent.change(screen.getByLabelText('CTA'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalled());
    expect(persistida.content.venta.inicio.banners[0].cta_texto).toBe('');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' }).disabled).toBe(false));
    vista.unmount();
    montar(persistida);
    fireEvent.click(await screen.findByRole('button', { name: 'Banner principal', exact: true }));
    expect(screen.getByLabelText('CTA').value).toBe('');
  });

  it('envía los productos sumados al bloque y los recupera al reabrir', async () => {
    const productos = [
      { id: 1, tipo: 'producto', slug: 'uno', nombre: 'Uno', precio_efectivo: 10000 },
      { id: 2, tipo: 'producto', slug: 'dos', nombre: 'Dos', precio_efectivo: 20000 },
    ];
    vitrinaService.catalogo.mockResolvedValueOnce({ productos, combos: [] });
    vitrinaService.catalogoPaginado.mockResolvedValue({ items: productos, total: 2, totalPages: 1, categorias: [] });
    let persistida = inicial();
    persistida.items.push({ tipo: 'producto', referencia_id: 2 });
    persistida.content = {
      ...persistida.content, generado_por_ia: false, bloques_inicio_bloqueados: false, origen: 'plantilla',
      codigo: plantillaInicioPara('catalogo'),
      venta: { ...persistida.content.venta, inicio: { productos_categoria: { items: ['uno'], limite: 8 } } },
    };
    landingSimpleService.actualizar.mockImplementation(async (_id, payload) => {
      persistida = { ...persistida, items: payload.items, content: { ...persistida.content, venta: payload.venta, codigo: payload.codigo ?? persistida.content.codigo } };
      return structuredClone(persistida);
    });
    const vista = montar(persistida);
    fireEvent.click(await screen.findByRole('button', { name: 'Productos', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: /^Dos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(landingSimpleService.actualizar).toHaveBeenCalled());
    expect(persistida.content.venta.inicio.productos_categoria.items).toEqual(['uno', 'dos']);
    expect(persistida.items.map(i => i.referencia_id)).toEqual([1, 2]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' }).disabled).toBe(false));
    vista.unmount();
    vitrinaService.catalogo.mockResolvedValueOnce({ productos, combos: [] });
    montar(persistida);
    fireEvent.click(await screen.findByRole('button', { name: 'Productos', exact: true }));
    expect((await screen.findByRole('button', { name: /^Dos/, pressed: true })).disabled).toBe(false);
  });
});
