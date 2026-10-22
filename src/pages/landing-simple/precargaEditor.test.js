import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const catalogo = vi.fn();
vi.mock('../../services/vitrinaService', () => ({ vitrinaService: { catalogo: (...a) => catalogo(...a) } }));
vi.mock('../../services/tiendaService', () => ({ tiendaService: { obtener: () => Promise.resolve({ id: 1 }) } }));
vi.mock('../../services/landingSimpleService', () => ({ landingSimpleService: { obtener: vi.fn() } }));
vi.mock('./EditorSegunModo', () => ({ default: () => null }));

/**
 * La precarga del catálogo la piden el guard, la entrada y el editor uno
 * detrás del otro. Se protege acá que nunca abra el editor con un catálogo
 * viejo (sin un producto cargado mientras tanto) ni duplique el pedido.
 */
describe('precarga del catálogo del editor', () => {
  let m;
  beforeEach(async () => {
    vi.resetModules();
    catalogo.mockReset();
    m = await import('./precargaEditor');
  });
  afterEach(() => vi.useRealTimers());

  it('mientras el pedido está en vuelo, lo comparten (aunque tarde más de 5 s)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    catalogo.mockReturnValue(new Promise(() => {}));
    m.precargarEditor();
    vi.setSystemTime(Date.now() + 20_000);
    m.precargarEditor();
    expect(catalogo).toHaveBeenCalledTimes(1);
  });

  it('una precarga recién llegada se reusa; una de hace más de 5 s se vuelve a pedir', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const viejo = { productos: [{ id: 1 }], combos: [] };
    const nuevo = { productos: [{ id: 1 }, { id: 2 }], combos: [] };
    catalogo.mockResolvedValueOnce(viejo).mockResolvedValueOnce(nuevo);
    m.precargarEditor();
    await Promise.resolve(); await Promise.resolve();
    m.precargarEditor();
    expect(catalogo).toHaveBeenCalledTimes(1);

    // El comercio fue a Productos, cargó uno y volvió.
    vi.setSystemTime(Date.now() + 6_000);
    m.precargarEditor();
    expect(catalogo).toHaveBeenCalledTimes(2);
    expect((await m.tomarPrecargaEditor().catalogo).productos).toHaveLength(2);
  });

  it('se consume una sola vez: después el editor vuelve a pedir', async () => {
    catalogo.mockResolvedValue({ productos: [], combos: [] });
    m.precargarEditor();
    await m.tomarPrecargaEditor().catalogo;
    await m.tomarPrecargaEditor().catalogo;
    expect(catalogo).toHaveBeenCalledTimes(2);
  });

  it('si el pedido falla, el próximo intento vuelve a pedir', async () => {
    catalogo.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({ productos: [], combos: [] });
    m.precargarEditor();
    await Promise.resolve(); await Promise.resolve();
    m.precargarEditor();
    expect(catalogo).toHaveBeenCalledTimes(2);
  });
});
