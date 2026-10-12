import api from './api';

export const importadaChinaService = {
  solicitar: async ({ producto_url }) => {
    const { data } = await api.post('/importada-china/solicitudes', { producto_url });
    return data;
  },
};
