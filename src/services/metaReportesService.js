import API from './api';

// Cliente para /api/meta-reportes: campañas internas de Meta Ads +
// importación de reportes CSV exportados desde Meta Ads Manager.
export const metaReportesService = {
  // ---- Campañas internas ----
  crearCampana: (payload) => API.post('/meta-reportes/campanas', payload).then(r => r.data),
  listarCampanas: (filtros = {}) => API.get('/meta-reportes/campanas', { params: filtros }).then(r => r.data),
  actualizarCampana: (id, payload) => API.put(`/meta-reportes/campanas/${id}`, payload).then(r => r.data),
  eliminarCampana: (id) => API.delete(`/meta-reportes/campanas/${id}`).then(r => r.data),

  // ---- Importación de reportes ----
  importarCSV: (archivo, meta_integration_id) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (meta_integration_id) formData.append('meta_integration_id', meta_integration_id);
    return API.post('/meta-reportes/importar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  listarImportaciones: () => API.get('/meta-reportes/importaciones').then(r => r.data),
  eliminarImportacion: (id) => API.delete(`/meta-reportes/importaciones/${id}`).then(r => r.data),

  // ---- Filas / métricas ----
  listarFilas: (filtros = {}) => API.get('/meta-reportes/filas', { params: filtros }).then(r => r.data),
  vincularFila: (id, meta_campana_interna_id) =>
    API.put(`/meta-reportes/filas/${id}/vincular`, { meta_campana_interna_id }).then(r => r.data),
  metricasPorProducto: (filtros = {}) => API.get('/meta-reportes/metricas-por-producto', { params: filtros }).then(r => r.data),
};
