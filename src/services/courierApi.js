import api from './api';

export const getCouriers = async () => {
  const { data } = await api.get('/couriers');
  return data;
};

export const createCourier = async (courierData) => {
  const { data } = await api.post('/couriers', courierData);
  return data;
};

export const updateCourier = async (id, courierData) => {
  const { data } = await api.put(`/couriers/${id}`, courierData);
  return data;
};

export const deleteCourier = async (id) => {
  const { data } = await api.delete(`/couriers/${id}`);
  return data;
};

export const getEnvios = async (filtros = {}) => {
  const { data } = await api.post('/envios/list', filtros);
  return data;
};

/**
 * Versión paginada de getEnvios para la vista de tabla.
 * @param {object} filtros - { page, limit, fecha_desde, fecha_hasta, estados[], cliente, ciudad, courier_id, confirmador, origen }
 */
export const getEnviosPaginados = async (filtros = {}) => {
  const { data } = await api.post('/envios/list-paginado', filtros);
  return data;
};

export const createEnvio = async (envioData) => {
  const { data } = await api.post('/envios', envioData);
  return data;
};

/**
 * `datos` acepta estado/courier_id (uso normal, drag-and-drop o el select
 * de la card) y, cuando se confirma un pedido desde el modal único de
 * Pedido (NuevoPedidoModal.jsx en modo "completar"), también el resto de
 * los campos del formulario (ciudad, dirección, courier, método de pago,
 * facturación, etc.) — el backend solo toca los campos que vienen definidos.
 */
export const updateEstadoEnvio = async (id, datos) => {
  const { data } = await api.put(`/envios/${id}/estado`, datos);
  return data;
};

export const deleteEnvio = async (id) => {
  const { data } = await api.delete(`/envios/${id}`);
  return data;
};

export const getMetricasDashboardPedidos = async (filtros = {}) => {
  const { data } = await api.post('/envios/metricas-dashboard', filtros);
  return data;
};

/** Contador de pedidos agrupados por estado, respetando los filtros activos (pestañas de la bandeja). */
export const getConteoPorEstado = async (filtros = {}) => {
  const { data } = await api.post('/envios/conteo-por-estado', filtros);
  return data;
};

/** Resumen financiero minimalista de la pestaña Entregados (ver plan sección 22). */
export const getResumenEntregados = async (filtros = {}) => {
  const { data } = await api.post('/envios/resumen-entregados', filtros);
  return data;
};

/** Dashboard general del módulo Pedidos: trabajo pendiente, resultado operativo, desempeño courier. */
export const getDashboardGeneralPedidos = async (filtros = {}) => {
  const { data } = await api.post('/envios/dashboard-general', filtros);
  return data;
};

/** Historial simple de movimientos de un pedido (ver plan sección 24). */
export const getHistorialPedido = async (envioId) => {
  const { data } = await api.get(`/envios/${envioId}/historial`);
  return data;
};

/** Devolución por producto/cantidad. `payload`: { items: [{envio_item_componente_id, cantidad, condicion}], marcar_estado } */
export const registrarDevolucion = async (envioId, payload) => {
  const { data } = await api.post(`/envios/${envioId}/devolucion`, payload);
  return data;
};

/** Pérdida por producto/cantidad. `payload`: { items: [{envio_item_componente_id, cantidad}], marcar_estado } */
export const registrarPerdida = async (envioId, payload) => {
  const { data } = await api.post(`/envios/${envioId}/perdida`, payload);
  return data;
};

/** Motor de rendición — previsualización, confirmación y consulta de historial. */
export const previsualizarLiquidacion = async (payload) => {
  const { data } = await api.post('/liquidaciones/previsualizar', payload);
  return data;
};

export const confirmarLiquidacion = async (payload) => {
  const { data } = await api.post('/liquidaciones/confirmar', payload);
  return data;
};

export const getLiquidacionesPorCourier = async (courierId) => {
  const { data } = await api.get(`/liquidaciones/courier/${courierId}`);
  return data;
};

export const getMetodosPago = async () => {
  const { data } = await api.get('/metodos-pago');
  return data;
};

export const createMetodoPago = async (metodoData) => {
  const { data } = await api.post('/metodos-pago', metodoData);
  return data;
};

export const updateMetodoPago = async (id, metodoData) => {
  const { data } = await api.put(`/metodos-pago/${id}`, metodoData);
  return data;
};

export const deleteMetodoPago = async (id) => {
  const { data } = await api.delete(`/metodos-pago/${id}`);
  return data;
};

