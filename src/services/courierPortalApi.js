import axios from 'axios';
import { apiBaseURL } from '../utils/apiBase';

const TOKEN_KEY = 'gesicomm:courierToken';

const courierApi = axios.create({
  baseURL: apiBaseURL(),
});

courierApi.interceptors.request.use((config) => {
  const token = getCourierToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getCourierToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCourierToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin storage, la sesión no persiste entre recargas.
  }
}

export const courierLogin = async (payload) => {
  const { data } = await courierApi.post('/courier-auth/login', payload);
  if (data?.token) setCourierToken(data.token);
  return data;
};

export const courierLogout = async () => {
  try {
    await courierApi.post('/courier-auth/logout');
  } finally {
    setCourierToken(null);
  }
};

export const getCourierMe = async () => {
  const { data } = await courierApi.get('/courier-auth/me');
  return data;
};

export const getCourierPedidos = async () => {
  const { data } = await courierApi.get('/courier-portal/pedidos');
  return data;
};

export const getCourierMetodosPago = async () => {
  const { data } = await courierApi.get('/courier-portal/metodos-pago');
  return data;
};

export const marcarPedidoEntregadoCourier = async (id, payload) => {
  const { data } = await courierApi.put(`/courier-portal/pedidos/${id}/entregar`, payload);
  return data;
};

export const reprogramarPedidoCourier = async (id, payload) => {
  const { data } = await courierApi.put(`/courier-portal/pedidos/${id}/reprogramar`, payload);
  return data;
};

export const reportarNoEntregadoCourier = async (id, payload) => {
  const { data } = await courierApi.put(`/courier-portal/pedidos/${id}/no-entregado`, payload);
  return data;
};
