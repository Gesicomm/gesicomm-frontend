// Lógica pura de "buscar tarifa de delivery por ciudad + tipo de pago +
// cantidad" — compartida por el modal único de Pedido (alta y "completar",
// ver NuevoPedidoModal.jsx) para courier y costo de envío automáticos.
//
// El tipo de pago ya no se infiere de un string fijo de método de pago
// ("Pagado"/"Transferencia" hardcodeado) — ahora es el flag `es_anticipado`
// configurado por método en el ABM de Métodos de Pago, resuelto por quien
// llama a estas funciones y pasado acá como booleano.

function cantidadEvaluada(items) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  return total > 0 ? total : 1;
}

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Costo de delivery de UN courier puntual para una ciudad+tipo de
 * pago+cantidad, o null si ese courier no cubre la ciudad.
 * Tres niveles de fallback (en orden): coincidencia exacta por rango de
 * cantidad → cualquier tarifa de la ciudad con ese tipo de pago → cualquier
 * tarifa de la ciudad sin importar el tipo de pago.
 */
export function obtenerTarifaPara(couriers, ciudad, courierId, esAnticipado, items, departamento = '') {
  if (!ciudad || !courierId || !couriers?.length) return null;
  const c = couriers.find(curr => curr.id === Number(courierId));
  if (!c?.tarifas?.length) return null;

  const targetTipoPago = esAnticipado ? 'Anticipado' : 'Al Recibir';
  const cantEval = cantidadEvaluada(items);
  const ciudadNorm = normalizar(ciudad);
  const departamentoNorm = normalizar(departamento);
  const mismaZona = (t) => normalizar(t.ciudad_zona) === ciudadNorm
    && (!departamentoNorm || normalizar(t.departamento) === departamentoNorm);

  let tarifa = c.tarifas.find(t => {
    const rMin = Number(t.rango_min) || 0;
    const rMax = (t.rango_max === null || t.rango_max === undefined || t.rango_max === '') ? Infinity : Number(t.rango_max);
    return mismaZona(t)
      && (t.tipo_pago === 'Ambos' || t.tipo_pago === targetTipoPago)
      && cantEval >= rMin && cantEval <= rMax;
  });

  if (!tarifa) {
    tarifa = c.tarifas.find(t => mismaZona(t)
      && (t.tipo_pago === 'Ambos' || t.tipo_pago === targetTipoPago));
  }
  if (!tarifa) {
    tarifa = c.tarifas.find(mismaZona);
  }

  return tarifa ? tarifa.costo : null;
}

/** Primer courier (en el orden que vino la lista) que cubra la ciudad, con su tarifa. */
export function buscarCourierYTarifa(couriers, ciudad, esAnticipado, items, departamento = '') {
  if (!ciudad || !couriers?.length) return null;
  for (const c of couriers) {
    const costo = obtenerTarifaPara(couriers, ciudad, c.id, esAnticipado, items, departamento);
    if (costo !== null) return { courierId: c.id, costo };
  }
  return null;
}
