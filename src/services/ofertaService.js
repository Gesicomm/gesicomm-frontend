import API from './api';

export const ofertaService = {
  listarPorProducto: (productoId) =>
    API.get(`/productos/${productoId}/ofertas`).then(r => r.data),

  crear: (productoId, payload) =>
    API.post(`/productos/${productoId}/ofertas`, payload).then(r => r.data),

  actualizar: (id, payload) =>
    API.put(`/ofertas/${id}`, payload).then(r => r.data),

  eliminar: (id) =>
    API.delete(`/ofertas/${id}`).then(r => r.data),
};
