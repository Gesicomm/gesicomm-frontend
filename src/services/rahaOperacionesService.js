import api from './api';

const base = '/integraciones/raha/operaciones';

export const rahaOperacionesService = {
  destinos: async () => (await api.get(`${base}/destinos`)).data,
  origenes: async () => (await api.get(`${base}/origenes`)).data,
  stock: async filtros => (await api.post(`${base}/stock`, filtros)).data,
  crearEnvio: async payload => (await api.post(`${base}/envios`, payload)).data,
  envios: async filtros => (await api.post(`${base}/envios/listado`, filtros)).data,
  envio: async id => (await api.get(`${base}/envios/${id}`)).data,
  resolverEnvio: async (id, payload) => (await api.post(`${base}/envios/${id}/resolver`, payload)).data,
};
