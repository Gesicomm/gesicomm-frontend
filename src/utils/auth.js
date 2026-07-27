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

/**
 * Verifica si el usuario tiene una sesión activa
 * haciendo una petición autenticada al backend.
 * El navegador envía la cookie HttpOnly automáticamente.
 */
export async function verificarSesion() {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'https://api.gesicomm.com';
    const res = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include', // Envía cookies HttpOnly automáticamente
    });

    if (!res.ok) return null;

    return await res.json(); // { id, nombre, email, rol }
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del usuario.
 * El backend invalida la cookie HttpOnly.
 */
export async function cerrarSesion() {
  const API_URL = import.meta.env.VITE_API_URL || 'https://api.gesicomm.com';
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
