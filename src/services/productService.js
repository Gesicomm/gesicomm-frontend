import API from './api';

export const productService = {
  buscar: (filtros) => API.post('/productos/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/productos', data).then(r => r.data),
  importarShopify: (formData) =>
    API.post('/productos/importar-shopify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  detalle: (id) => API.get(`/productos/${id}`).then(r => r.data),
  variantes: (id) => API.get(`/productos/${id}/variantes`).then(r => r.data),
  opciones: (id) => API.get(`/productos/${id}/opciones`).then(r => r.data),
  imagenes: (id) => API.get(`/productos/${id}/imagenes`).then(r => r.data),
  faq: (id) => API.get(`/productos/${id}/faq`).then(r => r.data),
  relacionados: (id, landing_id) => API.get(`/productos/${id}/relacionados${landing_id ? '?landing_id=' + landing_id : ''}`).then(r => r.data),
  historialPrecios: (id) => API.get(`/productos/${id}/historial-precios`).then(r => r.data),
  // Simulador de precio — llama al mismo Pricing Engine que el checkout
  // público (ver ProductoService.simularPrecio en el backend).
  simularPrecio: (id, { cantidad, variante_id, oferta_id } = {}) =>
    API.post(`/productos/${id}/simular-precio`, { cantidad, variante_id, oferta_id }).then(r => r.data),
  actualizar: (id, data) => API.put(`/productos/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/productos/${id}`).then(r => r.data),
  subirImagen: (productoId, formData) =>
    API.post(`/productos/${productoId}/imagenes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  // Foto suelta de la ficha (Vista del producto): sube a R2 y devuelve { url },
  // no la agrega a la galería del producto.
  subirImagenFicha: (productoId, formData) =>
    API.post(`/productos/${productoId}/ficha-imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  actualizarImagen: (productoId, imgId, data) =>
    API.put(`/productos/${productoId}/imagenes/${imgId}`, data).then(r => r.data),
  reprocesarImagen: (productoId, imgId, data) =>
    API.post(`/productos/${productoId}/imagenes/${imgId}/reprocesar`, data).then(r => r.data),
  eliminarImagen: (productoId, imgId) =>
    API.delete(`/productos/${productoId}/imagenes/${imgId}`).then(r => r.data),
};
