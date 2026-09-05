import API from './api';

/**
 * Cupones de descuento del comercio. El backend filtra todo por el usuario
 * de la sesión, así que acá no hace falta mandar a quién pertenecen.
 */
export const cuponService = {
  listar: () => API.get('/cupones').then(r => r.data.cupones),
  crear: (datos) => API.post('/cupones', datos).then(r => r.data),
  actualizar: (id, datos) => API.put(`/cupones/${id}`, datos).then(r => r.data),
  eliminar: (id) => API.delete(`/cupones/${id}`).then(r => r.data),
};
