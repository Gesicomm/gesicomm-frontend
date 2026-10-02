import { useRef } from "react";
import { formatGs, STATUS_ORDER } from "../../lib/courier";
import { AlertCircle, Bike, Car, Clock, CreditCard, Package, Phone, ShoppingBag, MapPin, MessageCircle, Truck } from "lucide-react";

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

function getAbastecimientoTimelineInfo(envio) {
  const estado = envio?.abastecimiento_estado;
  if (!estado || estado === "no_requiere") return null;

  const labels = {
    pendiente_pago: "Pendiente de pago",
    pago_rechazado: "Pago rechazado",
    pago_enviado: "En seguimiento abastecimiento",
    en_transito_a_deposito_cliente: "En tránsito a tu depósito",
    recibido_en_deposito_cliente: "Abastecimiento recibido",
    disponible_en_gesicomm: "Disponible en Gesicomm",
  };

  return {
    label: labels[estado] || "En seguimiento abastecimiento",
    tone: ["pendiente_pago", "pago_rechazado"].includes(estado)
      ? "danger"
      : ["recibido_en_deposito_cliente", "disponible_en_gesicomm"].includes(estado)
      ? "success"
      : "info",
  };
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
  const accion = envio.accion_siguiente;
  const seguimientoVencido = Boolean(envio.recordatorio_vencido);
  const seguimientoPendiente = envio.recordatorio_estado === "PENDIENTE" && envio.recordatorio_ejecutar_en;
  const necesitaSeguimiento = seguimientoVencido || (envio.estado === "EnSeguimiento" && !seguimientoPendiente);
  const accionAbastecimiento = accion?.tipo === "pago_enviado" && isAdmin
    ? { ...accion, tipo: "validar_pago", cta: "Validar pago" }
    : accion;
  const puedeAccionarAbastecimiento = accion?.tipo && [
    "pagar_abastecimiento",
    "pago_rechazado",
    "abastecimiento_avanzar",
  ].includes(accion.tipo) && !(isAdmin && ["pagar_abastecimiento", "pago_rechazado"].includes(accion.tipo));
  const puedeValidarPago = accion?.tipo === "pago_enviado" && isAdmin;
  const abastecimientoEnTransito = envio.abastecimiento_estado === "en_transito_a_deposito_cliente";
  const abastecimientoInformativo = accion?.tipo && !puedeAccionarAbastecimiento && !puedeValidarPago && accion.tipo !== "pedido_avanzar";
  const timelineAbastecimiento = getAbastecimientoTimelineInfo(envio);
  const puedeAbrirTimelineAbastecimiento = Boolean(onAbrirTimelineAbastecimiento && timelineAbastecimiento);
  const mostrarTimelineAbastecimiento =
    puedeAbrirTimelineAbastecimiento &&
    !["pagar_abastecimiento", "pago_rechazado"].includes(accion?.tipo);
  const mostrarAlertas = necesitaSeguimiento || seguimientoPendiente || puedeAccionarAbastecimiento || puedeValidarPago || abastecimientoEnTransito || abastecimientoInformativo || mostrarTimelineAbastecimiento;

  const handleSeguimientoClick = (event) => {
    event.stopPropagation();
    onAbrirSeguimiento?.(envio);
  };

  const handleAccionClick = (event, accionPayload = accion) => {
    event.stopPropagation();
    if (accionPayload) onAccionSiguiente?.(envio, accionPayload);
  };

  const handleTimelineAbastecimientoClick = (event) => {
    event.stopPropagation();
    onAbrirTimelineAbastecimiento?.(envio);
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
        <div style={{ position: 'relative' }}>
          {readOnly ? (
            <span className="order-state-readonly" title="Estado operativo del pedido">
              {envio.estado}
            </span>
          ) : (
            <select
              value={envio.estado}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
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
          )}
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

          {(puedeAccionarAbastecimiento || puedeValidarPago) && (
            <button
              type="button"
              className={`order-alert-chip ${accion.tono === "danger" || accion.tipo === "pago_rechazado" || accion.tipo === "pagar_abastecimiento" ? "danger" : "warning"}`}
              title={accion.descripcion || accion.titulo}
              onClick={(event) => handleAccionClick(event, accionAbastecimiento)}
              draggable={false}
            >
              {accion.tipo === "abastecimiento_avanzar" ? <Package size={13} /> : <CreditCard size={13} />}
              {accion.tipo === "pagar_abastecimiento"
                ? isAdmin ? "Pago pendiente" : "Pagar abastecimiento"
                : accionAbastecimiento.cta || accion.titulo}
            </button>
          )}

          {abastecimientoEnTransito && !isAdmin && (
            <button
              type="button"
              className="order-alert-chip warning"
              title="Cuando se reciba la mercadería, se puede preparar el pedido"
              onClick={(event) => handleAccionClick(event, { tipo: "confirmar_recepcion_deposito" })}
              draggable={false}
            >
              <Package size={13} />
              {isAdmin ? "Espera recepción" : "Confirmar recepción"}
            </button>
          )}

          {abastecimientoEnTransito && isAdmin && (
            <span className="order-alert-chip warning" title="Solo el comercio puede confirmar la recepción en su depósito">
              <Package size={13} />
              Espera recepción
            </span>
          )}

          {abastecimientoInformativo && !mostrarTimelineAbastecimiento && (
            <span
              className={`order-alert-chip ${["pagar_abastecimiento", "pago_rechazado"].includes(accion.tipo) ? "danger" : "info"}`}
              title={accion.descripcion || accion.titulo}
            >
              {["pagar_abastecimiento", "pago_rechazado", "pago_enviado"].includes(accion.tipo) ? <CreditCard size={13} /> : <Package size={13} />}
              {accion.titulo || "Abastecimiento"}
            </span>
          )}

          {mostrarTimelineAbastecimiento && (
            <button
              type="button"
              className={`order-alert-chip ${timelineAbastecimiento.tone}`}
              title="Ver timeline de abastecimiento"
              onClick={handleTimelineAbastecimientoClick}
              draggable={false}
            >
              <Package size={13} />
              {timelineAbastecimiento.label}
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
