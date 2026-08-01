import API from './api';

export const landingService = {
  listar: () => API.get('/mis-landings').then(r => r.data),
  crear: (payload) => API.post('/mis-landings', payload).then(r => r.data),
  obtener: (id) => API.get(`/mis-landings/${id}`).then(r => r.data),
  actualizar: (id, payload) => API.put(`/mis-landings/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/mis-landings/${id}`).then(r => r.data),
  cambiarEstado: (id, activo) => API.patch(`/mis-landings/${id}/estado`, { activo }).then(r => r.data),

  subirBanner: (id, formData) =>
    API.post(`/mis-landings/${id}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarBanner: (id) => API.delete(`/mis-landings/${id}/banner`).then(r => r.data),

  subirSeoImagen: (id, formData) =>
    API.post(`/mis-landings/${id}/seo-imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarSeoImagen: (id) => API.delete(`/mis-landings/${id}/seo-imagen`).then(r => r.data),

  estadisticas: (id, dias = 30) => API.get(`/mis-landings/${id}/estadisticas`, { params: { dias } }).then(r => r.data),
};
