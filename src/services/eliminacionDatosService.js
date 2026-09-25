import API from './api';

export const eliminacionDatosService = {
  listar: async () => {
    const { data } = await API.get('/publico/admin/eliminacion-datos');
    return data;
  },
  actualizarEstado: async (id, estado) => {
    const { data } = await API.patch(`/publico/admin/eliminacion-datos/${id}`, { estado });
    return data;
  }
};
