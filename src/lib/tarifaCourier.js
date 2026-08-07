// Lógica pura de "buscar tarifa de delivery por ciudad + método de pago +
// cantidad" — la misma que usa NuevoPedidoModal.jsx para el alta manual de
// pedidos, ahora también la necesita CompletarPedidoModal.jsx (paso
// "Confirmado" de un pedido que vino del checkout público, sin courier
// asignado todavía).
//
// Nota: NuevoPedidoModal.jsx mantiene su propia copia inline en vez de
// importar de acá — está bajo desarrollo activo en paralelo (métodos de
// pago configurables) y tocarlo ahora arriesgaba un choque de ediciones.
// Si en algún momento se estabiliza, vale la pena que ese archivo importe
// de acá en vez de mantener dos copias.

/** "Pagado"/"Transferencia" cuentan como anticipado para la tarifa — el resto es contra entrega. */
function tipoPagoParaTarifa(metodoPago) {
  return (metodoPago === 'Pagado' || metodoPago === 'Transferencia') ? 'Anticipado' : 'Al Recibir';
}

function cantidadEvaluada(items) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  return total > 0 ? total : 1;
}

/**
 * Costo de delivery de UN courier puntual para una ciudad+método de
 * pago+cantidad, o null si ese courier no cubre la ciudad.
 * Tres niveles de fallback (en orden): coincidencia exacta por rango de
 * cantidad → cualquier tarifa de la ciudad con ese tipo de pago → cualquier
 * tarifa de la ciudad sin importar el tipo de pago.
 */
export function obtenerTarifaPara(couriers, ciudad, courierId, metodoPago, items) {
  if (!ciudad || !courierId || !couriers?.length) return null;
  const c = couriers.find(curr => curr.id === Number(courierId));
  if (!c?.tarifas?.length) return null;

  const targetTipoPago = tipoPagoParaTarifa(metodoPago);
  const cantEval = cantidadEvaluada(items);
  const ciudadNorm = ciudad.toLowerCase().trim();

  let tarifa = c.tarifas.find(t => {
    const rMin = Number(t.rango_min) || 0;
    const rMax = (t.rango_max === null || t.rango_max === undefined || t.rango_max === '') ? Infinity : Number(t.rango_max);
    return t.ciudad_zona.toLowerCase().trim() === ciudadNorm
      && (t.tipo_pago === 'Ambos' || t.tipo_pago === targetTipoPago)
      && cantEval >= rMin && cantEval <= rMax;
  });

  if (!tarifa) {
    tarifa = c.tarifas.find(t => t.ciudad_zona.toLowerCase().trim() === ciudadNorm
      && (t.tipo_pago === 'Ambos' || t.tipo_pago === targetTipoPago));
  }
  if (!tarifa) {
    tarifa = c.tarifas.find(t => t.ciudad_zona.toLowerCase().trim() === ciudadNorm);
  }

  return tarifa ? tarifa.costo : null;
}

/** Primer courier (en el orden que vino la lista) que cubra la ciudad, con su tarifa. */
export function buscarCourierYTarifa(couriers, ciudad, metodoPago, items) {
  if (!ciudad || !couriers?.length) return null;
  for (const c of couriers) {
    const costo = obtenerTarifaPara(couriers, ciudad, c.id, metodoPago, items);
    if (costo !== null) return { courierId: c.id, costo };
  }
  return null;
}
