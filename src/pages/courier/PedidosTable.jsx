import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Filter, X,
  ChevronDown, MapPin, Truck, User, Calendar,
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
      {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
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
    if (value.includes(estado)) onChange(value.filter((e) => e !== estado));
    else onChange([...value, estado]);
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
        style={{ minWidth: "160px", justifyContent: "space-between", display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="pt-estado-dropdown">
          {STATUS_ORDER.map((estado) => {
            const st = STATUS[estado] || {};
            const checked = value.includes(estado);
            return (
              <label key={estado} className="pt-estado-option" style={{ cursor: "pointer" }} onClick={() => toggle(estado)}>
                <span className="pt-estado-dot" style={{ background: st.chipText || "#aaa" }} />
                <span style={{ color: checked ? "#fff" : "#999", flex: 1 }}>{estado}</span>
                <input type="checkbox" checked={checked} readOnly style={{ accentColor: st.chipText, cursor: "pointer" }} />
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef(null);

  const cargar = useCallback(async (f, p) => {
    setLoading(true);
    try {
      const payload = {
        page: p,
        limit: LIMITE,
        ...(f.cliente.trim() ? { cliente: f.cliente.trim() } : {}),
        ...(f.ciudad.trim() ? { ciudad: f.ciudad.trim() } : {}),
        ...(f.fecha_desde ? { fecha_desde: f.fecha_desde } : {}),
        ...(f.fecha_hasta ? { fecha_hasta: f.fecha_hasta } : {}),
        ...(f.estados.length > 0 ? { estados: f.estados } : {}),
        ...(f.courier_id !== "TODOS" ? { courier_id: f.courier_id } : {}),
        ...(f.confirmador.trim() ? { confirmador: f.confirmador.trim() } : {}),
        ...(f.origen !== "TODOS" ? { origen: f.origen } : {}),
      };
      const res = await getEnviosPaginados(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      cargar(filtros, 1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  useEffect(() => {
    cargar(filtros, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const setFiltro = (key, val) => {
    setFiltros((prev) => ({ ...prev, [key]: val }));
    setPage(1);
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
      {/* Toolbar de filtros */}
      <div className="pt-toolbar">
        <div className="pt-search-wrap">
          <Search size={15} className="pt-search-icon" />
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

        <MultiEstadoSelect value={filtros.estados} onChange={(v) => setFiltro("estados", v)} />

        <label className="pt-date-label" title="Fecha desde">
          <Calendar size={13} />
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltro("fecha_desde", e.target.value)}
          />
        </label>

        <label className="pt-date-label" title="Fecha hasta">
          <Calendar size={13} />
          <input
            type="date"
            className="pt-date-input"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltro("fecha_hasta", e.target.value)}
          />
        </label>

        <button
          type="button"
          className={`pt-filter-toggle ${filtersOpen ? "active" : ""}`}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter size={15} />
          Más filtros
          {(filtros.ciudad || filtros.courier_id !== "TODOS" || filtros.origen !== "TODOS" || filtros.confirmador) && (
            <span className="pt-filter-dot" />
          )}
        </button>

        {hayFiltros && (
          <button type="button" className="pt-reset-btn" onClick={resetFiltros} title="Limpiar filtros">
            <RotateCcw size={14} />
          </button>
        )}

        <span className="pt-count">{loading ? "…" : `${data.total} pedidos`}</span>
      </div>

      {/* Filtros extra */}
      {filtersOpen && (
        <div className="pt-extra-filters">
          <label className="pt-extra-label">
            <MapPin size={13} />
            <input
              type="text"
              className="pt-extra-input"
              placeholder="Ciudad..."
              value={filtros.ciudad}
              onChange={(e) => setFiltro("ciudad", e.target.value)}
            />
          </label>

          <label className="pt-extra-label">
            <Truck size={13} />
            <select
              className="pt-filter-select"
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

      {/* Tabla */}
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
                  <span className="pt-spinner" />
                  Cargando pedidos...
                </td>
              </tr>
            ) : envios.length === 0 ? (
              <tr>
                <td colSpan={9} className="pt-empty">No hay pedidos que coincidan con los filtros.</td>
              </tr>
            ) : (
              envios.map((e) => {
                const st = STATUS[e.estado] || { chipBg: "rgba(255,255,255,0.06)", chipText: "#888" };
                const items = e.items || [];
                const resumenItems =
                  items.length === 0 ? "—" :
                  items.length === 1 ? `${items[0].nombre_producto}${items[0].cantidad > 1 ? ` x${items[0].cantidad}` : ""}` :
                  `${items[0].nombre_producto} +${items.length - 1} más`;

                return (
                  <tr
                    key={e.id}
                    className="pt-row"
                    onClick={() => onAbrirDetalle && onAbrirDetalle(e)}
                  >
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
                    <td className="pt-td pt-td-items" title={items.map((i) => `${i.nombre_producto} x${i.cantidad}`).join(", ")}>
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
                      {e.Courier ? (
                        <span className="pt-courier">{e.Courier.nombre}</span>
                      ) : (
                        <span className="pt-sin-courier">—</span>
                      )}
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

      {/* Paginación */}
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
                <button key={p} className={`pt-pag-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              )
            )}
          <button className="pt-pag-btn" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}>
            <ChevronRight size={16} />
          </button>
          <span className="pt-pag-info">
            {Math.min((page - 1) * LIMITE + 1, data.total)}–{Math.min(page * LIMITE, data.total)} de {data.total}
          </span>
        </div>
      )}
    </div>
  );
}
