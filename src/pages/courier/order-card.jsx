import { formatGs, STATUS_ORDER } from "../../lib/courier";
import { Bike, Car, Truck, MapPin, Phone, ShoppingBag, MessageCircle } from "lucide-react";
import { numeroPedidoVisible } from "./pedidoNumero";

function VehiculoIcon({ v }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={13} />;
  if (v === "Camioneta") return <Truck size={13} />;
  return <Car size={13} />;
}

function getWhatsappLink(telefono, envio) {
  const limpio = String(telefono || "").replace(/\D/g, "");
  if (!limpio) return null;
  const numero = limpio.startsWith("0") ? `595${limpio.slice(1)}` : limpio;
  const nombre = [envio.nombre_cliente, envio.apellido_cliente].filter(Boolean).join(" ") || envio.cliente || "";
  const mensaje = `Hola ${nombre}, te escribimos por tu pedido #${numeroPedidoVisible(envio)}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function OrderCard({
  envio,
  courier,
  dragging,
  onDragStart,
  onDragEnd,
  onChangeEstado,
}) {
  const nombreCliente = envio.nombre_cliente
    ? `${envio.nombre_cliente} ${envio.apellido_cliente || ''}`.trim()
    : envio.cliente || "Cliente";

  const ciudadLabel = envio.ciudad ? `Ciudad: ${envio.ciudad}` : '';
  const deptoLabel = envio.departamento ? `(${envio.departamento})` : '';
  const ubicacionLabel = [ciudadLabel, deptoLabel].filter(Boolean).join(' ') || envio.direccion;
  const whatsappLink = getWhatsappLink(envio.telefono, envio);

  return (
    <article
      draggable
      onDragStart={() => onDragStart(envio.id)}
      onDragEnd={onDragEnd}
      className={`order-card ${dragging ? 'dragging' : ''}`}
    >
      <div className="order-card-top">
        <div>
          <h4 className="order-card-client">{nombreCliente}</h4>
          {ubicacionLabel && (
            <p className="order-card-address" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={11} style={{ color: 'var(--color-primary-text)' }} />
              <span>{ubicacionLabel}</span>
            </p>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <select 
            value={envio.estado}
            onChange={(e) => onChangeEstado(envio.id, e.target.value)}
            style={{ 
              background: 'var(--color-canvas)', 
              color: 'var(--color-fg-muted)', 
              border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', 
              borderRadius: '0.375rem', 
              fontSize: '0.7rem',
              padding: '0.15rem 0.3rem',
              cursor: 'pointer'
            }}
          >
            {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Tags de Pago y Teléfono */}
      <div className="order-card-tags" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.4rem 0' }}>
        {envio.metodo_pago && (
          <span className="tag-badge pay" style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.72rem',
            fontWeight: 700,
              background: envio.metodo_pago === 'Efectivo' ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' :
                       envio.metodo_pago === 'Transferencia' ? 'color-mix(in srgb, var(--color-info) 15%, transparent)' :
                       envio.metodo_pago === 'POS' ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
            color: envio.metodo_pago === 'Efectivo' ? 'var(--color-success)' :
                   envio.metodo_pago === 'Transferencia' ? 'var(--color-info)' :
                   envio.metodo_pago === 'POS' ? 'var(--color-primary-text)' : 'var(--color-warning)'
          }}>
            {envio.metodo_pago === 'Efectivo' ? 'Al Recibir (Efectivo)' : 
             envio.metodo_pago === 'POS' ? 'Al Recibir (POS)' : envio.metodo_pago}
          </span>
        )}
        {envio.telefono && (
          <span className="tag-badge order-phone-badge" style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem' }}>
            <Phone size={10} style={{ display: 'inline', marginRight: '3px' }} />
            {envio.telefono}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="order-whatsapp-action"
                title={`Escribir por WhatsApp a ${envio.telefono}`}
                aria-label={`Escribir por WhatsApp a ${nombreCliente}`}
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              >
                <MessageCircle size={13} />
              </a>
            )}
          </span>
        )}
      </div>

      {/* Ítems del pedido preview */}
      {envio.items && envio.items.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ShoppingBag size={12} style={{ color: 'var(--color-primary-text)' }} />
          <span>
            {envio.items.map(it => `${it.cantidad}x ${it.nombre_producto}`).join(', ')}
          </span>
        </div>
      )}

      <div className="order-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="order-card-price" style={{ display: 'block' }}>
            {formatGs(envio.monto)}
          </span>
          {Number(envio.costo_envio) > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary-text)', fontWeight: 700, display: 'block', marginTop: '0.1rem' }}>
              Delivery: {formatGs(envio.costo_envio)}
            </span>
          )}
        </div>

        {courier ? (
          <div className="order-card-courier">
            <VehiculoIcon v={courier.vehiculo} />
            <span>{courier.nombre}</span>
          </div>
        ) : (
          <span className="order-card-courier" style={{ opacity: 0.6 }}>Delivery propio</span>
        )}
      </div>
    </article>
  );
}
