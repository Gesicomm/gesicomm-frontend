import API from './api';

export const costosGastosService = {
  buscar: (filtros) => API.post('/costos-gastos/buscar', filtros).then(r => r.data),
  resumen: (params) => API.get('/costos-gastos/resumen', { params }).then(r => r.data),
  reporteDesglose: (filtros) => API.post('/costos-gastos/reporte-desglose', filtros).then(r => r.data),
  crear: (data) => API.post('/costos-gastos', data).then(r => r.data),
  detalle: (id) => API.get(`/costos-gastos/${id}`).then(r => r.data),
  actualizar: (id, data) => API.put(`/costos-gastos/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/costos-gastos/${id}`).then(r => r.data),
  duplicar: (id) => API.post(`/costos-gastos/${id}/duplicar`).then(r => r.data),
  marcarPagado: (id, data) => API.patch(`/costos-gastos/${id}/marcar-pagado`, data).then(r => r.data),
  subirComprobante: (id, formData) =>
    API.post(`/costos-gastos/${id}/comprobante`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  exportarExcel: (rango) => API.get('/costos-gastos/exportar/excel', { params: rango, responseType: 'blob' }).then(r => r.data),
  exportarPdf: (rango) => API.get('/costos-gastos/exportar/pdf', { params: rango, responseType: 'blob' }).then(r => r.data),
};

export const categoriasCostosGastosService = {
  listar: () => API.get('/categorias-costos-gastos').then(r => r.data),
  crear: (data) => API.post('/categorias-costos-gastos', data).then(r => r.data),
  eliminar: (id) => API.delete(`/categorias-costos-gastos/${id}`).then(r => r.data),
};

export const proveedoresService = {
  buscar: (filtros) => API.post('/proveedores/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/proveedores', data).then(r => r.data),
  actualizar: (id, data) => API.put(`/proveedores/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/proveedores/${id}`).then(r => r.data),
};
