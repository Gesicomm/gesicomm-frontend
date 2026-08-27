import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User, MessageCircle, ClipboardList, Eye, Package, CreditCard, History,
} from "lucide-react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";
import { getEnviosPaginados, getConteoPorEstado, getResumenEntregados, getMetodosPago, deleteEnvio } from "../../services/courierApi";
import { productService } from "../../services/productService";
import { verificarSesion } from "../../utils/auth";

const ORIGENES = ["TODOS", "MANUAL", "WHATSAPP", "LANDING", "WEB", "META_ADS"];
const LIMITE = 10;

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
  cliente: "",
  ciudad: "",
  fecha_desde: "",
  fecha_hasta: "",
  courier_id: "TODOS",
  confirmador: "",
  origen: "TODOS",
  producto: "TODOS",
  metodo_pago_id: "TODOS",
};

function EstadoBadgeDropdown({ estado, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = STATUS[estado] || { chipBg: "rgba(255,255,255,0.08)", chipText: "#aaa" };
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
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.12)",
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
            const config = STATUS[st] || { chipBg: "rgba(255,255,255,0.05)", chipText: "#aaa" };
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
                  background: isSelected ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: isSelected ? "#fff" : "#ccc",
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
                  if (isValid && !isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
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
                    backgroundColor: config.chipText || "#aaa",
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

function ResumenItem({ label, value, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ color: "#888" }}>{label}:</span>
      <strong style={{ color: color || "#fff" }}>{value}</strong>
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

function AccionPrincipal({ envio, onAbrirDetalle, onAbrirResumen }) {
  if (envio.estado === "Pendiente") {
    const tel = (envio.telefono || "").replace(/\D/g, "");
    const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
    if (!tel) return <span style={{ color: "#555", fontSize: "0.75rem" }}>Sin teléfono</span>;
    const mensaje = `Hola ${nombre}, te escribimos por tu pedido #${envio.id}. ¿Confirmamos los datos de entrega?`;
    const link = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
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
export function PedidosTable({ couriers = [], onChangeEstado, onAbrirDetalle, onAccionEspecial, onAbrirResumen, onAbrirHistorial, refrescarKey = 0 }) {
  const [estadoActivo, setEstadoActivo] = useState("Pendiente");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, totalPages: 1 });
  const [conteos, setConteos] = useState({});
  const [resumenEntregados, setResumenEntregados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masFilters, setMasFilters] = useState(false);
  const [productos, setProductos] = useState([]);
  const [metodosPagoList, setMetodosPagoList] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    productService.buscar({}).then((res) => {
      const prods = Array.isArray(res) ? res : (res.productos || res.rows || []);
      setProductos(prods);
    }).catch(() => setProductos([]));
    getMetodosPago().then((data) => setMetodosPagoList(data || [])).catch(() => setMetodosPagoList([]));
    verificarSesion().then((res) => setUsuarioActual(res)).catch(() => setUsuarioActual(null));
  }, []);

  const construirPayloadBase = useCallback((f) => {
    const payload = {};
    if (f.cliente.trim()) payload.cliente = f.cliente.trim();
    if (f.ciudad.trim()) payload.ciudad = f.ciudad.trim();
    if (f.fecha_desde) payload.fecha_desde = f.fecha_desde;
    if (f.fecha_hasta) payload.fecha_hasta = f.fecha_hasta;
    if (f.courier_id !== "TODOS") payload.courier_id = f.courier_id;
    if (f.confirmador.trim()) payload.confirmador = f.confirmador.trim();
    if (f.origen !== "TODOS") payload.origen = f.origen;
    if (f.producto !== "TODOS") payload.producto = f.producto;
    if (f.metodo_pago_id !== "TODOS") payload.metodo_pago_id = f.metodo_pago_id;
    return payload;
  }, []);

  const cargar = useCallback(async (f, p, estado) => {
    setLoading(true);
    try {
      const payload = { ...construirPayloadBase(f), page: p, limit: LIMITE, estados: [estado] };
      const res = await getEnviosPaginados(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, [construirPayloadBase]);

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
      const res = await getConteoPorEstado(construirPayloadBase(f));
      setConteos(res || {});
    } catch (err) {
      console.error("Error cargando conteo por estado:", err);
    }
  }, [construirPayloadBase]);

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
    setFiltros(FILTROS_VACIOS);
    setPage(1);
  };

  const handleItemEstadoChange = (item, nuevoEstado) => {
    if (item.estado === nuevoEstado) return;

    if (nuevoEstado === "Confirmado") {
      onAbrirDetalle && onAbrirDetalle(item);
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

  const hayFiltros = Object.entries(filtros).some(([, v]) => v !== "" && v !== "TODOS");

  const envios = data.data || [];

  return (
    <div className="pt-root">
      {/* ── Pestañas por estado con contador ── */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
        {STATUS_ORDER.map((st) => {
          const cfg = STATUS[st] || {};
          const active = estadoActivo === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => { setEstadoActivo(st); setPage(1); }}
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

      {/* ── Resumen financiero minimalista — solo en Entregados (plan sección 22) ── */}
      {estadoActivo === "Entregado" && resumenEntregados && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.7rem 1rem",
            borderRadius: "0.6rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.4rem 1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <ResumenItem label="Entregado" value={`${resumenEntregados.entregado.cantidad} · ${formatGs(resumenEntregados.entregado.monto_total)}`} />
          <ResumenItem label="En poder del courier" value={formatGs(resumenEntregados.dinero_courier)} />
          <ResumenItem label="Cobrado por la tienda" value={formatGs(resumenEntregados.cobrado_directo)} />
          <ResumenItem label="Costo de courier" value={formatGs(resumenEntregados.costo_total_courier)} />
          <ResumenItem
            label="Saldo de liquidación"
            value={
              resumenEntregados.saldo_liquidacion > 0
                ? `Courier debe tienda: ${formatGs(resumenEntregados.saldo_liquidacion)}`
                : resumenEntregados.saldo_liquidacion < 0
                ? `Tienda debe courier: ${formatGs(Math.abs(resumenEntregados.saldo_liquidacion))}`
                : "Equilibrado"
            }
            color={resumenEntregados.saldo_liquidacion > 0 ? "#34d399" : resumenEntregados.saldo_liquidacion < 0 ? "#f87171" : "#9ca3af"}
          />
          <ResumenItem label="Pendientes de rendición" value={String(resumenEntregados.pendientes_rendicion)} />

          {resumenEntregados.desglose_metodo_pago.length > 0 && (
            <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.3rem", paddingTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.3rem 1.2rem", color: "#888" }}>
              {resumenEntregados.desglose_metodo_pago.map((d) => (
                <span key={d.metodo_pago}>{d.metodo_pago}: <strong style={{ color: "#ccc" }}>{formatGs(d.monto)}</strong></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toolbar de filtros principales ── */}
      <div className="pt-toolbar" style={{ marginTop: "0.75rem" }}>
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
          <MapPin size={14} className="pt-search-icon" style={{ color: "#666" }} />
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
          <span style={{ fontSize: "0.72rem", color: "#666", whiteSpace: "nowrap" }}>Desde</span>
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltro("fecha_desde", e.target.value)}
          />
        </label>

        {/* Fecha hasta */}
        <label className="pt-date-label" title="Fecha hasta">
          <span style={{ fontSize: "0.72rem", color: "#666", whiteSpace: "nowrap" }}>Hasta</span>
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
          {(filtros.courier_id !== "TODOS" || filtros.origen !== "TODOS" || filtros.confirmador || filtros.producto !== "TODOS" || filtros.metodo_pago_id !== "TODOS") && (
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

          <select
            className="pt-filter-select"
            value={filtros.origen}
            onChange={(e) => setFiltro("origen", e.target.value)}
          >
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o === "TODOS" ? "Todos los orígenes" : o}
              </option>
            ))}
          </select>

          <label className="pt-extra-label">
            <Package size={13} />
            <select
              className="pt-filter-select"
              style={{ border: "none", padding: "0.4rem 0.5rem", background: "transparent" }}
              value={filtros.producto}
              onChange={(e) => setFiltro("producto", e.target.value)}
            >
              <option value="TODOS">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
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
              {metodosPago.map((m) => (
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
              <th className="pt-th">Cliente</th>
              <th className="pt-th">Teléfono</th>
              <th className="pt-th">Ciudad</th>
              <th className="pt-th">Producto / Oferta</th>
              <th className="pt-th pt-th-num">Total</th>
              <th className="pt-th">Courier</th>
              <th className="pt-th">Estado</th>
              <th className="pt-th">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="pt-empty">
                  <span className="pt-spinner" /> Cargando pedidos...
                </td>
              </tr>
            ) : envios.length === 0 ? (
              <tr>
                <td colSpan={10} className="pt-empty">
                  No hay pedidos en "{estadoActivo}" que coincidan con los filtros.
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

                return (
                  <tr
                    key={e.id}
                    className="pt-row"
                    onClick={() => onAbrirDetalle && onAbrirDetalle(e)}
                  >
                    <td className="pt-td pt-td-id">#{e.id}</td>
                    <td className="pt-td pt-td-fecha">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ color: "#fff", fontWeight: 500 }}>{fechaVisual}</span>
                        {horaVisual && (
                          <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "monospace" }}>
                            {horaVisual}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pt-td">
                      <span className="pt-cliente-nombre">
                        {[e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") ||
                          e.cliente ||
                          "—"}
                      </span>
                    </td>
                    <td className="pt-td">
                      <span style={{ color: "#aaa", fontSize: "0.82rem" }}>{e.telefono || "—"}</span>
                    </td>
                    <td className="pt-td pt-td-ciudad">
                      <span>{e.ciudad || "—"}</span>
                      {e.departamento && <span className="pt-depto">{e.departamento}</span>}
                    </td>
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
                    <td className="pt-td">
                      {e.Courier ? (
                        <span className="pt-courier">{e.Courier.nombre}</span>
                      ) : (
                        <span className="pt-sin-courier">—</span>
                      )}
                    </td>
                    <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                      <EstadoBadgeDropdown
                        estado={e.estado}
                        onChange={(nuevoEstado) => handleItemEstadoChange(e, nuevoEstado)}
                      />
                    </td>
                    <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <AccionPrincipal envio={e} onAbrirDetalle={onAbrirDetalle} onAbrirResumen={onAbrirResumen} />
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
                        {usuarioActual?.rol === 'ADMIN' && (
                          <button
                            type="button"
                            title="Eliminar pedido permanentemente"
                            style={{ ...accionBtnStyle, padding: "4px 6px", color: "#f87171", borderColor: "rgba(248, 113, 113, 0.3)" }}
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
