import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User,
} from "lucide-react";
import { STATUS, STATUS_ORDER, formatGs } from "../../lib/courier";
import { getEnviosPaginados } from "../../services/courierApi";

const ORIGENES = ["TODOS", "MANUAL", "WHATSAPP", "LANDING", "WEB", "META_ADS"];
const LIMITE = 10;

const FILTROS_VACIOS = {
  cliente: "",
  ciudad: "",
  fecha_desde: "",
  fecha_hasta: "",
  estados: [],
  courier_id: "TODOS",
  confirmador: "",
  origen: "TODOS",
};

function EstadoBadge({ estado, onChange }) {
  const s = STATUS[estado] || { chipBg: "rgba(255,255,255,0.1)", chipText: "#aaa" };
  return (
    <select
      value={estado}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: s.chipBg,
        color: s.chipText,
        border: `1px solid ${s.chipText}33`,
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "0.72rem",
        fontWeight: 700,
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        minWidth: "110px",
        textAlign: "center",
      }}
    >
      {STATUS_ORDER.map((st) => <option key={st} value={st}>{st}</option>)}
    </select>
  );
}

function MultiEstadoSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (estado) => {
    onChange(value.includes(estado) ? value.filter((e) => e !== estado) : [...value, estado]);
  };

  const label =
    value.length === 0 ? "Todos los estados" :
    value.length === 1 ? value[0] :
    `${value.length} estados`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pt-filter-select"
        style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: "155px" }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="pt-estado-dropdown">
          {STATUS_ORDER.map((estado) => {
            const st = STATUS[estado] || {};
            const checked = value.includes(estado);
            return (
              <label key={estado} className="pt-estado-option" onClick={() => toggle(estado)}>
                <span className="pt-estado-dot" style={{ background: st.chipText || "#aaa" }} />
                <span style={{ color: checked ? "#fff" : "#888", flex: 1 }}>{estado}</span>
                <input type="checkbox" checked={checked} readOnly style={{ accentColor: st.chipText }} />
              </label>
            );
          })}
          {value.length > 0 && (
            <button type="button" onClick={() => { onChange([]); setOpen(false); }} className="pt-clear-estados">
              Limpiar estados
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PedidosTable({ couriers = [], onChangeEstado, onAbrirDetalle }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [masFilters, setMasFilters] = useState(false);

  // Versión estable del ref de filtros para el debounce
  const filtrosRef = useRef(filtros);
  const pageRef = useRef(page);
  filtrosRef.current = filtros;
  pageRef.current = page;

  const cargar = useCallback(async (f, p) => {
    setLoading(true);
    try {
      const payload = { page: p, limit: LIMITE };
      if (f.cliente.trim())      payload.cliente     = f.cliente.trim();
      if (f.ciudad.trim())       payload.ciudad      = f.ciudad.trim();
      if (f.fecha_desde)         payload.fecha_desde = f.fecha_desde;
      if (f.fecha_hasta)         payload.fecha_hasta = f.fecha_hasta;
      if (f.estados.length > 0)  payload.estados     = f.estados;
      if (f.courier_id !== "TODOS") payload.courier_id = f.courier_id;
      if (f.confirmador.trim())  payload.confirmador = f.confirmador.trim();
      if (f.origen !== "TODOS")  payload.origen      = f.origen;
      const res = await getEnviosPaginados(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Un solo efecto con debounce que maneja tanto filtros como página
  const timerRef = useRef(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      cargar(filtros, page);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [filtros, page, cargar]);

  const setFiltro = (key, val) => {
    setFiltros((prev) => ({ ...prev, [key]: val }));
    setPage(1); // reset página al cambiar cualquier filtro
  };

  const resetFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setPage(1);
  };

  const hayFiltros = Object.entries(filtros).some(([, v]) =>
    Array.isArray(v) ? v.length > 0 : v !== "" && v !== "TODOS"
  );

  const envios = data.data || [];

  return (
    <div className="pt-root">
      {/* ── Sección título tabla ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#fff" }}>Todos los Pedidos</h2>
          <p style={{ fontSize: "0.78rem", color: "#666", margin: "2px 0 0 0" }}>
            Filtrá por estado, fecha, cliente, ciudad o courier. 10 registros por página.
          </p>
        </div>
      </div>

      {/* ── Toolbar de filtros principales ── */}
      <div className="pt-toolbar">
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

        {/* Multi-estado */}
        <MultiEstadoSelect value={filtros.estados} onChange={(v) => setFiltro("estados", v)} />

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
          {(filtros.courier_id !== "TODOS" || filtros.origen !== "TODOS" || filtros.confirmador) && (
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
        <span className="pt-count">{loading ? "…" : `${data.total.toLocaleString("es-PY")} pedidos`}</span>
      </div>

      {/* ── Filtros extra (courier, confirmador, origen) ── */}
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
                <option key={c.id} value={c.id}>{c.nombre}</option>
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
              <option key={o} value={o}>{o === "TODOS" ? "Todos los orígenes" : o}</option>
            ))}
          </select>
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
              <th className="pt-th">Ciudad</th>
              <th className="pt-th">Productos</th>
              <th className="pt-th pt-th-num">Monto</th>
              <th className="pt-th">Pago</th>
              <th className="pt-th">Courier</th>
              <th className="pt-th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="pt-empty">
                  <span className="pt-spinner" /> Cargando pedidos...
                </td>
              </tr>
            ) : envios.length === 0 ? (
              <tr>
                <td colSpan={9} className="pt-empty">No hay pedidos que coincidan con los filtros.</td>
              </tr>
            ) : (
              envios.map((e) => {
                const items = e.items || [];
                const resumenItems =
                  items.length === 0 ? "—" :
                  items.length === 1
                    ? `${items[0].nombre_producto}${items[0].cantidad > 1 ? ` x${items[0].cantidad}` : ""}`
                    : `${items[0].nombre_producto} +${items.length - 1} más`;

                return (
                  <tr key={e.id} className="pt-row" onClick={() => onAbrirDetalle && onAbrirDetalle(e)}>
                    <td className="pt-td pt-td-id">#{e.id}</td>
                    <td className="pt-td pt-td-fecha">{e.dispatchedAt || e.fecha || "—"}</td>
                    <td className="pt-td">
                      <div className="pt-cliente">
                        <span className="pt-cliente-nombre">
                          {[e.nombre_cliente, e.apellido_cliente].filter(Boolean).join(" ") || e.cliente || "—"}
                        </span>
                        {e.telefono && <span className="pt-cliente-tel">{e.telefono}</span>}
                      </div>
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
                      {e.costo_envio > 0 && <span className="pt-delivery">+{formatGs(e.costo_envio)}</span>}
                    </td>
                    <td className="pt-td">
                      <span className="pt-pago">{e.metodo_pago || "—"}</span>
                    </td>
                    <td className="pt-td">
                      {e.Courier
                        ? <span className="pt-courier">{e.Courier.nombre}</span>
                        : <span className="pt-sin-courier">—</span>}
                    </td>
                    <td className="pt-td" onClick={(ev) => ev.stopPropagation()}>
                      <EstadoBadge
                        estado={e.estado}
                        onChange={(nuevoEstado) => onChangeEstado && onChangeEstado(e.id, nuevoEstado)}
                      />
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
          <button className="pt-pag-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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
                <span key={`e${idx}`} className="pt-pag-ellipsis">…</span>
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

          <button className="pt-pag-btn" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}>
            <ChevronRight size={16} />
          </button>
          <span className="pt-pag-info">
            {Math.min((page - 1) * LIMITE + 1, data.total)}–{Math.min(page * LIMITE, data.total)} de {data.total.toLocaleString("es-PY")}
          </span>
        </div>
      )}
    </div>
  );
}
