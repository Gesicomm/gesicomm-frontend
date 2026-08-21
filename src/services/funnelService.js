import API from './api';

/**
 * Servicio de EMBUDOS — módulo propio, separado del editor de landing
 * (landingSimpleService.js) y del sistema flexible deprecado
 * (landingService.js). Ver backend funnel.service.js.
 *
 * Un embudo es una página de un solo producto: el comercio elige el
 * producto y el tipo de embudo, y solo edita contenido — nunca estructura.
 */
export const funnelService = {
  listarTemplates: () => API.get('/mis-funnels/templates').then(r => r.data),

  listar: () => API.get('/mis-funnels').then(r => r.data),

  // 404 = ese producto todavía no tiene embudo (respuesta esperada, no un
  // error): el front muestra el selector de tipo en vez de romper.
  porProducto: (productoId) =>
    API.get(`/mis-funnels/producto/${productoId}`)
      .then(r => r.data)
      .catch(err => {
        if (err.response?.status === 404) return null;
        throw err;
      }),

  crear: (productoId, templateId) =>
    API.post('/mis-funnels', { producto_id: productoId, template_id: templateId }).then(r => r.data),

  obtener: (id) => API.get(`/mis-funnels/${id}`).then(r => r.data),
  actualizar: (id, payload) => API.put(`/mis-funnels/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/mis-funnels/${id}`).then(r => r.data),
  cambiarEstado: (id, activo) => API.patch(`/mis-funnels/${id}/estado`, { activo }).then(r => r.data),
};
