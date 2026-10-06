import API from './api';

// Servicio de "Landing simple" — 3 templates rígidos (Fitness/Beauty/Tech).
// Mismo estilo que landingService.js, pero apuntando al módulo nuevo:
// el comercio solo edita contenido, nunca estructura (ver backend
// landingSimple.service.js).
export const landingSimpleService = {
  listarTemplates: () => API.get('/landing-templates', { params: { kind: 'rigido' } }).then(r => r.data),

  listar: () => API.get('/mis-landings-simples').then(r => r.data),
  crear: (templateId, colores = null, items = []) => API.post('/mis-landings-simples', { template_id: templateId, items, ...(colores ? { colores } : {}) }).then(r => r.data),
  // `venta` es lo que se armó en el panel de ofertas del wizard (qué
  // ofertas se muestran, combos, recomendados, tipo de venta): viaja junto
  // con el prompt para que la primera generación ya traiga esos bloques.
  crearDesdeIA: (prompt, items = [], venta = null, base = null) =>
    API.post('/mis-landings-simples/ai-draft', { prompt, items, venta, base }).then(r => r.data),
  // Vuelve a generar el HTML/CSS de una landing YA CREADA con un prompt
  // nuevo — misma fila, mismo id, mismos productos (los de "Configurar
  // venta"). A diferencia de crearDesdeIA, no crea otra landing.
  // target: 'inicio' | 'producto' (ficha general) | 'producto_especifico' | 'categoria' | 'checkout'
  // (ficha propia — requiere contentId, el content_id público del producto).
  regenerarConIA: (id, prompt, target = 'inicio', contentId = null) =>
    API.post(`/mis-landings-simples/${id}/ai-regenerar`, { prompt, target, contentId }).then(r => r.data),
  // Reemplaza el order bump y los paquetes de las fichas por el bloque
  // canónico de Gesicomm (foto, precio anterior, ahorro, estados). Las
  // landings nuevas ya salen así; esto repara las anteriores sin regenerar
  // con IA, que tardaría minutos y cambiaría el diseño.
  actualizarBloquesVenta: (id) =>
    API.post(`/mis-landings-simples/${id}/bloques-venta`).then(r => r.data),
  crearDesdeOnboarding: (templateSlug, items) =>
    API.post('/mis-landings-simples/onboarding', { template_slug: templateSlug, items }).then(r => r.data),
  // Lienzo en blanco (kind='codigo'): no lleva template_id — el template
  // de código es uno solo y lo resuelve el backend por slug.
  crearLienzoBlanco: (items = []) => API.post('/mis-landings-simples/lienzo-blanco', { items }).then(r => r.data),
  obtener: (id) => API.get(`/mis-landings-simples/${id}`).then(r => r.data),
  actualizar: (id, payload) => API.put(`/mis-landings-simples/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/mis-landings-simples/${id}`).then(r => r.data),
  cambiarEstado: (id, activo, opciones = {}) => API.patch(`/mis-landings-simples/${id}/estado`, {
    activo,
    ...(opciones.aceptarContenidoIA ? { aceptar_contenido_ia: true } : {}),
  }).then(r => r.data),

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

  // Fotos propias de la ficha (antes/después, ingredientes...). Las landings
  // rígidas son filas de la misma tabla Landing, así que se reusa el
  // endpoint de imágenes de sección de /mis-landings: chequea que la landing
  // sea de la tienda, sube a R2 y devuelve { url } sin atarla a ninguna
  // columna — la URL queda guardada dentro de Landing.content.
  subirImagenFicha: (id, formData) =>
    API.post(`/mis-landings/${id}/seccion-imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
};
