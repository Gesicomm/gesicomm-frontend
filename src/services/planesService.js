import API from './api';

/**
 * Planes y suscripciones de Gesicomm. Son endpoints PÚBLICOS: el flujo es
 * elegir plan → pagar → recién ahí registrarse, así que quien los consume
 * todavía no tiene cuenta ni token de sesión.
 */
export const planesService = {
  /** Catálogo activo, ordenado. Reemplaza al catálogo hardcodeado del front. */
  listar: () => API.get('/planes').then(r => r.data),

  /**
   * Arranca el pago de un plan.
   * @returns {{ payment_url, hash_pedido, suscripcion_id, referencia }}
   */
  checkout: (payload) => API.post('/suscripciones/checkout', payload).then(r => r.data),

  /** Estado del cobro, para la pantalla a la que vuelve el comprador. */
  estado: (hash) => API.get(`/suscripciones/estado/${hash}`).then(r => r.data),

  /** Valida el token de alta antes de mostrar el formulario de registro. */
  validarToken: (token) => API.get(`/suscripciones/token/${token}`).then(r => r.data),
};
