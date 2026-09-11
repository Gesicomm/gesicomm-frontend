import API from './api';

/**
 * Parámetros de configuración del sistema. Solo administradores.
 *
 * Los valores marcados como secretos (ej. el token privado de PagoPar) NUNCA
 * vuelven por la API: el backend responde `configurado: true/false` y de
 * dónde sale el valor, pero no el valor en sí.
 */
export const parametrosService = {
  /** Lista qué hay cargado, agrupado por `grupo`. */
  listar: () => API.get('/config/parametros').then(r => r.data),

  /**
   * Guarda uno o varios: { CLAVE: 'valor', ... }.
   * Mandar un secreto vacío significa "dejalo como está" — así se puede
   * corregir el token público sin tener que volver a pegar el privado.
   */
  guardar: (payload) => API.put('/config/parametros', payload).then(r => r.data),
};
