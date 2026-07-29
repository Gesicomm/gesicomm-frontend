import API from './api';

export const productService = {
  buscar: (filtros) => API.post('/productos/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/productos', data).then(r => r.data),
  detalle: (id) => API.get(`/productos/${id}`).then(r => r.data),
  historialPrecios: (id) => API.get(`/productos/${id}/historial-precios`).then(r => r.data),
  actualizar: (id, data) => API.put(`/productos/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/productos/${id}`).then(r => r.data),
  subirImagen: (productoId, formData) =>
    API.post(`/productos/${productoId}/imagenes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  actualizarImagen: (productoId, imgId, data) =>
    API.put(`/productos/${productoId}/imagenes/${imgId}`, data).then(r => r.data),
  eliminarImagen: (productoId, imgId) =>
    API.delete(`/productos/${productoId}/imagenes/${imgId}`).then(r => r.data),
};
