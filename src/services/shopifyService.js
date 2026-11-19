import API from './api';
import { apiBaseURL } from '../utils/apiBase';

const shopifyService = {
  getStatus: async () => {
    const { data } = await API.get('/shopify/status');
    return data;
  },

  connectWithCredentials: async ({ shop, clientId, clientSecret }) => {
    const { data } = await API.post('/shopify/connect-credentials', { shop, clientId, clientSecret });
    return data;
  },

  connectWithToken: async ({ shop, accessToken }) => {
    const { data } = await API.post('/shopify/connect-token', { shop, accessToken });
    return data;
  },

  connect: async (shop) => {
    const { data } = await API.post('/shopify/connect', { shop });
    return data;
  },

  linkStore: async (shop) => {
    const { data } = await API.post('/shopify/link', { shop });
    return data;
  },

  syncProductos: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/sync/productos', { shopifyTiendaId });
    return data;
  },

  syncStock: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/sync/stock', { shopifyTiendaId });
    return data;
  },

  syncPedidos: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/sync/pedidos', { shopifyTiendaId });
    return data;
  },

  syncClientes: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/sync/clientes', { shopifyTiendaId });
    return data;
  },

  updateCotizacion: async ({ shopifyTiendaId, cotizacion_pyg }) => {
    const { data } = await API.put('/shopify/cotizacion', { shopifyTiendaId, cotizacion_pyg });
    return data;
  },

  reintentarAvisos: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/avisos/reintentar', { shopifyTiendaId });
    return data;
  },

  syncTodo: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/sync/todo', { shopifyTiendaId });
    return data;
  },

  listPedidos: async (filtros = {}) => {
    const { data } = await API.post('/shopify/pedidos/list', filtros);
    return data;
  },

  listClientes: async (filtros = {}) => {
    const { data } = await API.post('/shopify/clientes/list', filtros);
    return data;
  },

  listLogs: async (filtros = {}) => {
    const { data } = await API.post('/shopify/logs/list', filtros);
    return data;
  },

  disconnect: async (shopifyTiendaId) => {
    const { data } = await API.post('/shopify/disconnect', { shopifyTiendaId });
    return data;
  },

  getPublicAuthUrl: (shop) => {
    const base = apiBaseURL().replace(/\/$/, '');
    return `${base}/shopify/auth?shop=${encodeURIComponent(shop)}`;
  },
};

export default shopifyService;
