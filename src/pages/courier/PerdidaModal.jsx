import { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import { formatGs } from "../../lib/courier";

function construirFilas(envio) {
  const filas = [];
  for (const item of envio?.items || []) {
    const componentes = item.componentes_vendidos || [];
    const cantidadFisicaTotal = componentes.reduce((acc, c) => acc + c.cantidad, 0);
    const precioUnitario = cantidadFisicaTotal > 0 ? Number(item.subtotal || 0) / cantidadFisicaTotal : 0;
    for (const comp of componentes) {
      const yaGestionado = (comp.cantidad_devuelta_vendible || 0) + (comp.cantidad_devuelta_danada || 0) + (comp.cantidad_perdida || 0);
      const disponible = comp.cantidad - yaGestionado;
      filas.push({
        componente_id: comp.id,
        nombre_producto: item.nombre_producto,
        cantidad_pedida: comp.cantidad,
        ya_gestionado: yaGestionado,
        disponible,
        precio_unitario: precioUnitario,
      });
    }
  }
  return filas;
}

/**
 * Fulfills la transición a "Perdido" — por producto/cantidad, ver plan
 * sección 46. El cargo mostrado es una previsualización: el backend
 * siempre lo vuelve a calcular antes de persistir (nunca confía en el
 * importe que manda el frontend).
 */
export function PerdidaModal({ open, envio, onClose, onSubmit }) {
  const filas = useMemo(() => construirFilas(envio), [envio]);
  const [cantidades, setCantidades] = useState({});
  const [marcarEstado, setMarcarEstado] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setCantidades({});
      setMarcarEstado(true);
      setError(null);
    }
  }, [open, envio]);

  if (!open || !envio) return null;

  const valorPerdido = filas.reduce((acc, f) => {
    const cant = parseInt(cantidades[f.componente_id], 10) || 0;
    return acc + cant * f.precio_unitario;
  }, 0);
  const costoEnvio = Number(envio.costo_envio) || 0;
  const cargoEstimado = Math.round(valorPerdido - costoEnvio);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = filas
      .map((f) => ({ envio_item_componente_id: f.componente_id, cantidad: parseInt(cantidades[f.componente_id], 10) || 0 }))
      .filter((it) => it.cantidad > 0);

    if (items.length === 0) {
      setError("Indicá al menos una cantidad perdida");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(envio.id, { items, marcar_estado: marcarEstado });
    } catch (err) {
      setError(err?.response?.data?.error || "Error al registrar la pérdida");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "560px", background: "#0a0a0b", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="#f87171" /> Registrar pérdida #{envio.id}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "70vh", overflowY: "auto" }}>
          {filas.length === 0 ? (
            <p style={{ color: "#888" }}>Este pedido no tiene productos con stock en tránsito para marcar como perdidos.</p>
          ) : (
            filas.map((f) => (
              <div key={f.componente_id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.6rem", padding: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong>{f.nombre_producto}</strong>
                  <span style={{ fontSize: "0.78rem", color: "#888" }}>
                    Pedido: {f.cantidad_pedida} · Gestionado: {f.ya_gestionado} · Disponible: {f.disponible}
                  </span>
                </div>
                {f.disponible <= 0 ? (
                  <span style={{ fontSize: "0.78rem", color: "#666" }}>Sin cantidad disponible para marcar como perdida.</span>
                ) : (
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: "90px" }}
                    min={0}
                    max={f.disponible}
                    value={cantidades[f.componente_id] ?? ""}
                    onChange={(e) => setCantidades((prev) => ({ ...prev, [f.componente_id]: e.target.value }))}
                    placeholder="0"
                  />
                )}
              </div>
            ))
          )}

          {filas.length > 0 && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.6rem", padding: "0.8rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Valor de productos perdidos</span>
                <span>{formatGs(Math.round(valorPerdido))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>− Costo del servicio de courier</span>
                <span>{formatGs(costoEnvio)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: "0.3rem", borderTop: "1px solid rgba(248,113,113,0.25)", paddingTop: "0.3rem" }}>
                <span>= Cargo al courier (estimado)</span>
                <span>{formatGs(cargoEstimado)}</span>
              </div>
              <p style={{ margin: "0.4rem 0 0 0", color: "#999", fontSize: "0.72rem" }}>
                El backend recalcula este cargo antes de guardarlo — este valor es solo una previsualización.
              </p>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#ccc" }}>
            <input type="checkbox" checked={marcarEstado} onChange={(e) => setMarcarEstado(e.target.checked)} />
            Marcar el pedido completo como "Perdido"
          </label>

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando || filas.length === 0}>
              {guardando ? "Guardando..." : "Registrar pérdida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
