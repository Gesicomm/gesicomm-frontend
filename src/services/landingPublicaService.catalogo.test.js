import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { obtenerCatalogoLandingPublica, limpiarCacheCatalogoPublico } from './landingPublicaService';

// Al abrir /catalogo de un lienzo la página 1 se pedía tres veces: el padre sin
// porPagina, y el iframe con porPagina=20 al arrancar y de nuevo con cada
// reenvío de datos. Con el CDN frío eran ~1,3s cada una, en serie.

function respuesta(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

describe('obtenerCatalogoLandingPublica — un solo pedido por página', () => {
  beforeEach(() => {
    limpiarCacheCatalogoPublico();
    global.fetch = vi.fn(() => respuesta({ disponible: true, catalogo_items: [] }));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('el pedido del padre (sin porPagina) y el del iframe (porPagina=20) son la misma URL y un solo fetch', async () => {
    const delPadre = await obtenerCatalogoLandingPublica(undefined, {
      orden: 'destacados', disponibilidad: 'todos', categoria: 'todas', etiqueta: 'todas', precioMin: '', precioMax: '', pagina: 1,
    });
    const delIframe = await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 20, orden: 'destacados' });
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 20, orden: 'destacados' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/l/?vista=catalogo&pagina=1&porPagina=20&orden=destacados');
    expect(delIframe).toBe(delPadre);
  });

  it('dos pedidos simultáneos comparten el fetch en vuelo', async () => {
    await Promise.all([
      obtenerCatalogoLandingPublica('tienda', { pagina: 2 }),
      obtenerCatalogoLandingPublica('tienda', { pagina: 2 }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('otra página u otro filtro sí es otro pedido', async () => {
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1 });
    await obtenerCatalogoLandingPublica(undefined, { pagina: 2 });
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, categoria: 'Cocina' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('vencido el TTL (60s, igual que el CDN) se vuelve a pedir', async () => {
    vi.useFakeTimers();
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1 });
    vi.advanceTimersByTime(61 * 1000);
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('un error no queda guardado: el próximo pedido reintenta', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => respuesta({}, 500))
      .mockImplementationOnce(() => respuesta({ disponible: true }));
    await expect(obtenerCatalogoLandingPublica(undefined, { pagina: 1 })).rejects.toThrow();
    await expect(obtenerCatalogoLandingPublica(undefined, { pagina: 1 })).resolves.toEqual({ disponible: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('404 sigue devolviendo null', async () => {
    global.fetch = vi.fn(() => respuesta({}, 404));
    await expect(obtenerCatalogoLandingPublica('no-existe', { pagina: 1 })).resolves.toBeNull();
  });
});
