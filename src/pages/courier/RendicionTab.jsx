import { useState, useEffect } from "react";
import { HandCoins, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatGs } from "../../lib/courier";
import { previsualizarLiquidacion, confirmarLiquidacion, getLiquidacionesPorCourier } from "../../services/courierApi";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}
function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/**
 * Pestaña Rendición — motor de liquidación por lote con un courier. Separada
 * de la bandeja operativa (ver plan Gestión de Pedidos sección 48-50): acá
 * se decide quién le debe dinero a quién, no se gestionan pedidos.
 */
export function RendicionTab({ couriers = [] }) {
  const [courierId, setCourierId] = useState("");
  const [fechaDesde, setFechaDesde] = useState(inicioDeMes());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [ajusteManual, setAjusteManual] = useState(0);
  const [observacion, setObservacion] = useState("");
  const [desglose, setDesglose] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (courierId) {
      getLiquidacionesPorCourier(courierId).then(setHistorial).catch(() => setHistorial([]));
    } else {
      setHistorial([]);
    }
    setDesglose(null);
    setExito(null);
  }, [courierId]);

  const previsualizar = async () => {
    if (!courierId) {
      setError("Elegí un courier");
      return;
    }
    setCargando(true);
    setError(null);
    setExito(null);
    try {
      const res = await previsualizarLiquidacion({
        courier_id: courierId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        ajuste_manual: Number(ajusteManual) || 0,
      });
      setDesglose(res);
    } catch (err) {
      setError(err?.response?.data?.error || "Error al previsualizar la liquidación");
      setDesglose(null);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!window.confirm(`¿Confirmar liquidación de ${desglose.cantidad_pedidos} pedido(s) por ${fechaDesde} a ${fechaHasta}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setConfirmando(true);
    setError(null);
    try {
      await confirmarLiquidacion({
        courier_id: courierId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        ajuste_manual: Number(ajusteManual) || 0,
        observacion: observacion.trim() || null,
      });
      setExito("Liquidación registrada correctamente.");
      setDesglose(null);
      setObservacion("");
      getLiquidacionesPorCourier(courierId).then(setHistorial).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.error || "Error al confirmar la liquidación");
    } finally {
      setConfirmando(false);
    }
  };

  const saldoColor = !desglose ? "#ccc" : desglose.saldo_final > 0 ? "#34d399" : desglose.saldo_final < 0 ? "#f87171" : "#9ca3af";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "820px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <HandCoins size={20} color="#facc15" />
        <h2 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Rendición de couriers</h2>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <div className="np-row" style={{ minWidth: "200px" }}>
            <label>Courier</label>
            <select className="form-input" value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              <option value="">Seleccionar courier...</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="np-row">
            <label>Desde</label>
            <input type="date" className="form-input" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div className="np-row">
            <label>Hasta</label>
            <input type="date" className="form-input" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div className="np-row" style={{ minWidth: "140px" }}>
            <label>Ajuste manual (Gs.)</label>
            <input type="number" className="form-input" value={ajusteManual} onChange={(e) => setAjusteManual(e.target.value)} />
          </div>
        </div>

        <button type="button" className="btn-primary" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={previsualizar} disabled={cargando}>
          <RefreshCw size={15} /> {cargando ? "Calculando..." : "Previsualizar"}
        </button>

        {error && <div className="field-error">{error}</div>}
        {exito && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#34d399", fontWeight: 600 }}>
            <CheckCircle2 size={16} /> {exito}
          </div>
        )}
      </div>

      {desglose && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#fff" }}>Desglose ({desglose.cantidad_pedidos} pedido{desglose.cantidad_pedidos === 1 ? "" : "s"})</h3>

          <FilaDesglose label="Dinero en poder del courier" valor={desglose.total_dinero_courier} />
          <FilaDesglose label="− Costo de servicios" valor={-desglose.total_costo_servicios} />
          <FilaDesglose label="+ Cargos por pérdidas" valor={desglose.total_cargos_perdida} />
          <FilaDesglose label="+ Ajuste manual" valor={desglose.ajuste_manual} />

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.7rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1.1rem", color: saldoColor }}>
              <span>Saldo de liquidación</span>
              <span>{formatGs(desglose.saldo_final)}</span>
            </div>
            {/* Nunca solo color — siempre texto explícito de quién le debe a quién */}
            <span style={{ color: saldoColor, fontSize: "0.85rem", fontWeight: 600 }}>{desglose.mensaje_saldo}</span>
          </div>

          {desglose.detalle && desglose.detalle.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", color: "#9ca3af", fontSize: "0.82rem" }}>Ver pedidos incluidos</summary>
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {desglose.detalle.map((d) => (
                  <div key={d.envio_id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#aaa", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0.25rem 0" }}>
                    <span>#{d.envio_id} · {d.cliente} · {d.estado} · {d.metodo_pago || "—"}</span>
                    <span>{formatGs(d.dinero_courier)} / envío {formatGs(d.costo_envio)}{d.cargo_perdida_courier ? ` / pérdida ${formatGs(d.cargo_perdida_courier)}` : ""}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="np-row">
            <label>Observación (opcional)</label>
            <input type="text" className="form-input" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Motivo del ajuste, notas, etc." />
          </div>

          <button type="button" className="btn-primary" onClick={confirmar} disabled={confirmando || desglose.cantidad_pedidos === 0}>
            {confirmando ? "Confirmando..." : "Marcar liquidación como rendida"}
          </button>
        </div>
      )}

      {historial.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#fff" }}>Historial</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {historial.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#ccc", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0.4rem 0" }}>
                <span>{l.fecha_desde} a {l.fecha_hasta} · {(l.envios_incluidos || []).length} pedidos · {l.observacion || "—"}</span>
                <span style={{ fontWeight: 700, color: l.saldo_final > 0 ? "#34d399" : l.saldo_final < 0 ? "#f87171" : "#9ca3af" }}>{formatGs(l.saldo_final)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilaDesglose({ label, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#ccc" }}>
      <span>{label}</span>
      <span>{formatGs(valor)}</span>
    </div>
  );
}
