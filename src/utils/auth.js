/**
 * Utilidad para manejo de autenticación.
 *
 * ✅ SEGURO: Usamos cookies HttpOnly gestionadas por el BACKEND.
 *    El backend debe enviar la cookie con:
 *      Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict
 *
 * ❌ NUNCA:
 *    localStorage.setItem("token", jwt)
 *    sessionStorage.setItem("token", jwt)
 *
 * Desde el frontend NO podemos leer el token directamente
 * (eso es precisamente lo que lo hace seguro contra XSS).
 * Solo el backend puede leerlo e invalidarlo.
 */
import {
  baseApi,
  marcarSesionActiva,
  olvidarSesion,
  registrarSesionPerdida,
  renovarSesion,
} from './sesion';

/**
 * Consulta la sesión al backend y devuelve un estado explícito.
 *
 * Distinguir "no hay sesión" de "no se pudo preguntar" es lo que evita que la
 * app se quede colgada en el spinner: si el backend no responde (caído, red
 * cortada, 502 de Nginx) antes se devolvía null igual que en un 401, y los
 * componentes que solo sabían manejar "hay usuario" se quedaban cargando para
 * siempre, sin ningún mensaje.
 *
 * Estados:
 *   'autenticado' → sesión válida (usuario viene con los datos)
 *   'sin-sesion'  → el backend dijo 401, incluso después de intentar renovar
 *   'error'       → no se pudo determinar (backend caído / sin conexión)
 */
export async function verificarSesionDetallada({ permitirRenovar = true } = {}) {
  let res;
  try {
    res = await fetch(`${baseApi()}/api/auth/me`, {
      method: 'GET',
      credentials: 'include', // Envía cookies HttpOnly automáticamente
      cache: 'no-store',      // nunca reusar la identidad de una sesión anterior
    });
  } catch {
    return { estado: 'error', usuario: null };
  }

  if (res.status === 401 || res.status === 403) {
    // El access token dura 15 minutos. Antes de dar la sesión por perdida hay
    // que usar el refresh token (7 días), si no el usuario vuelve al login
    // cada 15 minutos de uso.
    if (permitirRenovar && (await renovarSesion())) {
      return verificarSesionDetallada({ permitirRenovar: false });
    }
    registrarSesionPerdida();
    return { estado: 'sin-sesion', usuario: null };
  }

  if (!res.ok) return { estado: 'error', usuario: null };

  try {
    const usuario = await res.json(); // { id, nombre, email, rol }
    marcarSesionActiva();
    return { estado: 'autenticado', usuario };
  } catch {
    // Respondió 200 pero no era JSON (típico de un proxy devolviendo HTML).
    return { estado: 'error', usuario: null };
  }
}

/**
 * Verifica si el usuario tiene una sesión activa.
 * Devuelve el usuario o null (compatible con el uso previo en las páginas).
 * Para decidir qué mostrar cuando NO hay usuario, usar
 * verificarSesionDetallada(): distingue "sin sesión" de "backend caído".
 */
export async function verificarSesion() {
  const { usuario } = await verificarSesionDetallada();
  return usuario;
}

/**
 * Cierra la sesión del usuario.
 * El backend invalida las cookies HttpOnly.
 */
export async function cerrarSesion() {
  olvidarSesion();
  try {
    await fetch(`${baseApi()}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Si el backend no contesta igual seguimos: quien llama redirige al
    // login con recarga completa, y las cookies vencen solas.
  }
}
