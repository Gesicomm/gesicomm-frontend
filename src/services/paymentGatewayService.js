import api from './api';

export const paymentGatewayService = {
  obtenerPagopar: async () => {
    const { data } = await api.get('/config/payment-gateways/pagopar');
    return data;
  },

  guardarPagopar: async (config) => {
    const { data } = await api.put('/config/payment-gateways/pagopar', config);
    return data;
  },

  probarPagopar: async () => {
    const { data } = await api.post('/config/payment-gateways/pagopar/test');
    return data;
  },

  formasPagoPagopar: async () => {
    const { data } = await api.get('/config/payment-gateways/pagopar/formas-pago');
    return data;
  },
};
