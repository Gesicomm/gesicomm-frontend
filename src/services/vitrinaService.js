import API from './api';

const LIMITE_CATALOGO_COMPLETO = 10000;

async function catalogoCompletoDesdePaginado() {
  const data = await API.post('/vitrina/catalogo-paginado', {
    page: 1,
    limit: LIMITE_CATALOGO_COMPLETO,
    orden: 'nombre',
    tipo: 'todos',
    solamenteMios: false,
  }).then(r => r.data);

  const items = data?.items || [];
  return {
    productos: items.filter(item => item.tipo === 'producto'),
    combos: items.filter(item => item.tipo === 'combo'),
  };
}

export const vitrinaService = {
  catalogo: catalogoCompletoDesdePaginado,
  catalogoPaginado: (filtros = {}) => API.post('/vitrina/catalogo-paginado', filtros).then(r => r.data),

  guardarPrecioProducto: (id, precio) =>
    API.put(`/vitrina/productos/${id}/precio`, { precio }).then(r => r.data),

  guardarPrecioCombo: (id, precio) =>
    API.put(`/vitrina/combos/${id}/precio`, { precio }).then(r => r.data),

  sensibilidadProducto: (id) =>
    API.get(`/vitrina/productos/${id}/sensibilidad`).then(r => r.data),

  sensibilidadCombo: (id) =>
    API.get(`/vitrina/combos/${id}/sensibilidad`).then(r => r.data),

  // Excel de precios: el catálogo completo puede ser de 10.000+ ítems, sin
  // timeout del lado del cliente — el backend lo genera en streaming.
  exportarPreciosExcel: () =>
    API.get('/vitrina/precios/exportar', { responseType: 'blob', timeout: 0 }).then(r => r.data),

  // Sin `aplicar` es vista previa: valida el archivo y no escribe nada.
  importarPreciosExcel: (archivo, { aplicar = false } = {}) => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('aplicar', aplicar ? 'true' : 'false');
    return API.post('/vitrina/precios/importar', fd, { timeout: 0 }).then(r => r.data);
  },
};
