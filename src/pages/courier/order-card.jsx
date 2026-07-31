import { formatGs, STATUS_ORDER } from "../../lib/courier";
import { Bike, Car, Truck, MapPin, Phone, ShoppingBag } from "lucide-react";

function VehiculoIcon({ v }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={13} />;
  if (v === "Camioneta") return <Truck size={13} />;
  return <Car size={13} />;
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

  const ubicacion = [envio.ciudad, envio.departamento].filter(Boolean).join(", ") || envio.direccion;

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
          {ubicacion && (
            <p className="order-card-address">
              <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
              {ubicacion}
            </p>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <select 
            value={envio.estado}
            onChange={(e) => onChangeEstado(envio.id, e.target.value)}
            style={{ 
              background: '#1a1a1c', 
              color: '#aaa', 
              border: '1px solid rgba(255,255,255,0.1)', 
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
      <div className="order-card-tags">
        {envio.metodo_pago && (
          <span className="tag-badge pay">{envio.metodo_pago}</span>
        )}
        {envio.telefono && (
          <span className="tag-badge">
            <Phone size={10} style={{ display: 'inline', marginRight: '3px' }} />
            {envio.telefono}
          </span>
        )}
      </div>

      {/* Ítems del pedido preview */}
      {envio.items && envio.items.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#bbb', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ShoppingBag size={12} style={{ color: '#3b82f6' }} />
          <span>
            {envio.items.map(it => `${it.cantidad}x ${it.nombre_producto}`).join(', ')}
          </span>
        </div>
      )}

      <div className="order-card-bottom">
        <span className="order-card-price">
          {formatGs(envio.monto)}
        </span>

        {courier ? (
          <div className="order-card-courier">
            <VehiculoIcon v={courier.vehiculo} />
            <span>{courier.nombre}</span>
          </div>
        ) : (
          <span className="order-card-courier" style={{ opacity: 0.6 }}>Sin courier</span>
        )}
      </div>
    </article>
  );
}
