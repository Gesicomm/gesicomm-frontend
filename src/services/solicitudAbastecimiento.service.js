import api from './api';

export const solicitudAbastecimientoService = {
  cotizar: async (payload) => {
    const { data } = await api.post('/solicitudes-abastecimiento/cotizar', payload);
    return data;
  },

  crear: async (payload) => {
    const { data } = await api.post('/solicitudes-abastecimiento', payload);
    return data;
  },

  listar: async (params = {}) => {
    const { data } = await api.get('/solicitudes-abastecimiento', { params });
    return data;
  },

  obtener: async (id) => {
    const { data } = await api.get(`/solicitudes-abastecimiento/${id}`);
    return data;
  },

  subirComprobante: async (id, file) => {
    const form = new FormData();
    form.append('comprobante', file);
    const { data } = await api.post(`/solicitudes-abastecimiento/${id}/comprobante`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  validarPago: async (id) => {
    const { data } = await api.post(`/solicitudes-abastecimiento/${id}/validar-pago`);
    return data;
  },

  rechazarPago: async (id, motivo) => {
    const { data } = await api.post(`/solicitudes-abastecimiento/${id}/rechazar-pago`, { motivo });
    return data;
  },

  avanzar: async (id, centroGesicommId) => {
    const { data } = await api.post(`/solicitudes-abastecimiento/${id}/avanzar`, { centroGesicommId });
    return data;
  },

  confirmarRecepcion: async (id) => {
    const { data } = await api.post(`/solicitudes-abastecimiento/${id}/confirmar-recepcion`);
    return data;
  },
};
