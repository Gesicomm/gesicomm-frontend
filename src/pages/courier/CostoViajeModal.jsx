import { useState, useEffect } from "react";
import { X, HandCoins } from "lucide-react";
import { numeroPedidoVisible } from "./pedidoNumero";

/**
 * Paso previo a resolver un pedido "Reprogramado" — hacia cualquier destino
 * permitido (Despachado, Entregado, Cancelado, Devuelto, Perdido o de nuevo
 * Reprogramado). El viaje en falso ya se hizo y normalmente se paga igual;
 * acá recién se sabe cuánto, así que se pide antes de dejar avanzar la
 * transición real. Arranca vacío a propósito: no hay un valor por defecto
 * honesto, lo tiene que decir quien habló con el courier.
 */
export function CostoViajeModal({ open, envio, onClose, onSubmit }) {
  const [costoViaje, setCostoViaje] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setCostoViaje("");
      setError(null);
    }
  }, [open]);

  if (!open || !envio) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se exige una respuesta explícita, incluso si es 0: dejarlo en blanco
    // haría que el costo del viaje desaparezca sin que nadie lo decida.
    if (costoViaje === "" || Number.isNaN(Number(costoViaje)) || Number(costoViaje) < 0) {
      setError('Indicá cuánto te costó este viaje. Si el courier no te lo cobra, poné 0.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(Number(costoViaje));
    } catch (err) {
      setError(err?.response?.data?.error || "Error al continuar con el pedido");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "420px", background: "var(--color-canvas)", border: "1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)", color: "var(--color-fg)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <HandCoins size={18} color="var(--color-warning)" /> Costo del viaje — pedido #{numeroPedidoVisible(envio)}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="np-row">
            <label>Costo de este viaje <span className="req">*</span></label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-input"
                value={costoViaje}
                onChange={(e) => setCostoViaje(e.target.value)}
                placeholder="Gs 0"
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCostoViaje("0")}
                style={{ whiteSpace: "nowrap" }}
              >
                No me lo cobran
              </button>
            </div>
            <small style={{ color: "var(--color-fg-muted)", fontSize: "0.75rem" }}>
              Lo que te cobró el courier por el viaje reprogramado. Se suma al
              costo de envío del pedido, así el margen y la rendición muestran lo que
              de verdad pagaste. Si no te lo cobran, poné 0.
            </small>
          </div>

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Continuar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
