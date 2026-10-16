import { useEffect, useMemo, useState } from "react";
import { X, MessageCircle, Send } from "lucide-react";
import { numeroPedidoVisible } from "./pedidoNumero";
import { generarMensajeConfirmacion, armarLinkWhatsappTexto, MENSAJE_CONFIRMACION_DEFAULT, formatPrecio } from "../../lib/mensajeWhatsapp";

function resumenProductos(envio) {
  const items = envio?.items || [];
  if (items.length === 0) return "tu pedido";
  if (items.length === 1) return `${items[0].nombre_producto}${Number(items[0].cantidad) > 1 ? ` x${items[0].cantidad}` : ""}`;
  return items.map((i) => `${i.nombre_producto}${Number(i.cantidad) > 1 ? ` x${i.cantidad}` : ""}`).join(", ");
}

/**
 * Pop-up que se ofrece apenas se confirma un pedido (Pendiente/EnSeguimiento
 * → Confirmado): deja mandar por WhatsApp "tu pedido ha sido confirmado,
 * lo vamos a preparar ahora", con la plantilla editable de Mi Tienda ya
 * aplicada a ESTE pedido — y todavía editable a mano antes de enviar
 * (pedido del usuario, 2026-10-14).
 */
export function ConfirmacionPedidoWhatsappModal({ open, envio, tienda, onClose }) {
  const [mensaje, setMensaje] = useState("");

  const mensajeInicial = useMemo(() => {
    if (!envio) return "";
    const cliente = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
    const plantilla = tienda?.mensaje_confirmacion_pedido || MENSAJE_CONFIRMACION_DEFAULT;
    const mensajeBase = generarMensajeConfirmacion(plantilla, {
      cliente,
      pedido: numeroPedidoVisible(envio),
      producto: resumenProductos(envio),
      total: envio.monto,
    });
    const resumen = [];
    if (!/\{producto\}/i.test(plantilla)) resumen.push(`Productos: ${resumenProductos(envio)}`);
    if (!/\{total\}/i.test(plantilla)) resumen.push(`Total: ${formatPrecio(envio.monto)}`);
    const direccion = [envio.direccion, envio.ciudad, envio.departamento].filter(Boolean).join(', ');
    if (direccion) resumen.push(`Entrega: ${direccion}`);
    if (envio.link_maps) resumen.push(`Ubicación: ${envio.link_maps}`);
    resumen.push(`Pago: ${envio.pago_anticipado ? `Anticipado${envio.metodo_pago ? ` · ${envio.metodo_pago}` : ''}` : 'Contra entrega'}`);
    return `${mensajeBase}\n\n${resumen.join('\n')}`;
  }, [envio, tienda]);

  useEffect(() => {
    if (open) setMensaje(mensajeInicial);
  }, [open, mensajeInicial]);

  if (!open || !envio) return null;

  const telefono = envio.telefono;
  const link = telefono ? armarLinkWhatsappTexto(telefono, mensaje) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "480px", background: "var(--color-canvas)", border: "1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)", color: "var(--color-fg)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageCircle size={18} color="var(--color-primary-text)" /> Resumen del pedido confirmado
          </h2>
          <button type="button" className="close-btn dark" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-fg-muted)" }}>
            Pedido #{numeroPedidoVisible(envio)} confirmado. Ya está en Gestión Logística, pendiente de preparación. Podés revisar y enviar el resumen al cliente.
          </p>

          {!telefono && (
            <div className="field-error">Este pedido no tiene teléfono cargado: no se puede enviar por WhatsApp.</div>
          )}

          <textarea
            className="form-input"
            aria-label="Resumen para WhatsApp"
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            disabled={!telefono}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Ahora no</button>
            <a
              href={link || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary${!link ? " is-disabled" : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", pointerEvents: link ? "auto" : "none", opacity: link ? 1 : 0.5 }}
              onClick={onClose}
            >
              <Send size={15} /> Enviar resumen por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
