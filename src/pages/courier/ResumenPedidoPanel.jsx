import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { formatGs } from "../../lib/courier";

function armarTextoResumen(envio) {
  const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "—";
  const items = envio.items || [];
  const detalle = items.length > 0
    ? items.map((it) => `${it.cantidad} × ${it.nombre_producto}${it.oferta_nombre ? ` (${it.oferta_nombre})` : ""}`).join("\n")
    : "—";

  const lineas = [
    `Pedido #${envio.id}`,
    `Ciudad: ${envio.ciudad || "—"}`,
    `Nombre: ${nombre}`,
    `Celular: ${envio.telefono || "—"}`,
    ``,
    `Detalle del pedido:`,
    detalle,
    ``,
    `Monto a cobrar:`,
    formatGs(envio.monto),
    ``,
    `Observaciones:`,
    envio.observaciones ? envio.observaciones : "—",
  ];

  if (envio.link_maps) {
    lineas.push(``, `Google Maps:`, envio.link_maps);
  }

  return lineas.join("\n");
}

/** Panel lateral liviano — ver plan Gestión de Pedidos sección 47. */
export function ResumenPedidoPanel({ open, envio, onClose }) {
  const [copiado, setCopiado] = useState(false);

  if (!open || !envio) return null;

  const texto = armarTextoResumen(envio);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("No se pudo copiar el resumen:", err);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "360px", maxWidth: "100%", height: "100%", background: "#0a0a0b", borderLeft: "1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)", color: "#fff", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Resumen del pedido</h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.88rem", lineHeight: 1.6, margin: 0, color: "#ddd" }}>
            {texto}
          </pre>
        </div>

        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <button type="button" className="btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={copiar}>
            {copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
