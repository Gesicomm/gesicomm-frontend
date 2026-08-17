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
  },
  obtenerReporteComisiones: async (params) => {
    const res = await api.post('/reportes/comisiones', params);
    return res.data;
  },
  obtenerReporteFacturacion: async (params) => {
    const res = await api.post('/reportes/facturacion', params);
    return res.data;
  },
  obtenerReporteProductos: async (params) => {
    const res = await api.post('/reportes/productos', params);
    return res.data;
  },
  obtenerReporteConfirmadores: async (params) => {
    const res = await api.post('/reportes/confirmadores', params);
    return res.data;
  }
};
