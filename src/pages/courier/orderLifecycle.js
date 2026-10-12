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

export const STAGE_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "comercial", label: "Comercial" },
  { id: "logistica", label: "Logística" },
];

export const COMMERCIAL_STATUSES = ["Pendiente", "EnSeguimiento", "Confirmado", "Cancelado"];
export const LOGISTIC_STATUSES = ["Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"];

export const KANBAN_CONTEXTS = {
  comercial: {
    label: "Comercial",
    lanes: [
      { id: "pendiente", label: "Pendientes", columnBar: "bg-amber-400", match: (e) => estadoComercial(e).id === "pendiente" },
      { id: "confirmado", label: "Confirmados", columnBar: "bg-teal-400", match: (e) => estadoComercial(e).id === "confirmado" },
      { id: "cancelado", label: "Cancelados", columnBar: "bg-red-400", match: (e) => estadoComercial(e).id === "cancelado" },
    ],
  },
  logistica: {
    label: "Logística",
    lanes: [
      { id: "Preparado", label: "Preparados", columnBar: "bg-purple-400", estado: "Preparado", match: (e) => estadoLogistico(e).id === "Preparado" },
      // Un reprogramado sigue en la calle: se muestra como despachado, igual que en la tabla.
      { id: "Despachado", label: "Despachados", columnBar: "bg-blue-400", estado: "Despachado", match: (e) => ["Despachado", "Reprogramado"].includes(estadoLogistico(e).id) },
      { id: "Entregado", label: "Entregados", columnBar: "bg-emerald-400", estado: "Entregado", match: (e) => estadoLogistico(e).id === "Entregado" },
      { id: "DevolucionPendiente", label: "Devolución pendiente", columnBar: "bg-red-400", operational: true, match: (e) => estadoLogistico(e).id === "DevolucionPendiente" },
      { id: "Devuelto", label: "Devueltos", columnBar: "bg-stone-400", estado: "Devuelto", match: (e) => estadoLogistico(e).id === "Devuelto" },
      { id: "Perdido", label: "Perdidos", columnBar: "bg-stone-400", estado: "Perdido", match: (e) => estadoLogistico(e).id === "Perdido" },
    ],
  },
};

export function esPagoAnticipado(envio) {
  return envio?.pago_anticipado === true || envio?.pago_anticipado === 1 || String(envio?.pago_anticipado).toLowerCase() === "true";
}

export function estadoComercial(envio) {
  if (envio?.estado === "Cancelado") return { id: "cancelado", label: "Cancelado" };
  if (["Confirmado", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"].includes(envio?.estado)) {
    return { id: "confirmado", label: "Confirmado" };
  }
  return { id: "pendiente", label: "Pendiente" };
}

export function estadoLogistico(envio) {
  const estado = envio?.estado_logistico || envio?.estado;
  if (estado === "Devuelto" && !envio?.devolucion_recibida_at) {
    return { id: "DevolucionPendiente", label: "Devolución pendiente" };
  }
  if (["Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"].includes(estado)) {
    return { id: estado, label: estado === "Reprogramado" ? "Despachado" : estado };
  }
  return { id: "SinLogistica", label: "—" };
}

export function paymentLine(envio) {
  if (esPagoAnticipado(envio)) {
    return `Pago anticipado${envio?.metodo_pago ? ` · ${envio.metodo_pago}` : ""}`;
  }
  return "Contra entrega";
}

