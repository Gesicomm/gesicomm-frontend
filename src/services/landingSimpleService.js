import API from './api';

// Servicio de "Landing simple" — 3 templates rígidos (Fitness/Beauty/Tech).
// Mismo estilo que landingService.js, pero apuntando al módulo nuevo:
// el comercio solo edita contenido, nunca estructura (ver backend
// landingSimple.service.js).
export const landingSimpleService = {
  listarTemplates: () => API.get('/landing-templates', { params: { kind: 'rigido' } }).then(r => r.data),

  listar: () => API.get('/mis-landings-simples').then(r => r.data),
  crear: (templateId) => API.post('/mis-landings-simples', { template_id: templateId }).then(r => r.data),
  crearDesdeOnboarding: (templateSlug, items) =>
    API.post('/mis-landings-simples/onboarding', { template_slug: templateSlug, items }).then(r => r.data),
  // Lienzo en blanco (kind='codigo'): no lleva template_id — el template
  // de código es uno solo y lo resuelve el backend por slug.
  crearLienzoBlanco: (items = []) => API.post('/mis-landings-simples/lienzo-blanco', { items }).then(r => r.data),
  obtener: (id) => API.get(`/mis-landings-simples/${id}`).then(r => r.data),
  actualizar: (id, payload) => API.put(`/mis-landings-simples/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/mis-landings-simples/${id}`).then(r => r.data),
  cambiarEstado: (id, activo) => API.patch(`/mis-landings-simples/${id}/estado`, { activo }).then(r => r.data),

  subirLogo: (id, formData) =>
    API.post(`/mis-landings-simples/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarLogo: (id) => API.delete(`/mis-landings-simples/${id}/logo`).then(r => r.data),

  subirHeroImagen: (id, formData) =>
    API.post(`/mis-landings-simples/${id}/hero-imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarHeroImagen: (id) => API.delete(`/mis-landings-simples/${id}/hero-imagen`).then(r => r.data),
};
