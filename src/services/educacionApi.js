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

export const marcarVideoVisto = async (id) => {
  const { data } = await api.post(`/educacion/modulos/${id}/video-visto`);
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
// Rutas de Administrador (ABM Cursos y Exámenes)
// ==========================================

export const adminListModulos = async () => {
  const { data } = await api.get('/admin/educacion/modulos');
  return data;
};

export const adminCreateModulo = async (moduloData) => {
  const { data } = await api.post('/admin/educacion/modulos', moduloData);
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
