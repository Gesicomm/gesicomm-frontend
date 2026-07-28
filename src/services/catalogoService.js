import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

export const categoriaService = {
  /**
   * Busca categorías con filtros dinámicos vía POST.
   * El backend devuelve un envelope paginado: { total, pagina, total_paginas, categorias }
   * Si no se pasan filtros, devuelve todas (para selectores del formulario).
   */
  buscar: (filtros = {}) => API.post('/categorias/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/categorias', data).then(r => r.data),
  detalle: (id) => API.get(`/categorias/${id}`).then(r => r.data),
  actualizar: (id, data) => API.put(`/categorias/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/categorias/${id}`).then(r => r.data),
};

export const marcaService = {
  /**
   * Busca marcas con filtros dinámicos vía POST.
   * El backend devuelve un envelope paginado: { total, pagina, total_paginas, marcas }
   */
  buscar: (filtros = {}) => API.post('/marcas/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/marcas', data).then(r => r.data),
  detalle: (id) => API.get(`/marcas/${id}`).then(r => r.data),
  actualizar: (id, data) => API.put(`/marcas/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/marcas/${id}`).then(r => r.data),
};
