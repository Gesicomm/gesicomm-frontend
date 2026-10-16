import { describe, it, expect, vi, beforeEach } from 'vitest';
import { obtenerLandingPublica, obtenerCatalogoLandingPublica, limpiarCacheCatalogoPublico } from './landingPublicaService';

describe('diseños de la tienda por vista', () => {
  beforeEach(() => {
    limpiarCacheCatalogoPublico();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ disponible: true }) });
  });

  it('la portada conserva su URL sin parámetros', async () => {
    await obtenerLandingPublica();
    expect(fetch).toHaveBeenCalledWith('/api/l/', { credentials: 'include' });
  });

  it.each(['checkout', 'categoria', 'contacto', 'politica_envio'])('solicita solo el diseño de %s', async vista => {
    await obtenerLandingPublica(undefined, { vista });
    expect(fetch).toHaveBeenCalledWith(`/api/l/?vista=${vista}`, { credentials: 'include' });
  });

  it('conserva el slug y el tipo de página de las rutas existentes', async () => {
    await obtenerLandingPublica('mi tienda', { tipoPagina: 'politica_envio' });
    expect(fetch).toHaveBeenCalledWith('/api/l/mi%20tienda?tipo_pagina=politica_envio', { credentials: 'include' });
  });

  it('envía la categoría y pide solo datos para el listado dentro del iframe', async () => {
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 25, categoria: 'Audio, TV y video', soloDatos: true });
    const url = new URL(fetch.mock.calls[0][0], 'https://tienda.test');
    expect(url.searchParams.get('categoria')).toBe('Audio, TV y video');
    expect(url.searchParams.get('soloDatos')).toBe('true');
    expect(url.searchParams.get('porPagina')).toBe('25');
  });

  it('mantiene separadas la página completa y la respuesta de solo datos en caché', async () => {
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 25 });
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 25, soloDatos: true });
    await obtenerCatalogoLandingPublica(undefined, { pagina: 1, porPagina: 25, soloDatos: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
