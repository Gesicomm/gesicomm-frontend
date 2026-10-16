import API from './api';
const base = '/mi-tienda/meta-feed';
export const metaFeedService = {
  estadoActual: () => API.get(`${base}/landing-actual`).then(r => r.data),
  estado: id => API.get(`${base}/${id}`).then(r => r.data),
  activar: (id, activo) => API.patch(`${base}/${id}`, { activo }).then(r => r.data),
  actualizar: id => API.post(`${base}/${id}/actualizar`).then(r => r.data),
};
