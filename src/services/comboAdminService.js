import API from './api';

export const comboAdminService = {
  // ─── Simulación ─────────────────────────────────────────────────────────
  simular: (payload) =>
    API.post('/combos/simular', payload).then(r => r.data),

  // ─── CRUD ────────────────────────────────────────────────────────────────
  listar: (filtros = {}) => {
    const params = {};
    if (filtros.estado) params.estado = filtros.estado;
    return API.get('/combos', { params }).then(r => r.data);
  },

  obtener: (id) =>
    API.get(`/combos/${id}`).then(r => r.data),

  crear: (payload) =>
    API.post('/combos', payload).then(r => r.data),

  actualizar: (id, payload) =>
    API.put(`/combos/${id}`, payload).then(r => r.data),

  // ─── Imágenes del combo ─────────────────────────────────────────────────
  imagenes: (id) =>
    API.get(`/combos/${id}/imagenes`).then(r => r.data),

  subirImagen: (id, formData) =>
    API.post(`/combos/${id}/imagenes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  actualizarImagen: (id, imgId, payload) =>
    API.put(`/combos/${id}/imagenes/${imgId}`, payload).then(r => r.data),

  eliminarImagen: (id, imgId) =>
    API.delete(`/combos/${id}/imagenes/${imgId}`).then(r => r.data),

  // ─── Ciclo de vida ───────────────────────────────────────────────────────
  cambiarEstado: (id, estado) =>
    API.patch(`/combos/${id}/estado`, { estado }).then(r => r.data),

  // ─── Configuración económica ─────────────────────────────────────────────
  obtenerConfiguracion: () =>
    API.get('/combos/configuracion').then(r => r.data),

  actualizarConfiguracion: (payload) =>
    API.post('/combos/configuracion', payload).then(r => r.data),
};
