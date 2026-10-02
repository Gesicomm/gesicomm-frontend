import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User, MessageCircle, ClipboardList, Eye, Package, CreditCard, History, Hash, Tag, Clock,
  Columns3, Table2, SlidersHorizontal
} from "lucide-react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";
import { getEnviosPaginados, getConteoPorEstado, getConteoPorAbastecimiento, getResumenEntregados, getMetodosPago, deleteEnvio } from "../../services/courierApi";
import AbastecimientoTimeline from "../../components/abastecimiento/AbastecimientoTimeline";
import { canalVentaService } from "../../services/canalVentaService";
import { seguimientoService } from "../../services/seguimiento.service";
import { verificarSesion } from "../../utils/auth";
import { numeroPedidoVisible } from "./pedidoNumero";
import { KanbanBoard } from "./kanban-board";


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

const STATUS_COMPACT_LABEL = {
  EnSeguimiento: "Seguimiento Contacto",
};

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
  etiqueta_id: "TODOS",
  plantilla_id: "TODOS",
  seguimiento_responsable_id: "TODOS",
  seguimiento_pendiente: false,
  seguimiento_vencido: false,
};

function EstadoBadgeDropdown({ estado, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = STATUS[estado] || { chipBg: "color-mix(in srgb, var(--color-fg) 8%, transparent)", chipText: "var(--color-fg-muted)" };
  const validas = TRANSICIONES_VALIDAS_FRONTEND[estado] || [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        style={{
          background: s.chipBg,
          color: s.chipText,
          border: `1px solid ${s.chipText}40`,
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "0.74rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.15s ease",
          outline: "none",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span>{estado || "Pendiente"}</span>
        <ChevronDown
          size={12}
          style={{
            opacity: 0.8,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
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
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_ORDER.map((st) => {
            const config = STATUS[st] || { chipBg: "color-mix(in srgb, var(--color-fg) 5%, transparent)", chipText: "var(--color-fg-muted)" };
            const isSelected = st === estado;
            const isValid = isSelected || validas.includes(st);
            
            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!isValid) {
                    if (validas.length === 0) {
                      alert(`El pedido está en un estado final (${estado}).\n\nNo se puede cambiar a ningún otro estado.`);
                    } else {
                      alert(`Transición no permitida.\n\nNo se puede pasar de "${estado}" a "${st}".\n\nLos estados permitidos son: ${validas.join(", ")}.`);
                    }
                    return;
                  }
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
                  cursor: isValid ? "pointer" : "not-allowed",
                  textAlign: "left",
                  transition: "background 0.12s",
                  width: "100%",
                  opacity: isValid ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  if (isValid && !isSelected) e.currentTarget.style.background = "color-mix(in srgb, var(--color-fg) 7%, transparent)";
                }}
                onMouseLeave={(e) => {
                  if (isValid && !isSelected) e.currentTarget.style.background = "transparent";
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
                <span style={{ flex: 1 }}>{st}</span>
                {isSelected && (
                  <span style={{ color: config.chipText, fontSize: "0.75rem", fontWeight: "bold" }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
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

function AccionPrincipal({ envio, isAdmin, onAbrirDetalle, onAbrirResumen, onAccionSiguiente }) {
  const accion = envio.accion_siguiente;

  // La confirmación de recepción en el depósito propio se decide SOLO por el
  // estado de abastecimiento, no por el estado de venta del pedido: es el
  // paso que destraba el pase a "Preparado", así que la tienda tiene que
  // poder marcarlo siempre que la mercadería esté viajando hacia su depósito.
  if (envio.abastecimiento_estado === "en_transito_a_deposito_cliente") {
    if (isAdmin) {
      return (
        <span className="pt-next-pill pt-next-pill--info" title="Solo el comercio puede confirmar la recepción en su depósito">
          <Package size={13} /> Esperando confirmación del cliente
        </span>
      );
    }
    return (
      <button
        type="button"
        className="pt-next-action pt-next-action--success"
        title="Cuando recibas la mercadería, confirmá la recepción para poder preparar el pedido"
        onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, { tipo: "confirmar_recepcion_deposito" }); }}
      >
        <Package size={13} /> Confirmar recepción
      </button>
    );
  }

  // pendiente_pago: solo la tienda tiene acción (pagar por transferencia). El
  // admin no acredita nada acá — el pago se valida recién cuando llega el
  // comprobante (pago_enviado).
  if (accion?.tipo === "pagar_abastecimiento") {
    if (isAdmin) {
      return <span className="pt-next-pill pt-next-pill--danger" title={accion.descripcion}><CreditCard size={13} /> Pendiente de pago</span>;
    }
    return (
      <button
        type="button"
        className={`pt-next-action pt-next-action--${accion.tono || "danger"}`}
        title={accion.descripcion}
        onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, accion); }}
      >
        <CreditCard size={13} /> {accion.cta}
      </button>
    );
  }

  // pago_enviado: solo el admin puede validar/rechazar.
  if (accion?.tipo === "pago_enviado") {
    if (!isAdmin) {
      return <span className="pt-next-pill pt-next-pill--warning" title={accion.descripcion}><CreditCard size={13} /> {accion.titulo}</span>;
    }
    return (
      <div style={{ display: "inline-flex", gap: 6 }}>
        <button
          type="button"
          className="pt-next-action pt-next-action--success"
          onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, { ...accion, tipo: "validar_pago" }); }}
        >
          Validar pago
        </button>
        <button
          type="button"
          className="pt-next-action pt-next-action--danger"
          onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, { ...accion, tipo: "rechazar_pago" }); }}
        >
          Rechazar
        </button>
      </div>
    );
  }

  // pago_rechazado: solo la tienda puede reemplazar el comprobante y reenviar.
  if (accion?.tipo === "pago_rechazado") {
    if (isAdmin) {
      return <span className="pt-next-pill pt-next-pill--danger" title={accion.descripcion}><CreditCard size={13} /> Rechazado, esperando reenvío</span>;
    }
    return (
      <button
        type="button"
        className="pt-next-action pt-next-action--danger"
        title={accion.descripcion}
        onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, accion); }}
      >
        <CreditCard size={13} /> {accion.cta}
      </button>
    );
  }

  // Tramo operativo intermedio: solo el admin avanza, la tienda ve el estado.
  if (accion?.tipo === "abastecimiento_avanzar") {
    if (!isAdmin) {
      return <span className="pt-next-pill pt-next-pill--info" title={accion.descripcion}><Package size={13} /> {accion.titulo}</span>;
    }
    return (
      <button
        type="button"
        className="pt-next-action pt-next-action--info"
        title={accion.descripcion}
        onClick={(e) => { e.stopPropagation(); onAccionSiguiente?.(envio, accion); }}
      >
        <Package size={13} /> {accion.cta}
      </button>
    );
  }

  // en_transito_a_deposito_cliente: solo la tienda confirma la recepción.
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
  refrescarKey = 0,
  initialPedidoId = "",
  initialEstado = "Pendiente",
  soloAbastecimiento = false,
  initialAbastecimientoEstado = "en_seguimiento",
}) {
  const filtrosBase = useMemo(() => ({ ...FILTROS_VACIOS, pedido_id: initialPedidoId || "" }), [initialPedidoId]);
  const [estadoActivo, setEstadoActivo] = useState(initialEstado);
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
  const [metodosPagoList, setMetodosPagoList] = useState([]);
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modalAbastecimientoOpen, setModalAbastecimientoOpen] = useState(false);
  const [modalAbastecimientoDismissedKey, setModalAbastecimientoDismissedKey] = useState(null);
  
  const [etiquetas, setEtiquetas] = useState([]);
  const [plantillas, setPlantillas] = useState([]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getMetodosPago().then((data) => setMetodosPagoList(data || [])).catch(() => setMetodosPagoList([]));
    canalVentaService.listar().then((data) => setCanalesVenta(data || [])).catch(() => setCanalesVenta([]));
    verificarSesion().then((res) => setUsuarioActual(res)).catch(() => setUsuarioActual(null));
    seguimientoService.getEtiquetas({ activo: true }).then(d => setEtiquetas(d || [])).catch(()=>{});
    seguimientoService.getPlantillas({ activo: true }).then(d => setPlantillas(d || [])).catch(()=>{});
  }, []);

  useEffect(() => {
    setFiltros((prev) => ({ ...prev, pedido_id: initialPedidoId || "" }));
    if (initialPedidoId) setPage(1);
  }, [initialPedidoId]);

  useEffect(() => {
    setEstadoActivo(initialEstado);
    setPage(1);
  }, [initialEstado]);

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
    
    if (f.etiqueta_id !== "TODOS") payload.etiqueta_id = f.etiqueta_id;
    if (f.plantilla_id !== "TODOS") payload.plantilla_id = f.plantilla_id;
    if (f.seguimiento_responsable_id !== "TODOS") payload.seguimiento_responsable_id = f.seguimiento_responsable_id;
    if (f.seguimiento_pendiente) payload.seguimiento_pendiente = f.seguimiento_pendiente;
    if (f.seguimiento_vencido) payload.seguimiento_vencido = f.seguimiento_vencido;

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
      if (!soloAbastecimiento && estado === TAB_ABASTECIMIENTO_ID) {
        payload.abastecimiento_estado = "pagado";
      } else if (!soloAbastecimiento && estado) {
        payload.estados = [estado];
      }
      const res = await getEnviosPaginados(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, [construirPayloadBase, soloAbastecimiento]);

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
  }, [construirPayloadBase, soloAbastecimiento]);

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

  const cargarConteos = useCallback(async (f) => {
    try {
      const payload = construirPayloadBase(f, { incluirFiltroAbastecimiento: false });
      const res = soloAbastecimiento
        ? await getConteoPorAbastecimiento(payload)
        : await getConteoPorEstado(payload);
      setConteos(res || {});
    } catch (err) {
      console.error("Error cargando conteo por estado:", err);
    }
  }, [construirPayloadBase, soloAbastecimiento]);

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

  const timerRef = useRef(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      cargar(filtros, page, estadoActivo);
      cargarConteos(filtros);
      if (estadoActivo === "Entregado") {
        cargarResumenEntregados(filtros);
      } else {
        setResumenEntregados(null);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [filtros, page, estadoActivo, refrescarKey, cargar, cargarConteos, cargarResumenEntregados]);

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
    if (estado === "Confirmado") {
      setModalAbastecimientoDismissedKey(null);
    }
    setEstadoActivo(estado);
    setTimelineExpandidoId(null);
    setPage(1);
  };

  const handleSelectAbastecimientoEstado = (estado) => {
    setAbastecimientoEstadoActivo(estado);
    setModalAbastecimientoDismissedKey(null);
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
    if (accion.tipo === "pagar_abastecimiento") {
      onPagarAbastecimiento?.(item);
      return;
    }
    if (accion.tipo === "validar_pago") {
      onValidarPagoAbastecimiento?.(item);
      return;
    }
    if (accion.tipo === "rechazar_pago") {
      onRechazarPagoAbastecimiento?.(item);
      return;
    }
    if (accion.tipo === "pago_rechazado") {
      onPagarAbastecimiento?.(item);
      return;
    }
    if (accion.tipo === "abastecimiento_avanzar") {
      onAvanzarAbastecimiento?.(item);
      return;
    }
    if (accion.tipo === "confirmar_recepcion_deposito") {
      onConfirmarRecepcionAbastecimiento?.(item);
      return;
    }
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
    filtros.etiqueta_id !== "TODOS" && { key: "etiqueta_id", label: "Etiqueta aplicada", reset: "TODOS" },
    filtros.plantilla_id !== "TODOS" && { key: "plantilla_id", label: "Plantilla aplicada", reset: "TODOS" },
    filtros.seguimiento_pendiente && { key: "seguimiento_pendiente", label: "Seguimiento pendiente", reset: false },
    filtros.seguimiento_vencido && { key: "seguimiento_vencido", label: "Seguimiento vencido", reset: false },
  ].filter(Boolean);
  const esAdmin = usuarioActual?.rol === "administrador";
  const esTabAbastecimiento = !soloAbastecimiento && estadoActivo === TAB_ABASTECIMIENTO_ID;
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
  const tableColSpan = soloAbastecimiento ? 9 : 10;
  const pagosAbastecimientoPendientes = envios.filter((e) => e.accion_siguiente?.tipo === "pagar_abastecimiento");
  const totalAbastecimientoPendiente = pagosAbastecimientoPendientes.reduce(
    (acc, e) => acc + (Number(e.abastecimiento_costo) || 0),
    0
  );
  const abastecimientoModalKey = pagosAbastecimientoPendientes.map((e) => e.id).sort((a, b) => a - b).join("-");
  const primerPagoPendiente = pagosAbastecimientoPendientes[0] || null;

  useEffect(() => {
    if (
      !soloAbastecimiento &&
      usuarioActual?.rol !== "administrador" &&
      estadoActivo === "Confirmado" &&
      !loading &&
      pagosAbastecimientoPendientes.length > 0 &&
      abastecimientoModalKey &&
      modalAbastecimientoDismissedKey !== abastecimientoModalKey
    ) {
      setModalAbastecimientoOpen(true);
    }
  }, [
    estadoActivo,
    soloAbastecimiento,
    usuarioActual,
    loading,
    pagosAbastecimientoPendientes.length,
    abastecimientoModalKey,
    modalAbastecimientoDismissedKey,
  ]);

  const cerrarModalAbastecimiento = () => {
    setModalAbastecimientoDismissedKey(abastecimientoModalKey);
    setModalAbastecimientoOpen(false);
  };

  const pagarDesdeModalAbastecimiento = () => {
    if (!primerPagoPendiente) return;
    cerrarModalAbastecimiento();
    handleAccionSiguiente(primerPagoPendiente, primerPagoPendiente.accion_siguiente);
  };

  return (
    <div className="pt-root">
      {!soloAbastecimiento && modalAbastecimientoOpen && primerPagoPendiente && (
        <div className="pt-payment-modal-backdrop" role="presentation">
          <div
            className="pt-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-payment-modal-title"
          >
            <button
              type="button"
              className="pt-payment-modal__close"
              onClick={cerrarModalAbastecimiento}
              aria-label="Cerrar aviso de abastecimiento"
            >
              <X size={18} />
            </button>

            <div className="pt-payment-modal__icon">
              <CreditCard size={28} />
            </div>

            <div className="pt-payment-modal__content">
              <span className="pt-payment-modal__eyebrow">Acción requerida</span>
              <h2 id="pt-payment-modal-title">Tenés pedidos que pagar</h2>
              <p>
                Hay {pagosAbastecimientoPendientes.length} pedido{pagosAbastecimientoPendientes.length === 1 ? "" : "s"} confirmado{pagosAbastecimientoPendientes.length === 1 ? "" : "s"} con abastecimiento pendiente por {formatGs(totalAbastecimientoPendiente)}.
              </p>
              <p className="pt-payment-modal__warning">
                Tenés 24 horas para pagar. Gesicom recién procesa el abastecimiento cuando el pago esté acreditado.
              </p>
            </div>

            <div className="pt-payment-modal__actions">
              <button type="button" className="pt-payment-modal__secondary" onClick={cerrarModalAbastecimiento}>
                Ver pedidos
              </button>
              <button type="button" className="pt-payment-modal__primary" onClick={pagarDesdeModalAbastecimiento}>
                Pagar abastecimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {!soloAbastecimiento && (
        <div className="pt-viewbar">
          <div className="pt-viewbar-copy">
            <strong>Pedidos</strong>
            <span>{loading ? "Cargando..." : `${totalPedidosVista.toLocaleString("es-PY")} pedido${totalPedidosVista === 1 ? "" : "s"}`}</span>
          </div>

          <div className="pt-view-switch" role="group" aria-label="Cambiar vista de pedidos">
            <button
              type="button"
              className={vista === "tabla" ? "active" : ""}
              onClick={() => setVista("tabla")}
            >
              <Table2 size={15} />
              Tabla
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
      ) : estaEnKanban ? (
        <div className="pt-kanban-context" role="note">
          <Columns3 size={16} />
          <div>
            <strong>Estás viendo el flujo completo.</strong>
            <span>Los estados viven en las columnas del tablero; los filtros de búsqueda, ciudad, fechas y courier siguen aplicando.</span>
          </div>
        </div>
      ) : (
        <section className="pt-status-shell" aria-label="Bandejas por estado">
          <div className="pt-status-tabs" role="tablist" aria-label="Estados del pedido">
            {STATUS_ORDER.map((st) => {
              const cfg = STATUS[st] || {};
              const active = estadoActivo === st;
              const isEnSeguimiento = st === "EnSeguimiento";
              const vencidosSeguimiento = Number(conteos?.seguimiento_vencidos) || 0;
              const tieneAlertas = isEnSeguimiento && vencidosSeguimiento > 0;
              const label = STATUS_COMPACT_LABEL[st] || cfg.label || st;

              return [
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelectEstado(st)}
                  className={`pt-status-chip ${active ? "active" : ""} ${tieneAlertas ? "has-alert" : ""}`}
                  title={cfg.label || st}
                  style={active ? { borderColor: cfg.chipText, background: cfg.chipBg, color: cfg.chipText } : undefined}
                >
                  <span className="pt-status-chip__label">{label}</span>
                  <strong className="pt-status-chip__count">{conteos[st] ?? 0}</strong>
                  {tieneAlertas && (
                    <span
                      title={`${vencidosSeguimiento} seguimiento(s) pendientes de contactar`}
                      style={{
                        background: "var(--color-danger)",
                        color: "#ffffff",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                        boxShadow: "0 0 6px color-mix(in srgb, var(--color-danger) 60%, transparent)",
                      }}
                      className="vencido-pulse"
                    >
                      <Clock size={10} />
                      {vencidosSeguimiento}
                    </span>
                  )}
                </button>,
                st === "Confirmado" && (
                  <button
                    key="abastecimiento-seguimiento-tab"
                    type="button"
                    onClick={() => handleSelectEstado(TAB_ABASTECIMIENTO_ID)}
                    className={`pt-status-chip ${estadoActivo === TAB_ABASTECIMIENTO_ID ? "active" : ""}`}
                    style={estadoActivo === TAB_ABASTECIMIENTO_ID ? { borderColor: TAB_ABASTECIMIENTO_CFG.chipText, background: TAB_ABASTECIMIENTO_CFG.chipBg, color: TAB_ABASTECIMIENTO_CFG.chipText } : undefined}
                  >
                    <span className="pt-status-chip__label">{TAB_ABASTECIMIENTO_CFG.label}</span>
                    <strong className="pt-status-chip__count">{conteos.abastecimiento_pagado ?? 0}</strong>
                  </button>
                ),
              ];
            })}
          </div>
        </section>
      )}

      {!soloAbastecimiento && (
        <div className={`pt-ops-summary ${estadoActivo === "Entregado" && resumenEntregados ? "pt-ops-summary--story" : ""}`} aria-label="Resumen financiero de pedidos">
          <div className="pt-ops-summary__header">
            <span>{estadoActivo === "Entregado" && resumenEntregados ? "Resumen de entregados" : "Resumen operativo"}</span>
            <strong>{formatGs(totalVisibleACobrar)} por cobrar · {formatGs(totalCobrado)} cobrado</strong>
          </div>

          {estadoActivo === "Entregado" && resumenEntregados ? (
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

      {!soloAbastecimiento && estadoActivo === "Confirmado" && pagosAbastecimientoPendientes.length > 0 && (
        <div className="pt-payment-alert" role="alert">
          <div className="pt-payment-alert__icon">
            <CreditCard size={18} />
          </div>
          <div className="pt-payment-alert__body">
            <strong>Tenés que pagar abastecimiento para procesar estos pedidos.</strong>
            <span>
              {pagosAbastecimientoPendientes.length} pedido{pagosAbastecimientoPendientes.length === 1 ? "" : "s"} · {formatGs(totalAbastecimientoPendiente)} pendientes. Tenés 24 horas para pagar; Gesicom procesa el pedido recién cuando el pago esté acreditado.
            </span>
          </div>
        </div>
      )}

      {/* ── Toolbar de filtros principales ── */}
      <div className="pt-toolbar" style={{ marginTop: "0.75rem" }}>
        <div className="pt-search-wrap" style={{ flex: "0 0 160px" }}>
          <Package size={14} className="pt-search-icon" />
          <input
            type="text"
            className="pt-search"
            placeholder="Nro. pedido..."
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
          <div className="pt-search-wrap" style={{ flex: "0 0 150px" }}>
            <Hash size={14} className="pt-search-icon" />
            <input
              type="text"
              className="pt-search"
              placeholder="ID interno..."
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
        <div className="pt-search-wrap">
          <Search size={14} className="pt-search-icon" />
          <input
            type="text"
            className="pt-search"
            placeholder="Buscar cliente, teléfono..."
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
        <div className="pt-search-wrap" style={{ flex: "0 0 auto", minWidth: "140px" }}>
          <MapPin size={14} className="pt-search-icon" style={{ color: "var(--color-fg-subtle)" }} />
          <input
            type="text"
            className="pt-search"
            placeholder="Ciudad..."
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
        <label className="pt-date-label" title="Fecha desde">
          <span style={{ fontSize: "0.72rem", color: "var(--color-fg-subtle)", whiteSpace: "nowrap" }}>Desde</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltro("fecha_desde", e.target.value)}
          />
        </label>

        {/* Fecha hasta */}
        <label className="pt-date-label" title="Fecha hasta">
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
          onClick={() => setMasFilters((o) => !o)}
        >
          <SlidersHorizontal size={14} />
          Más filtros
          {filtrosSecundariosActivos.length > 0 && <span className="pt-filter-dot" />}
        </button>

        {/* Reset */}
        {hayFiltros && (
          <button type="button" className="pt-reset-btn" onClick={resetFiltros} title="Limpiar todo">
            <RotateCcw size={14} />
          </button>
        )}

        {/* Contador */}
        <span className="pt-count">
          {loading ? "…" : `${data.total.toLocaleString("es-PY")} pedidos`}
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
          
          {estadoActivo === "EnSeguimiento" && (
            <>
              <label className="pt-extra-label">
                <Tag size={13} />
                <select className="pt-filter-select" style={{ border: "none", padding: "0.4rem 0.5rem", background: "transparent" }} value={filtros.etiqueta_id} onChange={(e) => setFiltro("etiqueta_id", e.target.value)}>
                  <option value="TODOS">Todas las etiquetas</option>
                  {etiquetas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </label>
              <label className="pt-extra-label">
                <MessageCircle size={13} />
                <select className="pt-filter-select" style={{ border: "none", padding: "0.4rem 0.5rem", background: "transparent" }} value={filtros.plantilla_id} onChange={(e) => setFiltro("plantilla_id", e.target.value)}>
                  <option value="TODOS">Todas las plantillas</option>
                  {plantillas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </label>
              <label className="pt-extra-label" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input type="checkbox" checked={filtros.seguimiento_pendiente} onChange={e => setFiltro("seguimiento_pendiente", e.target.checked)} />
                <span style={{ fontSize: "0.8rem", color: "var(--color-fg)" }}>Seguimiento pendiente</span>
              </label>
              <label className="pt-extra-label" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input type="checkbox" checked={filtros.seguimiento_vencido} onChange={e => setFiltro("seguimiento_vencido", e.target.checked)} />
                <span style={{ fontSize: "0.8rem", color: "var(--color-fg)" }}>Seguimiento vencido</span>
              </label>
            </>
          )}
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
              onAbrirSeguimiento={onAbrirSeguimiento}
              onAbrirTimelineAbastecimiento={onAbrirTimelineAbastecimiento}
              onAccionSiguiente={handleAccionSiguiente}
              isAdmin={esAdmin}
            />
          )}
        </div>
      ) : (
      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th className="pt-th pt-th-id">#</th>
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
                  <th className="pt-th">Ciudad</th>
                </>
              )}
              <th className="pt-th pt-th-product">Producto / Oferta</th>
              <th className="pt-th pt-th-num">Total</th>
              {!soloAbastecimiento && <th className="pt-th pt-th-courier">Courier</th>}
              <th className="pt-th pt-th-state">Estado</th>
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
                    : estadoActivo === TAB_ABASTECIMIENTO_ID
                    ? "No hay pedidos con abastecimiento en seguimiento que coincidan con los filtros."
                    : `No hay pedidos en "${estadoActivo}" que coincidan con los filtros.`}
                </td>
              </tr>
            ) : (
              envios.map((e) => {
                const items = e.items || [];
                const resumenItems =
                  items.length === 0
                    ? "—"
                    : items.length === 1
                    ? `${items[0].nombre_producto}${items[0].oferta_nombre ? ` — ${items[0].oferta_nombre}` : ""}${
                        items[0].cantidad > 1 ? ` x${items[0].cantidad}` : ""
                      }`
                    : `${items[0].nombre_producto} +${items.length - 1} más`;

                const { fecha: fechaVisual, hora: horaVisual } = formatFechaYHora(
                  e.dispatchedAt || e.fecha,
                  e.hora,
                  e.createdAt
                );
                const whatsappLink = getWhatsappLink(e);
                const nombreCliente = [e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") || e.cliente || "cliente";

                return [
                  <tr
                    key={e.id}
                    className="pt-row"
                    onClick={() => {
                      // Dentro de la pestaña de abastecimiento el clic en la
                      // fila abre el seguimiento, no el editor del pedido.
                      if (esTabAbastecimiento) {
                        setTimelineExpandidoId((prev) => (prev === e.id ? null : e.id));
                        return;
                      }
                      onAbrirDetalle && onAbrirDetalle(e);
                    }}
                  >
                    <td className="pt-td pt-td-id" data-label="Pedido">
                      <span>#{numeroPedidoVisible(e)}</span>
                      {esAdmin && Number(e.id) !== Number(e.numero_pedido) && (
                        <span style={{ display: "block", marginTop: "2px", color: "var(--color-fg-subtle)", fontSize: "0.68rem", fontWeight: 600 }}>
                          ID {e.id}
                        </span>
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
                        <td className="pt-td" data-label="Cliente">
                          <span className="pt-cliente-nombre">
                            {[e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") ||
                              e.cliente ||
                              "—"}
                          </span>
                        </td>
                        <td className="pt-td" data-label="Teléfono">
                          <span className="pt-phone-cell" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span>{e.telefono || "—"}</span>
                            {e.recordatorio_vencido ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  background: "color-mix(in srgb, var(--color-danger) 18%, transparent)",
                                  color: "var(--color-danger)",
                                  border: "1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Seguimiento vencido: ${e.recordatorio_ejecutar_en ? new Date(e.recordatorio_ejecutar_en).toLocaleString('es-PY') : 'Requiere contacto urgente'}`}
                              >
                                <Clock size={10} /> Contactar
                              </span>
                            ) : e.recordatorio_estado === 'PENDIENTE' && e.recordatorio_ejecutar_en ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  background: "color-mix(in srgb, var(--color-info) 10%, transparent)",
                                  color: "var(--color-info)",
                                  border: "1px solid color-mix(in srgb, var(--color-info) 25%, transparent)",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Próximo contacto: ${new Date(e.recordatorio_ejecutar_en).toLocaleString('es-PY')}`}
                              >
                                <Clock size={10} /> {new Date(e.recordatorio_ejecutar_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : null}
                            {e.telefono && onAbrirSeguimiento && (
                              <button
                                type="button"
                                className={`pt-whatsapp-action ${e.recordatorio_vencido ? "vencido-pulse" : ""}`}
                                title={`Seguimiento por WhatsApp a ${e.telefono}${e.recordatorio_vencido ? ' (Requiere contacto)' : ''}`}
                                aria-label={`Seguimiento por WhatsApp a ${nombreCliente}`}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  onAbrirSeguimiento(e);
                                }}
                                style={e.recordatorio_vencido ? {
                                  borderColor: "var(--color-danger)",
                                  background: "color-mix(in srgb, var(--color-danger) 22%, transparent)",
                                  color: "var(--color-danger)",
                                  boxShadow: "0 0 8px color-mix(in srgb, var(--color-danger) 40%, transparent)",
                                } : undefined}
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
                          </span>
                        </td>
                        <td className="pt-td pt-td-ciudad" data-label="Ciudad">
                          <span>{e.ciudad || "—"}</span>
                          {e.departamento && <span className="pt-depto">{e.departamento}</span>}
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
                      <span>{formatGs(e.monto)}</span>
                      {e.costo_envio > 0 && (
                        <span className="pt-delivery">+{formatGs(e.costo_envio)}</span>
                      )}
                    </td>
                    {!soloAbastecimiento && (
                    <td className="pt-td" data-label="Courier">
                      {e.Courier ? (
                        <span className="pt-courier">{e.Courier.nombre}</span>
                      ) : (
                        <span className="pt-sin-courier">—</span>
                      )}
                    </td>
                    )}
                    <td className="pt-td" data-label="Estado" onClick={(ev) => ev.stopPropagation()}>
                      <EstadoBadgeDropdown
                        estado={e.estado}
                        onChange={(nuevoEstado) => handleItemEstadoChange(e, nuevoEstado)}
                      />
                      {!soloAbastecimiento && e.abastecimiento_estado && e.abastecimiento_estado !== "no_requiere" && (
                        <div style={{ marginTop: 4 }} onClick={(ev) => ev.stopPropagation()}>
                          <AbastecimientoBadge envio={e} onAbrirTimeline={onAbrirTimelineAbastecimiento} />
                        </div>
                      )}
                    </td>
                    {soloAbastecimiento && (
                      <td className="pt-td" data-label="Abastecimiento">
                        <AbastecimientoBadge envio={e} onAbrirTimeline={onAbrirTimelineAbastecimiento} />
                      </td>
                    )}
                    <td className="pt-td" data-label="Acción" onClick={(ev) => ev.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <AccionPrincipal
                          envio={e}
                          isAdmin={esAdmin}
                          onAbrirDetalle={onAbrirDetalle}
                          onAbrirResumen={onAbrirResumen}
                          onAccionSiguiente={handleAccionSiguiente}
                        />
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
                        {onAbrirTimelineAbastecimiento && e.abastecimiento_estado && e.abastecimiento_estado !== "no_requiere" && (
                          <button
                            type="button"
                            title="Ver seguimiento de abastecimiento"
                            style={{ ...accionBtnStyle, padding: "4px 6px" }}
                            onClick={() => onAbrirTimelineAbastecimiento(e)}
                          >
                            <Truck size={13} />
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
