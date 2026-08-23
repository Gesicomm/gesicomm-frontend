import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { getDashboardGeneralPedidos } from "../../services/courierApi";
import { productService } from "../../services/productService";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

const FILTROS_VACIOS = { courier_id: "TODOS", fecha_desde: "", fecha_hasta: "", producto: "TODOS" };

function Stat({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: "110px" }}>
      <span style={{ fontSize: "0.72rem", color: "#888" }}>{label}</span>
      <span style={{ fontSize: "1.3rem", fontWeight: 700, color: color || "#fff" }}>{value}</span>
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "1.1rem" }}>
      <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "0.85rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em" }}>{titulo}</h3>
      {children}
    </div>
  );
}

/**
 * Pestaña "Dashboard" — visión rápida de "¿qué está pasando hoy con la
 * operación?" (ver plan sección 23). Deliberadamente compacto: 3 bloques,
 * nada de tarjetas gigantes — esto es aparte de la bandeja operativa
 * (Tablero) y del resumen financiero de Entregados (sección 22).
 */
export function DashboardGeneralTab({ couriers = [] }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [productos, setProductos] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.buscar({}).then((res) => {
      const prods = Array.isArray(res) ? res : (res.productos || res.rows || []);
      setProductos(prods);
    }).catch(() => setProductos([]));
  }, []);

  const cargar = useCallback(async (f) => {
    setLoading(true);
    try {
      const payload = {};
      if (f.courier_id !== "TODOS") payload.courier_id = f.courier_id;
      if (f.fecha_desde) payload.fecha_desde = f.fecha_desde;
      if (f.fecha_hasta) payload.fecha_hasta = f.fecha_hasta;
      if (f.producto !== "TODOS") payload.producto = f.producto;
      const res = await getDashboardGeneralPedidos(payload);
      setData(res);
    } catch (err) {
      console.error("Error cargando dashboard general:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(filtros); }, [filtros, cargar]);

  const setFiltro = (key, val) => setFiltros((prev) => ({ ...prev, [key]: val }));

  const tp = data?.trabajo_pendiente;
  const ro = data?.resultado_operativo;
  const dc = data?.desempeno_courier || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "1100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <LayoutDashboard size={20} color="#60a5fa" />
        <h2 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Dashboard</h2>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="pt-date-label" title="Courier">
          <span style={{ fontSize: "0.72rem", color: "#666" }}>Courier</span>
          <select className="pt-filter-select" value={filtros.courier_id} onChange={(e) => setFiltro("courier_id", e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="null">Sin courier</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label className="pt-date-label" title="Fecha desde">
          <span style={{ fontSize: "0.72rem", color: "#666" }}>Desde</span>
          <input type="date" className="pt-date-input" value={filtros.fecha_desde} onChange={(e) => setFiltro("fecha_desde", e.target.value)} />
        </label>
        <label className="pt-date-label" title="Fecha hasta">
          <span style={{ fontSize: "0.72rem", color: "#666" }}>Hasta</span>
          <input type="date" className="pt-date-input" value={filtros.fecha_hasta} onChange={(e) => setFiltro("fecha_hasta", e.target.value)} />
        </label>
        <label className="pt-date-label" title="Producto">
          <span style={{ fontSize: "0.72rem", color: "#666" }}>Producto</span>
          <select className="pt-filter-select" value={filtros.producto} onChange={(e) => setFiltro("producto", e.target.value)}>
            <option value="TODOS">Todos</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <button type="button" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} onClick={() => cargar(filtros)} disabled={loading}>
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {loading && !data ? (
        <p style={{ color: "#888" }}>Cargando...</p>
      ) : !data ? null : (
        <>
          {/* Bloque 1 — Trabajo pendiente */}
          <Bloque titulo="Trabajo pendiente">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem" }}>
              <Stat label="Pendientes de confirmar" value={tp.pendientes_confirmar} color="#fbbf24" />
              <Stat label="Confirmados por preparar" value={tp.confirmados_preparar} color="#2dd4bf" />
              <Stat label="Preparados por despachar" value={tp.preparados_despachar} color="#3d5fa3" />
              <Stat label="Despachados sin resultado" value={tp.despachados_sin_resultado} color="#60a5fa" />
              <Stat label="Reprogramados para hoy" value={tp.reprogramados_hoy} color="#fb923c" />
              <Stat label="Reprogramados vencidos" value={tp.reprogramados_vencidos} color="#f87171" />
              <Stat label="Entregados sin rendir" value={tp.entregados_pendientes_rendicion} color="#34d399" />
            </div>
          </Bloque>

          {/* Bloque 2 — Resultado operativo (embudo compacto) */}
          <Bloque titulo="Resultado operativo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", alignItems: "center" }}>
              <Stat label="Ingresados" value={ro.ingresados} />
              <span style={{ color: "#444" }}>→</span>
              <Stat label="Confirmados" value={ro.confirmados} color="#2dd4bf" />
              <span style={{ color: "#444" }}>→</span>
              <Stat label="Entregados" value={ro.entregados} color="#34d399" />
              <span style={{ color: "#444", marginLeft: "0.5rem" }}>·</span>
              <Stat label="Cancelados" value={ro.cancelados} color="#f87171" />
              <Stat label="Devueltos" value={ro.devueltos} color="#a8917a" />
              <Stat label="Perdidos" value={ro.perdidos} color="#f87171" />
            </div>
          </Bloque>

          {/* Bloque 3 — Desempeño de courier */}
          <Bloque titulo="Desempeño de courier">
            {dc.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.82rem", margin: 0 }}>Todavía no hay pedidos despachados en este período.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="prod-table" style={{ margin: 0, width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Courier</th>
                      <th style={{ textAlign: "center" }}>Despachados</th>
                      <th style={{ textAlign: "center" }}>Entregados</th>
                      <th style={{ textAlign: "center" }}>Devueltos</th>
                      <th style={{ textAlign: "center" }}>Perdidos</th>
                      <th style={{ textAlign: "center" }}>% Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dc.map((c) => (
                      <tr key={c.courier_id ?? "sin_courier"}>
                        <td>{c.courier_nombre}</td>
                        <td style={{ textAlign: "center" }}>{c.despachados}</td>
                        <td style={{ textAlign: "center", color: "#34d399" }}>{c.entregados}</td>
                        <td style={{ textAlign: "center", color: "#a8917a" }}>{c.devueltos}</td>
                        <td style={{ textAlign: "center", color: "#f87171" }}>{c.perdidos}</td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: c.pct_entrega >= 80 ? "#34d399" : c.pct_entrega >= 70 ? "#fbbf24" : "#f87171" }}>
                          {c.pct_entrega}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.72rem", color: "#666" }}>
              % Entrega = Entregados ÷ (Entregados + Devueltos + Perdidos) × 100. Reprogramados no entran todavía porque no tienen resultado final.
            </p>
          </Bloque>
        </>
      )}
    </div>
  );
}
