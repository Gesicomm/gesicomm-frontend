import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User, MessageCircle, ClipboardList, Eye, Package, CreditCard, History, Hash, Clock,
  Columns3, Table2, SlidersHorizontal, CheckCircle2, Plus, MoreHorizontal, Phone
} from "lucide-react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";
import { getEnviosPaginados, getConteoPorEstado, getConteoPorAbastecimiento, getResumenEntregados, getMetodosPago, deleteEnvio, actualizarLeadTipoManual } from "../../services/courierApi";
import AbastecimientoTimeline from "../../components/abastecimiento/AbastecimientoTimeline";
import { canalVentaService } from "../../services/canalVentaService";
import { verificarSesion } from "../../utils/auth";
import { numeroPedidoVisible } from "./pedidoNumero";
import { KanbanBoard } from "./kanban-board";
import {
  COMMERCIAL_STATUSES,
  SHIPPING_FOLLOWUP_STATUSES,
  LOGISTIC_STATUSES,
  RECOMPRA_STATUSES,
  RECOVERY_STATUSES,
  STAGE_FILTERS,
  STAGE_LABELS,
  estadoDePedido,
  estadoParaSeguimiento,
  puedeEnviarSeguimiento,
  RAHA_STATUS_META,
  paymentLine,
  esPagoAnticipado,
} from "./orderLifecycle";


const LIMITE = 10;

// Pestaña "virtual": no es un Envio.estado real (no toca la máquina de
// fulfillment Pendiente→...→Entregado), es un filtro sobre
// abastecimiento_estado que se muestra en la MISMA barra que las pestañas
// reales, entre Confirmado y Preparado, para que la tienda vea de un
// vistazo qué pedidos ya pagaron el abastecimiento y puedan abrir su
// timeline sin tener que entrar a una sección aparte.
const TAB_ABASTECIMIENTO_ID = "AbastecimientoSeguimiento";
const TAB_ABASTECIMIENTO_CFG = {
  label: "Seguimiento Abastecimiento",
  chipBg: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
  chipText: "var(--color-primary)",
};
const TAB_RAHA_LOGISTICA_ID = "LogisticaRaha";
const TAB_RAHA_LOGISTICA_CFG = {
  label: "Envíos RAHA",
  chipBg: "color-mix(in srgb, var(--color-info) 14%, transparent)",
  chipText: "var(--color-info)",
};
const TODOS_ESTADOS_ID = "TODOS";

// "En seguimiento" ya no se muestra como estado aparte: para la bandeja un
// pedido sin confirmar es Pendiente, lo estén contactando o no. El estado
// sigue existiendo en el pedido, así que el filtro y el contador de Pendiente
// lo incluyen para que esos pedidos no desaparezcan.
const ESTADOS_AGRUPADOS = { Pendiente: ["Pendiente", "EnSeguimiento"] };
const ESTADOS_SIN_CHIP = new Set(["EnSeguimiento"]);
const estadosDeFiltro = (estado) => ESTADOS_AGRUPADOS[estado] || [estado];

const ABASTECIMIENTO_TABS = [
  { id: "en_seguimiento", label: "En seguimiento", description: "Pago validado, en camino hacia el depósito" },
  { id: "pendiente_pago", label: "Pendientes de pago", description: "La tienda todavía debe pagar o reenviar el comprobante" },
  { id: "recibido", label: "Recibidos", description: "Mercadería recibida en depósito" },
  { id: "TODOS", label: "Todos", description: "Todos los pedidos con abastecimiento" },
];

// El label "En seguimiento abastecimiento" cubre todo el tramo operativo
// intermedio (desde pago validado hasta que sale hacia el destino final):
// el detalle exacto de en qué paso está se ve en el timeline, no acá.
const ABASTECIMIENTO_META = {
  pendiente_pago: { label: "Pendiente de pago", tone: "danger" },
  pago_enviado: { label: "En seguimiento abastecimiento", tone: "warning" },
  pago_rechazado: { label: "Pago rechazado", tone: "danger" },
  pago_validado: { label: "En seguimiento abastecimiento", tone: "info" },
  proveedor_contactado: { label: "En seguimiento abastecimiento", tone: "info" },
  enviado_por_proveedor: { label: "En seguimiento abastecimiento", tone: "info" },
  en_transito_a_gesicomm: { label: "En seguimiento abastecimiento", tone: "info" },
  recibido_en_gesicomm: { label: "En seguimiento abastecimiento", tone: "info" },
  preparando_envio_a_deposito_cliente: { label: "En seguimiento abastecimiento", tone: "info" },
  despachado_a_deposito_cliente: { label: "En seguimiento abastecimiento", tone: "info" },
  en_transito_a_deposito_cliente: { label: "En tránsito a tu depósito", tone: "info" },
  recibido_en_deposito_cliente: { label: "Recibido", tone: "success" },
  disponible_en_gesicomm: { label: "Recibido", tone: "success" },
};

// Transiciones que necesitan datos adicionales (fecha, método de pago,
// detalle por producto) — se resuelven en un modal dedicado, nunca con un
// PATCH directo del dropdown. Ver plan Gestión de Pedidos, sección 42.
const ESTADOS_CON_MODAL = { Reprogramado: "reprogramar", Entregado: "entregar", Devuelto: "devolver", Perdido: "perder" };

// En Seguimiento de envío los tres estados conviven en una sola lista (pedido
// del usuario, 2026-10-14): ya no se separan en pestañas, se distinguen por
// color de fila y del estado logístico. Despachado usa "violet" en vez de su
// tono "info" habitual para no confundirse con Preparado.
const SEGUIMIENTO_TONE = { Confirmado: "success", Preparado: "info", Despachado: "violet", Reprogramado: "warning" };

function tonoSeguimiento(envio) {
  return SEGUIMIENTO_TONE[estadoParaSeguimiento(envio)] || estadoDePedido(envio, "seguimiento_envio").tone;
}

const RAHA_BASE_STATUS_ORDER = ["pendiente_confirmacion", "cargado", "en_camino"];
const RAHA_TERMINAL_STATUS_ORDER = ["entregado", "devuelto"];
const TRANSICIONES_VALIDAS_FRONTEND = {
  Pendiente: ['EnSeguimiento', 'Confirmado', 'Cancelado'],
  EnSeguimiento: ['Confirmado', 'Cancelado'],
  Confirmado: ['Preparado', 'Cancelado'],
  Preparado: ['Despachado', 'Cancelado'],
  Despachado: ['Entregado', 'Reprogramado', 'Devuelto', 'Perdido'],
  Reprogramado: ['Despachado', 'Entregado', 'Cancelado', 'Reprogramado', 'Devuelto', 'Perdido'],
  Entregado: [],
  Cancelado: [],
  Devuelto: [],
  Perdido: [],
};

const FILTROS_VACIOS = {
  pedido_id: "",
  envio_id: "",
  cliente: "",
  ciudad: "",
  fecha_desde: "",
  fecha_hasta: "",
  courier_id: "TODOS",
  confirmador: "",
  canal_venta_id: "TODOS",
  producto: "",
  metodo_pago_id: "TODOS",
};

const STAGE_TO_ESTADOS = {
  comercial: COMMERCIAL_STATUSES,
  seguimiento_envio: SHIPPING_FOLLOWUP_STATUSES,
  logistica: LOGISTIC_STATUSES,
  recompra: RECOMPRA_STATUSES,
  recuperacion: RECOVERY_STATUSES,
};

function EstadoBadgeDropdown({ estado, etiqueta, onChange, modoAccion = false }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const s = STATUS[estado] || { chipBg: "color-mix(in srgb, var(--color-fg) 8%, transparent)", chipText: "var(--color-fg-muted)" };
  // "En seguimiento" lo pone el sistema al marcar un mensaje como enviado: no se elige a mano.
  const validas = (TRANSICIONES_VALIDAS_FRONTEND[estado] || []).filter((st) => !ESTADOS_SIN_CHIP.has(st));
  const sinCambios = validas.length === 0;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // El menú queda fuera del contenedor que desplaza la tabla para que
  // también se pueda usar en la última fila sin quedar recortado.
  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    const anchor = ref.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const top = anchor.bottom + 4 + menu.height <= window.innerHeight - 8
      ? anchor.bottom + 4
      : Math.max(8, anchor.top - menu.height - 4);
    setMenuPosition({
      top,
      left: Math.max(8, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 8)),
    });
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block" }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          ref.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        className={modoAccion ? "pt-next-action" : undefined}
        title={sinCambios ? "Estado final: no tiene más cambios" : "Cambiar el estado del pedido"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (!sinCambios) setOpen((prev) => !prev);
        }}
        style={modoAccion ? undefined : {
          background: s.chipBg,
          color: s.chipText,
          border: `1px solid ${s.chipText}40`,
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "0.74rem",
          fontWeight: 700,
          cursor: sinCambios ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.15s ease",
          outline: "none",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {modoAccion && <SlidersHorizontal size={13} />}
        <span>{modoAccion ? "Cambiar estado" : (etiqueta || estado || "Pendiente")}</span>
        {!sinCambios && (
          <ChevronDown
            size={12}
            style={{
              opacity: 0.8,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        )}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            visibility: menuPosition ? "visible" : "hidden",
            zIndex: 9999,
            background: "var(--color-canvas)",
            border: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)",
            borderRadius: "8px",
            padding: "4px",
            minWidth: "150px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {(modoAccion ? validas : STATUS_ORDER.filter((st) => st === estado || validas.includes(st))).map((st) => {
            const config = STATUS[st] || { chipBg: "color-mix(in srgb, var(--color-fg) 5%, transparent)", chipText: "var(--color-fg-muted)" };
            const isSelected = st === estado;

            return (
              <button
                key={st}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onChange(st);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "5px",
                  background: isSelected ? "color-mix(in srgb, var(--color-fg) 10%, transparent)" : "transparent",
                  color: isSelected ? "var(--color-fg)" : "var(--color-fg)",
                  border: "none",
                  fontSize: "0.78rem",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "color-mix(in srgb, var(--color-fg) 7%, transparent)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: config.chipText || "var(--color-fg-muted)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{isSelected ? (etiqueta || st) : st}</span>
                {isSelected && (
                  <span style={{ color: config.chipText, fontSize: "0.75rem", fontWeight: "bold" }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>,
        ref.current.closest(".pt-root") || document.body,
      )}
    </div>
  );
}

function formatFechaYHora(fecha, hora, createdAt) {
  let fechaStr = fecha || "—";
  let horaStr = hora || "";

  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        fechaStr = d.toLocaleDateString("en-CA", { timeZone: "America/Asuncion" });
        horaStr = d.toLocaleTimeString("es-PY", {
          timeZone: "America/Asuncion",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (err) {}
  }

  return { fecha: fechaStr, hora: horaStr };
}

function normalizarTelefonoWhatsapp(telefono) {
  const limpio = String(telefono || "").replace(/\D/g, "");
  if (!limpio) return "";
  return limpio.startsWith("0") ? `595${limpio.slice(1)}` : limpio;
}

function getWhatsappLink(envio, mensajePersonalizado) {
  const numero = normalizarTelefonoWhatsapp(envio?.telefono);
  if (!numero) return null;
  const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
  const mensaje = mensajePersonalizado || `Hola ${nombre}, te escribimos por tu pedido #${numeroPedidoVisible(envio)}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function formatFechaCorta(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFechaHoraCorta(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("es-PY", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventosEstadoRaha(envio) {
  return (envio?.raha_logistica?.eventos || [])
    .filter((evento) => evento.tipo === "shipment.status_changed" && evento.status)
    .sort((a, b) => new Date(a.occurred_at || 0) - new Date(b.occurred_at || 0));
}

function statusRahaActual(envio) {
  const eventos = eventosEstadoRaha(envio);
  return envio?.raha_logistica?.status || eventos.at(-1)?.status || "pendiente_confirmacion";
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const texto = String(valor || "").trim();
    if (texto) return texto;
  }
  return null;
}

function datosContextoRaha(logistica = {}, evento = {}) {
  return {
    courier: primerTexto(evento.courier_name, evento.courier, logistica.courier_name, "RAHA"),
    codigo: primerTexto(evento.tracking_code, evento.codigo_rastreo, logistica.tracking_code, logistica.order_id),
    motivoDevolucion: primerTexto(evento.return_reason, evento.motivo_devolucion, evento.motivo, logistica.return_reason),
  };
}

function RahaEstadoCell({ envio, etapa }) {
  const estado = estadoDePedido(envio, etapa);
  return (
    <LifecycleCell
      primary={estado.label}
      secondary="RAHA"
      alert={envio?.raha_logistica?.error || null}
      tone={etapa === "seguimiento_envio" ? tonoSeguimiento(envio) : estado.tone}
    />
  );
}

function RahaTimeline({ envio }) {
  const eventos = eventosEstadoRaha(envio);
  const eventosPorStatus = new Map();
  eventos.forEach((evento) => {
    eventosPorStatus.set(evento.status, evento);
  });
  const statusActual = statusRahaActual(envio);
  const statusNormalizado = statusActual;
  const fechaFallback = envio?.raha_logistica?.status_at || envio?.raha_logistica?.updated_at || envio?.raha_logistica?.created_at;
  const statusCompletado = (status) => {
    if (RAHA_TERMINAL_STATUS_ORDER.includes(status)) return status === statusNormalizado;
    const indiceBase = RAHA_BASE_STATUS_ORDER.indexOf(status);
    const indiceActualBase = RAHA_BASE_STATUS_ORDER.indexOf(statusNormalizado);
    if (indiceActualBase >= 0) return indiceBase <= indiceActualBase;
    if (RAHA_TERMINAL_STATUS_ORDER.includes(statusNormalizado)) return indiceBase >= 0;
    return status === "pendiente_confirmacion";
  };
  const pasos = [...RAHA_BASE_STATUS_ORDER, statusNormalizado === "devuelto" ? "devuelto" : "entregado"];
  const renderStep = (status, hasNextComplete = false) => {
    const meta = RAHA_STATUS_META[status];
    const activo = status === statusNormalizado;
    const completo = statusCompletado(status);
    const evento = eventosPorStatus.get(status);
    const fechaEstado = evento?.occurred_at || (activo ? fechaFallback : null);
    const fechaTexto = (completo || activo) ? formatFechaHoraCorta(fechaEstado) : null;
    return (
      <div key={status} aria-current={activo ? "step" : undefined} className={`pt-raha-step ${status === "devuelto" ? "is-returned" : ""} ${completo ? "is-complete" : ""} ${activo ? "is-active" : ""} ${hasNextComplete ? "has-next-complete" : ""}`}>
        <span className="pt-raha-step__dot" aria-hidden="true">
          {completo && <CheckCircle2 size={16} strokeWidth={3} />}
        </span>
        <span className="pt-raha-step__body">
          <strong>{meta.label}</strong>
          {fechaTexto && <time dateTime={fechaEstado}>{fechaTexto}</time>}
        </span>
      </div>
    );
  };
  return (
    <div className="pt-raha-timeline">
      <div className="pt-raha-steps" aria-label={`Timeline RAHA del pedido #${numeroPedidoVisible(envio)}`}>
          {pasos.map((status, index) => {
            const siguiente = pasos[index + 1];
            const siguienteCompleto = siguiente ? statusCompletado(siguiente) : false;
            return renderStep(status, siguienteCompleto);
          })}
      </div>
    </div>
  );
}

function AbastecimientoBadge({ envio, onAbrirTimeline }) {
  const meta = ABASTECIMIENTO_META[envio?.abastecimiento_estado] || { label: "Sin abastecimiento", tone: "neutral" };
  const fechaPago = formatFechaCorta(envio?.abastecimiento_pagado_at);
  const fechaRecibido = formatFechaCorta(envio?.abastecimiento_recibido_at);
  const detalleFecha = ["recibido_en_deposito_cliente", "disponible_en_gesicomm"].includes(envio?.abastecimiento_estado)
    ? fechaRecibido
    : fechaPago;
  const tieneTimeline = Boolean(envio?.abastecimiento_estado) && envio.abastecimiento_estado !== "no_requiere";

  return (
    <div className="pt-abastecimiento-cell">
      <button
        type="button"
        className={`pt-abastecimiento-badge pt-abastecimiento-badge--${meta.tone}`}
        style={{ cursor: tieneTimeline ? "pointer" : "default", border: "none" }}
        disabled={!tieneTimeline}
        title={tieneTimeline ? "Ver seguimiento" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (tieneTimeline) onAbrirTimeline?.(envio);
        }}
      >
        {meta.label}
      </button>
      <span className="pt-abastecimiento-meta">
        {formatGs(envio?.abastecimiento_costo || 0)}
        {detalleFecha ? ` · ${detalleFecha}` : ""}
      </span>
    </div>
  );
}

// Reputación del cliente por teléfono (ver adjuntarReputacionCliente en el
// backend): solo se muestra cuando ya devolvió algo clasificado alguna vez,
// en cualquier pedido suyo — no solo en Recuperación (pedido del usuario,
// 2026-10-14).
function ReputacionClienteBadge({ reputacion }) {
  if (!reputacion || (!reputacion.injustificadas && !reputacion.justificadas)) return null;
  const malo = reputacion.injustificadas > 0;
  const partes = [];
  if (reputacion.injustificadas > 0) partes.push(`${reputacion.injustificadas} injustificada${reputacion.injustificadas === 1 ? "" : "s"}`);
  if (reputacion.justificadas > 0) partes.push(`${reputacion.justificadas} justificada${reputacion.justificadas === 1 ? "" : "s"}`);
  return (
    <div className={`pt-reputacion-badge ${malo ? "is-malo" : "is-bueno"}`}>
      <span className="pt-reputacion-titulo">{malo ? "Cliente a revisar" : "Devolvió antes"}</span>
      <span className="pt-reputacion-detalle">{partes.join(" · ")}</span>
    </div>
  );
}

function LifecycleCell({ primary, secondary, alert, tone = "neutral" }) {
  return (
    <div className={`pt-life-cell pt-life-cell--${tone}`}>
      <strong>{primary}</strong>
      {secondary && <span>{secondary}</span>}
      {alert && <em>{alert}</em>}
    </div>
  );
}

// Confirmación muestra el estado comercial; Seguimiento de envío y Logística
// muestran el operativo. Recompra muestra el escalamiento de ventas.
function EstadoCell({ envio, etapa, onCambiarEstado }) {
  if (["comercial", "logistica", "seguimiento_envio"].includes(etapa) && envio?.raha_logistica?.gestionado) {
    return <RahaEstadoCell envio={envio} etapa={etapa} />;
  }
  const estado = estadoDePedido(envio, etapa);
  const courier = envio.Courier?.nombre || envio.proveedor_logistico_nombre || null;
  const motivoDevolucionLabel = { justificada: "Devuelto justificadamente", injustificada: "Devuelto injustificadamente" }[envio.motivo_devolucion] || null;
  const secundario = etapa === "recuperacion" ? (motivoDevolucionLabel || envio.estado) : estado.id === "Confirmado"
    ? paymentLine(envio)
    : estado.id === "Entregado" && envio.metodo_pago
    ? `Cobrado: ${envio.metodo_pago}`
    : estado.etapa === "logistica"
    ? courier
    : null;
  const tono = etapa === "seguimiento_envio" ? tonoSeguimiento(envio) : estado.tone;
  // Los mensajes usan el estado operativo como referencia; se cambia en Logística.
  if (["recompra", "recuperacion", "seguimiento_envio"].includes(etapa) || envio.estado === "Despachado" || !onCambiarEstado) {
    return <LifecycleCell primary={estado.label} secondary={secundario} tone={tono} />;
  }
  return (
    <div className="pt-life-cell">
      <EstadoBadgeDropdown
        estado={envio.estado}
        etiqueta={estado.label}
        onChange={(nuevoEstado) => onCambiarEstado(envio, nuevoEstado)}
      />
      {secundario && <span>{secundario}</span>}
    </div>
  );
}

const ENCABEZADO_ESTADO = {
  comercial: "Estado comercial",
  seguimiento_envio: "Estado logístico",
  logistica: "Estado logístico",
  recompra: "Estado de recompra",
  recuperacion: "Estado de recuperación",
};

const ZONA_HORARIA = "America/Asuncion";

/** "hace 3 h", "en 40 min", "hace 2 días". */
function tiempoRelativo(iso, ahora = Date.now()) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - ahora;
  const min = Math.round(Math.abs(diff) / 60000);
  let texto;
  if (min < 1) texto = "un momento";
  else if (min < 60) texto = `${min} min`;
  else if (min < 60 * 36) texto = `${Math.round(min / 60)} h`;
  else texto = `${Math.round(min / 1440)} días`;
  return diff > 0 ? `en ${texto}` : `hace ${texto}`;
}

function fechaSeguimientoVencida(seg, ahora = Date.now()) {
  if (!seg?.toca_en || seg.terminado) return false;
  const tocaEn = new Date(seg.toca_en).getTime();
  return Number.isFinite(tocaEn) && tocaEn < ahora;
}

/** Estado semáforo del mensaje que le toca al pedido. */
function estadoDelSeguimiento(seg) {
  if (seg.motivo === "esperando_estado") {
    return { texto: `Espera ${seg.estado_requerido || "preparación"}`, tono: "neutral", icono: Clock };
  }
  const hora = seg.toca_en
    ? new Date(seg.toca_en).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA })
    : "";
  if (seg.terminado) {
    return { texto: "Enviado", detalle: "Todos los mensajes enviados", tono: "success", icono: CheckCircle2 };
  }
  if (seg.motivo === "vencido" || fechaSeguimientoVencida(seg)) {
    const relativo = tiempoRelativo(seg.toca_en);
    return { texto: relativo ? `Expiró ${relativo}` : "Expiró", tono: "danger", icono: Clock, pulso: true };
  }
  if (seg.fase_abierta_en) return { texto: "Pendiente de confirmar envío", tono: "warning", icono: Clock };
  if (seg.cuando === "ahora") return { texto: "Pendiente de envío", tono: "warning", icono: Clock };
  if (seg.cuando === "hoy") return { texto: `Pendiente hoy, ${hora}`, tono: "warning", icono: Clock };
  if (seg.cuando === "despues" && seg.toca_en) {
    const fecha = new Date(seg.toca_en).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", timeZone: ZONA_HORARIA });
    return { texto: `Pendiente ${fecha}, ${hora}`, tono: "warning", icono: Clock };
  }
  return { texto: "Sin fecha agendada", tono: "neutral", icono: Clock };
}

/**
 * El mensaje del flujo que le toca al pedido en su etapa (lo calcula el
 * backend, ver seguimientoDePedidos). Se toca para abrir los mensajes del
 * pedido, ya parado en ese.
 */
function SeguimientoCell({ envio, onAbrir }) {
  const seg = envio.seguimiento;
  if (!seg) return <span className="pt-seg-vacio">—</span>;
  const estado = estadoDelSeguimiento(seg);
  const bloqueado = seg.etapa === "SEGUIMIENTO_ENVIO" && !puedeEnviarSeguimiento(envio);
  const EstadoIcono = estado.icono || Clock;
  const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "cliente";
  const cuerpo = (
    <>
      <span className="pt-seg__etapa">{seg.etapa_nombre}</span>
      <strong className="pt-seg__fase">
        {seg.terminado ? estado.detalle : `${seg.fase_posicion}/${seg.total_fases} · ${seg.fase_nombre}`}
      </strong>
      <span className={`pt-seg__estado pt-seg__estado--${estado.tono}${estado.pulso ? " is-pulsing" : ""}`}>
        <EstadoIcono size={11} /> {estado.texto}
      </span>
      {!envio.telefono && <span className="pt-seg__cuando pt-seg__cuando--neutral">Sin teléfono</span>}
    </>
  );
  if (!onAbrir) return <div className="pt-seg">{cuerpo}</div>;
  return (
    <button
      type="button"
      className="pt-seg pt-seg--boton"
      disabled={bloqueado}
      title={bloqueado ? "Disponible cuando logística marque el pedido Preparado" : "Abrir los mensajes de este pedido"}
      style={bloqueado ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
      aria-label={`Seguimiento de ${nombre}`}
      onClick={(ev) => {
        ev.stopPropagation();
        onAbrir(envio);
      }}
    >
      {cuerpo}
    </button>
  );
}

function ResumenItem({ label, value, color, tone = "default" }) {
  return (
    <span className={`pt-resumen-item pt-resumen-item--${tone}`}>
      <span>{label}</span>
      <strong style={{ color: color || undefined }}>{value}</strong>
    </span>
  );
}

const accionBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-2)",
  color: "var(--color-fg)",
  fontSize: "0.74rem",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

function AccionPrincipal({ envio, onAbrirDetalle, onAbrirResumen, onAccionSiguiente, onAbrirSeguimiento, onCambiarEstado, etapa }) {
  if (["seguimiento_envio", "recompra", "recuperacion"].includes(etapa)) {
    const bloqueado = etapa === "seguimiento_envio" && !puedeEnviarSeguimiento(envio);
    return (
      <button type="button" disabled={bloqueado} title={bloqueado ? "Disponible cuando logística marque el pedido Preparado" : undefined} style={{ ...accionBtnStyle, ...(bloqueado ? { opacity: 0.6, cursor: "not-allowed" } : {}) }} onClick={(e) => { e.stopPropagation(); onAbrirSeguimiento?.(envio); }}>
        <MessageCircle size={13} /> Seguimiento
      </button>
    );
  }
  if (envio.estado === "Despachado" && !envio.raha_logistica?.gestionado) {
    return (
      <EstadoBadgeDropdown
        estado={envio.estado}
        modoAccion
        onChange={(nuevoEstado) => onCambiarEstado?.(envio, nuevoEstado)}
      />
    );
  }
  const accion = envio.accion_siguiente;

  // El backend manda la próxima acción del pedido con su estado destino.
  if (accion?.cta && accion.siguiente_estado) {
    return (
      <button
        type="button"
        className={`pt-next-action pt-next-action--${accion.tono || "info"}`}
        title={accion.descripcion}
        onClick={(e) => {
          e.stopPropagation();
          onAccionSiguiente?.(envio, accion);
        }}
      >
        <Package size={13} /> {accion.cta}
      </button>
    );
  }

  if (envio.estado === "Pendiente") {
    const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
    const link = getWhatsappLink(envio, `Hola ${nombre}, te escribimos por tu pedido #${numeroPedidoVisible(envio)}. ¿Confirmamos los datos de entrega?`);
    if (!link) return <span style={{ color: "var(--color-fg-subtle)", fontSize: "0.75rem" }}>Sin teléfono</span>;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" style={accionBtnStyle} onClick={(e) => e.stopPropagation()}>
        <MessageCircle size={13} /> Contactar
      </a>
    );
  }
  if (envio.estado === "Preparado") {
    return (
      <button type="button" style={accionBtnStyle} onClick={(e) => { e.stopPropagation(); onAbrirResumen(envio); }}>
        <ClipboardList size={13} /> Resumen
      </button>
    );
  }
  return (
    <button type="button" style={accionBtnStyle} onClick={(e) => { e.stopPropagation(); onAbrirDetalle(envio); }}>
      <Eye size={13} /> Ver detalle
    </button>
  );
}

function PedidoMobile({ envio, etapa, onAbrirDetalle, onAbrirResumen, onAbrirSeguimiento, onCambiarEstado, onAccionSiguiente, onAbrirHistorial, onRepetirPedido, onEliminar, onCambiarOrigen, esAdmin }) {
  const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "Sin nombre";
  const seg = envio.seguimiento;
  const whatsapp = String(envio.origen || "").toUpperCase().includes("WHATSAPP");
  const leadTipo = envio.lead_tipo_manual || ((envio.campana_leads || []).length ? "campana" : "organico");
  const origen = whatsapp ? `Lead ${leadTipo === "campana" ? "Campaña" : "Orgánico"}` : envio.origen === "LANDING" ? "Pedido web" : "Manual";
  const bloqueado = etapa === "seguimiento_envio" && !puedeEnviarSeguimiento(envio);
  const estadoMensaje = seg ? estadoDelSeguimiento(seg) : null;
  const { fecha } = formatFechaYHora(envio.dispatchedAt || envio.fecha, envio.hora, envio.createdAt);
  const cta = bloqueado ? "Disponible al preparar" : seg?.terminado ? "Ver mensajes enviados" : seg?.fase_abierta_en ? "Confirmar envío del mensaje" : "Enviar mensaje de seguimiento";
  const items = envio.items || [];
  return (
    <article className="pm-order" aria-label={`${envio.es_lead ? "Lead" : "Pedido"} ${numeroPedidoVisible(envio)}`}>
      <header className="pm-order-top">
        <button type="button" className="pm-reference" onClick={() => onAbrirDetalle?.(envio)}>{numeroPedidoVisible(envio)}<ChevronRight size={14} /></button>
        <span className="pm-origin">{origen}</span>
        <details className="pm-more">
          <summary aria-label={`Más acciones de ${numeroPedidoVisible(envio)}`}><MoreHorizontal size={20} /></summary>
          <div className="pm-more-menu" onClick={event => { if (event.target.closest("button")) event.currentTarget.closest("details").open = false; }}>
            <button type="button" onClick={() => onAbrirDetalle?.(envio)}><Eye size={16} /> Ver / editar pedido</button>
            {onAbrirResumen && <button type="button" onClick={() => onAbrirResumen(envio)}><ClipboardList size={16} /> Resumen del pedido</button>}
            {onAbrirHistorial && <button type="button" onClick={() => onAbrirHistorial(envio)}><History size={16} /> Historial</button>}
            {etapa === "recompra" && onRepetirPedido && <button type="button" onClick={() => onRepetirPedido(envio)}><Plus size={16} /> Nuevo pedido del cliente</button>}
            {whatsapp && <button type="button" onClick={() => onCambiarOrigen(envio, leadTipo)}>Cambiar a lead {leadTipo === "campana" ? "orgánico" : "campaña"}</button>}
            {esAdmin && <button type="button" className="pm-danger" onClick={() => onEliminar(envio)}>Eliminar pedido</button>}
          </div>
        </details>
      </header>
      <div className="pm-customer"><h2>{nombre}</h2><strong>{envio.es_lead && !items.length ? "Sin importe" : formatGs(envio.monto)}</strong></div>
      <p className="pm-location"><MapPin size={13} />{[envio.ciudad, envio.departamento].filter(Boolean).join(" · ") || "Sin ciudad"}</p>
      <ReputacionClienteBadge reputacion={envio.reputacion_cliente} />
      <p className="pm-products">{items.length ? items.map(item => `${item.cantidad || 1} × ${item.nombre_producto}`).join(" · ") : "Consulta general · Sin productos"}</p>
      <div className="pm-status"><EstadoCell envio={envio} etapa={etapa} onCambiarEstado={envio.raha_logistica?.gestionado ? null : onCambiarEstado} /><span>{fecha}</span></div>
      {onAbrirSeguimiento && <section className={`pm-followup pm-followup--${estadoMensaje?.tono || "neutral"}`} aria-label={`Mensajes de ${nombre}`}>
        <div className="pm-followup-heading"><MessageCircle size={16} /><strong>{seg?.etapa_nombre || "Mensajes de seguimiento"}</strong>{estadoMensaje && <span>{estadoMensaje.texto}</span>}</div>
        <p>{seg ? seg.terminado ? "Todos los mensajes enviados" : `${seg.fase_posicion}/${seg.total_fases} · ${seg.fase_nombre}` : "Abrí el flujo para ver y enviar los mensajes de este cliente."}</p>
        {seg && <div className="pm-progress" role="progressbar" aria-label="Avance del seguimiento" aria-valuemin={0} aria-valuemax={Number(seg.total_fases) || 1} aria-valuenow={seg.terminado ? Number(seg.total_fases) || 1 : Math.max(0, (Number(seg.fase_posicion) || 1) - 1)}><span style={{ width: `${seg.terminado ? 100 : Math.min(100, Math.max(0, ((Number(seg.fase_posicion) || 1) - 1) / (Number(seg.total_fases) || 1) * 100))}%` }} /></div>}
        <button type="button" className="pm-message-cta" disabled={bloqueado} onClick={() => onAbrirSeguimiento(envio)}><MessageCircle size={18} />{cta}<ChevronRight size={16} /></button>
        {bloqueado && <small>Logística debe marcar este pedido como Preparado.</small>}
      </section>}
      <footer className="pm-footer">
        <div className="pm-payment"><span>{envio.metodo_pago || "Sin método de pago"}{esPagoAnticipado(envio) ? " · Anticipado" : ""}</span>{Number(envio.costo_envio) > 0 && <span>Envío {formatGs(envio.costo_envio)}</span>}</div>
        <div className="pm-actions">
          {envio.telefono && <a href={`tel:${String(envio.telefono).replace(/[^\d+]/g, "")}`} aria-label={`Llamar a ${nombre}`}><Phone size={15} /><span>Llamar</span></a>}
          {!["seguimiento_envio", "recuperacion", "recompra"].includes(etapa) && !(envio.raha_logistica?.gestionado) && <AccionPrincipal envio={envio} etapa={etapa} onAbrirDetalle={onAbrirDetalle} onAbrirResumen={onAbrirResumen} onAbrirSeguimiento={onAbrirSeguimiento} onCambiarEstado={onCambiarEstado} onAccionSiguiente={onAccionSiguiente} />}
        </div>
      </footer>
      {envio.raha_logistica?.gestionado && etapa === "logistica" && <details className="pm-tracking"><summary>Ver seguimiento RAHA</summary><RahaTimeline envio={envio} /></details>}
    </article>
  );
}

/**
 * Bandeja operativa de pedidos — pestañas por estado con contador (ver plan
 * Gestión de Pedidos, sección 38-42). Reemplaza el viejo MultiEstadoSelect:
 * la pestaña activa ES el filtro de estado, no hace falta un selector aparte.
 */
export function PedidosTable({
  couriers = [],
  onChangeEstado,
  onPagarAbastecimiento,
  onValidarPagoAbastecimiento,
  onRechazarPagoAbastecimiento,
  onAvanzarAbastecimiento,
  onConfirmarRecepcionAbastecimiento,
  onAbrirTimelineAbastecimiento,
  onAbrirDetalle,
  onAccionEspecial,
  onAbrirResumen,
  onAbrirHistorial,
  onAbrirSeguimiento,
  onRepetirPedido,
  refrescarKey = 0,
  initialPedidoId = "",
  initialEstado = TODOS_ESTADOS_ID,
  soloAbastecimiento = false,
  initialAbastecimientoEstado = "en_seguimiento",
  // Qué etapas puede elegir esta bandeja: Gestión Comercial solo ofrece
  // Confirmación/Seguimiento de envío/Recompra; Logística solo Logística.
  etapasDisponibles = STAGE_FILTERS.map((s) => s.id),
  initialEtapa = etapasDisponibles[0],
}) {
  const filtrosBase = useMemo(() => ({ ...FILTROS_VACIOS, pedido_id: initialPedidoId || "" }), [initialPedidoId]);
  const [estadoActivo, setEstadoActivo] = useState(initialEstado);
  const [etapaActiva, setEtapaActiva] = useState(initialEtapa);
  const mostrarSeguimiento = !soloAbastecimiento && etapaActiva !== "logistica";
  const stageFiltersDisponibles = STAGE_FILTERS.filter((stage) => etapasDisponibles.includes(stage.id));
  // Fila expandida con el seguimiento de abastecimiento (solo en esa pestaña).
  const [timelineExpandidoId, setTimelineExpandidoId] = useState(null);
  const [abastecimientoEstadoActivo, setAbastecimientoEstadoActivo] = useState(initialAbastecimientoEstado);
  const [filtros, setFiltros] = useState(() => filtrosBase);
  const [vista, setVista] = useState("tabla");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, totalPages: 1 });
  const [kanbanData, setKanbanData] = useState([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [conteos, setConteos] = useState({});
  const [resumenEntregados, setResumenEntregados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masFilters, setMasFilters] = useState(false);
  const [resumenMobile, setResumenMobile] = useState(false);
  const [esMovil, setEsMovil] = useState(() => window.matchMedia?.("(max-width: 760px)").matches || false);
  const [busquedaMobileTipo, setBusquedaMobileTipo] = useState("cliente");
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 760px)");
    if (!media) return;
    const actualizar = () => setEsMovil(media.matches);
    actualizar();
    media.addEventListener("change", actualizar);
    return () => media.removeEventListener("change", actualizar);
  }, []);
  const [metodosPagoList, setMetodosPagoList] = useState([]);
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getMetodosPago().then((data) => setMetodosPagoList(data || [])).catch(() => setMetodosPagoList([]));
    canalVentaService.listar().then((data) => setCanalesVenta(data || [])).catch(() => setCanalesVenta([]));
    verificarSesion().then((res) => setUsuarioActual(res)).catch(() => setUsuarioActual(null));
  }, []);

  useEffect(() => {
    setFiltros((prev) => ({ ...prev, pedido_id: initialPedidoId || "" }));
    if (initialPedidoId) setPage(1);
  }, [initialPedidoId]);

  useEffect(() => {
    setEstadoActivo(initialEstado || TODOS_ESTADOS_ID);
    setPage(1);
  }, [initialEstado]);

  // Gestión Logística y Gestión Comercial renderizan el mismo componente en
  // el mismo lugar del router: al navegar entre ellas React no lo desmonta,
  // así que sin este efecto etapaActiva se quedaba con el valor de la página
  // anterior (bug reportado: título y pestañas de etapa cambiaban, pero los
  // subestados seguían siendo los de logística hasta recargar).
  useEffect(() => {
    setEtapaActiva(initialEtapa);
    setPage(1);
  }, [initialEtapa]);

  useEffect(() => {
    setAbastecimientoEstadoActivo(initialAbastecimientoEstado);
    setPage(1);
  }, [initialAbastecimientoEstado]);

  const construirPayloadBase = useCallback((f, opciones = {}) => {
    const { incluirFiltroAbastecimiento = true } = opciones;
    const payload = {};
    if (f.pedido_id.trim()) payload.pedido_id = f.pedido_id.replace(/#/g, "").trim();
    if (f.envio_id.trim()) payload.envio_id = f.envio_id.replace(/#/g, "").trim();
    if (f.cliente.trim()) payload.cliente = f.cliente.trim();
    if (f.ciudad.trim()) payload.ciudad = f.ciudad.trim();
    if (f.fecha_desde) payload.fecha_desde = f.fecha_desde;
    if (f.fecha_hasta) payload.fecha_hasta = f.fecha_hasta;
    if (f.courier_id !== "TODOS") payload.courier_id = f.courier_id;
    if (f.confirmador.trim()) payload.confirmador = f.confirmador.trim();
    if (f.canal_venta_id !== "TODOS") payload.canal_venta_id = f.canal_venta_id;
    if (f.producto.trim()) payload.producto_busqueda = f.producto.trim();
    if (f.metodo_pago_id !== "TODOS") payload.metodo_pago_id = f.metodo_pago_id;

    if (soloAbastecimiento && incluirFiltroAbastecimiento) {
      if (abastecimientoEstadoActivo && abastecimientoEstadoActivo !== "TODOS") {
        payload.abastecimiento_estado = abastecimientoEstadoActivo;
      } else {
        payload.solo_abastecimiento = true;
      }
    }
    return payload;
  }, [soloAbastecimiento, abastecimientoEstadoActivo]);

  const cargar = useCallback(async (f, p, estado) => {
    setLoading(true);
    try {
      const payload = { ...construirPayloadBase(f), page: p, limit: LIMITE };
      if (mostrarSeguimiento) payload.incluir_seguimiento = true;
      if (!soloAbastecimiento && etapaActiva !== "logistica") payload.seguimiento_comercial = true;
      if (!soloAbastecimiento && etapaActiva === "seguimiento_envio") payload.incluir_confirmados_raha = true;
      const estadosEtapa = STAGE_TO_ESTADOS[etapaActiva];
      if (!soloAbastecimiento && etapaActiva === "logistica" && estado === TAB_RAHA_LOGISTICA_ID) {
        payload.logistica_raha = true;
      } else if (!soloAbastecimiento && estado === TAB_ABASTECIMIENTO_ID) {
        payload.abastecimiento_estado = "pagado";
      } else if (!soloAbastecimiento && estadosEtapa?.length) {
        payload.estados = etapaActiva !== "recuperacion" && estado && estado !== TODOS_ESTADOS_ID && estadosEtapa.includes(estado)
          ? estadosDeFiltro(estado)
          : estadosEtapa;
        if (etapaActiva === "logistica") payload.excluir_logistica_raha = true;
      } else if (!soloAbastecimiento && estado && estado !== TODOS_ESTADOS_ID) {
        payload.estados = estadosDeFiltro(estado);
      }
      const res = await getEnviosPaginados(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, [construirPayloadBase, soloAbastecimiento, etapaActiva, mostrarSeguimiento]);

  // El kanban es un tablero por estado: tiene que mostrar TODOS los estados
  // a la vez (una columna por cada uno), no solo la pestana de estado activa
  // en la vista Tabla -- si se scopea a un solo estado, el resto de las
  // columnas del tablero quedan vacias (bug reportado: 72 pedidos en
  // Pendiente y 0 en las demas columnas aunque hubiera pedidos ahi).
  const cargarKanban = useCallback(async (f) => {
    if (soloAbastecimiento) return;
    setKanbanLoading(true);
    try {
      const payloadBase = { ...construirPayloadBase(f), limit: 100 };
      if (mostrarSeguimiento) payloadBase.incluir_seguimiento = true;
      if (etapaActiva !== "logistica") payloadBase.seguimiento_comercial = true;
      if (etapaActiva === "seguimiento_envio") payloadBase.incluir_confirmados_raha = true;
      const estadosEtapa = STAGE_TO_ESTADOS[etapaActiva];
      if (estadosEtapa?.length) payloadBase.estados = estadosEtapa;
      if (etapaActiva === "logistica") payloadBase.excluir_logistica_raha = true;

      const acumulado = [];
      let pageToLoad = 1;
      let totalPages = 1;

      do {
        const res = await getEnviosPaginados({ ...payloadBase, page: pageToLoad });
        acumulado.push(...(res?.data || []));
        totalPages = Number(res?.totalPages) || 1;
        pageToLoad += 1;
      } while (pageToLoad <= totalPages);

      setKanbanData(acumulado);
    } catch (err) {
      console.error("Error cargando tablero kanban:", err);
    } finally {
      setKanbanLoading(false);
    }
  }, [construirPayloadBase, soloAbastecimiento, etapaActiva, mostrarSeguimiento]);

  const handleEliminarPedido = async (envio) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el pedido de ${envio.cliente || "Cliente"}? Esta acción no se puede deshacer y liberará cualquier stock reservado.`)) {
      return;
    }
    
    try {
      await deleteEnvio(envio.id);
      cargarPedidos();
    } catch (err) {
      alert("Error al eliminar pedido: " + err.message);
    }
  };

  // Corrige a mano si un pedido de WhatsApp cuenta como Lead Orgánico o Lead
  // Campaña (ver columna Tipo) — el vendedor sabe cosas que el matching
  // automático por producto no puede saber (ej. llegó por recomendación
  // aunque el producto tenga campaña activa). Alterna entre las dos, no
  // vuelve al automático: una vez corregido, queda corregido.
  const handleToggleLeadTipo = async (envio, actual) => {
    try {
      await actualizarLeadTipoManual(envio.id, actual === "campana" ? "organico" : "campana");
      cargarPedidos();
    } catch (err) {
      alert("Error al corregir el tipo de lead: " + err.message);
    }
  };

  const cargarConteos = useCallback(async (f) => {
    try {
      const payload = construirPayloadBase(f, { incluirFiltroAbastecimiento: false });
      if (!soloAbastecimiento && etapaActiva === "logistica") payload.separar_logistica_raha = true;
      if (!soloAbastecimiento && etapaActiva !== "logistica") payload.seguimiento_comercial = true;
      if (!soloAbastecimiento && etapaActiva === "seguimiento_envio") payload.incluir_confirmados_raha = true;
      const res = soloAbastecimiento
        ? await getConteoPorAbastecimiento(payload)
        : await getConteoPorEstado(payload);
      setConteos(res || {});
    } catch (err) {
      console.error("Error cargando conteo por estado:", err);
    }
  }, [construirPayloadBase, soloAbastecimiento, etapaActiva]);

  // Declarado después de cargarConteos: su dependency array la referencia,
  // y con const/TDZ eso revienta con "Cannot access before initialization"
  // si cargarPedidos se declara primero (bug real que llegó a producción).
  const cargarPedidos = useCallback(async () => {
    cargar(filtros, page, estadoActivo);
    cargarConteos(filtros);
  }, [cargar, cargarConteos, filtros, page, estadoActivo]);

  // Resumen financiero minimalista, solo dentro de la pestaña Entregados —
  // ver plan sección 22. No es un dashboard general, no se calcula en las
  // demás pestañas.
  const cargarResumenEntregados = useCallback(async (f) => {
    try {
      const res = await getResumenEntregados(construirPayloadBase(f));
      setResumenEntregados(res);
    } catch (err) {
      console.error("Error cargando resumen de entregados:", err);
    }
  }, [construirPayloadBase]);

  // Solo en Logística: la rendición courier/tienda que resume este bloque es
  // un tema logístico, no comercial — en Recompra (Gestión Comercial) un
  // "Entregado" es el pedido ya cerrado sobre el que se hace el escalamiento
  // de ventas, no algo para rendir (pedido del usuario, 2026-10-14).
  const viendoEntregados = etapaActiva === "logistica" && estadoActivo === "Entregado";
  const timerRef = useRef(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      cargar(filtros, page, estadoActivo);
      cargarConteos(filtros);
      if (viendoEntregados) {
        cargarResumenEntregados(filtros);
      } else {
        setResumenEntregados(null);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [filtros, page, estadoActivo, viendoEntregados, refrescarKey, cargar, cargarConteos, cargarResumenEntregados]);

  useEffect(() => {
    if (vista !== "kanban" || soloAbastecimiento) return;
    const timer = setTimeout(() => {
      cargarKanban(filtros);
    }, 300);
    return () => clearTimeout(timer);
  }, [vista, soloAbastecimiento, filtros, refrescarKey, cargarKanban]);

  const setFiltro = (key, val) => {
    setFiltros((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const resetFiltros = () => {
    setFiltros(filtrosBase);
    setPage(1);
  };

  const handleSelectEstado = (estado) => {
    setEstadoActivo(estado);
    setTimelineExpandidoId(null);
    setPage(1);
  };

  const handleSelectEtapa = (etapa) => {
    setEtapaActiva(etapa);
    setPage(1);
    setTimelineExpandidoId(null);
    const estados = STAGE_TO_ESTADOS[etapa];
    if (estados?.length && !estados.includes(estadoActivo)) {
      setEstadoActivo(TODOS_ESTADOS_ID);
    }
  };

  const handleSelectAbastecimientoEstado = (estado) => {
    setAbastecimientoEstadoActivo(estado);
    setPage(1);
  };

  const handleItemEstadoChange = (item, nuevoEstado) => {
    if (item.estado === nuevoEstado) return;

    if (nuevoEstado === "Confirmado") {
      onAbrirDetalle && onAbrirDetalle(item);
      return;
    }

    // Saliendo de "Reprogramado" hacia cualquier destino: el viaje en falso
    // ya se hizo y recién ahora se sabe cuánto costó — se pregunta antes de
    // dejar avanzar la transición real. Ver CostoViajeModal.
    if (item.estado === "Reprogramado") {
      onAccionEspecial && onAccionEspecial("costo_viaje", item, { destino: nuevoEstado });
      return;
    }

    const tipoModal = ESTADOS_CON_MODAL[nuevoEstado];
    if (tipoModal) {
      onAccionEspecial && onAccionEspecial(tipoModal, item);
      return;
    }

    // Transición simple (Preparado, Despachado, Cancelado): PATCH directo,
    // el backend valida si realmente es una transición permitida.
    setData((prev) => ({
      ...prev,
      data: (prev.data || []).map((row) =>
        row.id === item.id ? { ...row, estado: nuevoEstado } : row
      ),
    }));
    setKanbanData((prev) => prev.map((row) =>
      row.id === item.id ? { ...row, estado: nuevoEstado } : row
    ));

    if (onChangeEstado) {
      onChangeEstado(item.id, nuevoEstado, item);
    }
  };

  const handleKanbanDrop = (nuevoEstado) => {
    if (!draggingId) return;
    const item = kanbanData.find((row) => row.id === draggingId);
    setDraggingId(null);
    if (!item) return;
    handleItemEstadoChange(item, nuevoEstado);
  };

  const handleKanbanChangeEstado = (id, nuevoEstado) => {
    const item = kanbanData.find((row) => row.id === id);
    if (!item) return;
    handleItemEstadoChange(item, nuevoEstado);
  };

  const handleAccionSiguiente = (item, accion) => {
    if (accion.siguiente_estado === "Confirmado") {
      onAbrirDetalle?.(item);
      return;
    }
    if (accion.siguiente_estado) {
      handleItemEstadoChange(item, accion.siguiente_estado);
    }
  };

  const hayFiltros = Object.entries(filtros).some(([, v]) =>
    typeof v === "boolean" ? v : v !== "" && v !== "TODOS"
  );
  const filtrosSecundariosActivos = [
    filtros.courier_id !== "TODOS" && {
      key: "courier_id",
      label: couriers.find((c) => String(c.id) === String(filtros.courier_id))?.nombre || "Sin courier",
      reset: "TODOS",
    },
    filtros.confirmador.trim() && { key: "confirmador", label: `Confirmador: ${filtros.confirmador.trim()}`, reset: "" },
    filtros.canal_venta_id !== "TODOS" && {
      key: "canal_venta_id",
      label: canalesVenta.find((c) => String(c.id) === String(filtros.canal_venta_id))?.nombre || "Canal",
      reset: "TODOS",
    },
    filtros.producto.trim() && { key: "producto", label: `Producto: ${filtros.producto.trim()}`, reset: "" },
    filtros.metodo_pago_id !== "TODOS" && {
      key: "metodo_pago_id",
      label: metodosPagoList.find((m) => String(m.id) === String(filtros.metodo_pago_id))?.nombre || "Método de pago",
      reset: "TODOS",
    },
  ].filter(Boolean);
  const esAdmin = usuarioActual?.rol === "administrador";
  const esTabAbastecimiento = !soloAbastecimiento && estadoActivo === TAB_ABASTECIMIENTO_ID;
  const esTabRahaLogistica = !soloAbastecimiento && etapaActiva === "logistica" && estadoActivo === TAB_RAHA_LOGISTICA_ID;
  const estaEnKanban = !soloAbastecimiento && vista === "kanban";

  const envios = data.data || [];
  // Viene del backend (agregado sobre TODOS los pedidos filtrados, sin
  // paginar y sin restringir a un solo estado) para que el numero sea el
  // mismo en Tabla y en Kanban -- antes se sumaba solo lo cargado en
  // memoria en cada vista (10 filas en la tabla, o solo el estado activo
  // en el kanban), y por eso el total no coincidia entre ambas.
  const totalVisibleACobrar = Number(conteos.total_visible_a_cobrar || 0);
  const totalCobrado = Number(conteos.total_cobrado || 0);
  const totalPedidosVista = Number(data.total || 0);
  const totalVentaEntregada = resumenEntregados
    ? (Number(resumenEntregados.entregado?.monto_total) || 0) + (Number(resumenEntregados.costo_total_courier) || 0)
    : 0;
  const montoProductoEntregado = Number(resumenEntregados?.entregado?.monto_total || 0);
  const montoCourierEntregado = Number(resumenEntregados?.costo_total_courier || 0);
  const saldoLiquidacionEntregados = Number(resumenEntregados?.saldo_liquidacion || 0);
  const montoPendienteRendicion = Math.abs(saldoLiquidacionEntregados);
  const tableColSpan = (soloAbastecimiento ? 9 : (mostrarSeguimiento ? 10 : 9)) + 1;
  const sumarConteos = (estados) => estados.reduce((acc, st) => acc + Number(conteos[st] || 0), 0);
  const totalLogisticaRaha = Number(conteos.logistica_raha || 0);
  // Cada estado cuenta en un solo casillero.
  const resumenCiclo = {
    pendientes: sumarConteos(["Pendiente", "EnSeguimiento"]),
    confirmados: sumarConteos(["Confirmado"]),
    logistica: sumarConteos(["Preparado", "Despachado", "Reprogramado"]) + (etapaActiva === "seguimiento_envio" ? Number(conteos.Confirmado || 0) : 0),
    entregados: sumarConteos(["Entregado"]),
    cancelados: sumarConteos(["Cancelado"]),
    incidencias: sumarConteos(["Devuelto", "Perdido"]),
  };
  // El resumen no puede mezclar estado comercial con logístico (pedido del
  // usuario, 2026-10-14): cada página de menú ve solo lo suyo. Confirmado ya
  // es logístico ("Pendiente de preparación"), y Cancelado es comercial.
  const soloLogistica = etapasDisponibles.length === 1 && etapasDisponibles[0] === "logistica";
  const soloComercial = etapasDisponibles.every((e) => e !== "logistica");
  const resumenChips = etapaActiva === "seguimiento_envio"
    ? [
        { key: "logistica", label: "En logística", tone: "money" },
      ]
    : etapaActiva === "recuperacion"
    ? [{ key: "incidencias", label: "Pedidos con incidencia", tone: "danger" }]
    : soloLogistica
    ? [
        { key: "confirmados", label: "Pendiente de preparación", tone: "info" },
        { key: "logistica", label: "En logística", tone: "money" },
        { key: "entregados", label: "Entregados", tone: "success" },
        { key: "incidencias", label: "Incidencias", tone: "danger" },
      ]
    : soloComercial
    ? [
        { key: "pendientes", label: "Pendientes", tone: "warning" },
        { key: "cancelados", label: "Cancelados", tone: "default" },
      ]
    : [
        { key: "pendientes", label: "Pendientes", tone: "warning" },
        { key: "confirmados", label: "Pendiente de preparación", tone: "info" },
        { key: "logistica", label: "En logística", tone: "money" },
        { key: "entregados", label: "Entregados", tone: "success" },
        { key: "cancelados", label: "Cancelados", tone: "default" },
        { key: "incidencias", label: "Incidencias", tone: "danger" },
      ];
  const estadosEtapaActiva = STAGE_TO_ESTADOS[etapaActiva] || [];
  const totalEstadosEtapaActiva = sumarConteos(estadosEtapaActiva) + (etapaActiva === "logistica" ? totalLogisticaRaha : 0);
  const chipsEtapaActiva = etapaActiva === "recuperacion" ? [] : [
    ...(etapaActiva === "seguimiento_envio" && Number(conteos.Confirmado) > 0 ? ['Confirmado'] : []),
    ...(etapaActiva === "logistica" ? [TAB_RAHA_LOGISTICA_ID] : []),
    ...estadosEtapaActiva.filter((st) => !ESTADOS_SIN_CHIP.has(st)),
  ];
  // Ya no existe el filtro "Todos" en las etapas con varios subfiltros:
  // si el estado activo no es uno de los chips, se usa el primero.
  useEffect(() => {
    // Seguimiento de envío ya no se separa por estado: siempre muestra los
    // tres juntos (Preparado/Despachado/Reprogramado), distinguidos por
    // color de fila en vez de por pestaña (pedido del usuario, 2026-10-14).
    if (!soloAbastecimiento && ["recuperacion", "seguimiento_envio"].includes(etapaActiva)) {
      if (estadoActivo !== TODOS_ESTADOS_ID) setEstadoActivo(TODOS_ESTADOS_ID);
      return;
    }
    if (soloAbastecimiento || etapaActiva === "logistica" || chipsEtapaActiva.length <= 1) return;
    if (!chipsEtapaActiva.includes(estadoActivo)) setEstadoActivo(chipsEtapaActiva[0]);
  }, [soloAbastecimiento, etapaActiva, estadoActivo, chipsEtapaActiva.join("|")]);
  const conteoDeFiltro = (estado) => (
    estado === TAB_RAHA_LOGISTICA_ID ? totalLogisticaRaha : sumarConteos(estadosDeFiltro(estado))
  );

  return (
    <div className={`pt-root${masFilters ? " pt-filters-open" : ""}${resumenMobile ? " pt-summary-open" : ""}`} data-stage={etapaActiva} data-mobile-orders={!soloAbastecimiento}>
      {!soloAbastecimiento && (
        <div className="pt-viewbar">
      {!soloAbastecimiento && <button type="button" className="pt-mobile-summary-toggle" aria-expanded={resumenMobile} onClick={() => setResumenMobile(value => !value)}>
        <ClipboardList size={16} /> Resumen <ChevronDown size={16} />
      </button>}

          <div className="pt-viewbar-copy">
            <strong>Pedidos</strong>
            <span>Gestión comercial y logística · {loading ? "Cargando..." : `${totalPedidosVista.toLocaleString("es-PY")} pedido${totalPedidosVista === 1 ? "" : "s"}`}</span>
          </div>

          <div className="pt-view-switch" role="group" aria-label="Cambiar vista de pedidos">
            <button
              type="button"
              className={vista === "tabla" ? "active" : ""}
              onClick={() => setVista("tabla")}
            >
              <Table2 size={15} />
              <span className="pt-desktop-label">Tabla</span><span className="pt-mobile-label">Lista</span>
            </button>
            <button
              type="button"
              className={vista === "kanban" ? "active" : ""}
              onClick={() => setVista("kanban")}
            >
              <Columns3 size={15} />
              Kanban
            </button>
          </div>
        </div>
      )}

      {!soloAbastecimiento && (
        <section className="pt-cycle-summary" aria-label="Resumen del ciclo de pedidos">
          {resumenChips.map((c) => (
            <ResumenItem key={c.key} label={c.label} value={resumenCiclo[c.key].toLocaleString("es-PY")} tone={c.tone} />
          ))}
        </section>
      )}

      {/* ── Pestañas por estado con contador ── */}
      {soloAbastecimiento ? (
        <div className="pt-abastecimiento-board">
          <div className="pt-abastecimiento-board__copy">
            <span>Abastecimiento Gesicom</span>
            <strong>Pagos acreditados y recepción de mercadería</strong>
          </div>
          <div className="pt-abastecimiento-tabs" role="tablist" aria-label="Estados de abastecimiento">
            {ABASTECIMIENTO_TABS.map((tab) => {
              const active = abastecimientoEstadoActivo === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`pt-abastecimiento-tab ${active ? "active" : ""}`}
                  title={tab.description}
                  aria-selected={active}
                  onClick={() => handleSelectAbastecimientoEstado(tab.id)}
                >
                  <span>{tab.label}</span>
                  <strong>{conteos[tab.id] ?? 0}</strong>
                </button>
              );
            })}
          </div>
        </div>
      ) : stageFiltersDisponibles.length > 1 ? (
        <section className="pt-stage-shell" aria-label="Etapas del ciclo de venta">
          <label className="pm-stage-picker">
            <span>Bandeja de trabajo</span>
            <span className="pm-stage-control">
              <select aria-label="Elegir bandeja de trabajo" value={etapaActiva} onChange={event => handleSelectEtapa(event.target.value)}>
                {stageFiltersDisponibles.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
              <span className="pm-stage-chevron" aria-hidden="true"><ChevronDown size={20} strokeWidth={2.5} /></span>
            </span>
            <small>Tocá para cambiar de bandeja</small>
          </label>
          <div className="pt-stage-tabs" role="tablist" aria-label="Filtrar por etapa">
            {stageFiltersDisponibles.map((stage) => (
              <button
                key={stage.id}
                type="button"
                data-stage={stage.id}
                className={etapaActiva === stage.id ? "active" : ""}
                aria-selected={etapaActiva === stage.id}
                onClick={() => handleSelectEtapa(stage.id)}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!soloAbastecimiento && estaEnKanban ? (
        <div className="pt-kanban-context" role="note">
          <Columns3 size={16} />
          <div>
            <strong>Kanban por {STAGE_LABELS[etapaActiva]}.</strong>
            <span>Las columnas operativas no crean estados nuevos: muestran qué necesita cada pedido ahora.</span>
          </div>
        </div>
      ) : !soloAbastecimiento && etapaActiva === "seguimiento_envio" ? (
        // Acá ya no se separa por estado (pedido del usuario, 2026-10-14):
        // Preparado/Despachado/Reprogramado conviven en una sola lista y se
        // distinguen por color de fila. Esta leyenda es solo informativa.
        <section className="pt-status-shell" aria-label="Estados de seguimiento de envío">
          <div className="pt-status-tabs pt-status-tabs--secondary" role="note">
            {chipsEtapaActiva.map((st) => {
              const cfg = STATUS[st] || {};
              return (
                <span key={st} className="pt-status-chip pt-status-chip--legend" data-followup-tone={SEGUIMIENTO_TONE[st]}>
                  <span className="pt-status-chip__dot" aria-hidden="true" />
                  <span className="pt-status-chip__label">{st === 'Confirmado' ? 'Confirmado' : cfg.label || st}</span>
                  <strong className="pt-status-chip__count">{conteoDeFiltro(st)}</strong>
                </span>
              );
            })}
          </div>
        </section>
      ) : !soloAbastecimiento && chipsEtapaActiva.length > 1 ? (
        <section className="pt-status-shell" aria-label={`Filtros secundarios de ${etapaActiva}`}>
          <div className="pt-status-tabs pt-status-tabs--secondary" role="tablist">
            {chipsEtapaActiva.map((st) => {
              const cfg = st === TAB_RAHA_LOGISTICA_ID ? TAB_RAHA_LOGISTICA_CFG : (STATUS[st] || {});
              const active = estadoActivo === st;
              const label = cfg.label || st;
              return [
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelectEstado(st)}
                  className={`pt-status-chip ${active ? "active" : ""}`}
                  style={active ? { borderColor: cfg.chipText, background: cfg.chipBg, color: cfg.chipText } : undefined}
                >
                  <span className="pt-status-chip__label">{label}</span>
                  <strong className="pt-status-chip__count">{conteoDeFiltro(st)}</strong>
                </button>,
              ];
            })}
          </div>
        </section>
      ) : null}

      {!soloAbastecimiento && (
        <div className={`pt-ops-summary ${viendoEntregados && resumenEntregados ? "pt-ops-summary--story" : ""}`} aria-label="Resumen financiero de pedidos">
          <div className="pt-ops-summary__header">
            <span>{viendoEntregados && resumenEntregados ? "Resumen de entregados" : "Resumen operativo"}</span>
            <strong>{formatGs(totalVisibleACobrar)} por cobrar · {formatGs(totalCobrado)} cobrado</strong>
          </div>

          {viendoEntregados && resumenEntregados ? (
            <div className="pt-finance-story">
              <div className="pt-finance-story__lead">
                <strong>
                  {resumenEntregados.entregado.cantidad} pedido{resumenEntregados.entregado.cantidad === 1 ? "" : "s"} entregado{resumenEntregados.entregado.cantidad === 1 ? "" : "s"} · {formatGs(totalVentaEntregada)} cobrado
                </strong>
                <span>Producto {formatGs(montoProductoEntregado)} + delivery {formatGs(montoCourierEntregado)}</span>
              </div>

              <div className="pt-finance-flow" aria-label="Distribución financiera de entregados">
                <div>
                  <span>Cliente pagó</span>
                  <strong>{formatGs(totalVentaEntregada)}</strong>
                </div>
                <div>
                  <span>Tienda</span>
                  <strong>{formatGs(montoProductoEntregado)}</strong>
                </div>
                <div>
                  <span>Courier</span>
                  <strong>{formatGs(montoCourierEntregado)}</strong>
                </div>
              </div>

              <div className={`pt-finance-action ${saldoLiquidacionEntregados === 0 ? "is-clear" : "needs-action"}`}>
                {saldoLiquidacionEntregados < 0 ? (
                  <strong>Debés rendir {formatGs(montoPendienteRendicion)} al courier</strong>
                ) : saldoLiquidacionEntregados > 0 ? (
                  <strong>El courier debe rendir {formatGs(montoPendienteRendicion)} a la tienda</strong>
                ) : (
                  <strong>Rendición equilibrada</strong>
                )}
                <span>{resumenEntregados.pendientes_rendicion} pendiente{resumenEntregados.pendientes_rendicion === 1 ? "" : "s"} de rendición</span>
              </div>

              {resumenEntregados.desglose_metodo_pago.length > 0 && (
                <div className="pt-finance-methods">
                  {resumenEntregados.desglose_metodo_pago.map((d) => (
                    <span key={d.metodo_pago}>{d.metodo_pago}: <strong>{formatGs(d.monto)}</strong></span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pt-ops-grid">
              <ResumenItem
                label="Por cobrar"
                value={formatGs(totalVisibleACobrar)}
                tone="money"
              />
              <ResumenItem
                label="Cobrado"
                value={formatGs(totalCobrado)}
                tone="success"
              />
            </div>
          )}
        </div>
      )}

      {!soloAbastecimiento && <div className="pm-searchbar">
        <div className="pm-search-input"><Search size={18} /><input aria-label="Buscar pedidos en móvil" placeholder={busquedaMobileTipo === "cliente" ? "Nombre o teléfono del cliente" : "Número de pedido"} value={filtros[busquedaMobileTipo]} onChange={event => setFiltro(busquedaMobileTipo, event.target.value)} />{filtros[busquedaMobileTipo] && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setFiltro(busquedaMobileTipo, "")}><X size={16} /></button>}</div>
        <div className="pm-search-options"><select aria-label="Tipo de búsqueda" value={busquedaMobileTipo} onChange={event => setBusquedaMobileTipo(event.target.value)}><option value="cliente">Cliente / teléfono</option><option value="pedido_id">N° de pedido</option></select><button type="button" aria-expanded={masFilters} onClick={() => setMasFilters(value => !value)}><SlidersHorizontal size={16} />Filtros{hayFiltros && <span className="pm-filter-dot" />}</button>{hayFiltros && <button type="button" onClick={resetFiltros}>Limpiar todo</button>}<span>{loading ? "Cargando…" : `${data.total} registros`}</span></div>
      </div>}
      {/* ── Toolbar de filtros principales ── */}
      <div className="pt-toolbar" style={{ marginTop: "0.75rem" }}>
        <div className="pt-search-wrap" style={{ flex: "0 1 240px" }}>
          <Package size={14} className="pt-search-icon" />
          <input
            type="text"
            className="pt-search"
            placeholder="ALI-1001 o número..."
            aria-label="Buscar por número de pedido"
            value={filtros.pedido_id}
            onChange={(e) => setFiltro("pedido_id", e.target.value)}
          />
          {filtros.pedido_id && (
            <button className="pt-clear-btn" onClick={() => setFiltro("pedido_id", "")}>
              <X size={13} />
            </button>
          )}
        </div>

        {esAdmin && (
          <div className="pt-search-wrap pt-mobile-secondary-filter" style={{ flex: "0 0 150px" }}>
            <Hash size={14} className="pt-search-icon" />
            <input
              type="text"
              className="pt-search"
              placeholder="ID interno..."
              aria-label="Buscar por ID interno"
              value={filtros.envio_id}
              onChange={(e) => setFiltro("envio_id", e.target.value)}
            />
            {filtros.envio_id && (
              <button className="pt-clear-btn" onClick={() => setFiltro("envio_id", "")}>
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Búsqueda cliente */}
        <div className="pt-search-wrap pt-customer-search">
          <Search size={14} className="pt-search-icon" />
          <input
            type="text"
            className="pt-search"
            placeholder="Buscar cliente, teléfono..."
            aria-label="Buscar cliente o teléfono"
            value={filtros.cliente}
            onChange={(e) => setFiltro("cliente", e.target.value)}
          />
          {filtros.cliente && (
            <button className="pt-clear-btn" onClick={() => setFiltro("cliente", "")}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Ciudad VISIBLE directamente */}
        <div className="pt-search-wrap pt-mobile-secondary-filter" style={{ flex: "0 0 auto", minWidth: "140px" }}>
          <MapPin size={14} className="pt-search-icon" style={{ color: "var(--color-fg-subtle)" }} />
          <input
            type="text"
            className="pt-search"
            placeholder="Ciudad..."
            aria-label="Filtrar por ciudad"
            value={filtros.ciudad}
            onChange={(e) => setFiltro("ciudad", e.target.value)}
          />
          {filtros.ciudad && (
            <button className="pt-clear-btn" onClick={() => setFiltro("ciudad", "")}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Fecha desde */}
        <label className="pt-date-label pt-mobile-secondary-filter" title="Fecha desde">
          <span style={{ fontSize: "0.72rem", color: "var(--color-fg-subtle)", whiteSpace: "nowrap" }}>Desde</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltro("fecha_desde", e.target.value)}
          />
        </label>

        {/* Fecha hasta */}
        <label className="pt-date-label pt-mobile-secondary-filter" title="Fecha hasta">
          <span style={{ fontSize: "0.72rem", color: "var(--color-fg-subtle)", whiteSpace: "nowrap" }}>Hasta</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltro("fecha_hasta", e.target.value)}
          />
        </label>

        <button
          type="button"
          className={`pt-filter-toggle ${masFilters ? "active" : ""}`}
          aria-expanded={masFilters}
          onClick={() => setMasFilters((o) => !o)}
        >
          <SlidersHorizontal size={14} />
          <span className="pt-desktop-label">Más filtros</span><span className="pt-mobile-label">Filtros</span>
          {hayFiltros && <span className="pt-filter-dot" />}
        </button>

        {/* Reset */}
        {hayFiltros && (
          <button type="button" className="pt-reset-btn" onClick={resetFiltros} title="Limpiar todo" aria-label="Limpiar todos los filtros">
            <RotateCcw size={14} />
          </button>
        )}

        {/* Contador */}
        <span className="pt-count">
          {loading ? "…" : data.total_leads !== undefined ? `${data.total_leads.toLocaleString("es-PY")} ${data.total_leads === 1 ? "lead" : "leads"} · ${data.total_pedidos.toLocaleString("es-PY")} ${data.total_pedidos === 1 ? "pedido" : "pedidos"}` : `${data.total.toLocaleString("es-PY")} registros`}
        </span>
      </div>

      {filtrosSecundariosActivos.length > 0 && (
        <div className="pt-active-filters" aria-label="Filtros activos">
          {filtrosSecundariosActivos.map((filtro) => (
            <button
              key={filtro.key}
              type="button"
              onClick={() => setFiltro(filtro.key, filtro.reset)}
              title="Quitar filtro"
            >
              {filtro.label}
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros extra ── */}
      {masFilters && (
      <div className="pt-extra-filters">
          <div className="pt-extra-title">
            <Filter size={14} />
            Filtros
          </div>

          <label className="pt-extra-label">
            <Truck size={13} />
            <select
              className="pt-filter-select"
              style={{ border: "none", padding: "0.4rem 0.5rem", background: "transparent" }}
              value={filtros.courier_id}
              onChange={(e) => setFiltro("courier_id", e.target.value)}
            >
              <option value="TODOS">Todos los couriers</option>
              <option value="null">Sin courier</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="pt-extra-label">
            <User size={13} />
            <input
              type="text"
              className="pt-extra-input"
              placeholder="Confirmador..."
              value={filtros.confirmador}
              onChange={(e) => setFiltro("confirmador", e.target.value)}
            />
          </label>

          {/* Opciones del catálogo `canales_venta`, no de una constante:
              la lista fija de acá se desincronizaba de los valores que de
              verdad tenían los pedidos. */}
          <select
            className="pt-filter-select"
            value={filtros.canal_venta_id}
            onChange={(e) => setFiltro("canal_venta_id", e.target.value)}
          >
            <option value="TODOS">Todos los canales</option>
            {canalesVenta.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <label className="pt-extra-label">
            <Package size={13} />
            <input
              type="text"
              className="pt-extra-input"
              placeholder="Buscar producto u oferta..."
              value={filtros.producto}
              onChange={(e) => setFiltro("producto", e.target.value)}
            />
          </label>

          <label className="pt-extra-label">
            <CreditCard size={13} />
            <select
              className="pt-filter-select"
              style={{ border: "none", padding: "0.4rem 0.5rem", background: "transparent" }}
              value={filtros.metodo_pago_id}
              onChange={(e) => setFiltro("metodo_pago_id", e.target.value)}
            >
              <option value="TODOS">Todos los métodos de pago</option>
              {metodosPagoList.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>
      </div>
      )}

      {/* ── Tabla ── */}
      {vista === "kanban" && !soloAbastecimiento ? (
        <div className="pt-kanban-wrap" aria-busy={kanbanLoading}>
          {kanbanLoading && kanbanData.length === 0 ? (
            <div className="pt-empty">
              <span className="pt-spinner" /> Cargando tablero...
            </div>
          ) : kanbanData.length === 0 ? (
            <div className="pt-empty">
              No hay pedidos que coincidan con los filtros.
            </div>
          ) : (
            <KanbanBoard
              envios={kanbanData}
              couriers={couriers}
              draggingId={draggingId}
              onDragStartCard={setDraggingId}
              onDragEndCard={() => setDraggingId(null)}
              onDropCard={handleKanbanDrop}
              onChangeEstado={handleKanbanChangeEstado}
              onAbrirDetalle={onAbrirDetalle}
              onAbrirSeguimiento={mostrarSeguimiento ? onAbrirSeguimiento : undefined}
              onAbrirTimelineAbastecimiento={onAbrirTimelineAbastecimiento}
              onAccionSiguiente={["seguimiento_envio", "recuperacion"].includes(etapaActiva) ? undefined : handleAccionSiguiente}
              isAdmin={esAdmin}
              context={etapaActiva}
            />
          )}
        </div>
      ) : esMovil && !soloAbastecimiento ? (
        <section className="pm-list" aria-label="Lista de pedidos" aria-busy={loading}>
          {loading ? <div className="pm-loading" role="status"><span className="pt-spinner" /> Cargando pedidos…</div> : envios.length === 0 ? <div className="pt-empty">No hay registros en esta bandeja con los filtros actuales.{hayFiltros && <button type="button" onClick={resetFiltros}>Limpiar filtros</button>}</div> : envios.map(envio => <PedidoMobile key={envio.id} envio={envio} etapa={etapaActiva} esAdmin={esAdmin} onAbrirDetalle={onAbrirDetalle} onAbrirResumen={onAbrirResumen} onAbrirSeguimiento={mostrarSeguimiento ? onAbrirSeguimiento : undefined} onCambiarEstado={handleItemEstadoChange} onAccionSiguiente={handleAccionSiguiente} onAbrirHistorial={onAbrirHistorial} onRepetirPedido={onRepetirPedido} onEliminar={handleEliminarPedido} onCambiarOrigen={handleToggleLeadTipo} />)}
        </section>
      ) : (
      <div className="pt-table-wrap">
        <table className={`pt-table${mostrarSeguimiento || soloAbastecimiento ? " pt-table--followup" : ""}`}>
          <colgroup>
            <col className="pt-col-id" />
            <col className="pt-col-tipo" />
            <col className="pt-col-date" />
            <col className="pt-col-client" />
            <col className="pt-col-phone" />
            <col className="pt-col-product" />
            <col className="pt-col-total" />
            {!soloAbastecimiento && <col className="pt-col-metodo-pago" />}
            <col className="pt-col-state" />
            {(mostrarSeguimiento || soloAbastecimiento) && <col className="pt-col-followup" />}
            <col className="pt-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th className="pt-th pt-th-id">{etapaActiva === 'comercial' ? 'Registro' : 'Pedido'}</th>
              <th className="pt-th pt-th-tipo">{etapaActiva === 'comercial' ? 'Origen' : 'Tipo'}</th>
              <th className="pt-th">Fecha</th>
              {soloAbastecimiento ? (
                <>
                  <th className="pt-th">Depósito</th>
                  <th className="pt-th">Contacto depósito</th>
                </>
              ) : (
                <>
                  <th className="pt-th">Cliente</th>
                  <th className="pt-th">Teléfono</th>
                </>
              )}
              <th className="pt-th pt-th-product">{etapaActiva === 'comercial' ? 'Producto / Interés' : 'Producto / Oferta'}</th>
              <th className="pt-th pt-th-num">Total</th>
              {!soloAbastecimiento && (
                <>
                  <th className="pt-th">Método de pago</th>
                  <th className="pt-th">{ENCABEZADO_ESTADO[etapaActiva]}</th>
                  {mostrarSeguimiento && <th className="pt-th">{["seguimiento_envio", "recuperacion"].includes(etapaActiva) ? "Mensaje de seguimiento" : "Seguimiento"}</th>}
                </>
              )}
              {soloAbastecimiento && <th className="pt-th pt-th-state">Estado</th>}
              {soloAbastecimiento && <th className="pt-th">Abastecimiento</th>}
              <th className="pt-th pt-th-action">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tableColSpan} className="pt-empty">
                  <span className="pt-spinner" /> Cargando pedidos...
                </td>
              </tr>
            ) : envios.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="pt-empty">
                  {soloAbastecimiento
                    ? "No hay pedidos de abastecimiento que coincidan con los filtros."
                    : esTabRahaLogistica
                    ? "No hay envíos RAHA que coincidan con los filtros."
                    : estadoActivo === TAB_ABASTECIMIENTO_ID
                    ? "No hay pedidos con abastecimiento en seguimiento que coincidan con los filtros."
                    : estadoActivo === TODOS_ESTADOS_ID
                    ? "No hay pedidos que coincidan con los filtros."
                    : `No hay pedidos en "${estadoActivo}" que coincidan con los filtros.`}
                </td>
              </tr>
            ) : (
              envios.map((e) => {
                const items = e.items || [];
                const resumenItems =
                  items.length === 0
                    ? (String(e.origen || '').toUpperCase().includes('WHATSAPP') ? "Consulta general · Sin productos" : "—")
                    : items.length === 1
                    ? `${items[0].nombre_producto}${items[0].cantidad > 1 ? ` x${items[0].cantidad}` : ""}`
                    : `${items[0].nombre_producto} +${items.length - 1} más`;

                const { fecha: fechaVisual, hora: horaVisual } = formatFechaYHora(
                  e.dispatchedAt || e.fecha,
                  e.hora,
                  e.createdAt
                );
                const nombreCliente = [e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") || e.cliente || "—";
                const tonoFila = etapaActiva === "seguimiento_envio" ? tonoSeguimiento(e) : undefined;
                // Mismo criterio que esOrigenWhatsapp del backend (ver
                // flujosBase.js): solo mira el texto de `origen`, nada de
                // estado. "Lead" es la palabra que pidió Martín para dejar
                // claro que todavía no es una venta confirmada — sigue
                // siendo el mismo Envio de siempre, esto es solo la etiqueta.
                const esWhatsapp = String(e.origen || "").toUpperCase().includes("WHATSAPP");
                // Mismo dato que ya separa "Lead Orgánico" de "Lead Campaña"
                // en el Dashboard General (ver pedidosAnalyticsService.js):
                // si el pedido tiene al menos un MetaCampanaLead, su producto
                // matcheó una campaña activa al crearse.
                // El vendedor puede corregir el cálculo automático a mano
                // (ver lead_tipo_manual en Envio.js) — su marca gana cuando
                // existe, mismo criterio que pedidosAnalyticsService.js.
                const leadTipoActual = e.lead_tipo_manual || ((e.campana_leads || []).length > 0 ? "campana" : "organico");
                const tipoPedido = esWhatsapp
                  ? leadTipoActual === "campana"
                    ? { label: "LC", tono: "whatsapp", title: "Lead Campaña WhatsApp — clic para corregir a Orgánico" }
                    : { label: "LO", tono: "whatsapp", title: "Lead Orgánico WhatsApp — clic para corregir a Campaña" }
                  : String(e.origen || "").toUpperCase() === "LANDING"
                  ? { label: "Pedido Web", tono: "web" }
                  : { label: "Manual", tono: "manual" };

                return [
                  <tr
                    key={e.id}
                    className="pt-row"
                    data-followup-tone={tonoFila}
                    onClick={() => {
                      // Dentro de la pestaña de abastecimiento el clic en la
                      // fila abre el seguimiento, no el editor del pedido.
                      if (esTabAbastecimiento) {
                        setTimelineExpandidoId((prev) => (prev === e.id ? null : e.id));
                        return;
                      }
                      if (esTabRahaLogistica && e.raha_logistica?.gestionado) {
                        setTimelineExpandidoId((prev) => (prev === e.id ? null : e.id));
                        return;
                      }
                      onAbrirDetalle && onAbrirDetalle(e);
                    }}
                  >
                    <td className="pt-td pt-td-id" data-label="Pedido">
                      <button type="button" className="pt-order-reference" aria-label={`Abrir ${e.es_lead ? "lead" : "pedido"} ${numeroPedidoVisible(e)}`}>{numeroPedidoVisible(e)}</button>
                      {e.es_lead && <span className="pt-depto">Lead · Sin pedido</span>}
                      {esAdmin && Number(e.id) !== Number(e.numero_pedido) && (
                        <span style={{ display: "block", marginTop: "2px", color: "var(--color-fg-subtle)", fontSize: "0.68rem", fontWeight: 600 }}>
                          ID {e.id}
                        </span>
                      )}
                    </td>
                    <td className="pt-td pt-td-tipo" data-label="Tipo">
                      {esWhatsapp ? (
                        <button
                          type="button"
                          className={`pt-tipo-badge pt-tipo-badge--${tipoPedido.tono} pt-tipo-badge--clickable`}
                          title={tipoPedido.title}
                          onClick={(ev) => { ev.stopPropagation(); handleToggleLeadTipo(e, leadTipoActual); }}
                        >
                          {tipoPedido.label}
                        </button>
                      ) : (
                        <span className={`pt-tipo-badge pt-tipo-badge--${tipoPedido.tono}`}>{tipoPedido.label}</span>
                      )}
                    </td>
                    <td className="pt-td pt-td-fecha" data-label="Fecha">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ color: "var(--color-fg)", fontWeight: 500 }}>{fechaVisual}</span>
                        {horaVisual && (
                          <span style={{ fontSize: "0.72rem", color: "var(--color-fg-muted)", fontFamily: "monospace" }}>
                            {horaVisual}
                          </span>
                        )}
                      </div>
                    </td>
                    {soloAbastecimiento ? (
                      <>
                        <td className="pt-td pt-td-ciudad" data-label="Depósito">
                          <span>{e.Usuario?.Tienda?.deposito_direccion || "Sin dirección cargada"}</span>
                          <span className="pt-depto">
                            {[e.Usuario?.Tienda?.deposito_ciudad, e.Usuario?.Tienda?.deposito_departamento].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </td>
                        <td className="pt-td" data-label="Contacto">
                          <span>{e.Usuario?.Tienda?.deposito_telefono || e.Usuario?.Tienda?.whatsapp || "—"}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="pt-td pt-td-client" data-label="Cliente">
                          <span className="pt-cliente-nombre">{nombreCliente}</span>
                          <span className="pt-depto">{[e.ciudad, e.departamento].filter(Boolean).join(" · ") || "Sin ciudad"}</span>
                          <ReputacionClienteBadge reputacion={e.reputacion_cliente} />
                        </td>
                        <td className="pt-td pt-td-telefono" data-label="Teléfono">
                          {e.telefono || "—"}
                        </td>
                      </>
                    )}
                    <td
                      className="pt-td pt-td-items"
                      data-label="Producto"
                      title={items.map((i) => `${i.nombre_producto} x${i.cantidad}`).join(", ")}
                    >
                      {resumenItems}
                    </td>
                    <td className="pt-td pt-td-num" data-label="Total">
                      <span>{e.es_lead && items.length === 0 ? '—' : formatGs(e.monto)}</span>
                      {e.es_lead && items.length > 0 && <span className="pt-depto">Valor de interés</span>}
                      {e.costo_envio > 0 && (
                        <span className="pt-delivery">+{formatGs(e.costo_envio)}</span>
                      )}
                    </td>
                    {!soloAbastecimiento && (
                      <>
                        <td className="pt-td pt-td-payment" data-label="Método de pago">
                          <span>{e.metodo_pago || "—"}</span>
                          {esPagoAnticipado(e) && <span className="pt-depto">Anticipado</span>}
                        </td>
                        <td className="pt-td pt-td-state" data-label="Estado">
                          <EstadoCell envio={e} etapa={etapaActiva} onCambiarEstado={e.raha_logistica?.gestionado ? null : handleItemEstadoChange} />
                        </td>
                        {mostrarSeguimiento && <td className={`pt-td pt-td-followup${!e.seguimiento ? " pt-td-followup--empty" : ""}`} data-label={["seguimiento_envio", "recuperacion"].includes(etapaActiva) ? "Mensaje de seguimiento" : "Seguimiento"} onClick={(ev) => ev.stopPropagation()}>
                          <SeguimientoCell envio={e} onAbrir={onAbrirSeguimiento} />
                        </td>}
                      </>
                    )}
                    {soloAbastecimiento && (
                      <td className="pt-td pt-td-state" data-label="Estado" onClick={(ev) => ev.stopPropagation()}>
                        <EstadoBadgeDropdown
                          estado={e.estado}
                          onChange={(nuevoEstado) => handleItemEstadoChange(e, nuevoEstado)}
                        />
                      </td>
                    )}
                    {soloAbastecimiento && (
                      <td className="pt-td" data-label="Abastecimiento">
                        <AbastecimientoBadge envio={e} onAbrirTimeline={onAbrirTimelineAbastecimiento} />
                      </td>
                    )}
                    <td className="pt-td pt-td-action" data-label="Acción" onClick={(ev) => ev.stopPropagation()}>
                      <div className="pt-row-actions">
                        {!(esTabRahaLogistica && e.raha_logistica?.gestionado) && (
                          <AccionPrincipal
                            envio={e}
                            onAbrirDetalle={onAbrirDetalle}
                            onAbrirResumen={onAbrirResumen}
                            onAccionSiguiente={handleAccionSiguiente}
                            onAbrirSeguimiento={mostrarSeguimiento ? onAbrirSeguimiento : undefined}
                            onCambiarEstado={handleItemEstadoChange}
                            etapa={etapaActiva}
                          />
                        )}
                        {etapaActiva === "recompra" && onRepetirPedido && (
                          <button
                            type="button"
                            title="Crear un nuevo pedido con los datos de este cliente"
                            style={accionBtnStyle}
                            onClick={(ev) => { ev.stopPropagation(); onRepetirPedido(e); }}
                          >
                            <Plus size={13} /> Nuevo pedido
                          </button>
                        )}
                        {onAbrirHistorial && (
                          <button
                            type="button"
                            title="Ver historial del pedido"
                            style={{ ...accionBtnStyle, padding: "4px 6px" }}
                            onClick={() => onAbrirHistorial(e)}
                          >
                            <History size={13} />
                          </button>
                        )}
                        {esAdmin && (
                          <button
                            type="button"
                            title="Eliminar pedido permanentemente"
                            style={{ ...accionBtnStyle, padding: "4px 6px", color: "var(--color-danger)", borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)" }}
                            onClick={() => handleEliminarPedido(e)}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>,
                  esTabAbastecimiento && timelineExpandidoId === e.id && (
                    <tr key={`${e.id}-timeline`} className="pt-row-timeline">
                      <td className="pt-td" colSpan={tableColSpan} style={{ background: "var(--color-surface-2)", padding: "1rem 1.25rem" }}>
                        <AbastecimientoTimeline
                          envio={e}
                          compacto
                          esAdmin={esAdmin}
                          onConfirmarRecepcion={onConfirmarRecepcionAbastecimiento}
                        />
                      </td>
                    </tr>
                  ),
                  esTabRahaLogistica && timelineExpandidoId === e.id && (
                    <tr key={`${e.id}-raha-timeline`} className="pt-row-timeline">
                      <td className="pt-td" colSpan={tableColSpan}>
                        <RahaTimeline envio={e} />
                      </td>
                    </tr>
                  ),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Paginación ── */}
      {vista === "tabla" && data.totalPages > 1 && (
        <div className="pt-pagination">
          <button
            className="pt-pag-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: data.totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - page) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "..." ? (
                <span key={`e${idx}`} className="pt-pag-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`pt-pag-btn ${p === page ? "active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}

          <button
            className="pt-pag-btn"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            <ChevronRight size={16} />
          </button>
          <span className="pt-pag-info">
            {Math.min((page - 1) * LIMITE + 1, data.total)}–
            {Math.min(page * LIMITE, data.total)} de {data.total.toLocaleString("es-PY")}
          </span>
        </div>
      )}
    </div>
  );
}
