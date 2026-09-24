import api from './api';

export const inventarioService = {
  listarStock: async (filtros = {}) => {
    const { data } = await api.post('/inventario/stock/listado', filtros);
    return data;
  },

  listarIngresos: async (filtros = {}) => {
    const { data } = await api.post('/inventario/ingresos/listado', filtros);
    return data;
  },

  obtenerIngreso: async (id) => {
    const { data } = await api.get(`/inventario/ingresos/${id}`);
    return data;
  },

  crearBorrador: async (payload) => {
    const { data } = await api.post('/inventario/ingresos', payload);
    return data;
  },

  confirmarEnvio: async (id) => {
    const { data } = await api.post(`/inventario/ingresos/${id}/confirmar-envio`);
    return data;
  },

  marcarEnTransito: async (id, datosEnvio = {}) => {
    const { data } = await api.post(`/inventario/ingresos/${id}/marcar-en-transito`, datosEnvio);
    return data;
  },

  registrarRecepcion: async (id) => {
    const { data } = await api.post(`/inventario/ingresos/${id}/recepcion`);
    return data;
  },

  resolverDiferencias: async (id, conteos) => {
    const { data } = await api.post(`/inventario/ingresos/${id}/resolver-diferencias`, { conteos });
    return data;
  },

  habilitarStock: async (id) => {
    const { data } = await api.post(`/inventario/ingresos/${id}/habilitar-stock`);
    return data;
  },

  buscarProductosPropios: async ({ texto = '', page = 1, limit = 30 } = {}) => {
    const { data } = await api.post('/productos/buscar', {
      texto: texto || undefined,
      mios_solamente: true,
      activo: true,
      page,
      limit,
    });
    return data; // { total, pagina, total_paginas, productos }
  },

  obtenerVariantes: async (productoId) => {
    const { data } = await api.get(`/productos/${productoId}/variantes`);
    return data || [];
  },

  listarCentrosGesicomm: async () => {
    const { data } = await api.get('/inventario/centros-destino');
    return data || [];
  },
};
