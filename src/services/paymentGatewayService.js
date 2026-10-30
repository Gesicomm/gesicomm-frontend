import api from './api';
import { compartirPorSesion } from '../utils/sesion';

export const paymentGatewayService = {
  // En el editor hay varios componentes montados a la vez que preguntan lo
  // mismo con usePagoparConectado (LandingCodigoEditor, ConfigurarVentaCodigo,
  // la vista previa del combo): una sola petición para todos. Guardar la
  // configuración es un PUT, y eso ya invalida la caché compartida.
  obtenerPagopar: () => compartirPorSesion(
    'config/payment-gateways/pagopar',
    () => api.get('/config/payment-gateways/pagopar').then(r => r.data),
  ),

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
