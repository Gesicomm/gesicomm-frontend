import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingCodigoEditor, { resolverSeleccion, seleccionAItems } from './LandingCodigoEditor';
import { vitrinaService } from '../../services/vitrinaService';

vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogo: vi.fn() } }));
vi.mock('../../services/ofertaService', () => ({ ofertaService: { listarTodas: vi.fn().mockResolvedValue([]) } }));
vi.mock('./CodigoPreview', () => ({ default: () => null }));
vi.mock('./ConfigurarVentaCodigo', () => ({
  aplicarReglaVenta: () => null,
  default: function Panel({ inicial, errorGuardado }) {
    // Igual que el panel real: la selección se toma SOLO al montarse.
    const [items] = React.useState(inicial.seleccion);
    return <div><div data-testid="seleccion">{items.map(i => `${i.tipo}:${i.id}`).join(',')}</div>{errorGuardado?.mensaje}</div>;
  },
}));

const catalogo = { productos: [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }], combos: [{ id: 1, nombre: 'Combo' }] };
const landing = { id: 8, titulo: 'Tienda', content: {}, items: [{ tipo: 'producto', referencia_id: 1 }] };
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });

describe('Productos del catálogo en el lienzo', () => {
  it('recupera precio ancla, etiquetas y visibilidad al reabrir la landing', () => {
    const items = [{ tipo: 'producto', referencia_id: 1, precio_ancla: 90000, etiqueta: 'Cocina, Oferta', mostrar_en_inicio: false, envio_incluido: true }];
    const resuelta = resolverSeleccion(items, catalogo);
    expect(resuelta[0]).toMatchObject({ id: 1, precio_ancla: 90000, etiqueta: 'Cocina, Oferta', mostrar_en_inicio: false, envio_incluido: true });
    expect(seleccionAItems(resuelta, items)[0]).toMatchObject(items[0]);
  });

  it('permite borrar un precio ancla y una etiqueta sin restaurar el valor previo', () => {
    const antes = [{ tipo: 'producto', referencia_id: 1, precio_ancla: 90000, etiqueta: 'Oferta' }];
    expect(seleccionAItems([{ tipo: 'producto', id: 1, precio_ancla: null, etiqueta: '' }], antes)[0]).toMatchObject({ precio_ancla: null, etiqueta: '' });
  });

  it('espera al catálogo antes de montar el panel aunque ya tenga landingInicial', async () => {
    let resolver;
    vitrinaService.catalogo.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    render(<MemoryRouter><LandingCodigoEditor landingInicial={landing} /></MemoryRouter>);
    expect(screen.queryByTestId('seleccion')).toBeNull();
    resolver(catalogo);
    expect(await screen.findByTestId('seleccion')).toHaveTextContent('producto:1');
  });

  it('incorpora productos y combos al lienzo existente sin duplicar los guardados', async () => {
    vitrinaService.catalogo.mockResolvedValue(catalogo);
    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify([
      { tipo: 'producto', referencia_id: 1 }, { tipo: 'combo', referencia_id: 1 }, { tipo: 'producto', referencia_id: 2 },
    ]));
    render(<MemoryRouter><LandingCodigoEditor landingInicial={{ ...landing, content: { venta: { configurado: true, seleccion: 'manual' } } }} /></MemoryRouter>);
    expect(await screen.findByTestId('seleccion')).toHaveTextContent('producto:1,combo:1,producto:2');
    expect(sessionStorage.getItem('gesicomm:prefilledLandingItems')).toBeNull();
  });

  it('conserva la selección pendiente si falla la carga del catálogo', async () => {
    vitrinaService.catalogo.mockRejectedValue(new Error('sin conexión'));
    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify([{ tipo: 'producto', referencia_id: 2 }]));
    render(<MemoryRouter><LandingCodigoEditor landingInicial={landing} /></MemoryRouter>);
    await screen.findByText('No se pudo cargar la landing.');
    expect(sessionStorage.getItem('gesicomm:prefilledLandingItems')).not.toBeNull();
  });
});
