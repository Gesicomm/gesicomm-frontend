import api from './api';

const base = '/integraciones/speedbox';
export const speedboxService = {
  obtener: async () => (await api.get(base)).data,
  guardar: async payload => (await api.put(base, payload)).data,
  vincular: async () => (await api.post(`${base}/store`)).data,
  probar: async () => (await api.post(`${base}/spec`)).data,
  sincronizar: async () => (await api.post(`${base}/updates`)).data,
  enviar: async id => (await api.post(`${base}/pedidos/${id}/enviar`)).data,
  reintentar: async (id, acknowledge_uncertain = false) =>
    (await api.post(`${base}/pedidos/${id}/reintentar`, { acknowledge_uncertain })).data,
};
