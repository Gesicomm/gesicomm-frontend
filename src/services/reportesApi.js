import api from './api';

export const reportesService = {
  obtenerKPIs: async (filtros) => {
    const res = await api.post('/reportes/kpis', filtros);
    return res.data;
  },
  obtenerPedidos: async (params) => {
    // params incluye { pagina, limite, fecha_desde, fecha_hasta, buscador }
    const res = await api.post('/reportes/pedidos', params);
    return res.data;
  },
  obtenerItems: async (params) => {
    const res = await api.post('/reportes/items', params);
    return res.data;
  }
};
