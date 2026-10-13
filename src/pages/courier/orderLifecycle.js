export const CUSTOM_FLOW_TYPE = "PERSONALIZADO";

// Las etapas automáticas del seguimiento por WhatsApp. A cuál entra un pedido
// lo decide su estado (ver flujosBase.js en el backend), no una persona.
// "Otros flujos" queda para usos manuales que no dependen del ciclo del pedido.
export const FLOW_TYPES = {
  CONFIRMACION_PEDIDO_WEB: {
    label: "Confirmación de pedido web",
    stage: "comercial",
    hint: "Pedidos por confirmar que entraron por la tienda o una landing. Entran solos apenas se crean.",
  },
  VENTA_WHATSAPP: {
    label: "Venta por WhatsApp",
    stage: "comercial",
    hint: "Pedidos por confirmar que entraron por WhatsApp. Entran solos apenas se crean.",
  },
  SEGUIMIENTO_ENVIO: {
    label: "Seguimiento de envío",
    stage: "logistica",
    hint: "Pedidos confirmados, preparados, despachados o reprogramados. Entran solos cuando el pedido se confirma.",
  },
  ESCALAMIENTO_VENTAS: {
    label: "Escalamiento de ventas",
    stage: "recompra",
    hint: "Pedidos entregados. Entran solos; el primer mensaje espera los días que definas desde la entrega.",
  },
  [CUSTOM_FLOW_TYPE]: {
    label: "Otros flujos",
    stage: "manual",
    hint: "Flujos manuales para casos propios de tu operación. Aparecen en el panel del pedido, pero no cambian de etapa automáticamente.",
  },
};

// No hay una etapa "Todos": un pedido se mira siempre dentro de la etapa en
// la que está.
export const STAGE_FILTERS = [
  { id: "comercial", label: "Comercial" },
  { id: "logistica", label: "Logística" },
  { id: "recompra", label: "Recompra" },
];

export const STAGE_LABELS = { comercial: "Comercial", logistica: "Logística", recompra: "Recompra" };

// Los estados de cada etapa. Comercial termina en Confirmado (o Cancelado):
// recién después el pedido pasa a Logística. Logística termina en Entregado
// (o Devuelto / Perdido), y un entregado pasa además a Recompra, donde se le
// hace el escalamiento de ventas.
export const COMMERCIAL_STATUSES = ["Pendiente", "EnSeguimiento", "Confirmado", "Cancelado"];
export const LOGISTIC_STATUSES = ["Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"];
export const RECOMPRA_STATUSES = ["Entregado"];

/** La etapa a la que pertenece el estado del pedido (un entregado se ve también en Recompra). */
export function etapaDePedido(envio) {
  return LOGISTIC_STATUSES.includes(envio?.estado) ? "logistica" : "comercial";
}

const TONO_POR_ESTADO = {
  Cancelado: "danger",
  Confirmado: "success",
  Despachado: "info",
  Reprogramado: "info",
  Devuelto: "neutral",
  Perdido: "danger",
  Entregado: "success",
};

// En Recompra el pedido ya está entregado: su estado es cómo viene el
// escalamiento de ventas (lo calcula el backend en `seguimiento`).
function estadoDeRecompra(envio) {
  const seg = envio?.seguimiento;
  if (seg && !seg.terminado) return { etapa: "recompra", id: "recompra_en_seguimiento", label: "En seguimiento", tone: "info" };
  if (seg?.terminado) return { etapa: "recompra", id: "recompra_completa", label: "Seguimiento completo", tone: "success" };
  return { etapa: "recompra", id: "recompra_sin_seguimiento", label: "Sin seguimiento", tone: "neutral" };
}

/**
 * El estado del pedido en la etapa que se está mirando: el comercial
 * (Pendiente / Confirmado / Cancelado), el logístico o el de recompra.
 */
export function estadoDePedido(envio, etapaVista) {
  if (etapaVista === "recompra") return estadoDeRecompra(envio);
  const etapa = etapaDePedido(envio);
  const estado = envio?.estado;
  if (etapa === "comercial" && !["Confirmado", "Cancelado"].includes(estado)) {
    return { etapa, id: "Pendiente", label: "Pendiente", tone: "warning" };
  }
  if (estado === "Devuelto" && !envio?.devolucion_recibida_at) {
    return { etapa, id: "DevolucionPendiente", label: "Devolución pendiente", tone: "danger" };
  }
  return { etapa, id: estado, label: estado, tone: TONO_POR_ESTADO[estado] || "neutral" };
}

const esEstado = (...ids) => (e) => ids.includes(estadoDePedido(e).id);

const LANES = {
  pendientes: { id: "pendiente", label: "Pendientes", columnBar: "bg-amber-400", match: esEstado("Pendiente") },
  cancelados: { id: "cancelado", label: "Cancelados", columnBar: "bg-red-400", match: esEstado("Cancelado") },
  confirmados: { id: "confirmado", label: "Confirmados", columnBar: "bg-teal-400", match: esEstado("Confirmado") },
  preparados: { id: "Preparado", label: "Preparados", columnBar: "bg-purple-400", estado: "Preparado", match: esEstado("Preparado") },
  // Un reprogramado sigue en la calle: va en la misma columna que los despachados.
  despachados: { id: "Despachado", label: "Despachados", columnBar: "bg-blue-400", estado: "Despachado", match: esEstado("Despachado", "Reprogramado") },
  entregados: { id: "Entregado", label: "Entregados", columnBar: "bg-emerald-400", estado: "Entregado", match: esEstado("Entregado") },
  devolucionPendiente: { id: "DevolucionPendiente", label: "Devolución pendiente", columnBar: "bg-red-400", operational: true, match: esEstado("DevolucionPendiente") },
  devueltos: { id: "Devuelto", label: "Devueltos", columnBar: "bg-stone-400", estado: "Devuelto", match: esEstado("Devuelto") },
  perdidos: { id: "Perdido", label: "Perdidos", columnBar: "bg-stone-400", estado: "Perdido", match: esEstado("Perdido") },
};

export const KANBAN_CONTEXTS = {
  comercial: {
    label: "Comercial",
    lanes: [LANES.pendientes, LANES.confirmados, LANES.cancelados],
  },
  logistica: {
    label: "Logística",
    lanes: [LANES.preparados, LANES.despachados, LANES.entregados, LANES.devolucionPendiente, LANES.devueltos, LANES.perdidos],
  },
  // En recompra el pedido ya está entregado: lo que cambia es si todavía
  // tiene mensajes de escalamiento de ventas por enviar.
  recompra: {
    label: "Recompra",
    lanes: [
      { id: "recompra_pendiente", label: "Con mensajes por enviar", columnBar: "bg-blue-300", operational: true, match: (e) => Boolean(e?.seguimiento?.fase_id) },
      { id: "recompra_sin_mensajes", label: "Sin mensajes por enviar", columnBar: "bg-emerald-400", operational: true, match: (e) => !e?.seguimiento?.fase_id },
    ],
  },
};

export function esPagoAnticipado(envio) {
  return envio?.pago_anticipado === true || envio?.pago_anticipado === 1 || String(envio?.pago_anticipado).toLowerCase() === "true";
}

export function paymentLine(envio) {
  if (esPagoAnticipado(envio)) {
    return `Pago anticipado${envio?.metodo_pago ? ` · ${envio.metodo_pago}` : ""}`;
  }
  return "Contra entrega";
}
