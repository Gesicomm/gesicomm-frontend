import API from './api';

export const comboService = {
  listar: async (productoId) => {
    const { data } = await API.get(`/productos/${productoId}/combos`);
    return data;
  },

  crear: async (productoId, payload) => {
    const { data } = await API.post(`/productos/${productoId}/combos`, payload);
    return data;
  },

  actualizar: async (productoId, comboId, payload) => {
    const { data } = await API.put(`/productos/${productoId}/combos/${comboId}`, payload);
    return data;
  },

  cambiarEstado: async (productoId, comboId, activo) => {
    const { data } = await API.patch(`/productos/${productoId}/combos/${comboId}/estado`, { activo });
    return data;
  }
};
