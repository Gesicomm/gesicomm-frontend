import API from './api';

// Cliente para /api/meta-reportes: campañas internas de Meta Ads y el
// gasto que se les carga a mano por rango de fechas.
export const metaReportesService = {
  // ---- Campañas internas ----
  crearCampana: (payload) => API.post('/meta-reportes/campanas', payload).then(r => r.data),
  listarCampanas: (filtros = {}) => API.get('/meta-reportes/campanas', { params: filtros }).then(r => r.data),
  actualizarCampana: (id, payload) => API.put(`/meta-reportes/campanas/${id}`, payload).then(r => r.data),
  eliminarCampana: (id) => API.delete(`/meta-reportes/campanas/${id}`).then(r => r.data),

  // ---- Gasto de la campaña ----
  // payload: { fecha_desde, fecha_hasta, monto, nota }
  crearGasto: (campanaId, payload) => API.post(`/meta-reportes/campanas/${campanaId}/gastos`, payload).then(r => r.data),
  // El histórico va por POST: paginación y orden viajan como JSON en el
  // body y los resuelve el backend.
  listarGastos: (campanaId, filtros = {}) =>
    API.post(`/meta-reportes/campanas/${campanaId}/gastos/listar`, filtros).then(r => r.data),
  actualizarGasto: (id, payload) => API.put(`/meta-reportes/gastos/${id}`, payload).then(r => r.data),
  eliminarGasto: (id) => API.delete(`/meta-reportes/gastos/${id}`).then(r => r.data),
};
