import API from './api';

export const ofertaService = {
  // soloActivas: la baja es lógica, así que por defecto la lista trae también
  // las dadas de baja (las necesita la pantalla de administración, que las
  // marca como inactivas). Quien solo muestra ofertas vigentes debe pedirlo.
  listarPorProducto: (productoId, { soloActivas = false } = {}) =>
    API.get(`/productos/${productoId}/ofertas`, { params: soloActivas ? { soloActivas: true } : {} }).then(r => r.data),

  crear: (productoId, payload) =>
    API.post(`/productos/${productoId}/ofertas`, payload).then(r => r.data),

  actualizar: (id, payload) =>
    API.put(`/ofertas/${id}`, payload).then(r => r.data),

  eliminar: (id) =>
    API.delete(`/ofertas/${id}`).then(r => r.data),
};
