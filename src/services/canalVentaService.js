import API from './api';

/**
 * Catálogo de canales de venta (tabla `canales_venta`). Reemplaza las
 * listas hardcodeadas que había en cada pantalla: agregar un canal es
 * cargar una fila en la base, no editar un array en el frontend.
 */
export const canalVentaService = {
  listar: () => API.get('/canales-venta').then(r => r.data.canales),
  crear: (datos) => API.post('/canales-venta', datos).then(r => r.data),
  actualizar: (id, datos) => API.put(`/canales-venta/${id}`, datos).then(r => r.data),
};
