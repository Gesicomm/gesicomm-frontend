import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verificarSesionDetallada, sesionVerificadaVigente, cerrarSesion } from './auth';
import { compartirPorSesion, invalidarCacheSesion, olvidarSesion, registrarSesionPerdida } from './sesion';
import { api } from './api';

/**
 * La sesión compartida (utils/sesion.js) ahorra idas al servidor al abrir
 * cada pantalla. Lo que se protege acá: nunca devolver la identidad o la
 * tienda de antes de un login, logout, cambio de tienda o sesión perdida.
 */
const respuesta = (status, cuerpo) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });
const llamadasA = (ruta) => fetch.mock.calls.filter(([url]) => String(url).includes(ruta)).length;

describe('sesión compartida', () => {
  beforeEach(async () => {
    // renovarSesion libera su petición compartida en el próximo ciclo.
    await new Promise((r) => setTimeout(r, 0));
    window.sessionStorage.clear();
    olvidarSesion();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('guards y layouts que preguntan a la vez comparten una sola petición', async () => {
    fetch.mockResolvedValue(respuesta(200, { id: 1, rol: 'usuario', tiendaId: 7 }));
    const [a, b] = await Promise.all([verificarSesionDetallada(), verificarSesionDetallada()]);
    const c = await verificarSesionDetallada();
    expect(a.usuario.id).toBe(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(llamadasA('/api/auth/me')).toBe(1);
    expect(sesionVerificadaVigente().usuario.tiendaId).toBe(7);
  });

  it('pasados unos segundos vuelve a preguntar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fetch.mockResolvedValue(respuesta(200, { id: 1, rol: 'usuario' }));
    await verificarSesionDetallada();
    vi.setSystemTime(Date.now() + 6000);
    expect(sesionVerificadaVigente()).toBeUndefined();
    await verificarSesionDetallada();
    expect(llamadasA('/api/auth/me')).toBe(2);
  });

  it('"sin sesión" y los errores no se reusan', async () => {
    fetch.mockImplementation(async (url) => (String(url).includes('/refresh') ? respuesta(401, {}) : respuesta(401, {})));
    expect((await verificarSesionDetallada()).estado).toBe('sin-sesion');
    fetch.mockResolvedValue(respuesta(200, { id: 2, rol: 'usuario' }));
    expect((await verificarSesionDetallada()).usuario.id).toBe(2);

    invalidarCacheSesion();
    fetch.mockRejectedValue(new Error('red caída'));
    expect((await verificarSesionDetallada()).estado).toBe('error');
    fetch.mockResolvedValue(respuesta(200, { id: 3, rol: 'usuario' }));
    expect((await verificarSesionDetallada()).usuario.id).toBe(3);
  });

  it('con el token vencido renueva y no se queda colgado esperándose a sí mismo', async () => {
    let renovado = false;
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/auth/refresh')) { renovado = true; return respuesta(200, {}); }
      return renovado ? respuesta(200, { id: 4, rol: 'usuario' }) : respuesta(401, {});
    });
    const r = await verificarSesionDetallada();
    expect(r).toMatchObject({ estado: 'autenticado', usuario: { id: 4 } });
  });

  it('cerrar sesión, perderla o cualquier escritura descartan lo compartido', async () => {
    fetch.mockResolvedValue(respuesta(200, { id: 1, rol: 'usuario', tiendaId: 7 }));
    await verificarSesionDetallada();
    await cerrarSesion();
    expect(sesionVerificadaVigente()).toBeUndefined();

    await verificarSesionDetallada();
    registrarSesionPerdida();
    expect(sesionVerificadaVigente()).toBeUndefined();

    // Cambio de tienda (o login): un POST exitoso. Después, /auth/me de nuevo.
    await verificarSesionDetallada();
    await api.post('/api/auth/seleccionar-tienda', { tienda_id: 9 });
    fetch.mockResolvedValue(respuesta(200, { id: 1, rol: 'usuario', tiendaId: 9 }));
    expect((await verificarSesionDetallada()).usuario.tiendaId).toBe(9);
  });

  it('una respuesta que llega después de invalidar no se guarda', async () => {
    let resolver;
    const pedir = vi.fn(() => new Promise((r) => { resolver = r; }));
    const enVuelo = compartirPorSesion('x', pedir);
    await Promise.resolve(); // pedir() arranca en el próximo microtask
    invalidarCacheSesion();
    resolver('vieja');
    await enVuelo;
    const nueva = compartirPorSesion('x', async () => 'nueva');
    expect(await nueva).toBe('nueva');
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});
