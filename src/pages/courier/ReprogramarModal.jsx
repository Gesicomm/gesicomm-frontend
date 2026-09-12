import { useState, useEffect } from "react";
import { X, CalendarClock } from "lucide-react";
import { numeroPedidoVisible } from "./pedidoNumero";

const MOTIVOS = [
  "Cliente no estaba",
  "Cliente pidió otra fecha",
  "Problema con dirección",
  "Courier no llegó",
  "Otro",
];

/**
 * Fulfills la transición a "Reprogramado" — ver plan Gestión de Pedidos
 * sección 43. Solo pide fecha y motivo: el costo del viaje que se acaba de
 * hacer todavía no se sabe acá (el courier lo avisa después) y se pide
 * recién al salir de "Reprogramado", ver CostoViajeModal.
 */
export function ReprogramarModal({ open, envio, onClose, onSubmit }) {
  const [fecha, setFecha] = useState("");
  const [motivoOpcion, setMotivoOpcion] = useState("");
  const [motivoLibre, setMotivoLibre] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setFecha("");
      setMotivoOpcion("");
      setMotivoLibre("");
      setError(null);
    }
  }, [open]);

  if (!open || !envio) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha) {
      setError("La nueva fecha es obligatoria");
      return;
    }
    const motivo = motivoOpcion === "Otro" ? motivoLibre.trim() : motivoOpcion;
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(envio.id, {
        fecha_reprogramada: fecha,
        motivo_reprogramacion: motivo || null,
      });
    } catch (err) {
      setError(err?.response?.data?.error || "Error al reprogramar el pedido");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "420px", background: "var(--color-canvas)", border: "1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)", color: "var(--color-fg)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CalendarClock size={18} color="var(--color-warning)" /> Reprogramar pedido #{numeroPedidoVisible(envio)}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="np-row">
            <label>Nueva fecha <span className="req">*</span></label>
            <input type="date" className="form-input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>

          <div className="np-row">
            <label>Motivo (opcional)</label>
            <select className="form-input" value={motivoOpcion} onChange={(e) => setMotivoOpcion(e.target.value)}>
              <option value="">— Sin especificar —</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {motivoOpcion === "Otro" && (
            <div className="np-row">
              <label>Detalle del motivo</label>
              <input type="text" className="form-input" value={motivoLibre} onChange={(e) => setMotivoLibre(e.target.value)} placeholder="Describí el motivo..." />
            </div>
          )}

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Reprogramar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
