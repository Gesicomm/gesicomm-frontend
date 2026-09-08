import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/Login';
import { olvidarSesion } from '../utils/sesion';

/**
 * Los tres finales posibles de un guard de ruta. La regla que se protege acá
 * es que ninguno se quede en el spinner: en producción, con el token vencido,
 * la pantalla giraba para siempre y el usuario no sabía si el sistema se había
 * caído.
 */

function montar() {
  // StrictMode igual que main.jsx: en desarrollo React monta dos veces, y eso
  // ya rompió una vez el cartel de sesión vencida (se consumía en el primer
  // efecto y el segundo lo encontraba vacío).
  return render(
    <StrictMode>
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route path="/privado" element={<ProtectedRoute><p>contenido privado</p></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
    </StrictMode>
  );
}

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    olvidarSesion(); // limpia también el aviso memorizado en el módulo
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza el contenido cuando hay sesión', async () => {
    fetch.mockResolvedValue(respuesta(200, { id: 1, nombre: 'Ana', rol: 'usuario' }));

    montar();

    expect(await screen.findByText('contenido privado')).toBeInTheDocument();
  });

  it('con token vencido renueva la sesión y no expulsa al usuario', async () => {
    // Backend falso: /me da 401 hasta que alguien pasa por /refresh.
    let renovado = false;
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/refresh')) {
        renovado = true;
        return respuesta(200, { message: 'Token renovado.' });
      }
      return renovado
        ? respuesta(200, { id: 1, nombre: 'Ana', rol: 'usuario' })
        : respuesta(401, { message: 'Sesión inválida o expirada.' });
    });

    montar();

    expect(await screen.findByText('contenido privado')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/api/auth/refresh'))).toBe(true);
  });

  it('si la sesión ya no se puede renovar, manda al login con el aviso', async () => {
    window.sessionStorage.setItem('gesicomm:sesion-activa', '1'); // hubo sesión en esta pestaña
    fetch.mockResolvedValue(respuesta(401, { message: 'No autenticado.' }));

    montar();

    expect(await screen.findByText('Tu sesión expiró')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('sin sesión previa va al login sin avisar nada', async () => {
    fetch.mockResolvedValue(respuesta(401, { message: 'No autenticado.' }));

    montar();

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByText('Tu sesión expiró')).not.toBeInTheDocument();
  });

  it('si el backend no responde muestra el error de conexión, no el login', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    montar();

    expect(await screen.findByText('No pudimos conectar con el servidor')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });
});
