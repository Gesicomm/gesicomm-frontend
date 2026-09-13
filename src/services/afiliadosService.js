import API from './api';

const STORAGE_KEY = 'gesicomm.afiliado.ref.v1';

export const afiliadosService = {
  miAfiliado: () => API.get('/afiliados/me').then(r => r.data),
  solicitarMiAfiliado: (payload) => API.post('/afiliados/me', payload).then(r => r.data),
  listar: () => API.get('/afiliados').then(r => r.data),
  crear: (payload) => API.post('/afiliados', payload).then(r => r.data),
  actualizar: (id, payload) => API.put(`/afiliados/${id}`, payload).then(r => r.data),
  eliminar: (id) => API.delete(`/afiliados/${id}`).then(r => r.data),
  track: (payload) => API.post('/afiliados/track', payload).then(r => r.data),
  comisiones: () => API.get('/afiliados/comisiones/listado').then(r => r.data),
  actualizarComision: (id, payload) => API.put(`/afiliados/comisiones/${id}`, payload).then(r => r.data),
};

export function guardarRefAfiliado(codigo) {
  const limpio = String(codigo || '').trim().toLowerCase();
  if (!limpio) return null;
  try {
    localStorage.setItem(STORAGE_KEY, limpio);
  } catch {
    // El checkout sigue funcionando aunque el navegador bloquee storage.
  }
  return limpio;
}

export function leerRefAfiliado() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}
