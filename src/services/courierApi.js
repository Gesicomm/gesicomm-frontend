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

export const createEnvio = async (envioData) => {
  const { data } = await api.post('/envios', envioData);
  return data;
};

export const updateEstadoEnvio = async (id, estado, courier_id) => {
  const { data } = await api.put(`/envios/${id}/estado`, { estado, courier_id });
  return data;
};

export const getMetricasDashboardPedidos = async (filtros = {}) => {
  const { data } = await api.post('/envios/metricas-dashboard', filtros);
  return data;
};

