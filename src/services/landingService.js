import API from './api';

export const landingService = {
  listar: () => API.get('/mis-landings').then(r => r.data),
  crear: (payload) => API.post('/mis-landings', payload).then(r => r.data),
  obtener: (id) => API.get(`/mis-landings/${id}`).then(r => r.data),
  actualizar: (id, payload) => API.put(`/mis-landings/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/mis-landings/${id}`).then(r => r.data),
  cambiarEstado: (id, activo) => API.patch(`/mis-landings/${id}/estado`, { activo }).then(r => r.data),
};
