import api from './api';

export const reportesService = {
  obtenerKPIs: async (filtros) => {
    const res = await api.post('/reportes/kpis', filtros);
    return res.data;
  },
  obtenerEvolucionVentas: async (filtros) => {
    const res = await api.post('/reportes/evolucion-ventas', filtros);
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
  },
  obtenerReporteComposicion: async (params) => {
    const res = await api.post('/reportes/composicion', params);
    return res.data;
  },
  obtenerReporteClientes: async (params) => {
    const res = await api.post('/reportes/clientes', params);
    return res.data;
  },
  obtenerReporteMetodosPago: async (params) => {
    const res = await api.post('/reportes/metodos-pago', params);
    return res.data;
  },
  obtenerReporteFallos: async (params) => {
    const res = await api.post('/reportes/fallos', params);
    return res.data;
  },
  obtenerReporteGeografia: async (params) => {
    const res = await api.post('/reportes/geografia', params);
    return res.data;
  },
  obtenerReporteLogistica: async (params) => {
    const res = await api.post('/reportes/logistica', params);
    return res.data;
  },
  obtenerReporteCrossSelling: async (params) => {
    const res = await api.post('/reportes/cross-selling', params);
    return res.data;
  }
};
