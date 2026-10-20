import API from './api';

const LIMITE_CATALOGO_COMPLETO = 10000;

async function catalogoCompletoDesdePaginado() {
  const base = {
    page: 1,
    limit: LIMITE_CATALOGO_COMPLETO,
    orden: 'nombre',
    solamenteMios: false,
  };
  const [productosData, combosData] = await Promise.all([
    API.post('/vitrina/catalogo-paginado', { ...base, tipo: 'producto' }).then(r => r.data),
    API.post('/vitrina/catalogo-paginado', { ...base, tipo: 'combo' }).then(r => r.data),
  ]);

  return {
    productos: productosData?.items || [],
    combos: combosData?.items || [],
  };
}

export const vitrinaService = {
  catalogo: catalogoCompletoDesdePaginado,
  catalogoPaginado: (filtros = {}, config = {}) => API.post('/vitrina/catalogo-paginado', filtros, { timeout: 20000, ...config }).then(r => r.data),

  guardarPrecioProducto: (id, precio) =>
    API.put(`/vitrina/productos/${id}/precio`, { precio }).then(r => r.data),

  categorizarProductos: (payload) =>
    API.post('/vitrina/productos/categorizar', payload).then(r => r.data),

  despublicarLanding: (items = []) =>
    API.post('/vitrina/landing/despublicar', { items }).then(r => r.data),

  // Oferta, colección o quitar todo sobre productos que ya están en la
  // landing activa. payload: { accion, items, pct?, badge?, fin_at?, titulo?, coleccion? }
  organizarLanding: (payload) =>
    API.post('/vitrina/landing/organizar', payload).then(r => r.data),

  guardarPrecioCombo: (id, precio) =>
    API.put(`/vitrina/combos/${id}/precio`, { precio }).then(r => r.data),

  sensibilidadProducto: (id) =>
    API.get(`/vitrina/productos/${id}/sensibilidad`).then(r => r.data),

  sensibilidadCombo: (id) =>
    API.get(`/vitrina/combos/${id}/sensibilidad`).then(r => r.data),

  buscarPrecios: (filtros = {}) => API.post('/vitrina/precios/buscar', filtros, { timeout: 20000 }).then(r => r.data),
  actualizarPrecios: (body) => API.post('/vitrina/precios/actualizar', body, { timeout: 120000 }).then(r => r.data),
};
