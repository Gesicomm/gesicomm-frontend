import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Las ciudades de envío ya no vienen con la landing: el carrito las pide a
// /api/l/delivery. Cada test recarga el módulo porque guarda la respuesta en
// memoria (una vez por carga de página).
vi.mock('../lib/hostname', () => ({ esHostnameDeTienda: vi.fn(() => false) }));

async function cargar({ tienda = false, ruta = '/' } = {}) {
  vi.resetModules();
  const hostname = await import('../lib/hostname');
  hostname.esHostnameDeTienda.mockReturnValue(tienda);
  window.history.pushState({}, '', ruta);
  return import('./landingPublicaService');
}

const luque = { ciudad: 'Luque', departamento: 'Central' };

describe('obtenerDeliveryCiudadesPublica', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ delivery_ciudades: [luque] }) }));
  });
  afterEach(() => window.history.pushState({}, '', '/'));

  it('en el hostname de la tienda pide /api/l/delivery, una sola vez', async () => {
    const { obtenerDeliveryCiudadesPublica } = await cargar({ tienda: true, ruta: '/catalogo' });
    expect(await obtenerDeliveryCiudadesPublica()).toEqual([luque]);
    await obtenerDeliveryCiudadesPublica();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/l/delivery');
  });

  it('en /l/:slug (sin tienda por hostname) manda el slug', async () => {
    const { obtenerDeliveryCiudadesPublica } = await cargar({ ruta: '/l/mi-tienda-3fa1/catalogo' });
    await obtenerDeliveryCiudadesPublica();
    expect(global.fetch).toHaveBeenCalledWith('/api/l/mi-tienda-3fa1/delivery');
  });

  it('fuera de una tienda (vista previa del editor) no pide nada', async () => {
    const { obtenerDeliveryCiudadesPublica } = await cargar({ ruta: '/mis-landings/12/editar' });
    expect(await obtenerDeliveryCiudadesPublica()).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('si falla, el próximo intento vuelve a pedir', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ delivery_ciudades: [luque] }) }));
    const { obtenerDeliveryCiudadesPublica } = await cargar({ tienda: true });
    await expect(obtenerDeliveryCiudadesPublica()).rejects.toThrow();
    await expect(obtenerDeliveryCiudadesPublica()).resolves.toEqual([luque]);
  });
});
