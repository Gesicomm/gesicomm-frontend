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

  const ciudadLabel = envio.ciudad ? `Ciudad: ${envio.ciudad}` : '';
  const deptoLabel = envio.departamento ? `(${envio.departamento})` : '';
  const ubicacionLabel = [ciudadLabel, deptoLabel].filter(Boolean).join(' ') || envio.direccion;

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
              <MapPin size={11} style={{ color: '#8577fa' }} />
              <span>{ubicacionLabel}</span>
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
      <div className="order-card-tags" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.4rem 0' }}>
        {envio.metodo_pago && (
          <span className="tag-badge pay" style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: envio.metodo_pago === 'Efectivo' ? 'rgba(16,185,129,0.15)' :
                       envio.metodo_pago === 'Transferencia' ? 'rgba(59,130,246,0.15)' :
                       envio.metodo_pago === 'POS' ? 'rgba(46, 74, 133,0.15)' : 'rgba(245,158,11,0.15)',
            color: envio.metodo_pago === 'Efectivo' ? '#10b981' :
                   envio.metodo_pago === 'Transferencia' ? '#3b82f6' :
                   envio.metodo_pago === 'POS' ? '#2e4a85' : '#f59e0b'
          }}>
            {envio.metodo_pago === 'Efectivo' ? 'Al Recibir (Efectivo)' : 
             envio.metodo_pago === 'POS' ? 'Al Recibir (POS)' : envio.metodo_pago}
          </span>
        )}
        {envio.telefono && (
          <span className="tag-badge" style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem' }}>
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

      <div className="order-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="order-card-price" style={{ display: 'block' }}>
            {formatGs(envio.monto)}
          </span>
          {Number(envio.costo_envio) > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#8577fa', fontWeight: 700, display: 'block', marginTop: '0.1rem' }}>
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
