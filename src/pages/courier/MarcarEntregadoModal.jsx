import { useState, useEffect } from "react";
import { X, PackageCheck } from "lucide-react";
import { getMetodosPago } from "../../services/courierApi";
import CurrencyInput from "../../components/CurrencyInput";

/** Fulfills la transición a "Entregado" — ver plan Gestión de Pedidos sección 44. */
export function MarcarEntregadoModal({ open, envio, onClose, onSubmit }) {
  const [metodosPago, setMetodosPago] = useState([]);
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [monto, setMonto] = useState(0);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open && envio) {
      setMonto(Number(envio.monto) || 0);
      setCostoEnvio(Number(envio.costo_envio) || 0);
      setMetodoPagoId(envio.metodo_pago_id || "");
      setError(null);
      getMetodosPago().then((data) => setMetodosPago((data || []).filter((m) => m.activo))).catch(() => setMetodosPago([]));
    }
  }, [open, envio]);

  if (!open || !envio) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!metodoPagoId) {
      setError("El método de pago es obligatorio");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(envio.id, { metodo_pago_id: metodoPagoId, monto, costo_envio: costoEnvio });
    } catch (err) {
      setError(err?.response?.data?.error || "Error al marcar el pedido como entregado");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "420px", background: "var(--color-canvas)", border: "1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)", color: "var(--color-fg)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PackageCheck size={18} color="#34d399" /> Marcar Entregado #{envio.id}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="np-row">
            <label>Método de pago <span className="req">*</span></label>
            <select className="form-input" value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {metodosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          <div className="np-row">
            <label>Monto efectivamente cobrado</label>
            <CurrencyInput className="form-input" value={monto} onChange={(v) => setMonto(v || 0)} />
          </div>

          <div className="np-row">
            <label>Costo de entrega final</label>
            <CurrencyInput className="form-input" value={costoEnvio} onChange={(v) => setCostoEnvio(v || 0)} />
          </div>

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Marcar Entregado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
