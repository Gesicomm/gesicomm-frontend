import API from './api';

export const comboAdminService = {
  // ─── Simulación ─────────────────────────────────────────────────────────
  simular: (payload) =>
    API.post('/combos/simular', payload).then(r => r.data),

  // ─── CRUD ────────────────────────────────────────────────────────────────
  listar: (filtros = {}) => {
    const params = {};
    if (filtros.estado) params.estado = filtros.estado;
    return API.get('/combos', { params }).then(r => r.data);
  },

  obtener: (id) =>
    API.get(`/combos/${id}`).then(r => r.data),

  crear: (payload) =>
    API.post('/combos', payload).then(r => r.data),

  actualizar: (id, payload) =>
    API.put(`/combos/${id}`, payload).then(r => r.data),

  // ─── Ciclo de vida ───────────────────────────────────────────────────────
  cambiarEstado: (id, estado) =>
    API.patch(`/combos/${id}/estado`, { estado }).then(r => r.data),

  // ─── Configuración económica ─────────────────────────────────────────────
  obtenerConfiguracion: () =>
    API.get('/combos/configuracion').then(r => r.data),

  actualizarConfiguracion: (payload) =>
    API.post('/combos/configuracion', payload).then(r => r.data),
};
