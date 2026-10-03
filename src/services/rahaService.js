import api from './api';
const base = '/integraciones/raha';
async function descargar(url, nombre) {
  try {
    const { data } = await api.get(url, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = objectUrl; link.download = nombre; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Preserve transport error. */ }
    }
    throw error;
  }
}
export const rahaService = {
  obtener: async () => (await api.get(base)).data,
  guardar: async payload => (await api.put(base, payload)).data,
  enviar: async payload => (await api.post(`${base}/enviar`, payload)).data,
  subir: async (archivo, tipo, version) => {
    const form = new FormData(); form.append('archivo', archivo); form.append('tipo', tipo); form.append('version', version);
    return (await api.post(`${base}/documentos`, form)).data;
  },
  quitar: async (id, version) => (await api.delete(`${base}/documentos/${id}`, { data: { version } })).data,
  documento: doc => descargar(`${base}/documentos/${doc.id}`, doc.nombre),
  listar: async params => (await api.get(`${base}/admin`, { params })).data,
  detalle: async id => (await api.get(`${base}/admin/${id}`)).data,
  revisar: async (id, payload) => (await api.post(`${base}/admin/${id}/revisar`, payload)).data,
  expediente: id => descargar(`${base}/admin/${id}/expediente`, `raha-solicitud-${id}.zip`),
};
