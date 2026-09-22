import api from './api';

/**
 * Convierte un depósito del formato de la API (snake_case) a camelCase para uso en frontend.
 */
export const mapDepositoFromApi = (raw) => {
  if (!raw) return null;
  return {
    ...raw,
    personaContacto: raw.persona_contacto || '',
    telefonoContacto: raw.telefono_contacto || '',
    googleMapsUrl: raw.google_maps_url || '',
  };
};

/**
 * Convierte los campos camelCase a snake_case para enviar al backend.
 */
export const mapDepositoToApi = (form) => {
  if (!form) return {};
  
  const payload = { ...form };
  
  if ('personaContacto' in payload) {
    payload.persona_contacto = payload.personaContacto;
    delete payload.personaContacto;
  }
  if ('telefonoContacto' in payload) {
    payload.telefono_contacto = payload.telefonoContacto;
    delete payload.telefonoContacto;
  }
  if ('googleMapsUrl' in payload) {
    payload.google_maps_url = payload.googleMapsUrl;
    delete payload.googleMapsUrl;
  }
  
  return payload;
};

export const depositoService = {
  listarDepositos: async (payload) => {
    const { data } = await api.post('/depositos/listado', payload);
    if (data && data.data) {
      data.data = data.data.map(mapDepositoFromApi);
    }
    return data;
  },

  obtenerDeposito: async (id) => {
    const { data } = await api.get(`/depositos/${id}`);
    return mapDepositoFromApi(data);
  },

  crearDeposito: async (payload) => {
    const apiPayload = mapDepositoToApi(payload);
    const { data } = await api.post('/depositos', apiPayload);
    return mapDepositoFromApi(data);
  },

  actualizarDeposito: async (id, payload) => {
    const apiPayload = mapDepositoToApi(payload);
    const { data } = await api.put(`/depositos/${id}`, apiPayload);
    return mapDepositoFromApi(data);
  },

  cambiarEstadoDeposito: async (id, activo) => {
    const { data } = await api.patch(`/depositos/${id}/estado`, { activo: Boolean(activo) });
    return mapDepositoFromApi(data);
  },

  eliminarDeposito: async (id) => {
    const { data } = await api.delete(`/depositos/${id}`);
    return data; // Retorna el message enviado por backend
  },

  /** Couriers que pueden despachar desde el depósito (propios + de Gesicomm). */
  listarCouriersDeposito: async (id) => {
    const { data } = await api.get(`/depositos/${id}/couriers`);
    return data;
  },

  /** Reemplaza el set de couriers habilitados del depósito. */
  guardarCouriersDeposito: async (id, courierIds) => {
    const { data } = await api.put(`/depositos/${id}/couriers`, { courierIds });
    return data;
  },
};
