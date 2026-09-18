import api from './api';

export const notificationsService = {
  getNotifications: async (params = { leida: false, limit: 50 }) => {
    const { data } = await api.get('/seguimiento/notificaciones', { params });
    return data;
  },
  markAsRead: async (id) => {
    const { data } = await api.patch(`/seguimiento/notificaciones/${id}/leida`);
    return data;
  },
  markAllAsRead: async () => {
    await api.patch('/seguimiento/notificaciones/leer-todas');
  }
};
