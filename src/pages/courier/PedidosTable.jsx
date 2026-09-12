import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User, MessageCircle, ClipboardList, Eye, Package, CreditCard, History, Hash,
} from "lucide-react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";
import { getEnviosPaginados, getConteoPorEstado, getConteoPorAbastecimiento, getResumenEntregados, getMetodosPago, deleteEnvio } from "../../services/courierApi";
import { canalVentaService } from "../../services/canalVentaService";
import { verificarSesion } from "../../utils/auth";
import { numeroPedidoVisible } from "./pedidoNumero";


const LIMITE = 10;

const ABASTECIMIENTO_TABS = [
  { id: "en_proceso", label: "Pagados", description: "Pago acreditado, falta recibir mercadería" },
  { id: "pendiente_pago", label: "Pendientes de pago", description: "La tienda todavía debe pagar" },
  { id: "recibido", label: "Recibidos", description: "Mercadería recibida en depósito" },
  { id: "TODOS", label: "Todos", description: "Todos los pedidos con abastecimiento" },
];

const ABASTECIMIENTO_META = {
  pendiente_pago: { label: "Pendiente de pago", tone: "danger" },
  en_proceso: { label: "Pagado", tone: "info" },
  recibido: { label: "Recibido", tone: "success" },
};

// Transiciones que necesitan datos adicionales (fecha, método de pago,
// detalle por producto) — se resuelven en un modal dedicado, nunca con un
// PATCH directo del dropdown. Ver plan Gestión de Pedidos, sección 42.
const ESTADOS_CON_MODAL = { Reprogramado: "reprogramar", Entregado: "entregar", Devuelto: "devolver", Perdido: "perder" };

const TRANSICIONES_VALIDAS_FRONTEND = {
  Pendiente: ['Confirmado', 'Cancelado'],
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

function AbastecimientoBadge({ envio }) {
  const meta = ABASTECIMIENTO_META[envio?.abastecimiento_estado] || { label: "Sin abastecimiento", tone: "neutral" };
  const fechaPago = formatFechaCorta(envio?.abastecimiento_pagado_at);
  const fechaRecibido = formatFechaCorta(envio?.abastecimiento_recibido_at);
  const detalleFecha = envio?.abastecimiento_estado === "recibido" ? fechaRecibido : fechaPago;

  return (
    <div className="pt-abastecimiento-cell">
      <span className={`pt-abastecimiento-badge pt-abastecimiento-badge--${meta.tone}`}>
        {meta.label}
      </span>
      <span className="pt-abastecimiento-meta">
        {formatGs(envio?.abastecimiento_costo || 0)}
        {detalleFecha ? ` · ${detalleFecha}` : ""}
      </span>
    </div>
  );
}

function ResumenItem({ label, value, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ color: "var(--color-fg-muted)" }}>{label}:</span>
      <strong style={{ color: color || "var(--color-fg)" }}>{value}</strong>
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
  if (accion?.tipo === "abastecimiento_en_proceso") {
    if (isAdmin) {
      return (
        <button
          type="button"
          className="pt-next-action pt-next-action--success"
          title="Marcar que la mercadería ya llegó al depósito"
          onClick={(e) => {
            e.stopPropagation();
            onAccionSiguiente?.(envio, accion);
          }}
        >
          <Package size={13} /> Marcar recibido
        </button>
      );
    }
    return (
      <span className="pt-next-pill pt-next-pill--info" title={accion.descripcion}>
        <Package size={13} /> {accion.titulo}
      </span>
    );
  }
  if (accion?.tipo === "pagar_abastecimiento") {
    return (
      <button
        type="button"
        className={`pt-next-action pt-next-action--${accion.tono || "danger"}`}
        title={accion.descripcion}
        onClick={(e) => {
          e.stopPropagation();
          onAccionSiguiente?.(envio, accion);
        }}
      >
        <CreditCard size={13} /> {isAdmin ? "Acreditar pago" : accion.cta}
      </button>
    );
  }
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
  onAdminAbastecimiento,
  onAbrirDetalle,
  onAccionEspecial,
  onAbrirResumen,
  onAbrirHistorial,
  refrescarKey = 0,
  initialPedidoId = "",
  initialEstado = "Pendiente",
  soloAbastecimiento = false,
  initialAbastecimientoEstado = "en_proceso",
}) {
  const filtrosBase = useMemo(() => ({ ...FILTROS_VACIOS, pedido_id: initialPedidoId || "" }), [initialPedidoId]);
  const [estadoActivo, setEstadoActivo] = useState(initialEstado);
  const [abastecimientoEstadoActivo, setAbastecimientoEstadoActivo] = useState(initialAbastecimientoEstado);
  const [filtros, setFiltros] = useState(() => filtrosBase);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, totalPages: 1 });
  const [conteos, setConteos] = useState({});
  const [resumenEntregados, setResumenEntregados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masFilters, setMasFilters] = useState(false);
  const [metodosPagoList, setMetodosPagoList] = useState([]);
  const [canalesVenta, setCanalesVenta] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modalAbastecimientoOpen, setModalAbastecimientoOpen] = useState(false);
  const [modalAbastecimientoDismissedKey, setModalAbastecimientoDismissedKey] = useState(null);

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
      if (!soloAbastecimiento && estado) {
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

    if (onChangeEstado) {
      onChangeEstado(item.id, nuevoEstado, item);
    }
  };

  const handleAccionSiguiente = (item, accion) => {
    if (accion.tipo === "pagar_abastecimiento") {
      if (usuarioActual?.rol === "administrador") {
        onAdminAbastecimiento?.(item, "acreditar_pago");
      } else {
        onPagarAbastecimiento?.(item);
      }
      return;
    }
    if (accion.tipo === "abastecimiento_en_proceso") {
      if (usuarioActual?.rol === "administrador") {
        onAdminAbastecimiento?.(item, "recibir");
      }
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

  const hayFiltros = Object.entries(filtros).some(([, v]) => v !== "" && v !== "TODOS");
  const esAdmin = usuarioActual?.rol === "administrador";

  const envios = data.data || [];
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
                {usuarioActual?.rol === "administrador" ? "Acreditar pago" : "Pagar abastecimiento"}
              </button>
            </div>
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
      ) : (
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
          {STATUS_ORDER.map((st) => {
            const cfg = STATUS[st] || {};
            const active = estadoActivo === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => handleSelectEstado(st)}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "999px",
                  border: active ? `1px solid ${cfg.chipText}` : "1px solid var(--color-border)",
                  background: active ? cfg.chipBg : "var(--color-surface-2)",
                  color: active ? cfg.chipText : "var(--color-fg-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  flexShrink: 0,
                }}
              >
                {st}
                <span style={{ opacity: 0.7, fontWeight: 500 }}>({conteos[st] ?? 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Resumen financiero minimalista — solo en Entregados (plan sección 22) ── */}
      {estadoActivo === "Entregado" && resumenEntregados && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.7rem 1rem",
            borderRadius: "0.6rem",
            background: "color-mix(in srgb, var(--color-fg) 3%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.4rem 1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <ResumenItem label="Entregado" value={`${resumenEntregados.entregado.cantidad} · ${formatGs(resumenEntregados.entregado.monto_total)}`} />
          <ResumenItem label="En poder del courier pendiente" value={formatGs(resumenEntregados.dinero_courier)} />
          <ResumenItem label="Cobrado por la tienda" value={formatGs(resumenEntregados.cobrado_directo)} />
          <ResumenItem label="Costo de courier pendiente" value={formatGs(resumenEntregados.costo_total_courier)} />
          <ResumenItem
            label="Saldo de liquidación"
            value={
              resumenEntregados.saldo_liquidacion > 0
                ? `Courier debe tienda: ${formatGs(resumenEntregados.saldo_liquidacion)}`
                : resumenEntregados.saldo_liquidacion < 0
                ? `Tienda debe courier: ${formatGs(Math.abs(resumenEntregados.saldo_liquidacion))}`
                : "Equilibrado"
            }
            color={resumenEntregados.saldo_liquidacion > 0 ? "var(--color-success)" : resumenEntregados.saldo_liquidacion < 0 ? "var(--color-danger)" : "var(--color-fg-muted)"}
          />
          <ResumenItem label="Pendientes de rendición" value={String(resumenEntregados.pendientes_rendicion)} />

          {resumenEntregados.desglose_metodo_pago.length > 0 && (
            <div style={{ width: "100%", borderTop: "1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)", marginTop: "0.3rem", paddingTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.3rem 1.2rem", color: "var(--color-fg-muted)" }}>
              {resumenEntregados.desglose_metodo_pago.map((d) => (
                <span key={d.metodo_pago}>{d.metodo_pago}: <strong style={{ color: "var(--color-fg)" }}>{formatGs(d.monto)}</strong></span>
              ))}
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

        {/* Más filtros toggle */}
        <button
          type="button"
          className={`pt-filter-toggle ${masFilters ? "active" : ""}`}
          onClick={() => setMasFilters((o) => !o)}
        >
          <Filter size={14} />
          Más
          {(filtros.courier_id !== "TODOS" || filtros.canal_venta_id !== "TODOS" || filtros.confirmador || filtros.producto.trim() || filtros.metodo_pago_id !== "TODOS") && (
            <span className="pt-filter-dot" />
          )}
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

      {/* ── Filtros extra ── */}
      {masFilters && (
        <div className="pt-extra-filters">
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
              <th className="pt-th">Producto / Oferta</th>
              <th className="pt-th pt-th-num">Total</th>
              {!soloAbastecimiento && <th className="pt-th">Courier</th>}
              <th className="pt-th">Estado</th>
              {soloAbastecimiento && <th className="pt-th">Abastecimiento</th>}
              <th className="pt-th">Acción</th>
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

                return (
                  <tr
                    key={e.id}
                    className="pt-row"
                    onClick={() => onAbrirDetalle && onAbrirDetalle(e)}
                  >
                    <td className="pt-td pt-td-id">
                      <span>#{numeroPedidoVisible(e)}</span>
                      {esAdmin && Number(e.id) !== Number(e.numero_pedido) && (
                        <span style={{ display: "block", marginTop: "2px", color: "var(--color-fg-subtle)", fontSize: "0.68rem", fontWeight: 600 }}>
                          ID {e.id}
                        </span>
                      )}
                    </td>
                    <td className="pt-td pt-td-fecha">
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
                        <td className="pt-td pt-td-ciudad">
                          <span>{e.Usuario?.Tienda?.deposito_direccion || "Sin dirección cargada"}</span>
                          <span className="pt-depto">
                            {[e.Usuario?.Tienda?.deposito_ciudad, e.Usuario?.Tienda?.deposito_departamento].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </td>
                        <td className="pt-td">
                          <span>{e.Usuario?.Tienda?.deposito_telefono || e.Usuario?.Tienda?.whatsapp || "—"}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="pt-td">
                          <span className="pt-cliente-nombre">
                            {[e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") ||
                              e.cliente ||
                              "—"}
                          </span>
                        </td>
                        <td className="pt-td">
                          <span className="pt-phone-cell">
                            <span>{e.telefono || "—"}</span>
                            {whatsappLink && (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pt-whatsapp-action"
                                title={`Escribir por WhatsApp a ${e.telefono}`}
                                aria-label={`Escribir por WhatsApp a ${nombreCliente}`}
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </span>
                        </td>
                        <td className="pt-td pt-td-ciudad">
                          <span>{e.ciudad || "—"}</span>
                          {e.departamento && <span className="pt-depto">{e.departamento}</span>}
                        </td>
                      </>
                    )}
                    <td
                      className="pt-td pt-td-items"
                      title={items.map((i) => `${i.nombre_producto} x${i.cantidad}`).join(", ")}
                    >
                      {resumenItems}
                    </td>
                    <td className="pt-td pt-td-num">
                      <span>{formatGs(e.monto)}</span>
                      {e.costo_envio > 0 && (
                        <span className="pt-delivery">+{formatGs(e.costo_envio)}</span>
                      )}
                    </td>
                    {!soloAbastecimiento && (
                    <td className="pt-td">
                      {e.Courier ? (
                        <span className="pt-courier">{e.Courier.nombre}</span>
                      ) : (
                        <span className="pt-sin-courier">—</span>
                      )}
                    </td>
                    )}
                    <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                      <EstadoBadgeDropdown
                        estado={e.estado}
                        onChange={(nuevoEstado) => handleItemEstadoChange(e, nuevoEstado)}
                      />
                    </td>
                    {soloAbastecimiento && (
                      <td className="pt-td">
                        <AbastecimientoBadge envio={e} />
                      </td>
                    )}
                    <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      {data.totalPages > 1 && (
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
