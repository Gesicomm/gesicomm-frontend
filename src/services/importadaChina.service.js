import api from './api';

export const importadaChinaService = {
  solicitar: async (solicitud) => {
    const { data } = await api.post('/importada-china/solicitudes', solicitud);
    return data;
  },
};
