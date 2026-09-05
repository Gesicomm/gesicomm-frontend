import axios from 'axios';

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

// Interceptor para manejo global de errores (especialmente 401)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ignorar requests de login/refresh/me para evitar loops
    if (originalRequest.url.includes('/auth/login') || 
        originalRequest.url.includes('/auth/refresh') ||
        originalRequest.url.includes('/auth/me')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return API(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Intentar renovar el token
        await axios.post(`${apiURL}/auth/refresh`, {}, { withCredentials: true });
        isRefreshing = false;
        processQueue(null);
        return API(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, forzar cierre de sesión
        isRefreshing = false;
        processQueue(refreshError, null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
