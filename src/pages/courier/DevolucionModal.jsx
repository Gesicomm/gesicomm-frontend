import { useState, useEffect, useMemo } from "react";
import { X, Undo2 } from "lucide-react";

function construirFilas(envio) {
  const filas = [];
  for (const item of envio?.items || []) {
    for (const comp of item.componentes_vendidos || []) {
      const yaGestionado = (comp.cantidad_devuelta_vendible || 0) + (comp.cantidad_devuelta_danada || 0) + (comp.cantidad_perdida || 0);
      const disponible = comp.cantidad - yaGestionado;
      filas.push({
        componente_id: comp.id,
        nombre_producto: item.nombre_producto,
        cantidad_pedida: comp.cantidad,
        ya_gestionado: yaGestionado,
        disponible,
      });
    }
  }
  return filas;
}

/** Fulfills la transición a "Devuelto" — por producto/cantidad, ver plan sección 45. */
export function DevolucionModal({ open, envio, onClose, onSubmit }) {
  const filas = useMemo(() => construirFilas(envio), [envio]);
  const [cantidades, setCantidades] = useState({});
  const [condiciones, setCondiciones] = useState({});
  const [marcarEstado, setMarcarEstado] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setCantidades({});
      setCondiciones({});
      setMarcarEstado(true);
      setError(null);
    }
  }, [open, envio]);

  if (!open || !envio) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const items = filas
      .map((f) => ({
        envio_item_componente_id: f.componente_id,
        cantidad: parseInt(cantidades[f.componente_id], 10) || 0,
        condicion: condiciones[f.componente_id] || "vendible",
      }))
      .filter((it) => it.cantidad > 0);

    if (items.length === 0) {
      setError("Indicá al menos una cantidad a devolver");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(envio.id, { items, marcar_estado: marcarEstado });
    } catch (err) {
      setError(err?.response?.data?.error || "Error al registrar la devolución");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "560px", background: "var(--color-canvas)", border: "1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)", color: "var(--color-fg)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Undo2 size={18} color="var(--color-primary-text)" /> Registrar devolución #{envio.id}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "70vh", overflowY: "auto" }}>
          {filas.length === 0 ? (
            <p style={{ color: "var(--color-fg-muted)" }}>Este pedido no tiene productos con stock en tránsito para devolver.</p>
          ) : (
            filas.map((f) => (
              <div key={f.componente_id} style={{ background: "color-mix(in srgb, var(--color-fg) 3%, transparent)", border: "1px solid color-mix(in srgb, var(--color-fg) 7%, transparent)", borderRadius: "0.6rem", padding: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong>{f.nombre_producto}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-fg-muted)" }}>
                    Pedido: {f.cantidad_pedida} · Gestionado: {f.ya_gestionado} · Disponible: {f.disponible}
                  </span>
                </div>
                {f.disponible <= 0 ? (
                  <span style={{ fontSize: "0.78rem", color: "var(--color-fg-subtle)" }}>Sin cantidad disponible para devolver.</span>
                ) : (
                  <div style={{ display: "flex", gap: "0.6rem" }}>
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
                    <select
                      className="form-input"
                      style={{ flex: 1 }}
                      value={condiciones[f.componente_id] || "vendible"}
                      onChange={(e) => setCondiciones((prev) => ({ ...prev, [f.componente_id]: e.target.value }))}
                    >
                      <option value="vendible">Vendible (vuelve a stock disponible)</option>
                      <option value="dañado">Dañado (no vuelve a stock)</option>
                    </select>
                  </div>
                )}
              </div>
            ))
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--color-fg)" }}>
            <input type="checkbox" checked={marcarEstado} onChange={(e) => setMarcarEstado(e.target.checked)} />
            Marcar el pedido completo como "Devuelto"
          </label>

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando || filas.length === 0}>
              {guardando ? "Guardando..." : "Registrar devolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
