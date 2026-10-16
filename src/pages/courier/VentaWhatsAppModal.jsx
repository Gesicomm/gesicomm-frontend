import { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Trash2, Loader2, MessageCircle, ImageOff } from "lucide-react";
import { productService } from "../../services/productService";
import { getMediaUrl } from "../../services/api";
import CurrencyInput from "../../components/CurrencyInput";
import ProductPicker from "../landing/ProductPicker";
import "../landing/landing.css";

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-PY", { maximumFractionDigits: 0 });
}

const precioProducto = (producto) => (
  Number(producto?.precio_efectivo ?? producto?.precio_base ?? producto?.precio_venta ?? producto?.precio ?? 0) || 0
);

const imagenProducto = (producto) => (
  producto?.imagen || producto?.imagenes?.[0]?.url || producto?.imagenes?.[0] || null
);

/**
 * Alta rápida de un pedido que llega por WhatsApp: solo nombre, teléfono y
 * productos con cantidad. Usa el mismo ProductPicker (catálogo visual con
 * imagen y búsqueda) que NuevoPedidoModal, para no inventar un selector
 * paralelo. La tienda la resuelve el backend solo (exigirTiendaActiva), y el
 * origen fijo "WHATSAPP" hace que el pedido entre al flujo de seguimiento
 * "Venta por WhatsApp" (ver esOrigenWhatsapp en flujosBase.js) en vez del de
 * "Confirmación de pedido web". Nace en estado "Pendiente", igual que un
 * pedido web: el stock se descuenta recién al confirmar, no acá.
 */
export function VentaWhatsAppModal({ open, onClose, onSubmit, lead = null }) {
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [items, setItems] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  // Lo elige el vendedor ahí mismo, al cargar el lead — no después en la
  // tabla. "Orgánico" por default: es el caso más común (alguien escribe
  // sin venir de un anuncio); si sabés que vino de la campaña, lo cambiás acá.
  const [leadTipo, setLeadTipo] = useState("organico");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setNombreCliente("");
      setTelefono("");
      setItems([]);
      setLeadTipo("organico");
      setError("");
      return;
    }
    setNombreCliente(lead?.nombre_cliente || lead?.cliente || "");
    setTelefono(lead?.telefono || "");
    setItems([]);
    setLeadTipo(lead?.lead_tipo_manual || (lead?.campana_leads?.length ? "campana" : "organico"));
    // Sin `sin_limite` solo llegan 10 productos (paginación por defecto de
    // ProductoService.buscar) y el picker no puede ofrecer el resto del
    // catálogo — mismo criterio que NuevoPedidoModal.
    productService.buscar({ sin_limite: true, activo: true })
      .then((data) => setProductosDisponibles(Array.isArray(data) ? data : (data?.productos || [])))
      .catch(() => setProductosDisponibles([]));
  }, [open, lead]);

  const catalogoPicker = useMemo(() => ({
    productos: productosDisponibles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      imagen: imagenProducto(p),
      precio_efectivo: precioProducto(p),
      stock: p.cantidad_disponible ?? p.stock ?? null,
      categoria: p.categoria?.nombre || (typeof p.categoria === "string" ? p.categoria : null),
      marca: p.marca?.nombre || (typeof p.marca === "string" ? p.marca : null),
      destacado: p.destacado,
    })),
    combos: [],
  }), [productosDisponibles]);

  const seleccionPicker = useMemo(() => {
    const map = new Map();
    items.forEach((it) => map.set(`producto:${Number(it.producto_id)}`, { id: Number(it.producto_id), tipo: "producto" }));
    return map;
  }, [items]);

  if (!open) return null;

  const handleToggleProducto = (item) => {
    if (item?.tipo && item.tipo !== "producto") return;
    const productoId = Number(item.id);
    const yaEsta = items.some((it) => Number(it.producto_id) === productoId);
    if (yaEsta) {
      setItems((prev) => prev.filter((it) => Number(it.producto_id) !== productoId));
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        producto_id: productoId,
        nombre_producto: item.nombre,
        imagen: item.imagen,
        cantidad: 1,
        precio_unitario: Number(item.precio_efectivo) || 0,
      },
    ]);
    setError("");
  };

  const cambiarCantidad = (index, delta) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, cantidad: Math.max(1, (Number(it.cantidad) || 1) + delta) } : it))
    );
  };

  const cambiarPrecio = (index, precio) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, precio_unitario: Number(precio) || 0 } : it)));
  };

  const quitarItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!nombreCliente.trim()) {
      setError("Ingresá el nombre del cliente.");
      return;
    }
    if (!telefono.trim()) {
      setError("Ingresá el teléfono del cliente.");
      return;
    }
    setEnviando(true);
    try {
      await onSubmit({
        nombre_cliente: nombreCliente.trim(),
        telefono: telefono.trim(),
        origen: "WHATSAPP",
        estado: "Pendiente",
        // Explícito: el endpoint lo pone en "Confirmado" por default si no
        // viaja, y acá todavía no hay nada confirmado — recién se está
        // armando el seguimiento del contacto por WhatsApp (mismo criterio
        // que el checkout público, ver landing.service.js crearCheckout).
        estado_comercial: "Pendiente",
        lead_tipo_manual: leadTipo,
        es_lead: !!lead?.es_lead || leadTipo === 'organico' || items.length === 0,
        monto: total,
        items: items.map((it) => ({
          producto_id: it.producto_id,
          nombre_producto: it.nombre_producto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "No se pudo guardar el lead.");
      setEnviando(false);
      return;
    }
    setEnviando(false);
  };

  return (
    <div className="vw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vw-panel">
        <div className="vw-header">
          <h3><MessageCircle size={19} /> Venta por WhatsApp</h3>
          <button type="button" className="vw-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="vw-body" onSubmit={handleSubmit}>
          <div className="vw-field-row">
            <label className="vw-field">
              <span>Nombre del cliente</span>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ej: María López"
                autoFocus
              />
            </label>
            <label className="vw-field">
              <span>Teléfono</span>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 0981123456"
              />
            </label>
          </div>

          <div className="vw-lead-tipo">
            <span className="vw-label">¿De dónde llegó este lead?</span>
            <div className="vw-lead-tipo-opciones">
              <button
                type="button"
                className={`vw-lead-tipo-btn ${leadTipo === "organico" ? "is-activo" : ""}`}
                onClick={() => setLeadTipo("organico")}
              >
                Orgánico
              </button>
              <button
                type="button"
                className={`vw-lead-tipo-btn ${leadTipo === "campana" ? "is-activo" : ""}`}
                onClick={() => setLeadTipo("campana")}
              >
                Campaña WhatsApp
              </button>
            </div>
          </div>

          <div className="vw-productos">
            <span className="vw-label">Productos (opcional)</span>

            <div className="np-picker-theme">
              <ProductPicker
                catalogo={catalogoPicker}
                seleccion={seleccionPicker}
                onToggle={handleToggleProducto}
                max={50}
                mostrarLista={false}
                mostrarInputs={false}
                zIndexModal={1300}
                themeScopeClassName="np-picker-theme"
                triggerLabel="Elegir productos"
                modalTitle="Agregar productos al pedido"
                refrescarCatalogoAlAbrir
                permitirCombos={false}
              />
            </div>

            {items.length === 0 ? (
              <div className="vw-sin-items">Podés guardar el lead sin productos. Iniciará el flujo de consulta general para ayudarle a elegir.</div>
            ) : (
              <div className="vw-lista-items">
                {items.map((it, idx) => (
                  <div className="vw-item" key={`${it.producto_id}-${idx}`}>
                    {it.imagen ? (
                      <img src={getMediaUrl(it.imagen)} alt="" />
                    ) : (
                      <span className="vw-resultado-sin-imagen"><ImageOff size={14} /></span>
                    )}
                    <span className="vw-item-nombre">{it.nombre_producto}</span>
                    <div className="vw-item-cant">
                      <button type="button" onClick={() => cambiarCantidad(idx, -1)}><Minus size={13} /></button>
                      <span>{it.cantidad}</span>
                      <button type="button" onClick={() => cambiarCantidad(idx, 1)}><Plus size={13} /></button>
                    </div>
                    <CurrencyInput
                      className="vw-item-precio"
                      value={it.precio_unitario}
                      onChange={(v) => cambiarPrecio(idx, v)}
                    />
                    <button type="button" className="vw-item-quitar" onClick={() => quitarItem(idx)} title="Quitar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="vw-error">{error}</div>}

          <div className="vw-footer">
            <span className="vw-total">{items.length ? <>{leadTipo === 'organico' || lead?.es_lead ? 'Valor de interés' : 'Total'}: <strong>Gs {formatGs(total)}</strong></> : 'Consulta general · Sin pedido todavía'}</span>
            <div className="vw-footer-botones">
              <button type="button" className="vw-btn-cancelar" onClick={onClose}>Cancelar</button>
              <button type="submit" className="vw-btn-crear" disabled={enviando}>
                {enviando ? <Loader2 size={15} className="vw-spin" /> : null}
                {lead ? (items.length ? 'Guardar productos' : 'Guardar lead') : (items.length && leadTipo === 'campana' ? 'Crear pedido' : 'Guardar lead')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
