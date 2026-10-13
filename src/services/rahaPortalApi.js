import axios from 'axios';
import { apiBaseURL } from '../utils/apiBase';

// Portal externo de Raha (/raha/login). Sesión propia, separada de Gesicom.
const TOKEN_KEY = 'gesicomm:rahaPortalToken';

const portalApi = axios.create({ baseURL: apiBaseURL() });

export function getRahaPortalToken() {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setRahaPortalToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin storage, la sesión no persiste entre recargas.
  }
}

portalApi.interceptors.request.use((config) => {
  const token = getRahaPortalToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  response => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || '').endsWith('/login')) {
      setRahaPortalToken(null);
      if (!window.location.pathname.startsWith('/raha/login')) window.location.assign('/raha/login');
    }
    return Promise.reject(error);
  },
);

async function descargar(url, nombre) {
  try {
    const { data } = await portalApi.get(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = objectUrl; link.download = nombre; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Conserva el error de transporte. */ }
    }
    throw error;
  }
}

const base = '/raha-portal';

export const rahaPortalApi = {
  login: async (payload) => {
    const { data } = await portalApi.post(`${base}/login`, payload);
    if (data?.token) setRahaPortalToken(data.token);
    return data;
  },
  logout: () => setRahaPortalToken(null),
  me: async () => (await portalApi.get(`${base}/me`)).data,
  // Filtros dinámicos por body (POST).
  listar: async filtros => (await portalApi.post(`${base}/solicitudes`, filtros)).data,
  detalle: async id => (await portalApi.get(`${base}/solicitudes/${id}`)).data,
  resolver: async (id, payload) => (await portalApi.post(`${base}/solicitudes/${id}/resolver`, payload)).data,
  documento: (id, doc) => descargar(`${base}/solicitudes/${id}/documentos/${doc.id}`, doc.nombre),
  expediente: id => descargar(`${base}/solicitudes/${id}/expediente`, `raha-solicitud-${id}.zip`),
};
