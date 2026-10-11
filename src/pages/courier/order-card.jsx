import { useRef } from "react";
import { formatGs } from "../../lib/courier";
import { AlertCircle, Bike, Car, Clock, CreditCard, Package, Phone, ShoppingBag, MapPin, MessageCircle, Truck } from "lucide-react";
import {
  estadoComercial,
  estadoLogistico,
  paymentLine,
  seguimientoComercial,
  seguimientoLogistico,
  seguimientoRecompra,
} from "./orderLifecycle";

function VehiculoIcon({ v }) {
  if (v === "Moto" || v === "Bicicleta") return <Bike size={13} />;
  if (v === "Camioneta") return <Truck size={13} />;
  return <Car size={13} />;
}

function formatSeguimientoTime(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleString("es-PY", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function OrderCard({
  envio,
  courier,
  dragging,
  onDragStart,
  onDragEnd,
  onChangeEstado,
  onAbrirDetalle,
  onAbrirSeguimiento,
  onAbrirTimelineAbastecimiento,
  onAccionSiguiente,
  isAdmin = false,
  readOnly = false,
}) {
  const didDragRef = useRef(false);
  const nombreCliente = envio.nombre_cliente
    ? `${envio.nombre_cliente} ${envio.apellido_cliente || ''}`.trim()
    : envio.cliente || "Cliente";

  const ciudadLabel = envio.ciudad ? `Ciudad: ${envio.ciudad}` : '';
  const deptoLabel = envio.departamento ? `(${envio.departamento})` : '';
  const ubicacionLabel = [ciudadLabel, deptoLabel].filter(Boolean).join(' ') || envio.direccion;
  const pagoAnticipado = envio.pago_anticipado === true || envio.pago_anticipado === 1 || String(envio.pago_anticipado).toLowerCase() === "true";
  const condicionPagoLabel = pagoAnticipado ? "Pago anticipado" : "Contra entrega";
  const metodoYaDefinido = envio.estado === "Entregado" && envio.metodo_pago;
  const pagoLabel = metodoYaDefinido ? `Cobrado: ${envio.metodo_pago}` : condicionPagoLabel;
  const seguimientoVencido = Boolean(envio.recordatorio_vencido);
  const seguimientoPendiente = envio.recordatorio_estado === "PENDIENTE" && envio.recordatorio_ejecutar_en;
  const necesitaSeguimiento = seguimientoVencido || (envio.estado === "EnSeguimiento" && !seguimientoPendiente);
  const mostrarAlertas = necesitaSeguimiento || seguimientoPendiente;
  const comercial = estadoComercial(envio);
  const logistico = estadoLogistico(envio);
  const segComercial = seguimientoComercial(envio);
  const segLogistico = seguimientoLogistico(envio);
  const segRecompra = seguimientoRecompra(envio);

  const handleSeguimientoClick = (event) => {
    event.stopPropagation();
    onAbrirSeguimiento?.(envio);
  };

  const handleCardClick = () => {
    if (didDragRef.current) return;
    onAbrirDetalle?.(envio);
  };

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  const handleDragStart = () => {
    if (readOnly) return;
    didDragRef.current = true;
    onDragStart(envio.id);
  };

  const handleDragEnd = (event) => {
    onDragEnd?.(event);
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  return (
    <article
      draggable={!readOnly}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle del pedido de ${nombreCliente}`}
      title="Ver detalle del pedido"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`order-card ${dragging ? 'dragging' : ''} ${readOnly ? 'is-readonly' : ''}`}
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
        <div className="order-stage-stack" title="Etapa actual del pedido">
          <span>{comercial.label}</span>
          {logistico.id !== "SinLogistica" && <small>{logistico.label}</small>}
        </div>
      </div>

      {/* Tags de condición de pago y teléfono */}
      <div className="order-card-tags" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.4rem 0' }}>
        <span className={`tag-badge pay ${metodoYaDefinido ? "pay-collected" : pagoAnticipado ? "pay-prepaid" : "pay-cod"}`}>
          {pagoLabel}
        </span>
        {envio.telefono && (
          <span className="tag-badge order-phone-badge" style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem' }}>
            <Phone size={10} style={{ display: 'inline', marginRight: '3px' }} />
            {envio.telefono}
            {onAbrirSeguimiento && (
              <button
                type="button"
                className="order-whatsapp-action"
                title={`Abrir plantillas de WhatsApp para ${envio.telefono}`}
                aria-label={`Abrir plantillas de WhatsApp para ${nombreCliente}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirSeguimiento(envio);
                }}
                draggable={false}
              >
                <MessageCircle size={13} />
              </button>
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

      <div className="order-card-lifecycle" aria-label="Resumen por etapa">
        <div>
          <span>Estado comercial</span>
          <strong>{segComercial.active ? segComercial.label : paymentLine(envio)}</strong>
        </div>
        <div>
          <span>Estado logístico</span>
          <strong>{segLogistico.active ? segLogistico.label : logistico.label}</strong>
        </div>
        <div>
          <span>Estado recompra</span>
          <strong>{segRecompra.status}</strong>
        </div>
      </div>

      {mostrarAlertas && (
        <div className="order-card-alerts" aria-label="Pendientes del pedido">
          {necesitaSeguimiento && onAbrirSeguimiento && (
            <button
              type="button"
              className={`order-alert-chip ${seguimientoVencido ? "danger" : "info"}`}
              title={seguimientoVencido ? "Hay seguimiento vencido. Abrir plantillas de WhatsApp." : "Pedido en seguimiento. Abrir plantillas de WhatsApp."}
              onClick={handleSeguimientoClick}
              draggable={false}
            >
              {seguimientoVencido ? <AlertCircle size={13} /> : <MessageCircle size={13} />}
              {seguimientoVencido ? "Enviar seguimiento" : "Mensaje pendiente"}
            </button>
          )}

          {!necesitaSeguimiento && seguimientoPendiente && (
            <button
              type="button"
              className="order-alert-chip info"
              title="Abrir seguimiento programado"
              onClick={handleSeguimientoClick}
              draggable={false}
            >
              <Clock size={13} />
              {formatSeguimientoTime(envio.recordatorio_ejecutar_en)}
            </button>
          )}

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
