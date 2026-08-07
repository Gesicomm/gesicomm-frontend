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

export const getEnvios = async (fecha = null, estado = null) => {
  const { data } = await api.post('/envios/list', { fecha, estado });
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

export const getMetricasDashboardPedidos = async (filtros = {}) => {
  const { data } = await api.post('/envios/metricas-dashboard', filtros);
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

