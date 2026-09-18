import { useState, useEffect } from "react";
import { X, History, Loader, MessageCircle, CalendarClock, Tag, Ban, CheckCircle2 } from "lucide-react";
import { getHistorialPedido } from "../../services/courierApi";
import { seguimientoService } from "../../services/seguimiento.service";
import { numeroPedidoVisible } from "./pedidoNumero";

function formatFechaHora(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PY", { timeZone: "America/Asuncion", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Panel lateral con el historial simple de movimientos de un pedido — ver
 * plan Gestión de Pedidos sección 24. Se consulta desde el detalle del
 * pedido, no ocupa espacio permanente en la bandeja.
 */
export function HistorialPedidoPanel({ open, envio, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !envio) return;
    let activo = true;
    setCargando(true);
    setError(null);
    seguimientoService.getTimeline(envio.id)
      .then((res) => { if (activo) setHistorial(res || []); })
      .catch((err) => { if (activo) setError(err?.response?.data?.error || "No se pudo cargar el historial."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [open, envio]);

  if (!open || !envio) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ width: "380px", maxWidth: "100%", height: "100%", background: "var(--color-canvas)", borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)", color: "var(--color-fg)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <History size={18} color="var(--color-primary-text)" /> Historial · Pedido #{numeroPedidoVisible(envio)}
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {cargando ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-fg-muted)" }}><Loader size={16} /> Cargando...</div>
          ) : error ? (
            <p style={{ color: "var(--color-danger)" }}>{error}</p>
          ) : historial.length === 0 ? (
            <p style={{ color: "var(--color-fg-subtle)" }}>Todavía no hay movimientos registrados para este pedido.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {historial.map((h, i) => (
                <div key={h.id} style={{ display: "flex", gap: "0.75rem", position: "relative", paddingBottom: i === historial.length - 1 ? 0 : "1rem" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ 
                      width: "24px", height: "24px", borderRadius: "50%", 
                      background: "var(--color-surface-2)", border: "1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary-text)", zIndex: 1
                    }}>
                      {h.tipo === 'CONTACTO_WHATSAPP' && <MessageCircle size={12} color="#10b981" />}
                      {h.tipo === 'ETIQUETA' && <Tag size={12} color="#8b5cf6" />}
                      {h.tipo === 'SEGUIMIENTO_PROGRAMADO' && <CalendarClock size={12} color="#3b82f6" />}
                      {h.tipo === 'SEGUIMIENTO_VENCIDO' && <History size={12} color="#ef4444" />}
                      {h.tipo === 'SEGUIMIENTO_COMPLETADO' && <CheckCircle2 size={12} color="#10b981" />}
                      {h.tipo === 'SEGUIMIENTO_CANCELADO' && <Ban size={12} color="#64748b" />}
                      {(!h.tipo || h.tipo === 'HISTORIAL') && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-primary-text)" }} />}
                    </div>
                    {i < historial.length - 1 && <span style={{ width: "1px", flex: 1, background: "color-mix(in srgb, var(--color-fg) 10%, transparent)", marginTop: "-4px", marginBottom: "-4px" }} />}
                  </div>
                  <div style={{ paddingBottom: "0.2rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-fg-subtle)", fontFamily: "monospace" }}>{formatFechaHora(h.fecha)}</div>
                    <div style={{ fontSize: "0.86rem", color: "var(--color-fg)" }}>{h.detalle}</div>
                    {h.usuario && <div style={{ fontSize: "0.72rem", color: "var(--color-fg-subtle)" }}>por {h.usuario}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


