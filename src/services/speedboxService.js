import api from './api';

const base = '/integraciones/speedbox';

function payloadMinimo(payload = {}) {
  const limpio = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      limpio[key] = value;
    }
  }
  return limpio;
}

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
  listarPedidos: async (payload = {}) => (await api.post(`${base}/pedidos/list`, payloadMinimo(payload))).data,
  listarImportes: async (payload = {}) => (await api.post(`${base}/importes/list`, payloadMinimo(payload))).data,
  listarCostosReposicion: async (payload = {}) => (await api.post(`${base}/costos-reposicion/list`, payloadMinimo(payload))).data,
  listarMovimientos: async (payload = {}) => (await api.post(`${base}/movimientos/list`, payloadMinimo(payload))).data,
};
