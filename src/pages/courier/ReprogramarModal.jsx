import { useState, useEffect } from "react";
import { X, CalendarClock } from "lucide-react";

const MOTIVOS = [
  "Cliente no estaba",
  "Cliente pidió otra fecha",
  "Problema con dirección",
  "Courier no llegó",
  "Otro",
];

/** Fulfills la transición a "Reprogramado" — ver plan Gestión de Pedidos sección 43. */
export function ReprogramarModal({ open, envio, onClose, onSubmit }) {
  const [fecha, setFecha] = useState("");
  const [motivoOpcion, setMotivoOpcion] = useState("");
  const [motivoLibre, setMotivoLibre] = useState("");
  // El viaje en falso ya se hizo y normalmente se paga igual. Se pide acá y
  // se acumula en el costo del pedido; antes se perdía y el margen quedaba
  // inflado. Arranca vacío a propósito: no hay un valor por defecto honesto,
  // lo tiene que decir quien habló con el courier.
  const [costoViaje, setCostoViaje] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setFecha("");
      setMotivoOpcion("");
      setMotivoLibre("");
      setCostoViaje("");
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
    // Se exige una respuesta explícita, incluso si es 0: dejarlo en blanco
    // haría que el costo del viaje desaparezca sin que nadie lo decida.
    if (costoViaje === "" || Number.isNaN(Number(costoViaje)) || Number(costoViaje) < 0) {
      setError('Indicá cuánto te cuesta este viaje. Si el courier no te lo cobra, poné 0.');
      return;
    }
    const motivo = motivoOpcion === "Otro" ? motivoLibre.trim() : motivoOpcion;
    setGuardando(true);
    setError(null);
    try {
      await onSubmit(envio.id, {
        fecha_reprogramada: fecha,
        motivo_reprogramacion: motivo || null,
        costo_intento: Number(costoViaje),
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
            <CalendarClock size={18} color="var(--color-warning)" /> Reprogramar pedido #{envio.id}
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
              Lo que te cobra el courier por haber ido sin poder entregar. Se suma al
              costo de envío del pedido, así el margen y la rendición muestran lo que
              de verdad pagaste. Si no te lo cobran, poné 0.
            </small>
          </div>

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
