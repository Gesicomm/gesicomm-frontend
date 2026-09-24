import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  History,
  MapPin,
  Package,
  PackageSearch,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  getEnviosPaginados,
  validarPagoAbastecimiento,
  rechazarPagoAbastecimiento,
  avanzarAbastecimiento,
} from "../../services/courierApi";
import { numeroPedidoVisible } from "./pedidoNumero";

const LIMITE = 12;

const LANES = [
  {
    id: "pendiente_pago",
    label: "Pendiente de pago",
    description: "La tienda todavía debe pagar el abastecimiento",
    dot: "ab-dot-danger",
    empty: "Sin pagos pendientes",
  },
  {
    id: "pago_rechazado",
    label: "Pago rechazado",
    description: "Comprobante rechazado, esperando reenvío",
    dot: "ab-dot-danger",
    empty: "Sin comprobantes rechazados",
  },
  {
    id: "pago_enviado",
    label: "A validar",
    description: "Comprobante subido por la tienda, esperando validación del admin",
    dot: "ab-dot-warning",
    empty: "Sin comprobantes para validar",
  },
  {
    id: "pago_validado",
    label: "Pago validado",
    description: "Pago aprobado, listo para gestionar proveedor",
    dot: "ab-dot-info",
    empty: "Sin pagos validados",
  },
  {
    id: "proveedor_contactado",
    label: "Proveedor contactado",
    description: "Proveedor contactado, esperando despacho",
    dot: "ab-dot-info",
    empty: "Sin proveedores contactados",
  },
  {
    id: "enviado_por_proveedor",
    label: "Enviado por proveedor",
    description: "El proveedor ya despachó la mercadería",
    dot: "ab-dot-info",
    empty: "Sin envíos del proveedor",
  },
  {
    id: "en_transito_a_gesicomm",
    label: "En tránsito a Gesicom",
    description: "Mercadería viajando hacia Gesicom",
    dot: "ab-dot-info",
    empty: "Sin traslados a Gesicom",
  },
  {
    id: "recibido_en_gesicomm",
    label: "Recibido en Gesicom",
    description: "Mercadería recibida, pendiente de salida",
    dot: "ab-dot-info",
    empty: "Sin recepciones en Gesicomm",
  },
  {
    id: "preparando_envio_a_deposito_cliente",
    label: "Preparando envío",
    description: "Gesicomm prepara el envío al depósito",
    dot: "ab-dot-info",
    empty: "Sin envíos en preparación",
  },
  {
    id: "despachado_a_deposito_cliente",
    label: "Despachado a depósito",
    description: "Mercadería despachada hacia el depósito",
    dot: "ab-dot-info",
    empty: "Sin despachos a depósito",
  },
  {
    id: "en_transito_a_deposito_cliente",
    label: "En tránsito a depósito",
    description: "Mercadería viajando al depósito del comercio",
    dot: "ab-dot-info",
    empty: "Sin traslados a depósito",
  },
  {
    id: "recibido_en_deposito_cliente",
    label: "Recibido en depósito",
    description: "El comercio confirmó recepción",
    dot: "ab-dot-success",
    empty: "Sin recepciones en depósito",
  },
  {
    id: "disponible_en_gesicomm",
    label: "Disponible en Gesicom",
    description: "Stock disponible para preparar el pedido",
    dot: "ab-dot-success",
    empty: "Sin stock disponible",
  },
];

const FILTROS_VACIOS = {
  pedido_id: "",
  cliente: "",
  ciudad: "",
  producto: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const CTA_AVANZAR = {
  pago_validado: "Contactar proveedor",
  proveedor_contactado: "Marcar enviado por proveedor",
  enviado_por_proveedor: "Marcar en tránsito a Gesicom",
  en_transito_a_gesicomm: "Marcar recibido en Gesicom",
  preparando_envio_a_deposito_cliente: "Marcar despachado",
  despachado_a_deposito_cliente: "Marcar en tránsito",
};

const ESTADO_LABEL = {
  pendiente_pago: "Pendiente de pago",
  pago_rechazado: "Pago rechazado",
  pago_enviado: "Comprobante enviado",
  pago_validado: "Pago validado",
  proveedor_contactado: "Proveedor contactado",
  enviado_por_proveedor: "Enviado por proveedor",
  en_transito_a_gesicomm: "En tránsito a Gesicom",
  recibido_en_gesicomm: "Recibido en Gesicom",
  preparando_envio_a_deposito_cliente: "Preparando envío",
  despachado_a_deposito_cliente: "Despachado a depósito",
  en_transito_a_deposito_cliente: "En tránsito a depósito",
  recibido_en_deposito_cliente: "Recibido en depósito",
  disponible_en_gesicomm: "Disponible en Gesicom",
};

function estadoTone(estado) {
  if (["pendiente_pago", "pago_rechazado"].includes(estado)) return "danger";
  if (["recibido_en_deposito_cliente", "disponible_en_gesicomm"].includes(estado)) return "success";
  if (estado === "pago_enviado") return "warning";
  return "info";
}

function formatGs(valor) {
  const n = Math.max(0, Math.round(Number(valor) || 0));
  return `Gs. ${n.toLocaleString("es-PY")}`;
}

function formatFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ctaAvanzar(envio) {
  if (envio.abastecimiento_estado === "recibido_en_gesicomm") {
    return envio.tipo_logistica_abastecimiento === "PROPIA"
      ? "Iniciar preparación para envío"
      : "Marcar disponible en Gesicomm";
  }
  return CTA_AVANZAR[envio.abastecimiento_estado] || null;
}

function siguienteEstadoAdmin(envio) {
  const estado = envio?.abastecimiento_estado;
  if (estado === "pago_enviado") return "pago_validado";
  if (estado === "pago_validado") return "proveedor_contactado";
  if (estado === "proveedor_contactado") return "enviado_por_proveedor";
  if (estado === "enviado_por_proveedor") {
    return envio.ruta_abastecimiento === "DIRECTA" ? "en_transito_a_deposito_cliente" : "en_transito_a_gesicomm";
  }
  if (estado === "en_transito_a_gesicomm") return "recibido_en_gesicom";
  if (estado === "recibido_en_gesicomm") {
    return envio.tipo_logistica_abastecimiento === "PROPIA"
      ? "preparando_envio_a_deposito_cliente"
      : "disponible_en_gesicomm";
  }
  if (estado === "preparando_envio_a_deposito_cliente") return "despachado_a_deposito_cliente";
  if (estado === "despachado_a_deposito_cliente") return "en_transito_a_deposito_cliente";
  return null;
}

function nombreCliente(envio) {
  return [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "Cliente";
}

function resumenItems(envio) {
  const items = envio.items || [];
  if (items.length === 0) return "Sin producto";
  if (items.length === 1) {
    const item = items[0];
    return `${item.cantidad || 1}x ${item.nombre_producto || "Producto sin nombre"}`;
  }
  return `${items[0].cantidad || 1}x ${items[0].nombre_producto || "Producto sin nombre"} +${items.length - 1}`;
}

function buildEmptyColumns() {
  return LANES.reduce((acc, lane) => {
    acc[lane.id] = { data: [], total: 0, totalPages: 1, page: 1, loading: false };
    return acc;
  }, {});
}

function buildPayloadBase(filtros) {
  const payload = {};
  if (filtros.pedido_id.trim()) payload.pedido_id = filtros.pedido_id.replace(/#/g, "").trim();
  if (filtros.cliente.trim()) payload.cliente = filtros.cliente.trim();
  if (filtros.ciudad.trim()) payload.ciudad = filtros.ciudad.trim();
  if (filtros.producto.trim()) payload.producto_busqueda = filtros.producto.trim();
  if (filtros.fecha_desde) payload.fecha_desde = filtros.fecha_desde;
  if (filtros.fecha_hasta) payload.fecha_hasta = filtros.fecha_hasta;
  return payload;
}

export function AbastecimientoPanel({ onAbrirTimeline, refrescarKey = 0 }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [columns, setColumns] = useState(() => buildEmptyColumns());
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverLane, setDragOverLane] = useState(null);
  const boardRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  const payloadBase = useMemo(() => buildPayloadBase(filtros), [filtros]);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const respuestas = await Promise.all(
        LANES.map((lane) =>
          getEnviosPaginados({
            ...payloadBase,
            abastecimiento_estado_exacto: lane.id,
            page: 1,
            limit: LIMITE,
          })
        )
      );

      const nextColumns = buildEmptyColumns();
      LANES.forEach((lane, index) => {
        const res = respuestas[index] || {};
        nextColumns[lane.id] = {
          data: res.data || [],
          total: Number(res.total) || 0,
          totalPages: Number(res.totalPages) || 1,
          page: Number(res.page) || 1,
          loading: false,
        };
      });

      setColumns(nextColumns);
    } catch (err) {
      console.error("Error cargando tablero de abastecimiento:", err);
    } finally {
      setLoading(false);
    }
  }, [payloadBase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarTodo();
    }, 300);
    return () => clearTimeout(timer);
  }, [cargarTodo, refrescarKey]);

  const stopAutoScroll = () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tickAutoScroll = () => {
    const scroller = boardRef.current?.closest(".ab-kanban-wrap") || boardRef.current;
    if (!scroller || draggingId == null) {
      stopAutoScroll();
      return;
    }

    const rect = scroller.getBoundingClientRect();
    const { x, y } = pointerRef.current;
    const isVerticallyInside = y >= rect.top - 32 && y <= rect.bottom + 32;
    const edge = Math.min(120, Math.max(72, rect.width * 0.14));
    let delta = 0;

    if (isVerticallyInside && x > rect.right - edge) {
      delta = Math.ceil(((x - (rect.right - edge)) / edge) * 28);
    } else if (isVerticallyInside && x < rect.left + edge) {
      delta = -Math.ceil((((rect.left + edge) - x) / edge) * 28);
    }

    if (delta !== 0) scroller.scrollLeft += delta;
    rafRef.current = window.requestAnimationFrame(tickAutoScroll);
  };

  useEffect(() => {
    if (draggingId == null) {
      stopAutoScroll();
      return undefined;
    }

    const handleDragOver = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!rafRef.current) rafRef.current = window.requestAnimationFrame(tickAutoScroll);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", stopAutoScroll);
    window.addEventListener("dragend", stopAutoScroll);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", stopAutoScroll);
      window.removeEventListener("dragend", stopAutoScroll);
      stopAutoScroll();
    };
  }, [draggingId]);

  const cargarMas = async (laneId) => {
    const actual = columns[laneId];
    if (!actual || actual.loading || actual.page >= actual.totalPages) return;

    const siguientePage = actual.page + 1;
    setColumns((prev) => ({
      ...prev,
      [laneId]: { ...prev[laneId], loading: true },
    }));

    try {
      const res = await getEnviosPaginados({
        ...payloadBase,
        abastecimiento_estado_exacto: laneId,
        page: siguientePage,
        limit: LIMITE,
      });

      setColumns((prev) => ({
        ...prev,
        [laneId]: {
          data: [...(prev[laneId]?.data || []), ...(res.data || [])],
          total: Number(res.total) || 0,
          totalPages: Number(res.totalPages) || 1,
          page: Number(res.page) || siguientePage,
          loading: false,
        },
      }));
    } catch (err) {
      console.error("Error cargando más abastecimientos:", err);
      setColumns((prev) => ({
        ...prev,
        [laneId]: { ...prev[laneId], loading: false },
      }));
    }
  };

  const setFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const resetFiltros = () => setFiltros(FILTROS_VACIOS);

  const ejecutar = async (envioId, accion) => {
    setProcesandoId(envioId);
    try {
      await accion();
      await cargarTodo();
    } catch (err) {
      console.error("Error en acción de abastecimiento:", err);
      alert(err.response?.data?.error || err.message || "No se pudo completar la acción.");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleValidar = (envio) => ejecutar(envio.id, () => validarPagoAbastecimiento(envio.id));

  const handleRechazar = (envio) => {
    const motivo = window.prompt("Motivo del rechazo (obligatorio, lo ve la tienda):", "");
    if (!motivo) return;
    ejecutar(envio.id, () => rechazarPagoAbastecimiento(envio.id, motivo));
  };

  const handleAvanzar = (envio) => ejecutar(envio.id, () => avanzarAbastecimiento(envio.id));

  const findEnvioById = (id) => {
    for (const column of Object.values(columns)) {
      const found = (column.data || []).find((envio) => Number(envio.id) === Number(id));
      if (found) return found;
    }
    return null;
  };

  const puedeSoltarEn = (envio, laneId) => {
    if (!envio || envio.abastecimiento_estado === laneId) return false;
    if (envio.abastecimiento_estado === "pago_enviado") {
      return laneId === "pago_validado" || laneId === "pago_rechazado";
    }
    return siguienteEstadoAdmin(envio) === laneId;
  };

  const handleDropLane = (laneId) => {
    const envio = findEnvioById(draggingId);
    setDraggingId(null);
    setDragOverLane(null);
    if (!envio) return;
    if (!puedeSoltarEn(envio, laneId)) {
      alert(`Movimiento no permitido desde "${ESTADO_LABEL[envio.abastecimiento_estado] || envio.abastecimiento_estado}" hacia "${ESTADO_LABEL[laneId] || laneId}".`);
      return;
    }
    if (envio.abastecimiento_estado === "pago_enviado" && laneId === "pago_validado") {
      handleValidar(envio);
      return;
    }
    if (envio.abastecimiento_estado === "pago_enviado" && laneId === "pago_rechazado") {
      handleRechazar(envio);
      return;
    }
    handleAvanzar(envio);
  };

  const hayFiltros = Object.values(filtros).some((value) => value !== "");
  const total = LANES.reduce((acc, lane) => acc + (Number(columns[lane.id]?.total) || 0), 0);

  return (
    <div className="pt-root ab-admin-root">
      <div className="pt-abastecimiento-board">
        <div className="pt-abastecimiento-board__copy">
          <span>Abastecimiento Gesicom</span>
          <strong>Tablero de validación y seguimiento operativo</strong>
        </div>
        <div className="pt-abastecimiento-tabs" aria-label="Resumen de abastecimiento">
          {LANES.map((lane) => (
            <span key={lane.id} className="pt-abastecimiento-tab active" title={lane.description}>
              <span>{lane.label}</span>
              <strong>{columns[lane.id]?.total ?? 0}</strong>
            </span>
          ))}
          <span className="pt-abastecimiento-tab active" title="Todos los pedidos con abastecimiento">
            <span>Todos</span>
            <strong>{total}</strong>
          </span>
        </div>
      </div>

      <div className="pt-toolbar ab-toolbar">
        <div className="pt-search-wrap" style={{ flex: "0 0 170px" }}>
          <PackageSearch size={15} className="pt-search-icon" />
          <input
            className="pt-search"
            value={filtros.pedido_id}
            onChange={(e) => setFiltro("pedido_id", e.target.value)}
            placeholder="Nro. pedido..."
          />
          {filtros.pedido_id && (
            <button type="button" className="pt-clear-btn" onClick={() => setFiltro("pedido_id", "")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pt-search-wrap" style={{ flex: "1 1 260px" }}>
          <Search size={15} className="pt-search-icon" />
          <input
            className="pt-search"
            value={filtros.cliente}
            onChange={(e) => setFiltro("cliente", e.target.value)}
            placeholder="Buscar cliente, teléfono..."
          />
          {filtros.cliente && (
            <button type="button" className="pt-clear-btn" onClick={() => setFiltro("cliente", "")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pt-search-wrap" style={{ flex: "0 1 220px" }}>
          <MapPin size={15} className="pt-search-icon" />
          <input
            className="pt-search"
            value={filtros.ciudad}
            onChange={(e) => setFiltro("ciudad", e.target.value)}
            placeholder="Ciudad..."
          />
          {filtros.ciudad && (
            <button type="button" className="pt-clear-btn" onClick={() => setFiltro("ciudad", "")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pt-search-wrap" style={{ flex: "0 1 220px" }}>
          <Package size={15} className="pt-search-icon" />
          <input
            className="pt-search"
            value={filtros.producto}
            onChange={(e) => setFiltro("producto", e.target.value)}
            placeholder="Producto..."
          />
          {filtros.producto && (
            <button type="button" className="pt-clear-btn" onClick={() => setFiltro("producto", "")}>
              <X size={14} />
            </button>
          )}
        </div>

        <label className="pt-date-label">
          <Calendar size={14} />
          <span>Desde</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltro("fecha_desde", e.target.value)}
          />
        </label>

        <label className="pt-date-label">
          <Calendar size={14} />
          <span>Hasta</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltro("fecha_hasta", e.target.value)}
          />
        </label>

        {hayFiltros && (
          <button type="button" className="pt-reset-btn" onClick={resetFiltros} title="Limpiar filtros">
            <RotateCcw size={14} />
          </button>
        )}

        <span className="pt-count">{total} abastecimientos</span>
      </div>

      <div className="pt-kanban-wrap ab-kanban-wrap" aria-busy={loading}>
        <div ref={boardRef} className="ab-kanban-board">
          {LANES.map((lane) => {
            const column = columns[lane.id] || { data: [], total: 0, totalPages: 1, page: 1, loading: false };
            const draggingEnvio = findEnvioById(draggingId);
            const isOver = dragOverLane === lane.id;
            const canDrop = puedeSoltarEn(draggingEnvio, lane.id);
            return (
              <section
                key={lane.id}
                className={`ab-kanban-column ${isOver ? "is-over" : ""} ${isOver && !canDrop ? "is-invalid" : ""}`}
                aria-label={`Columna ${lane.label}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = canDrop ? "move" : "none";
                  if (dragOverLane !== lane.id) setDragOverLane(lane.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverLane(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDropLane(lane.id);
                }}
              >
                <div className="ab-kanban-header">
                  <div>
                    <h3>
                      <span className={`ab-kanban-dot ${lane.dot}`} />
                      {lane.label}
                    </h3>
                    <p>{lane.description}</p>
                  </div>
                  <strong>{column.total}</strong>
                </div>

                <div className="ab-kanban-cards">
                  {loading && column.data.length === 0 ? (
                    <div className="ab-empty">Cargando...</div>
                  ) : column.data.length === 0 ? (
                    <div className="ab-empty">{lane.empty}</div>
                  ) : (
                    column.data.map((envio) => (
                      <AbastecimientoCard
                        key={envio.id}
                        envio={envio}
                        procesando={procesandoId === envio.id}
                        dragging={draggingId === envio.id}
                        draggable={procesandoId !== envio.id}
                        onDragStart={() => setDraggingId(envio.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverLane(null);
                        }}
                        onValidar={handleValidar}
                        onRechazar={handleRechazar}
                        onAvanzar={handleAvanzar}
                        onAbrirTimeline={onAbrirTimeline}
                      />
                    ))
                  )}

                  {column.page < column.totalPages && (
                    <button
                      type="button"
                      className="ab-load-more"
                      disabled={column.loading}
                      onClick={() => cargarMas(lane.id)}
                    >
                      {column.loading ? "Cargando..." : `Cargar más (${column.data.length}/${column.total})`}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AbastecimientoCard({
  envio,
  procesando,
  dragging,
  draggable,
  onDragStart,
  onDragEnd,
  onValidar,
  onRechazar,
  onAvanzar,
  onAbrirTimeline,
}) {
  const estado = envio.abastecimiento_estado;
  const avanzarLabel = ctaAvanzar(envio);
  const fechaBase = envio.abastecimiento_pagado_at || envio.createdAt || envio.created_at || envio.fecha;
  const ubicacion = [envio.ciudad, envio.departamento].filter(Boolean).join(" · ");

  return (
    <article
      className={`ab-card ${dragging ? "dragging" : ""}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={() => onAbrirTimeline?.(envio)}
    >
      <div className="ab-card-top">
        <div>
          <span className="ab-order">#{numeroPedidoVisible(envio)}</span>
          <h4>{nombreCliente(envio)}</h4>
        </div>
        <span className={`ab-state ab-state--${estadoTone(estado)}`}>
          {ESTADO_LABEL[estado] || "Abastecimiento"}
        </span>
      </div>

      <div className="ab-card-meta">
        <span><Clock size={12} /> {formatFecha(fechaBase)}</span>
        {ubicacion && <span><MapPin size={12} /> {ubicacion}</span>}
      </div>

      <div className="ab-card-product">
        <Package size={13} />
        <span>{resumenItems(envio)}</span>
      </div>

      <div className="ab-card-money">
        <span>
          <CreditCard size={13} />
          {formatGs(envio.abastecimiento_costo)}
        </span>
        <span>
          <Truck size={13} />
          {envio.tipo_logistica_abastecimiento || "Sin logística"}
        </span>
      </div>

      <div className="ab-card-actions" onClick={(event) => event.stopPropagation()}>
        {envio.abastecimiento_comprobante_url ? (
          <a
            href={envio.abastecimiento_comprobante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ab-icon-link"
            title="Ver comprobante"
          >
            <FileText size={14} />
            Comprobante
          </a>
        ) : (
          <span className="ab-muted-pill">Sin comprobante</span>
        )}

        {estado === "pago_enviado" && (
          <>
            <button type="button" className="pt-next-action pt-next-action--success" disabled={procesando} onClick={() => onValidar(envio)}>
              <CheckCircle2 size={13} /> Validar
            </button>
            <button type="button" className="pt-next-action pt-next-action--danger" disabled={procesando} onClick={() => onRechazar(envio)}>
              Rechazar
            </button>
          </>
        )}

        {avanzarLabel && (
          <button type="button" className="pt-next-action pt-next-action--info" disabled={procesando} onClick={() => onAvanzar(envio)}>
            <Package size={13} /> {avanzarLabel}
          </button>
        )}

        {estado === "en_transito_a_deposito_cliente" && (
          <span className="pt-next-pill pt-next-pill--info">
            <Clock size={13} /> Esperando cliente
          </span>
        )}

        {["pendiente_pago", "pago_rechazado"].includes(estado) && (
          <span className="pt-next-pill pt-next-pill--danger">
            <Clock size={13} /> {estado === "pago_rechazado" ? "Esperando reenvío" : "Esperando pago"}
          </span>
        )}

        {["recibido_en_deposito_cliente", "disponible_en_gesicomm"].includes(estado) && (
          <span className="pt-next-pill pt-next-pill--success">
            <CheckCircle2 size={13} /> Recibido
          </span>
        )}

        <button type="button" className="ab-timeline-btn" title="Ver timeline" onClick={() => onAbrirTimeline?.(envio)}>
          <History size={14} />
        </button>
      </div>
    </article>
  );
}
