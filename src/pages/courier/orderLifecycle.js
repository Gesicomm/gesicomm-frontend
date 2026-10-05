export const FLOW_TYPES = {
  CONFIRMACION_PEDIDO_WEB: {
    label: "Confirmación de pedido web",
    stage: "comercial",
    hint: "Se utiliza automáticamente para nuevos pedidos provenientes de una landing.",
  },
  VENTA_WHATSAPP: {
    label: "Venta por WhatsApp",
    stage: "comercial",
    hint: "Se utiliza para ventas iniciadas desde una conversación de WhatsApp.",
  },
  SEGUIMIENTO_ENVIO: {
    label: "Seguimiento de envío",
    stage: "logistica",
    hint: "Se utiliza cuando un pedido entra en etapa de envío.",
  },
  ESCALAMIENTO_VENTAS: {
    label: "Escalamiento de ventas",
    stage: "recompra",
    hint: "Se utiliza para volver a trabajar oportunidades o clientes dentro de Recompra.",
  },
};

export const STAGE_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "comercial", label: "Comercial" },
  { id: "logistica", label: "Logística" },
  { id: "recompra", label: "Recompra" },
];

export const COMMERCIAL_STATUSES = ["Pendiente", "EnSeguimiento", "Confirmado", "Cancelado"];
export const LOGISTIC_STATUSES = ["Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"];

export const KANBAN_CONTEXTS = {
  comercial: {
    label: "Comercial",
    lanes: [
      { id: "pendiente", label: "Pendientes", columnBar: "bg-amber-400", match: (e) => estadoComercial(e).id === "pendiente" },
      { id: "seguimiento", label: "En seguimiento", columnBar: "bg-blue-300", operational: true, match: (e) => seguimientoComercial(e).active },
      { id: "confirmado", label: "Confirmados", columnBar: "bg-teal-400", match: (e) => estadoComercial(e).id === "confirmado" },
      { id: "cancelado", label: "Cancelados", columnBar: "bg-red-400", match: (e) => estadoComercial(e).id === "cancelado" },
    ],
  },
  logistica: {
    label: "Logística",
    lanes: [
      { id: "Preparado", label: "Preparados", columnBar: "bg-purple-400", estado: "Preparado", match: (e) => estadoLogistico(e).id === "Preparado" },
      { id: "Despachado", label: "Despachados", columnBar: "bg-blue-400", estado: "Despachado", match: (e) => estadoLogistico(e).id === "Despachado" },
      { id: "Entregado", label: "Entregados", columnBar: "bg-emerald-400", estado: "Entregado", match: (e) => estadoLogistico(e).id === "Entregado" },
      { id: "DevolucionPendiente", label: "Devolución pendiente", columnBar: "bg-red-400", operational: true, match: (e) => estadoLogistico(e).id === "DevolucionPendiente" },
      { id: "Devuelto", label: "Devueltos", columnBar: "bg-stone-400", estado: "Devuelto", match: (e) => estadoLogistico(e).id === "Devuelto" },
    ],
  },
  recompra: {
    label: "Recompra",
    lanes: [
      { id: "sin_seguimiento", label: "Sin seguimiento", columnBar: "bg-stone-400", operational: true, match: (e) => e?.recompra_estado === "SIN_SEGUIMIENTO" },
      { id: "seguimiento", label: "En seguimiento", columnBar: "bg-blue-300", operational: true, match: (e) => seguimientoRecompra(e).active },
      { id: "recompro", label: "Recompró", columnBar: "bg-emerald-400", operational: true, match: (e) => Boolean(e.recompra_conseguida) },
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

export function seguimientoComercial(envio) {
  const active = envio?.estado === "EnSeguimiento" || Boolean(envio?.recordatorio_id);
  const vencido = Boolean(envio?.recordatorio_vencido);
  const origen = String(envio?.origen || "").toUpperCase();
  const tipo = origen.includes("WHATSAPP") ? "VENTA_WHATSAPP" : "CONFIRMACION_PEDIDO_WEB";
  return {
    active,
    type: tipo,
    label: FLOW_TYPES[tipo].label,
    status: vencido ? "Acción vencida" : active ? "Activo" : "Sin seguimiento",
    next: envio?.recordatorio_ejecutar_en || null,
  };
}

export function seguimientoLogistico(envio) {
  const logistico = estadoLogistico(envio);
  const active = ["Despachado", "Reprogramado"].includes(logistico.id);
  const completed = logistico.id === "Entregado";
  return {
    active,
    completed,
    type: "SEGUIMIENTO_ENVIO",
    label: "Seguimiento de envío",
    status: completed ? "Completado" : active ? "Activo" : "Sin seguimiento",
  };
}

export function seguimientoRecompra(envio) {
  return {
    active: Boolean(envio?.recompra_activa),
    type: "ESCALAMIENTO_VENTAS",
    label: "Escalamiento de ventas",
    status: envio?.recompra_conseguida ? "Recompra conseguida" : envio?.recompra_activa ? "En seguimiento" : "Sin seguimiento",
  };
}

export function paymentLine(envio) {
  if (esPagoAnticipado(envio)) {
    return `Pago anticipado${envio?.metodo_pago ? ` · ${envio.metodo_pago}` : ""}`;
  }
  return "Contra entrega";
}

export function stageForEnvio(envio) {
  if (seguimientoRecompra(envio).active) return "recompra";
  if (estadoLogistico(envio).id !== "SinLogistica") return "logistica";
  return "comercial";
}
