import axios from 'axios';

let apiURL = import.meta.env.VITE_API_URL;
if (!apiURL) {
  throw new Error("🚨 ERROR CRÍTICO: La variable VITE_API_URL no está definida en el entorno. Revisa tu archivo .env o la configuración de tu servidor.");
}
if (!apiURL.endsWith('/api')) {
  apiURL = apiURL.replace(/\/$/, '') + '/api';
}

const API = axios.create({
  baseURL: apiURL,
  withCredentials: true,
});

export const productService = {
  buscar: (filtros) => API.post('/productos/buscar', filtros).then(r => r.data),
  crear: (data) => API.post('/productos', data).then(r => r.data),
  detalle: (id) => API.get(`/productos/${id}`).then(r => r.data),
  actualizar: (id, data) => API.put(`/productos/${id}`, data).then(r => r.data),
  eliminar: (id) => API.delete(`/productos/${id}`).then(r => r.data),
  subirImagen: (productoId, formData) =>
    API.post(`/productos/${productoId}/imagenes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  actualizarImagen: (productoId, imgId, data) =>
    API.put(`/productos/${productoId}/imagenes/${imgId}`, data).then(r => r.data),
  eliminarImagen: (productoId, imgId) =>
    API.delete(`/productos/${productoId}/imagenes/${imgId}`).then(r => r.data),
};
