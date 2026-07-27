/**
 * Utilidad centralizada para llamadas a la API del backend.
 *
 * - Todas las peticiones incluyen `credentials: 'include'` para que
 *   el navegador envíe automáticamente la cookie HttpOnly con el JWT.
 * - Los errores del servidor NUNCA se muestran directamente al usuario.
 *   Solo se expone un mensaje genérico.
 */

// ⚠️ NUNCA hacer fallback a la URL de producción.
// Si no existe la variable, usamos la ruta relativa (útil si hay un proxy local) o localhost para desarrollo.
const API_URL = import.meta.env.VITE_API_URL || '';

async function peticion(ruta, opciones = {}) {
  try {
    const res = await fetch(`${API_URL}${ruta}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.headers || {}),
      },
      credentials: 'include', // Envía la cookie HttpOnly siempre
      ...opciones,
    });

    const data = await res.json();

    if (!res.ok) {
      // ✅ Solo mostramos el mensaje genérico que envía el backend.
      // ❌ Nunca exponemos stack traces, IPs ni detalles internos.
      throw new Error(data.message || 'Error interno del servidor');
    }

    return data;
  } catch (err) {
    // Si es un error de red (sin respuesta del servidor)
    if (err.name === 'TypeError') {
      throw new Error('No se pudo conectar con el servidor. Intenta más tarde.');
    }
    throw err;
  }
}

export const api = {
  get: (ruta) => peticion(ruta, { method: 'GET' }),
  post: (ruta, cuerpo) => peticion(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }),
  put: (ruta, cuerpo) => peticion(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),
  delete: (ruta) => peticion(ruta, { method: 'DELETE' }),
};
