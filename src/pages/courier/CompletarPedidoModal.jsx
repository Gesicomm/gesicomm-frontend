import { useState, useEffect } from "react";
import { X, Truck, AlertCircle } from "lucide-react";
import CurrencyInput from "../../components/CurrencyInput";
import { obtenerTarifaPara, buscarCourierYTarifa } from "../../lib/tarifaCourier";

const FORM_VACIO = {
  ruc: "",
  direccion: "",
  referencia: "",
  link_maps: "",
  metodo_pago: "Efectivo",
  courier_id: "",
  costo_envio: 0,
};

/**
 * Se abre al elegir "Confirmado" para un pedido — en vez de mandar el
 * cambio de estado al toque, primero pide lo que un checkout público NUNCA
 * pide: courier, costo de envío, y deja corregir dirección/referencia/RUC
 * si el cliente los cargó mal. Recién al enviar este formulario se dispara
 * el PUT que de verdad mueve el pedido a "Confirmado" (y, en el backend,
 * descuenta el stock — ver envioController.updateEstado).
 */
export function CompletarPedidoModal({ open, envio, couriers, onClose, onConfirmar }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && envio) {
      setForm({
        ruc: envio.ruc || "",
        direccion: envio.direccion || "",
        referencia: envio.referencia || "",
        link_maps: envio.link_maps || "",
        metodo_pago: envio.metodo_pago || "Efectivo",
        courier_id: envio.courier_id || "",
        costo_envio: envio.costo_envio || 0,
      });
      setError(null);
    }
  }, [open, envio]);

  if (!open || !envio) return null;

  const nombreCliente = envio.nombre_cliente
    ? `${envio.nombre_cliente} ${envio.apellido_cliente || ""}`.trim()
    : envio.cliente || "Cliente";

  function handleCourierChange(courierId) {
    setForm(prev => {
      const next = { ...prev, courier_id: courierId };
      if (courierId) {
        const costo = obtenerTarifaPara(couriers, envio.ciudad, courierId, prev.metodo_pago, envio.items);
        if (costo !== null) next.costo_envio = costo;
      }
      return next;
    });
  }

  function handleMetodoPagoChange(metodoPago) {
    setForm(prev => {
      const next = { ...prev, metodo_pago: metodoPago };
      if (prev.courier_id) {
        const costo = obtenerTarifaPara(couriers, envio.ciudad, prev.courier_id, metodoPago, envio.items);
        if (costo !== null) next.costo_envio = costo;
      } else {
        const resultado = buscarCourierYTarifa(couriers, envio.ciudad, metodoPago, envio.items);
        if (resultado) { next.courier_id = resultado.courierId; next.costo_envio = resultado.costo; }
      }
      return next;
    });
  }

  function autocompletarCourier() {
    const resultado = buscarCourierYTarifa(couriers, envio.ciudad, form.metodo_pago, envio.items);
    if (resultado) {
      setForm(prev => ({ ...prev, courier_id: resultado.courierId, costo_envio: resultado.costo }));
    } else {
      setError(`Ningún courier tiene tarifa configurada para "${envio.ciudad}" — asignalo manualmente.`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.direccion.trim()) {
      setError("La dirección es obligatoria.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onConfirmar(envio.id, {
        estado: "Confirmado",
        courier_id: form.courier_id ? Number(form.courier_id) : null,
        costo_envio: Number(form.costo_envio) || 0,
        metodo_pago: form.metodo_pago,
        ruc: form.ruc.trim() || null,
        direccion: form.direccion.trim(),
        referencia: form.referencia.trim() || null,
        link_maps: form.link_maps.trim() || null,
      });
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo confirmar el pedido.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content np-modal-container" onClick={e => e.stopPropagation()}>
        <div className="np-header-banner">
          <h2>COMPLETAR PEDIDO #{envio.id}</h2>
          <button type="button" onClick={onClose} className="close-btn dark">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="form-error-banner" style={{ margin: "1rem 1.5rem 0" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="np-form" noValidate>
          <div className="np-grid">
            <div className="np-section">
              <h3 className="np-section-title">Datos del cliente</h3>
              <div className="np-row">
                <label>Nombre</label>
                <div className="form-input" style={{ opacity: 0.7 }}>{nombreCliente}</div>
              </div>
              <div className="np-row">
                <label>Teléfono</label>
                <div className="form-input" style={{ opacity: 0.7 }}>{envio.telefono || "—"}</div>
              </div>
              <div className="np-row">
                <label>Ciudad</label>
                <div className="form-input" style={{ opacity: 0.7 }}>
                  {envio.ciudad || "—"}{envio.departamento ? ` (${envio.departamento})` : ""}
                </div>
              </div>
              <div className="np-row">
                <label>RUC (Factura Virtual)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Opcional"
                  value={form.ruc}
                  onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))}
                />
              </div>
              <div className="np-row">
                <label>Dirección <span className="req">*</span></label>
                <input
                  type="text"
                  className={`form-input ${!form.direccion.trim() ? "input-error" : ""}`}
                  value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                />
              </div>
              <div className="np-row">
                <label>Referencia para llegar</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.referencia}
                  onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                />
              </div>
              <div className="np-row">
                <label>Link Google Maps</label>
                <input
                  type="url"
                  className="form-input"
                  value={form.link_maps}
                  onChange={e => setForm(f => ({ ...f, link_maps: e.target.value }))}
                />
              </div>
            </div>

            <div className="np-section">
              <h3 className="np-section-title"><Truck size={16} /> Courier y entrega</h3>
              <div className="np-row">
                <label>Método de pago</label>
                <select
                  className="form-input"
                  value={form.metodo_pago}
                  onChange={e => handleMetodoPagoChange(e.target.value)}
                >
                  <option value="Efectivo">Efectivo contra entrega</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="POS">POS / Tarjeta</option>
                  <option value="Pagado">Ya pagado (Anticipado)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="np-row">
                  <label>Courier asignado</label>
                  <select
                    className="form-input"
                    value={form.courier_id}
                    onChange={e => handleCourierChange(e.target.value)}
                  >
                    <option value="">-- Sin asignar --</option>
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.vehiculo})</option>
                    ))}
                  </select>
                </div>
                <div className="np-row">
                  <label>Costo delivery (Gs)</label>
                  <CurrencyInput
                    className="form-input"
                    value={form.costo_envio}
                    onChange={val => setForm(f => ({ ...f, costo_envio: val }))}
                    prefix=""
                  />
                </div>
              </div>

              {!form.courier_id && envio.ciudad && (
                <button type="button" className="btn-outline" onClick={autocompletarCourier}>
                  Buscar courier automático para {envio.ciudad}
                </button>
              )}
            </div>
          </div>

          <div className="np-section np-full-width">
            <h3 className="np-section-title">Ítems del pedido</h3>
            {envio.items?.length > 0 ? (
              <table className="prod-table np-items-table">
                <tbody>
                  {envio.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ color: "#fff", fontWeight: 600 }}>{it.nombre_producto}</td>
                      <td style={{ textAlign: "center" }}>{it.cantidad}x</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                        Gs. {Number(it.subtotal).toLocaleString("es-PY")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="np-empty-items">Sin ítems.</div>
            )}
            <div className="np-total-row">
              <span>Total del pedido</span>
              <strong className="np-total-amount">Gs. {Number(envio.monto).toLocaleString("es-PY")}</strong>
            </div>
          </div>

          <div className="np-footer">
            <button type="submit" className="btn-confirmar-pedido" disabled={guardando}>
              {guardando ? "Confirmando..." : "Confirmar pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
