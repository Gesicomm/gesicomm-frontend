import API from './api';

export const landingService = {
  listar: () => API.get('/mis-landings').then(r => r.data),
  paginas: () => API.get('/mis-landings/paginas').then(r => r.data),
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

  // A diferencia de subirBanner, no devuelve la landing actualizada — los
  // testimonios se guardan en bloque con el resto del form (ver PasoContenido
  // .jsx), no tienen id estable entre guardados. Devuelve { url } y esa URL
  // se pega en el campo "foto" de la fila que se esté editando en memoria.
  subirTestimonioFoto: (id, formData) =>
    API.post(`/mis-landings/${id}/testimonio-foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  // Mismo criterio que subirTestimonioFoto: devuelve solo { url }, sin
  // atarla a una fila — las secciones también se reemplazan en bloque en
  // cada Guardar (ver sincronizarSecciones en el backend).
  subirImagenSeccion: (id, formData) =>
    API.post(`/mis-landings/${id}/seccion-imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  estadisticas: (id, dias = 30) => API.get(`/mis-landings/${id}/estadisticas`, { params: { dias } }).then(r => r.data),
  estadisticasRango: (id, filtros = {}) => API.post(`/mis-landings/${id}/estadisticas-rango`, filtros).then(r => r.data),

  // Diseño de página propio de un producto — recurso separado de
  // /mis-landings/:id, vive bajo /productos porque es una propiedad del
  // producto, no de ninguna landing puntual (ver landing.service.js
  // obtenerSeccionesProducto/guardarSeccionesProducto).
  obtenerSeccionesProducto: (productoId) => API.get(`/productos/${productoId}/pagina-secciones`).then(r => r.data),
  guardarSeccionesProducto: (productoId, secciones) => API.put(`/productos/${productoId}/pagina-secciones`, { secciones }).then(r => r.data),

  // Las fichas de producto se editan desde /products/:id/editar. El flujo
  // legacy de instanciar "funnels" por producto fue retirado.
};
