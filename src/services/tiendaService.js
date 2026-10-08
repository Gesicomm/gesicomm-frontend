import API from './api';

export const tiendaService = {
  obtener: () => API.get('/mi-tienda').then(r => r.data),
  crear: (payload) => API.post('/mi-tienda', payload).then(r => r.data),
  actualizar: (payload) => API.put('/mi-tienda', payload).then(r => r.data),
  // Logo de la tienda: default de todas las landings sin logo propio. Se
  // guarda al subirlo, no con el PUT de "Guardar cambios".
  subirLogo: (formData) =>
    API.post('/mi-tienda/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarLogo: () => API.delete('/mi-tienda/logo').then(r => r.data),
  guardarTipografia: (payload) => API.put('/mi-tienda/typography', payload).then(r => r.data),
  subirFuente: (formData) =>
    API.post('/mi-tienda/typography/fonts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  eliminarFuente: (fontId) => API.delete(`/mi-tienda/typography/fonts/${fontId}`).then(r => r.data),
  disponibilidadSubdominio: (sub) => API.get('/mi-tienda/subdominio/disponibilidad', { params: { sub } }).then(r => r.data),

  // Cómo entrega el comercio lo que vende (modalidad de fulfillment).
  obtenerFulfillment: () => API.get('/mi-tienda/fulfillment').then(r => r.data),
  listarDepositosFulfillment: (payload) => API.post('/mi-tienda/fulfillment/depositos', payload).then(r => r.data),
  guardarFulfillment: (modalidad, depositoId) =>
    API.put('/mi-tienda/fulfillment', { modalidad, depositoId }).then(r => r.data),

  guardarDominioPropio: (dominio) => API.post('/mi-tienda/dominio-propio', { dominio }).then(r => r.data),
  estadoDominioPropio: () => API.get('/mi-tienda/dominio-propio/estado').then(r => r.data),
  habilitarDominioPropio: (habilitado) =>
    API.patch('/mi-tienda/dominio-propio/habilitado', { habilitado }).then(r => r.data),
  eliminarDominioPropio: () => API.delete('/mi-tienda/dominio-propio').then(r => r.data),
  consultarWhois: (domain) => API.post('/mi-tienda/dominio/whois', { domain }).then(r => r.data),

  // Varias tiendas por cuenta: listado + cambio de tienda activa.
  mias: () => API.get('/tiendas/mias').then(r => r.data),
  seleccionar: (tiendaId) => API.post('/auth/seleccionar-tienda', { tienda_id: tiendaId }).then(r => r.data),
};
