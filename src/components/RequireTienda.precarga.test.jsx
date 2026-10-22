import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const catalogo = vi.fn(() => new Promise(() => {}));
vi.mock('../services/vitrinaService', () => ({ vitrinaService: { catalogo: (...a) => catalogo(...a) } }));
vi.mock('../services/tiendaService', () => ({ tiendaService: { obtener: () => new Promise(() => {}), mias: () => new Promise(() => {}) } }));
vi.mock('../services/planesService', () => ({ planesService: { miEstado: () => new Promise(() => {}) } }));
vi.mock('../services/landingSimpleService', () => ({ landingSimpleService: { obtener: () => new Promise(() => {}) } }));
// El chunk del editor no hace falta para esta prueba.
vi.mock('../pages/landing-simple/EditorSegunModo', () => ({ default: () => null }));

import RequireTienda from './RequireTienda';
import { marcarSesionActiva, olvidarSesion } from '../utils/sesion';

function montar(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes><Route path={ruta} element={<RequireTienda><p>ok</p></RequireTienda>} /></Routes>
    </MemoryRouter>,
  );
}

/**
 * Mi e-commerce: el catálogo completo es el pedido más lento y el editor
 * lo espera. Tiene que salir junto con la sesión, no después.
 */
describe('RequireTienda: precarga de Mi e-commerce', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    olvidarSesion();
    catalogo.mockClear();
    // /auth/me queda sin responder: lo que se pida ya, salió en paralelo.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('en /landing pide el catálogo sin esperar la respuesta de la sesión', async () => {
    marcarSesionActiva();
    montar('/landing');
    await waitFor(() => expect(catalogo).toHaveBeenCalledTimes(1));
  });

  it('en otras pantallas no lo pide', async () => {
    marcarSesionActiva();
    montar('/products');
    await new Promise((r) => setTimeout(r, 50));
    expect(catalogo).not.toHaveBeenCalled();
  });

  it('sin una sesión previa en la pestaña no pide nada', async () => {
    montar('/landing');
    await new Promise((r) => setTimeout(r, 50));
    expect(catalogo).not.toHaveBeenCalled();
  });
});
