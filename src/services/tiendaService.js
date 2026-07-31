import API from './api';

export const tiendaService = {
  obtener: () => API.get('/mi-tienda').then(r => r.data),
  crear: (payload) => API.post('/mi-tienda', payload).then(r => r.data),
  actualizar: (payload) => API.put('/mi-tienda', payload).then(r => r.data),
  disponibilidadSubdominio: (sub) => API.get('/mi-tienda/subdominio/disponibilidad', { params: { sub } }).then(r => r.data),

  guardarDominioPropio: (dominio) => API.post('/mi-tienda/dominio-propio', { dominio }).then(r => r.data),
  estadoDominioPropio: () => API.get('/mi-tienda/dominio-propio/estado').then(r => r.data),
  eliminarDominioPropio: () => API.delete('/mi-tienda/dominio-propio').then(r => r.data),
};
