import axios from 'axios';
import { irALoginPorSesionPerdida, renovarSesion } from '../utils/sesion';

let apiURL = import.meta.env.VITE_API_URL || '';
if (!apiURL) {
  console.error("🚨 ERROR CRÍTICO: La variable VITE_API_URL no está definida en el entorno.");
}
if (!apiURL.endsWith('/api') && apiURL !== '') {
  apiURL = apiURL.replace(/\/$/, '') + '/api';
}

const API = axios.create({
  baseURL: apiURL,
  withCredentials: true,
});

// El backend guarda las imágenes con ruta relativa (ej: "/uploads/foto.jpg"),
// servida en la raíz del backend (server.js: app.use('/uploads', ...)), NO
// bajo /api. Si se usa esa ruta tal cual en un <img src>, el navegador la
// resuelve contra el origen del FRONTEND (Vite, otro puerto) en vez del
// backend, y la imagen sale rota. Este helper antepone el origen correcto.
const backendOrigin = apiURL.replace(/\/api$/, '');
export function getMediaUrl(url) {
  if (!url) return url;
  if (typeof url !== 'string') {
    url = url.url || url.ruta || url.path || url.src || '';
    if (!url || typeof url !== 'string') return '';
  }
  if (/^https?:\/\//.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return backendOrigin + url;
}

// ─────────────────────────────────────────────────────────────────────────
// Interceptor para manejo global de errores (especialmente 401)
//
// Flujo: 401 → renovar el access token con el refresh token (una sola vez,
// compartida entre todas las peticiones en vuelo — ver utils/sesion.js) →
// reintentar. Si la renovación falla, la sesión está realmente vencida: se
// va al login con el aviso, nunca se deja al usuario mirando un spinner.
// ─────────────────────────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Sin config no hay nada que reintentar (error de red antes de salir,
    // request cancelada). Antes esto reventaba al leer originalRequest.url.
    if (!originalRequest?.url) return Promise.reject(error);

    // Ignorar requests de login/refresh/me para evitar loops
    if (originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/refresh') ||
        originalRequest.url.includes('/auth/me')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const renovado = await renovarSesion();
      if (renovado) return API(originalRequest);

      // Refresh token vencido o inexistente: sesión terminada de verdad.
      irALoginPorSesionPerdida();
      return Promise.reject(error);
    }

    // Un 401 en el reintento significa que ni con el token nuevo alcanza
    // (cookie de otra sesión, permisos revocados): tampoco hay que dejar a la
    // pantalla esperando.
    if (error.response?.status === 401 && originalRequest._retry) {
      irALoginPorSesionPerdida();
    }

    return Promise.reject(error);
  }
);

export default API;
