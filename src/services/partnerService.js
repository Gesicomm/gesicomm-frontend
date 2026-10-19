import API from './api';

export const partnerService = {
  obtener: () => API.get('/partner/me').then(r => r.data),
  solicitar: datos => API.post('/partner/me', datos).then(r => r.data),
};
