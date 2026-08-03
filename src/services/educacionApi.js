import api from './api';

// ==========================================
// Rutas de Usuario (Academia y Progresión)
// ==========================================

export const getModulosEducacion = async () => {
  const { data } = await api.get('/educacion/modulos');
  return data;
};

export const getDetalleModulo = async (id) => {
  const { data } = await api.get(`/educacion/modulos/${id}`);
  return data;
};

export const marcarLeccionCompletada = async (leccionId) => {
  const { data } = await api.post(`/educacion/lecciones/${leccionId}/completar`);
  return data;
};

export const enviarExamenModulo = async (id, respuestas) => {
  const { data } = await api.post(`/educacion/modulos/${id}/enviar-examen`, { respuestas });
  return data;
};

export const getProgresoSidebar = async () => {
  const { data } = await api.get('/educacion/progreso-sidebar');
  return data;
};

// ==========================================
// Rutas de Administrador (LMS Journey Studio)
// ==========================================

export const adminListModulos = async () => {
  const { data } = await api.get('/admin/educacion/modulos');
  return data;
};

export const adminCreateModulo = async (moduloData) => {
  const { data } = await api.post('/admin/educacion/modulos', moduloData);
  return data;
};

export const adminReordenarModulos = async (modulosOrdenados) => {
  const { data } = await api.post('/admin/educacion/modulos/reordenar', { modulosOrdenados });
  return data;
};

export const adminDuplicarModulo = async (id) => {
  const { data } = await api.post(`/admin/educacion/modulos/${id}/duplicar`);
  return data;
};

export const adminUpdateModulo = async (id, moduloData) => {
  const { data } = await api.put(`/admin/educacion/modulos/${id}`, moduloData);
  return data;
};

export const adminDeleteModulo = async (id) => {
  const { data } = await api.delete(`/admin/educacion/modulos/${id}`);
  return data;
};
