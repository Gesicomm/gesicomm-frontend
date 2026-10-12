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

export const getCourierAccess = async (id) => {
  const { data } = await api.get(`/couriers/${id}/acceso`);
  return data;
};

export const createCourierAccess = async (id, payload) => {
  const { data } = await api.post(`/couriers/${id}/acceso`, payload);
  return data;
};

export const changeCourierAccessPassword = async (id, payload) => {
  const { data } = await api.put(`/couriers/${id}/acceso/password`, payload);
  return data;
};

export const updateCourierAccessStatus = async (id, activo) => {
  const { data } = await api.put(`/couriers/${id}/acceso/estado`, { activo });
  return data;
};

export const getDeliveryZonas = async () => {
  const { data } = await api.get('/couriers/zonas-delivery');
  return data;
};

export const getCourierGeografia = async (filtros = {}) => {
  const { data } = await api.post('/couriers/geografia', filtros);
  return data;
};

/**
 * Reemplaza tarifas de delivery. `courierIds` acota el alcance: sin él el
 * backend borra TODAS las del comercio y reescribe lo que llegue, así que un
 * guardado parcial se llevaría puestas las tarifas de los demás couriers.
 */
export const replaceDeliveryZonas = async (zonas, courierIds = undefined) => {
  const payload = courierIds === undefined ? { zonas } : { zonas, courierIds };
  const { data } = await api.put('/couriers/zonas-delivery', payload);
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
export const listarPedidosParaPrepararGesicomm = async () => {
  const { data } = await api.get('/envios/gesicomm/pendientes');
  return data;
};

export const updateEstadoEnvio = async (id, datos) => {
  const { data } = await api.put(`/envios/${id}/estado`, datos);
  return data;
};

export const getProveedorLogisticoMatch = async (id) => {
  const { data } = await api.get(`/envios/${id}/proveedor-logistico-sugerido`);
  return data;
};

/** Cambia el precio de un item puntual de un pedido ya creado (ej. descuento por seguimiento comercial). No toca el precio del producto. */
export const actualizarPrecioItemEnvio = async (envioId, itemId, precio_unitario) => {
  const { data } = await api.patch(`/envios/${envioId}/items/${itemId}/precio`, { precio_unitario });
  return data;
};

/** Datos de la cuenta bancaria + monto a transferir para pagar el abastecimiento. */
export const obtenerDatosTransferenciaAbastecimiento = async (id) => {
  const { data } = await api.get(`/envios/${id}/abastecimiento/datos-transferencia`);
  return data;
};

/** Sube el comprobante de transferencia; en el mismo acto pasa a "pago enviado". */
export const subirComprobanteAbastecimiento = async (id, archivo) => {
  const formData = new FormData();
  formData.append('comprobante', archivo);
  const { data } = await api.post(`/envios/${id}/abastecimiento/comprobante`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const validarPagoAbastecimiento = async (id) => {
  const { data } = await api.post(`/envios/${id}/abastecimiento/pago/validar`);
  return data;
};

export const rechazarPagoAbastecimiento = async (id, motivo) => {
  const { data } = await api.post(`/envios/${id}/abastecimiento/pago/rechazar`, { motivo });
  return data;
};

/** Avanza al único siguiente estado operativo válido; el backend lo resuelve, acá no se elige nada. */
export const avanzarAbastecimiento = async (id) => {
  const { data } = await api.post(`/envios/${id}/abastecimiento/avanzar`);
  return data;
};

export const confirmarRecepcionAbastecimiento = async (id) => {
  const { data } = await api.post(`/envios/${id}/abastecimiento/confirmar-recepcion`);
  return data;
};

export const obtenerTimelineAbastecimiento = async (id) => {
  const { data } = await api.get(`/envios/${id}/abastecimiento/timeline`);
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

/** Contador de abastecimientos por estado, respetando filtros dinámicos POST. */
export const getConteoPorAbastecimiento = async (filtros = {}) => {
  const { data } = await api.post('/envios/conteo-por-abastecimiento', filtros);
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

export const actualizarLogisticaAbastecimiento = async (envioId, payload) => {
  const { data } = await api.put(`/envios/${envioId}/abastecimiento/logistica`, payload);
  return data;
};

export const cotizarLogisticaAbastecimiento = async (envioId, payload) => {
  const { data } = await api.post(`/envios/${envioId}/abastecimiento/cotizar-logistica`, payload);
  return data;
};

