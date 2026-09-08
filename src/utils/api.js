/**
 * Utilidad centralizada para llamadas a la API del backend.
 *
 * - Todas las peticiones incluyen `credentials: 'include'` para que
 *   el navegador envíe automáticamente la cookie HttpOnly con el JWT.
 * - Los errores del servidor NUNCA se muestran directamente al usuario.
 *   Solo se expone un mensaje genérico.
 * - Un 401 con la sesión vencida se renueva sola (refresh token) y, si ya no
 *   hay nada que renovar, manda al login con el aviso correspondiente en vez
 *   de devolver un error críptico a la pantalla.
 */
import { irALoginPorSesionPerdida, renovarSesion } from './sesion';

// ⚠️ NUNCA hacer fallback a la URL de producción.
// Si no existe la variable, usamos la ruta relativa (útil si hay un proxy local) o localhost para desarrollo.
const API_URL = import.meta.env.VITE_API_URL || '';

// Rutas donde un 401 NO significa "sesión vencida" y por lo tanto no hay que
// mandar a nadie al login:
//   - /api/auth/*: credenciales incorrectas, OTP vencido, etc. (además sería
//     un bucle: el login vive ahí).
//   - la baja de cuenta, que responde 401 cuando la contraseña de
//     confirmación no coincide (solicitudEliminacion.controller.js).
const RUTAS_CON_401_PROPIO = [
  '/api/auth/',
  '/api/publico/mi-cuenta/eliminacion',
];
const manejaSuPropio401 = (ruta) => RUTAS_CON_401_PROPIO.some((r) => ruta.startsWith(r));

async function leerCuerpo(res) {
  try {
    return await res.json();
  } catch {
    // 502/504 de Nginx, HTML del SPA, respuesta vacía… nada de esto es JSON.
    return null;
  }
}

async function peticion(ruta, opciones = {}, { reintentado = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.headers || {}),
      },
      credentials: 'include', // Envía la cookie HttpOnly siempre
      ...opciones,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Intenta más tarde.');
  }

  if (res.status === 401 && !manejaSuPropio401(ruta)) {
    // Access token vencido: se intenta renovar una sola vez con el refresh
    // token antes de dar la sesión por perdida.
    if (!reintentado && (await renovarSesion())) {
      return peticion(ruta, opciones, { reintentado: true });
    }
    irALoginPorSesionPerdida();
    throw new Error('Tu sesión expiró. Volvé a iniciar sesión.');
  }

  const data = await leerCuerpo(res);

  if (!res.ok) {
    // ✅ Solo mostramos el mensaje genérico que envía el backend.
    // ❌ Nunca exponemos stack traces, IPs ni detalles internos.
    const error = new Error(data?.message || 'Error interno del servidor');
    error.status = res.status;
    error.response = { status: res.status, data: data || {} };
    throw error;
  }

  return data;
}

export const api = {
  get: (ruta) => peticion(ruta, { method: 'GET' }),
  post: (ruta, cuerpo) => peticion(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }),
  put: (ruta, cuerpo) => peticion(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),
  delete: (ruta) => peticion(ruta, { method: 'DELETE' }),
};
