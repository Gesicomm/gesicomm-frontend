import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from './api';
import { landingSimpleService } from './landingSimpleService';
import { compactarItemsLanding } from '../lib/landingItems';

vi.mock('./api', () => ({ default: { post: vi.fn(), put: vi.fn() } }));
const peso = value => new TextEncoder().encode(JSON.stringify(value)).length;
const items = Array.from({ length: 4000 }, (_, i) => ({
  tipo: 'producto', referencia_id: i + 1, orden: i,
  nombre: `Producto ${i + 1}`, descripcion: 'Descripción extensa '.repeat(100),
  imagen: `https://cdn.test/${i}.jpg`, precio_base: 150000,
  etiqueta: '', precio_ancla: null, envio_incluido: false, mostrar_en_inicio: true,
}));

beforeEach(() => {
  vi.clearAllMocks();
  API.post.mockResolvedValue({ data: { id: 7 } });
  API.put.mockResolvedValue({ data: { id: 7 } });
});

describe('selecciones grandes: solo viajan referencias y ajustes', () => {
  it('crea y actualiza 4000 productos con menos de 200 KB de items', async () => {
    await landingSimpleService.crearLienzoBlanco(items);
    const body = API.post.mock.calls[0][1];
    expect(body.items).toHaveLength(4000);
    expect(body.items[3999]).toEqual({ tipo: 'producto', referencia_id: 4000 });
    expect(peso(body)).toBeLessThan(200 * 1024);
    expect(peso({ items })).toBeGreaterThan(1024 * 1024);
    const codigo = { html: '<main>' + 'x'.repeat(85 * 1024) + '</main>' };
    await landingSimpleService.actualizar(7, { items, codigo });
    const guardado = API.put.mock.calls[0][1];
    expect(guardado.items).toEqual(body.items);
    expect(guardado.codigo).toEqual(codigo);
    expect(peso(guardado)).toBeLessThan(300 * 1024);
  });

  it('conserva personalización, visibilidad y un orden distinto al de la lista', () => {
    expect(compactarItemsLanding([{ ...items[0], etiqueta: 'Oferta', precio_ancla: 200000, envio_incluido: true, mostrar_en_inicio: false, orden: 15 }]))
      .toEqual([{ tipo: 'producto', referencia_id: 1, etiqueta: 'Oferta', precio_ancla: 200000, envio_incluido: true, mostrar_en_inicio: false, orden: 15 }]);
  });

  it('compacta también onboarding y templates; un guardado sin items no los borra', async () => {
    await landingSimpleService.crearDesdeOnboarding('basico', items);
    await landingSimpleService.crear(3, null, items);
    expect(API.post.mock.calls.every(([, body]) => body.items.length === 4000 && peso(body) < 200 * 1024)).toBe(true);
    await landingSimpleService.actualizar(7, { titulo: 'Prueba' });
    expect(API.put).toHaveBeenCalledWith('/mis-landings-simples/7', { titulo: 'Prueba' });
  });
});
