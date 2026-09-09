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
 * Una tarifa sin departamento cargado (NULL/vacío) es un comodín: cubre esa
 * ciudad sin importar el departamento que se busque. Antes exigía que
 * `departamento` de la tarifa fuera IGUAL al buscado, y una tarifa a la que
 * nunca se le cargó departamento (ej. "Luque" configurada sin ese dato) no
 * matcheaba NUNCA que se buscara con departamento (ej. "Luque, Central") —
 * el courier no se autocompletaba aunque la tarifa existiera y cubriera esa
 * ciudad. Solo se exige coincidencia exacta cuando la tarifa SÍ tiene un
 * departamento cargado: ahí sí importa, porque alguien lo cargó a propósito.
 */
function tarifaCoincide(t, ciudadNorm, departamentoNorm) {
  const departamentoTarifa = normalizar(t.departamento);
  return normalizar(t.ciudad || t.ciudad_zona) === ciudadNorm
    && (!departamentoNorm || !departamentoTarifa || departamentoTarifa === departamentoNorm);
}

function elegirTarifa(tarifas, targetTipoPago, cantEval, departamentoNorm = '') {
  // Coincidencia exacta de departamento primero, después la más barata. Sin
  // esto, si dos tarifas cubren la misma ciudad — una cargada a propósito
  // para "Central" y otra comodín sin departamento — se podía terminar
  // eligiendo la comodín solo porque era más barata, ignorando la que
  // alguien configuró específicamente para ese departamento.
  const esEspecifica = (t) => !!departamentoNorm && normalizar(t.departamento) === departamentoNorm;
  const ordenadas = [...(tarifas || [])].sort((a, b) => {
    const especificidad = Number(esEspecifica(b)) - Number(esEspecifica(a));
    if (especificidad !== 0) return especificidad;
    return (Number(a.costo) || 0) - (Number(b.costo) || 0);
  });
  const enRango = (t) => {
    const rMin = Number(t.rango_min) || 0;
    const rMax = (t.rango_max === null || t.rango_max === undefined || t.rango_max === '') ? Infinity : Number(t.rango_max);
    return cantEval >= rMin && cantEval <= rMax;
  };
  const pagoCompatible = (t) => t.tipo_pago === 'Ambos' || t.tipo_pago === targetTipoPago;
  // Sin fallbacks a propósito: o hay una tarifa que cubre esta ciudad, este
  // tipo de pago Y esta cantidad, o no se autocompleta nada. Antes se degradaba
  // a "cualquier tarifa compatible" y de ahí a "la más barata de la ciudad",
  // así que un pedido anticipado de 2 productos en una ciudad con tramo
  // anticipado sin cargar terminaba cobrando la tarifa mayorista sin avisar.
  return ordenadas.find(t => pagoCompatible(t) && enRango(t)) || null;
}

/**
 * Costo de delivery de UN courier puntual para una ciudad+tipo de
 * pago+cantidad, o null si no hay una tarifa que cubra exactamente esa
 * combinación. Devolver null es lo correcto: quien llama deja el costo en
 * blanco para que se cargue a mano, en vez de proponer un precio que nadie
 * configuró para ese caso.
 */
export function obtenerTarifaPara(couriers, ciudad, courierId, esAnticipado, items, departamento = '') {
  if (!ciudad || !courierId || !couriers?.length) return null;
  const c = couriers.find(curr => curr.id === Number(courierId));
  if (!c?.tarifas?.length) return null;

  const targetTipoPago = esAnticipado ? 'Anticipado' : 'Al Recibir';
  const cantEval = cantidadEvaluada(items);
  const ciudadNorm = normalizar(ciudad);
  const departamentoNorm = normalizar(departamento);
  const tarifa = elegirTarifa(
    c.tarifas.filter(t => tarifaCoincide(t, ciudadNorm, departamentoNorm)),
    targetTipoPago,
    cantEval,
    departamentoNorm
  );

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

export function buscarZonaDelivery(zonas, ciudad, esAnticipado, items, departamento = '') {
  if (!ciudad || !zonas?.length) return null;
  const targetTipoPago = esAnticipado ? 'Anticipado' : 'Al Recibir';
  const cantEval = cantidadEvaluada(items);
  const ciudadNorm = normalizar(ciudad);
  const departamentoNorm = normalizar(departamento);
  const tarifa = elegirTarifa(
    zonas.filter(t => t.activo !== false && tarifaCoincide(t, ciudadNorm, departamentoNorm)),
    targetTipoPago,
    cantEval,
    departamentoNorm
  );
  return tarifa ? { courierId: tarifa.courier_id || null, costo: tarifa.costo, tarifa } : null;
}
