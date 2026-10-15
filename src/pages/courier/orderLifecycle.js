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
    stage: "seguimiento_envio",
    hint: "El pedido entra cuando logística lo marca Preparado. Ahí se habilita el primer mensaje; al pasar a Despachado, el aviso de despacho.",
  },
  ESCALAMIENTO_VENTAS: {
    label: "Escalamiento de ventas",
    stage: "recompra",
    hint: "Pedidos entregados. Entran solos; el primer mensaje espera los días que definas desde la entrega.",
  },
  RECUPERACION_CLIENTES: {
    label: "Recuperación de clientes",
    stage: "recuperacion",
    hint: "Pedidos devueltos o perdidos. Entran solos al registrar la incidencia para atender al cliente y recuperar la relación.",
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
  { id: "comercial", label: "Proceso de confirmación" },
  { id: "seguimiento_envio", label: "Seguimiento de envío" },
  { id: "logistica", label: "Logística" },
  { id: "recompra", label: "Recompra" },
  { id: "recuperacion", label: "Recuperación" },
];

export const STAGE_LABELS = { comercial: "Proceso de confirmación", seguimiento_envio: "Seguimiento de envío", logistica: "Logística", recompra: "Recompra", recuperacion: "Recuperación" };

// Al confirmar, el pedido queda pendiente de preparación en Gestión Logística.
// Recién al marcarlo Preparado entra al seguimiento de envío comercial.
// Las dos bandejas comparten el estado operativo; Comercial gestiona mensajes.
// Al entregar, termina el seguimiento de envío y empieza Recompra.
export const COMMERCIAL_STATUSES = ["Pendiente", "EnSeguimiento", "Cancelado"];
export const SHIPPING_FOLLOWUP_STATUSES = ["Preparado", "Despachado", "Reprogramado"];
export const RAHA_STATUS_META = {
  pendiente_confirmacion: { label: 'Pendiente de confirmación', tone: 'warning' },
  cargado: { label: 'Preparado', tone: 'info' },
  en_camino: { label: 'Despachado', tone: 'info' },
  entregado: { label: 'Entregado', tone: 'success' },
  devuelto: { label: 'Devuelto', tone: 'danger' },
};

export function estadoParaSeguimiento(envio) {
  if (["Cancelado", "Perdido", "Devuelto", "Entregado"].includes(envio?.estado)) return envio.estado;
  if (envio?.estado_seguimiento) return envio.estado_seguimiento;
  if (!envio?.raha_logistica?.gestionado) return envio?.estado;
  return ({ pendiente_confirmacion: "Confirmado", cargado: "Preparado", en_camino: "Despachado", entregado: "Entregado", devuelto: "Devuelto" })[envio.raha_logistica.status || "pendiente_confirmacion"] || envio?.estado;
}

export function esperandoConfirmacionLogistica(envio) {
  return estadoParaSeguimiento(envio) === 'Confirmado' && Boolean(envio?.raha_logistica?.gestionado)
    && (!envio.raha_logistica.status || envio.raha_logistica.status === 'pendiente_confirmacion');
}
export const LOGISTIC_STATUSES = ["Confirmado", "Preparado", "Despachado", "Reprogramado", "Entregado", "Devuelto", "Perdido"];
export const RECOMPRA_STATUSES = ["Entregado"];
export const RECOVERY_STATUSES = ["Devuelto", "Perdido"];

/** Compatibilidad con los avisos base anteriores al estado activador. */
export function estadoActivadorEnvio(fase) {
  const configurado = fase?.estado_activador || fase?.transicion_estado_hasta
    || (fase?.accion_operativa === "PREPARAR_PEDIDO" ? "Preparado"
      : ["DESPACHAR_PEDIDO", "AVISO_EN_CAMINO"].includes(fase?.accion_operativa) ? "Despachado" : null);
  if (configurado) return configurado;
  const nombre = String(fase?.nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/confirm|prepar/.test(nombre)) return "Preparado";
  if (/despach|camino/.test(nombre)) return "Despachado";
  return null;
}

export function fasesDeSeguimientoParaPedido(flujo, envio) {
  if (flujo?.tipo !== "SEGUIMIENTO_ENVIO") return flujo?.fases || [];
  const estado = estadoParaSeguimiento(envio);
  return (flujo.fases || []).map((fase) => {
    const activador = estadoActivadorEnvio(fase);
    const superada = fase.superada || (activador === "Preparado" && ["Despachado", "Reprogramado"].includes(estado));
    const coincide = !activador || (activador === "Despachado"
      ? ["Despachado", "Reprogramado"].includes(estado)
      : activador === estado);
    return { ...fase, estado_activador: activador, superada,
      disponible: fase.disponible !== false && SHIPPING_FOLLOWUP_STATUSES.includes(estado) && coincide };
  });
}

// Nombre que se muestra para el estado Confirmado ahora que vive en
// Logística — "Confirmado" sigue siendo el valor real en Envio.estado (no
// se tocó la base ni envioController), esto es solo de presentación.
export const ESTADO_DISPLAY_LABEL = { Confirmado: "Pendiente de preparación" };

/** La etapa a la que pertenece el estado del pedido (un confirmado o entregado se ve del lado logístico; un entregado además en Recompra). */
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
function estadoDeContacto(envio, etapa) {
  const seg = envio?.seguimiento;
  if (seg && !seg.terminado) return { etapa, id: `${etapa}_en_seguimiento`, label: "En seguimiento", tone: "info" };
  if (seg?.terminado) return { etapa, id: `${etapa}_completa`, label: "Seguimiento completo", tone: "success" };
  return { etapa, id: `${etapa}_sin_seguimiento`, label: "Sin seguimiento", tone: "neutral" };
}

/**
 * El estado del pedido en la etapa que se está mirando: el comercial
 * (Pendiente / Confirmado / Cancelado), el logístico o el de recompra.
 */
export function estadoDePedido(envio, etapaVista) {
  if (["recompra", "recuperacion"].includes(etapaVista)) return estadoDeContacto(envio, etapaVista);
  const estado = envio?.raha_logistica?.gestionado ? estadoParaSeguimiento(envio) : envio?.estado;
  const etapa = etapaDePedido({ ...envio, estado });
  if (esperandoConfirmacionLogistica(envio)) return { etapa, id: 'Confirmado', label: 'Pendiente de confirmación', tone: 'neutral' };
  if (etapa === "comercial" && estado !== "Cancelado") {
    return { etapa, id: "Pendiente", label: "Pendiente", tone: "warning" };
  }
  if (estado === "Devuelto" && !envio?.devolucion_recibida_at) {
    return { etapa, id: "DevolucionPendiente", label: "Devolución pendiente", tone: "danger" };
  }
  return { etapa, id: estado, label: ESTADO_DISPLAY_LABEL[estado] || estado, tone: TONO_POR_ESTADO[estado] || "neutral" };
}

const esEstado = (...ids) => (e) => ids.includes(estadoDePedido(e).id);

const LANES = {
  pendientes: { id: "pendiente", label: "Pendientes", columnBar: "bg-amber-400", match: esEstado("Pendiente") },
  cancelados: { id: "cancelado", label: "Cancelados", columnBar: "bg-red-400", match: esEstado("Cancelado") },
  confirmados: { id: "confirmado", label: "Pendientes de preparación", columnBar: "bg-teal-400", match: esEstado("Confirmado") },
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
    lanes: [LANES.pendientes, LANES.cancelados],
  },
  seguimiento_envio: {
    label: "Seguimiento de envío",
    lanes: [
      { id: 'Confirmado', label: 'Pendientes de confirmación', columnBar: 'bg-slate-400', operational: true, match: esperandoConfirmacionLogistica },
      ...[LANES.preparados, LANES.despachados].map((lane) => ({ ...lane, operational: true,
        match: (envio) => lane.match({ ...envio, estado: estadoParaSeguimiento(envio) }) })),
    ],
  },
  logistica: {
    label: "Logística",
    lanes: [LANES.confirmados, LANES.preparados, LANES.despachados, LANES.entregados, LANES.devolucionPendiente, LANES.devueltos, LANES.perdidos],
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
  recuperacion: {
    label: "Recuperación",
    lanes: [
      { id: "recuperacion_pendiente", label: "Con mensajes por enviar", columnBar: "bg-amber-400", operational: true, match: (e) => Boolean(e?.seguimiento?.fase_id) },
      { id: "recuperacion_completa", label: "Sin mensajes por enviar", columnBar: "bg-emerald-400", operational: true, match: (e) => !e?.seguimiento?.fase_id },
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
