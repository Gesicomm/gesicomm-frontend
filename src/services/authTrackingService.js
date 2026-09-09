import API from './api';

export const authTrackingService = {
  async resumen(dias = 30) {
    const { data } = await API.post('/admin/auth-tracking/resumen', { dias });
    return data;
  },

  async eventos({ pagina = 1, filtros = {} } = {}) {
    const { data } = await API.post('/admin/auth-tracking/eventos', { pagina, filtros });
    return data;
  },

  async sesiones({ pagina = 1, filtros = {} } = {}) {
    const { data } = await API.post('/admin/auth-tracking/sesiones', { pagina, filtros });
    return data;
  },

  async notificaciones({ pagina = 1, filtros = {} } = {}) {
    const { data } = await API.post('/admin/auth-tracking/notificaciones', { pagina, filtros });
    return data;
  },

  async marcarNotificacionesLeidas(ids = null) {
    const { data } = await API.patch('/admin/auth-tracking/notificaciones/leidas', { ids });
    return data;
  },
};
