import api from './api';

export const seguimientoService = {
  // Flujos de mensajes (la unidad principal: proceso + fases ordenadas)
  getFlujos: async (params = {}) => {
    const { data } = await api.get('/seguimiento/flujos', { params });
    return data;
  },
  getFlujo: async (id) => {
    const { data } = await api.get(`/seguimiento/flujos/${id}`);
    return data;
  },
  createFlujo: async (payload) => {
    const { data } = await api.post('/seguimiento/flujos', payload);
    return data;
  },
  updateFlujo: async (id, payload) => {
    const { data } = await api.put(`/seguimiento/flujos/${id}`, payload);
    return data;
  },
  deleteFlujo: async (id) => {
    const { data } = await api.delete(`/seguimiento/flujos/${id}`);
    // 204 cuando se borro de verdad; { desactivado: true } cuando tenia historial.
    return data || null;
  },

  // Flujos + lo que ya se abrio de cada fase EN ESTE pedido
  getFlujosPedido: async (envioId) => {
    const { data } = await api.get(`/envios/${envioId}/seguimiento/flujos`);
    return data;
  },

  // Variables disponibles para los mensajes (fuente unica: el backend)
  getVariables: async () => {
    const { data } = await api.get('/seguimiento/variables');
    return data;
  },

  // Plantillas sueltas (legacy pre-flujos)
  getPlantillas: async (params = {}) => {
    const { data } = await api.get('/seguimiento/plantillas', { params });
    return data;
  },
  getPlantilla: async (id) => {
    const { data } = await api.get(`/seguimiento/plantillas/${id}`);
    return data;
  },
  createPlantilla: async (payload) => {
    const { data } = await api.post('/seguimiento/plantillas', payload);
    return data;
  },
  updatePlantilla: async (id, payload) => {
    const { data } = await api.put(`/seguimiento/plantillas/${id}`, payload);
    return data;
  },
  deletePlantilla: async (id) => {
    await api.delete(`/seguimiento/plantillas/${id}`);
  },

  // Etiquetas
  getEtiquetas: async (params = {}) => {
    const { data } = await api.get('/seguimiento/etiquetas', { params });
    return data;
  },
  createEtiqueta: async (payload) => {
    const { data } = await api.post('/seguimiento/etiquetas', payload);
    return data;
  },
  updateEtiqueta: async (id, payload) => {
    const { data } = await api.put(`/seguimiento/etiquetas/${id}`, payload);
    return data;
  },
  deleteEtiqueta: async (id) => {
    await api.delete(`/seguimiento/etiquetas/${id}`);
  },

  // Etiquetas del pedido
  getEtiquetasPedido: async (envioId) => {
    const { data } = await api.get(`/envios/${envioId}/seguimiento/etiquetas`);
    return data;
  },
  addEtiquetaPedido: async (envioId, etiquetaId) => {
    const { data } = await api.post(`/envios/${envioId}/seguimiento/etiquetas`, { etiqueta_id: etiquetaId });
    return data;
  },
  removeEtiquetaPedido: async (envioId, etiquetaId) => {
    await api.delete(`/envios/${envioId}/seguimiento/etiquetas/${etiquetaId}`);
  },

  // Contacto WhatsApp
  crearContacto: async (envioId, payload) => {
    const { data } = await api.post(`/envios/${envioId}/seguimiento/contactos`, payload);
    return data;
  },

  // Recordatorios
  guardarNota: async (envioId, nota) => {
      const { data } = await api.post(`/envios/${envioId}/seguimiento/nota`, { nota });
      return data;
    },
    programarRecordatorio: async (envioId, payload) => {
    const { data } = await api.post(`/envios/${envioId}/seguimiento/recordatorio`, payload);
    return data;
  },
  completarRecordatorio: async (envioId, recordatorioId) => {
    await api.patch(`/envios/${envioId}/seguimiento/recordatorio/${recordatorioId}/completar`);
  },
  cancelarRecordatorio: async (envioId, recordatorioId) => {
    await api.patch(`/envios/${envioId}/seguimiento/recordatorio/${recordatorioId}/cancelar`);
  },

  // Configuración
  getConfiguracion: async () => {
    const { data } = await api.get('/seguimiento/configuracion');
    return data;
  },
  updateConfiguracion: async (payload) => {
    const { data } = await api.put('/seguimiento/configuracion', payload);
    return data;
  },

  // Timeline
  getTimeline: async (envioId) => {
    const { data } = await api.get(`/envios/${envioId}/seguimiento/historial`);
    return data;
  }
};
