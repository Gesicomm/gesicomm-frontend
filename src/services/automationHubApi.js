import axios from 'axios';
import API from './api';

// Gesicomm Automation Hub es un backend INDEPENDIENTE de gesicomm-backend
// (ver server.js de gesicomm-automation-hub). No comparte cookie de sesión:
// usa un JWT de corta vida pedido a gesicomm-backend (GET /api/auth/service-token)
// y lo manda como Authorization: Bearer en cada request.
let automationApiURL = import.meta.env.VITE_AUTOMATION_HUB_URL || '';
if (!automationApiURL) {
  console.error('🚨 ERROR CRÍTICO: La variable VITE_AUTOMATION_HUB_URL no está definida en el entorno.');
}
if (!automationApiURL.endsWith('/api') && automationApiURL !== '') {
  automationApiURL = automationApiURL.replace(/\/$/, '') + '/api';
}

const AutomationAPI = axios.create({ baseURL: automationApiURL });

// El token dura 5 minutos (ver gesicomm-backend/src/routes/auth.js) — se
// cachea un ratito y se renueva antes de que expire, en vez de pedir uno
// nuevo en cada request.
let tokenCache = null; // { token, expiresAt }

async function obtenerServiceToken() {
  const ahora = Date.now();
  if (tokenCache && tokenCache.expiresAt > ahora + 5000) {
    return tokenCache.token;
  }
  const { data } = await API.get('/auth/service-token');
  tokenCache = { token: data.token, expiresAt: ahora + (data.expiresIn || 300) * 1000 };
  return tokenCache.token;
}

AutomationAPI.interceptors.request.use(async (config) => {
  const token = await obtenerServiceToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Calendario de contenido ---
export const contentApi = {
  listar: (params) => AutomationAPI.get('/content', { params }).then((r) => r.data),
  obtener: (id) => AutomationAPI.get(`/content/${id}`).then((r) => r.data),
  crear: (payload) => AutomationAPI.post('/content', payload).then((r) => r.data),
  reprogramar: (id, publish_date) => AutomationAPI.patch(`/content/${id}/fecha`, { publish_date }).then((r) => r.data),
  marcarPublicado: (id) => AutomationAPI.patch(`/content/${id}/publicar`).then((r) => r.data),
  eliminar: (id) => AutomationAPI.delete(`/content/${id}`).then((r) => r.data),
};

// --- ManyChat ---
export const manychatApi = {
  estado: () => AutomationAPI.get('/manychat/conexion').then((r) => r.data),
  conectar: (api_key) => AutomationAPI.post('/manychat/conexion', { api_key }).then((r) => r.data),
  prepararTag: (contentItemId, cta_slide) => AutomationAPI.post(`/manychat/contenido/${contentItemId}/preparar`, { cta_slide }).then((r) => r.data),
  confirmarPreparacionManual: (contentItemId) => AutomationAPI.post(`/manychat/contenido/${contentItemId}/preparado-manual`).then((r) => r.data),
  marcarVinculado: (contentItemId) => AutomationAPI.post(`/manychat/contenido/${contentItemId}/vincular`).then((r) => r.data),
  accionesPendientes: () => AutomationAPI.get('/manychat/acciones-pendientes').then((r) => r.data),
};

// --- GoHighLevel (publicación social) ---
export const ghlApi = {
  estado: () => AutomationAPI.get('/ghl/conexion').then((r) => r.data),
  conectar: (location_id, private_token) => AutomationAPI.post('/ghl/conexion', { location_id, private_token }).then((r) => r.data),
  cuentas: () => AutomationAPI.get('/ghl/cuentas').then((r) => r.data),
  subirMedia: (file) => {
    const form = new FormData();
    form.append('file', file);
    return AutomationAPI.post('/ghl/media', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  publicar: (contentItemId, payload) => AutomationAPI.post(`/ghl/contenido/${contentItemId}/publicar`, payload).then((r) => r.data),
  listarPosts: (contentItemId) => AutomationAPI.get(`/ghl/contenido/${contentItemId}/posts`).then((r) => r.data),
  eliminarPost: (socialPostId) => AutomationAPI.delete(`/ghl/posts/${socialPostId}`).then((r) => r.data),
};

// --- Oportunidades (CRM vía GoHighLevel) ---
export const opportunitiesApi = {
  pipelines: () => AutomationAPI.get('/opportunities/pipelines').then((r) => r.data),
  listar: (pipelineId, pipelineStageId) => AutomationAPI.get('/opportunities', { params: { pipelineId, pipelineStageId } }).then((r) => r.data),
  moverEtapa: (id, pipelineId, pipelineStageId) => AutomationAPI.patch(`/opportunities/${id}/etapa`, { pipelineId, pipelineStageId }).then((r) => r.data),
};

// --- Finanzas → Automatización ---
export const financeApi = {
  dashboard: (params) => AutomationAPI.get('/finance/dashboard', { params }).then((r) => r.data),
  programs: {
    listar: () => AutomationAPI.get('/finance/programs').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/programs', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/programs/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/programs/${id}`).then((r) => r.data),
  },
  teamMembers: {
    listar: () => AutomationAPI.get('/finance/team-members').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/team-members', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/team-members/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/team-members/${id}`).then((r) => r.data),
  },
  students: {
    listar: (params) => AutomationAPI.get('/finance/students', { params }).then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/students', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/students/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/students/${id}`).then((r) => r.data),
  },
  payments: {
    listar: () => AutomationAPI.get('/finance/payments').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/payments', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/payments/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/payments/${id}`).then((r) => r.data),
  },
  expenses: {
    listar: () => AutomationAPI.get('/finance/expenses').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/expenses', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/expenses/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/expenses/${id}`).then((r) => r.data),
  },
  commissionRules: {
    listar: () => AutomationAPI.get('/finance/commission-rules').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/commission-rules', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/commission-rules/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/commission-rules/${id}`).then((r) => r.data),
  },
  teamPayments: {
    listar: () => AutomationAPI.get('/finance/team-payments').then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/team-payments', d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/team-payments/${id}`).then((r) => r.data),
  },
};

// --- Analizador de contenido / atribución ---
export const analyticsApi = {
  obtener: (params) => AutomationAPI.get('/analytics', { params }).then((r) => r.data),
};

export function getAutomationMediaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  return automationApiURL.replace(/\/api$/, '') + url;
}

export default AutomationAPI;
