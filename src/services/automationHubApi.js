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
export const socialApi = {
  uploadMedia: async (file) => {
    if (file instanceof FormData) {
      return AutomationAPI.post('/social/upload', file, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    }
    const { data: presignedData } = await AutomationAPI.post('/social/upload/presign', {
      filename: file.name, contentType: file.type
    });
    await fetch(presignedData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    return { videoUrl: presignedData.publicUrl };
  },
  getAccounts: () => AutomationAPI.get('/social/accounts').then((r) => r.data),
  connectMeta: (payload) => AutomationAPI.post('/social/connect/meta', payload).then((r) => r.data),
  getFacebookPages: (tempToken) => AutomationAPI.get('/social/auth/facebook/pages', { params: { temp_token: tempToken } }).then((r) => r.data),
  saveFacebookPage: (payload) => AutomationAPI.post('/social/auth/facebook/save-page', payload).then((r) => r.data),
  getFacebookOAuthUrl: async () => {
    const token = await obtenerServiceToken();
    return `${automationApiURL}/social/auth/facebook?token=${encodeURIComponent(token)}`;
  },
  getInstagramOAuthUrl: async () => {
    const token = await obtenerServiceToken();
    return `${automationApiURL}/social/auth/instagram?token=${encodeURIComponent(token)}`;
  },
  deleteSocialAccount: (id) => AutomationAPI.delete(`/social/accounts/${id}`).then((r) => r.data),
};

export const contentApi = {
  listar: (params) => AutomationAPI.get('/content', { params }).then((r) => r.data),
  obtener: (id) => AutomationAPI.get(`/content/${id}`).then((r) => r.data),
  crear: (payload) => AutomationAPI.post('/content', payload).then((r) => r.data),
  editar: (id, payload) => AutomationAPI.put(`/content/${id}`, payload).then((r) => r.data),
  reprogramar: (id, publish_date) => AutomationAPI.patch(`/content/${id}/fecha`, { publish_date }).then((r) => r.data),
  publicarAhora: (id) => AutomationAPI.post(`/content/${id}/publish-now`).then((r) => r.data),
  eliminar: (id) => AutomationAPI.delete(`/content/${id}`).then((r) => r.data),
  eliminarRemoto: (id) => AutomationAPI.delete(`/content/${id}/remote`).then((r) => r.data),
  eliminarPruebas: () => AutomationAPI.delete('/content/test-items/clear').then((r) => r.data),
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

// URL pública (sin auth de sesión) que se pega en la acción "External
// Request" del flow de ManyChat para que cada lead nuevo entre al CRM.
export function getManychatWebhookUrl(webhookToken) {
  if (!webhookToken) return '';
  return `${automationApiURL}/public/manychat/leads/${webhookToken}`;
}

// URL pública (PATCH) para mover un lead ya existente de etapa y/o pipeline
// (ej. de "Instagram" a "Ventas") — mismo endpoint para avisar un avance de
// etapa o para registrar una venta (moverlo a la última etapa de Ventas).
export function getManychatUpdateWebhookUrl(webhookToken) {
  if (!webhookToken) return '';
  return `${automationApiURL}/public/manychat/leads/${webhookToken}/etapa`;
}

// --- CRM nativo de Gesicomm (leads/pipelines propios, alimentados por
// el webhook de ManyChat — reemplaza por completo al proxy de GoHighLevel) ---
export const crmApi = {
  pipelines: () => AutomationAPI.get('/crm/pipelines').then((r) => r.data),
  estados: () => AutomationAPI.get('/crm/lead-statuses').then((r) => r.data),
  leads: (pipelineId, buscar) => AutomationAPI.get('/crm/leads', { params: { pipelineId, buscar } }).then((r) => r.data),
  crearLead: (payload) => AutomationAPI.post('/crm/leads', payload).then((r) => r.data),
  moverEtapa: (leadId, stageId) => AutomationAPI.patch(`/crm/leads/${leadId}/etapa`, { stage_id: stageId }).then((r) => r.data),
  actualizarLead: (leadId, payload) => AutomationAPI.put(`/crm/leads/${leadId}`, payload).then((r) => r.data),
  eliminarLead: (leadId) => AutomationAPI.delete(`/crm/leads/${leadId}`).then((r) => r.data),
  planesDeLead: (leadId) => AutomationAPI.get(`/crm/leads/${leadId}/payment-plans`).then((r) => r.data),
  crearPlanDePagos: (leadId, payload) => AutomationAPI.post(`/crm/leads/${leadId}/payment-plan`, payload).then((r) => r.data),
  editarPlanDePagos: (studentId, payload) => AutomationAPI.put(`/crm/payment-plans/${studentId}`, payload).then((r) => r.data),
};

// --- Cobranzas (tablero de planes de pago) ---
export const collectionsApi = {
  listar: (buscar) => AutomationAPI.get('/crm/collections', { params: { buscar } }).then((r) => r.data),
  registrarCobro: (paymentId, payload) => AutomationAPI.patch(`/crm/collections/${paymentId}/pay`, payload).then((r) => r.data),
};

// --- Finanzas → Automatización ---
export const financeApi = {
  dashboard: (filtros) => AutomationAPI.post('/finance/dashboard', filtros).then((r) => r.data),
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
    buscar: (filtros) => AutomationAPI.post('/finance/students/search', filtros).then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/students', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/students/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/students/${id}`).then((r) => r.data),
  },
  payments: {
    listar: () => AutomationAPI.get('/finance/payments').then((r) => r.data),
    buscar: (filtros) => AutomationAPI.post('/finance/payments/search', filtros).then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/payments', d).then((r) => r.data),
    actualizar: (id, d) => AutomationAPI.put(`/finance/payments/${id}`, d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/payments/${id}`).then((r) => r.data),
  },
  expenses: {
    listar: () => AutomationAPI.get('/finance/expenses').then((r) => r.data),
    buscar: (filtros) => AutomationAPI.post('/finance/expenses/search', filtros).then((r) => r.data),
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
    buscar: (filtros) => AutomationAPI.post('/finance/team-payments/search', filtros).then((r) => r.data),
    crear: (d) => AutomationAPI.post('/finance/team-payments', d).then((r) => r.data),
    eliminar: (id) => AutomationAPI.delete(`/finance/team-payments/${id}`).then((r) => r.data),
  },
};

// --- Analizador de contenido / atribución ---
export const analyticsApi = {
  obtener: (params) => AutomationAPI.get('/analytics', { params }).then((r) => r.data),
  obtenerEditorial: () => AutomationAPI.get('/analytics/editorial').then((r) => r.data),
};

export default AutomationAPI;
