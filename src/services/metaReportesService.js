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

  // Análisis previo: dice qué trae el archivo y a qué campaña iría cada
  // dato, sin escribir nada. Es el paso de revisión del asistente.
  analizarCSV: (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return API.post('/meta-reportes/importar/analizar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  /**
   * @param {File} archivo
   * @param {number|null} meta_integration_id
   * @param {Record<string, number>} relaciones Lo elegido en la revisión:
   *        { "nombre de campaña en Meta": id_campana_interna }. Solo aplica
   *        a las que no matchean por código.
   */
  importarCSV: (archivo, meta_integration_id, relaciones = null) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (meta_integration_id) formData.append('meta_integration_id', meta_integration_id);
    if (relaciones && Object.keys(relaciones).length > 0) {
      formData.append('relaciones', JSON.stringify(relaciones));
    }
    return API.post('/meta-reportes/importar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  // Las consultas de reportes van por POST: los filtros son un objeto
  // (rango de fechas, búsqueda, estado, orden) y viajan como JSON en el
  // body, no aplastados en un query string.
  listarImportaciones: (filtros = {}) => API.post('/meta-reportes/importaciones/listar', filtros).then(r => r.data),
  eliminarImportacion: (id) => API.delete(`/meta-reportes/importaciones/${id}`).then(r => r.data),

  // ---- Filas / métricas ----
  listarFilas: (filtros = {}) => API.post('/meta-reportes/filas/listar', filtros).then(r => r.data),
  vincularFila: (id, meta_campana_interna_id) =>
    API.put(`/meta-reportes/filas/${id}/vincular`, { meta_campana_interna_id }).then(r => r.data),
  metricasPorProducto: (filtros = {}) => API.post('/meta-reportes/metricas-por-producto', filtros).then(r => r.data),

  // KPIs del período + variación contra el período anterior (vista "Resumen").
  resumen: (filtros = {}) => API.post('/meta-reportes/resumen', filtros).then(r => r.data),
};
