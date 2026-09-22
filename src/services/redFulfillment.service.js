import api from './api';

/**
 * Red de Fulfillment (administración).
 *
 * El costo y la cobertura SIEMPRE vienen resueltos del backend: acá no se
 * recalcula ninguna tarifa. El motor es uno solo y es el mismo que usa el
 * checkout, así que lo que se muestra en la red es literalmente lo que se
 * termina cobrando.
 */
export const redFulfillmentService = {
  resumen: () => api.get('/fulfillment/resumen').then((r) => r.data),

  listarCentros: () => api.get('/fulfillment/centros').then((r) => r.data),

  detalleCentro: (id) => api.get(`/fulfillment/centros/${id}`).then((r) => r.data),

  coberturaCentro: (id) => api.get(`/fulfillment/centros/${id}/cobertura`).then((r) => r.data),

  designarCentro: (id) => api.post(`/fulfillment/centros/${id}/designar`).then((r) => r.data),

  proveedores: () => api.get('/fulfillment/proveedores').then((r) => r.data),

  crearProveedor: (datos) => api.post('/fulfillment/proveedores', datos).then((r) => r.data),

  actualizarProveedor: (id, datos) =>
    api.put(`/fulfillment/proveedores/${id}`, datos).then((r) => r.data),

  /**
   * Borra un proveedor. Sin `forzar` el backend devuelve 409 con cuántas
   * tarifas se perderían, para poder decirlo antes de que alguien confirme.
   */
  eliminarProveedor: (id, forzar = false) =>
    api.delete(`/fulfillment/proveedores/${id}`, { params: forzar ? { forzar: 1 } : {} })
      .then((r) => r.data),

  /** Desde qué centros opera un proveedor. Necesario para editarlo. */
  centrosDeProveedor: (id) =>
    api.get(`/fulfillment/proveedores/${id}/centros`).then((r) => r.data),

  proveedoresDeCentro: (centroId) =>
    api.get(`/fulfillment/centros/${centroId}/proveedores`).then((r) => r.data),

  vincularProveedor: (centroId, proveedorId, prioridad = 0) =>
    api.put(`/fulfillment/centros/${centroId}/proveedores/${proveedorId}`, { prioridad }).then((r) => r.data),

  /**
   * Cobertura y tarifas del par centro+proveedor.
   *
   * La ruta lleva los dos ids a propósito: el mismo proveedor puede cobrar
   * distinto a la misma ciudad según desde qué centro sale, así que una
   * cobertura "del proveedor" a secas no existe.
   */
  coberturaDeProveedor: (centroId, proveedorId) =>
    api.get(`/fulfillment/centros/${centroId}/proveedores/${proveedorId}/cobertura`).then((r) => r.data),

  guardarCoberturaDeProveedor: (centroId, proveedorId, reglas) =>
    api.put(`/fulfillment/centros/${centroId}/proveedores/${proveedorId}/cobertura`, { reglas })
      .then((r) => r.data),

  /** Catálogo geográfico para selectores y filtros. */
  geografia: (conCiudades = false) =>
    api.get('/fulfillment/geografia', { params: conCiudades ? { conCiudades: 1 } : {} }).then((r) => r.data),
};
