import API from './api';

export const vitrinaService = {
  catalogo: () => API.get('/vitrina/catalogo').then(r => r.data),

  guardarPrecioProducto: (id, precio) =>
    API.put(`/vitrina/productos/${id}/precio`, { precio }).then(r => r.data),

  guardarPrecioCombo: (id, precio) =>
    API.put(`/vitrina/combos/${id}/precio`, { precio }).then(r => r.data),

  sensibilidadProducto: (id) =>
    API.get(`/vitrina/productos/${id}/sensibilidad`).then(r => r.data),

  sensibilidadCombo: (id) =>
    API.get(`/vitrina/combos/${id}/sensibilidad`).then(r => r.data),
};
