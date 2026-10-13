import api from './api';

const base = '/integraciones/speedbox';
export const speedboxService = {
  obtener: async () => (await api.get(base)).data,
  guardar: async payload => (await api.put(base, payload)).data,
  vincular: async credentials => (await api.post(`${base}/store`, credentials || {})).data,
  probar: async credentials => (await api.post(`${base}/spec`, credentials || {})).data,
  enviarPrueba: async credentials => (await api.post(`${base}/order-test`, credentials || {})).data,
  sincronizar: async credentials => (await api.post(`${base}/updates`, credentials || {})).data,
  enviar: async id => (await api.post(`${base}/pedidos/${id}/enviar`)).data,
  conciliar: async (id, payload) => (await api.post(`${base}/eventos/${id}/conciliar`, payload)).data,
  reintentar: async (id, acknowledge_uncertain = false) =>
    (await api.post(`${base}/pedidos/${id}/reintentar`, { acknowledge_uncertain })).data,
};
