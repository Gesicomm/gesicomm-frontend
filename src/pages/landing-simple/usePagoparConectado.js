import { useEffect, useState } from 'react';
import { paymentGatewayService } from '../../services/paymentGatewayService';

export const AVISO_PAGO_ANTICIPADO = 'Para usar el pago anticipado, conectá PagoPar en Mi tienda → Pagos.';

/**
 * Si el comercio tiene PagoPar activo — la misma regla con la que la tienda
 * publicada decide si ofrece pago anticipado (PaymentService.getPublicGateways).
 *
 * `null` mientras carga o si la consulta falla: en la duda no se bloquea nada,
 * así el editor no apaga el pago anticipado por un error de red.
 */
export function usePagoparConectado() {
  const [conectado, setConectado] = useState(null);
  useEffect(() => {
    let vivo = true;
    paymentGatewayService.obtenerPagopar()
      .then(config => { if (vivo) setConectado(!!config?.is_active); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return conectado;
}
