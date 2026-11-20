import api from './api';

const base = '/integraciones/movil-express';

/** Un campo vacío no se manda: el backend distingue "no tocar" de "borrar". */
function soloDefinidos(payload = {}) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

/**
 * Un documento de rendición se baja por NUESTRO servidor, que lo pide con la
 * clave. Mismo patrón que RAHA: si falla, el error viene como Blob y hay que
 * leerlo para no perder el mensaje.
 */
async function descargar(url, nombre) {
  try {
    const { data } = await api.get(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = objectUrl; link.download = nombre; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Se conserva el error de transporte. */ }
    }
    throw error;
  }
}

export const movilExpressService = {
  obtener: async () => (await api.get(base)).data,
  guardar: async payload => (await api.put(base, soloDefinidos(payload))).data,
  verificarClave: async () => (await api.post(`${base}/verificar-clave`)).data,
  registrarComercio: async () => (await api.post(`${base}/comercio`)).data,
  registrarWebhook: async () => (await api.post(`${base}/webhook`)).data,
  cobertura: async () => (await api.get(`${base}/cobertura`)).data,
  cotizar: async payload => (await api.post(`${base}/cotizar`, soloDefinidos(payload))).data,
  enviar: async (envioId, opciones = {}) => (await api.post(`${base}/pedidos/${envioId}/enviar`, opciones)).data,
  sincronizar: async envioId => (await api.post(`${base}/pedidos/${envioId}/sincronizar`)).data,
  cancelar: async (envioId, motivo) => (await api.post(`${base}/pedidos/${envioId}/cancelar`, { motivo })).data,

  // Rendiciones: las calcula y las cierra Móvil Express; acá se leen y se
  // les manda la decisión del comerciante.
  rendiciones: async (filtros = {}) => (await api.get(`${base}/rendiciones`, { params: soloDefinidos(filtros) })).data,
  rendicion: async id => (await api.get(`${base}/rendiciones/${id}`)).data,
  estadoDeCuenta: (id) => descargar(`${base}/rendiciones/${id}/estado-de-cuenta`, `rendicion-${id}.pdf`),
  comprobante: (id, receiptId, nombre) => descargar(`${base}/rendiciones/${id}/comprobantes/${receiptId}`, nombre || `comprobante-${id}-${receiptId}`),
  decidirRendicion: async (id, payload, idempotencyKey) => (await api.post(
    `${base}/rendiciones/${id}/acciones`,
    soloDefinidos(payload),
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  )).data,
};

export default movilExpressService;
