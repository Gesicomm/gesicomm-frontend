import { useEffect, useState } from 'react';
import { obtenerDeliveryCiudadesPublica } from '../../services/landingPublicaService';

/**
 * Ciudades de envío para el carrito/checkout.
 *
 * El backend ya no las manda dentro de la landing ni del catálogo (pesaban
 * más que todo el resto de la respuesta): se piden recién cuando `activo`
 * — el carrito tiene algo o el checkout está abierto.
 *
 * Si `recibidas` ya trae ciudades (un backend viejo que todavía las manda,
 * o el editor con datos de ejemplo), se usan esas y no se pide nada. Por eso
 * el frontend se puede desplegar antes que el backend.
 */
export default function useDeliveryCiudades(recibidas, activo) {
  const tieneRecibidas = Array.isArray(recibidas) && recibidas.length > 0;
  const [pedidas, setPedidas] = useState(null);

  useEffect(() => {
    if (tieneRecibidas || !activo || pedidas) return undefined;
    let cancelado = false;
    obtenerDeliveryCiudadesPublica()
      .then((lista) => { if (!cancelado) setPedidas(lista); })
      .catch(() => {}); // sin ciudades el checkout ya avisa "Elegí tu ciudad"; reintenta en el próximo cambio de `activo`
    return () => { cancelado = true; };
  }, [tieneRecibidas, activo, pedidas]);

  if (tieneRecibidas) return recibidas;
  return pedidas || SIN_CIUDADES;
}

const SIN_CIUDADES = [];
