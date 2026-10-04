import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, ExternalLink, Link2, Loader, ReceiptText, RefreshCw, Save, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { speedboxService } from '../../services/speedboxService';
import { getCouriers } from '../../services/courierApi';
import './speedbox.css';

const labels = { spec: 'Autenticación', order: 'Recepción de pedido', updates: 'Estados y billetera', webhook: 'Webhook verificado' };
const money = value => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value);
const conceptos = { pago_proveedor: 'Pago al proveedor', costo_abastecimiento: 'Costo de abastecimiento', envio: 'Envio', cobro_cliente: 'Cobro al cliente', otro: 'Otro' };
const estado = value => (value || '-').replaceAll('_', ' ');

export default function SpeedboxConfig() {
  const [data, setData] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState('');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState('cargar');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retryOrder, setRetryOrder] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const dialogRef = useRef(null);
  const financeDialogRef = useRef(null);
  const [movement, setMovement] = useState(null);
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (retryOrder && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [retryOrder]);
  function closeRetry() { dialogRef.current?.close(); setRetryOrder(null); }
  useEffect(() => {
    if (movement && financeDialogRef.current && !financeDialogRef.current.open) financeDialogRef.current.showModal();
  }, [movement]);
  function closeFinance() { financeDialogRef.current?.close(); setMovement(null); }

  async function load(resetForm = false) {
    const [config, available] = await Promise.all([speedboxService.obtener(), getCouriers()]);
    setData(config);
    setCouriers(available.filter(courier => courier.activo));
    if (resetForm) {
      setCourierId(config.connection?.courier_id ? String(config.connection.courier_id) : '');
      setActive(Boolean(config.connection?.activo));
    }
  }
  useEffect(() => {
    let mounted = true;
    Promise.all([speedboxService.obtener(), getCouriers()]).then(([config, available]) => {
      if (!mounted) return;
      setData(config);
      setCouriers(available.filter(courier => courier.activo));
      setCourierId(config.connection?.courier_id ? String(config.connection.courier_id) : '');
      setActive(Boolean(config.connection?.activo));
    }).catch(err => { if (mounted) setError(err.response?.data?.message || 'No se pudo cargar Speedbox.'); })
      .finally(() => { if (mounted) setBusy(''); });
    return () => { mounted = false; };
  }, []);

  async function run(action, handler, success, resetForm = false) {
    setBusy(action); setError(''); setMessage('');
    try { await handler(); await load(resetForm); setMessage(success); return true; }
    catch (err) { setError(err.response?.data?.message || err.response?.data?.error || 'No se pudo completar la operacion.'); return false; }
    finally { setBusy(''); }
  }
  const disabled = Boolean(busy);
  const uncertain = retryOrder && ['incierto', 'enviando'].includes(retryOrder.estado);
  const wallet = (data?.events || []).filter(event => event.tipo === 'wallet.transaction');
  const reviews = (data?.events || []).filter(event => event.estado === 'revision' && event.tipo !== 'wallet.transaction');

  if (busy === 'cargar') return <div className="spb-loading" role="status"><Loader size={18} className="spb-spin" /> Cargando Speedbox...</div>;
  return <div className="spb-config">
    {error && <div className="spb-alert spb-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
    {message && <div className="spb-alert spb-success" role="status"><Check size={18} /><span>{message}</span></div>}
    {!data ? <button type="button" className="spb-button" disabled={disabled} onClick={() => run('cargar', () => load(true), 'Configuracion actualizada.')}><RefreshCw size={16} /> Reintentar carga</button> : <>
      <section className="spb-section">
        <h3>Cuenta en Speedy</h3>
        <div className="spb-actions">{data.registration_url
          ? <a className="spb-button" href={data.registration_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UserPlus size={16} /> Crear cuenta en Speedy <ExternalLink size={14} aria-hidden="true" /></a>
          : <button type="button" className="spb-button" disabled title="Enlace oficial pendiente de configuracion"><UserPlus size={16} /> Registro en Speedy no disponible</button>}
        </div>
      </section>
      <section className="spb-section">
        <div className="spb-heading"><h3>Conexión</h3><span className={`spb-badge ${data.environment === 'sandbox' ? 'spb-sandbox' : ''}`}>{data.environment === 'sandbox' ? 'Sandbox' : 'Producción'}</span></div>
        <dl className="spb-summary">
          <div><dt>Credenciales del servidor</dt><dd>{data.credentials_configured ? 'Configuradas' : 'Pendientes'}</dd></div>
          <div><dt>Tienda Speedbox</dt><dd>{data.connection?.tienda_id || 'Sin vincular'}</dd></div>
          <div><dt>Protección del webhook</dt><dd>{data.webhook_configured ? 'Configurada' : 'Pendiente'}</dd></div>
          <div><dt>Envío automático</dt><dd>{data.automatic_enabled && data.connection?.activo ? 'Activo' : 'Pausado'}</dd></div>
        </dl>
        <div className="spb-actions">
          <button type="button" className="spb-button" disabled={disabled || !data.credentials_configured} onClick={() => run('spec', speedboxService.probar, 'Autenticacion verificada.')}><ShieldCheck size={16} /> Probar conexion</button>
          {!data.connection?.tienda_id && <button type="button" className="spb-button" disabled={disabled || !data.credentials_configured} onClick={() => run('store', speedboxService.vincular, 'Tienda vinculada.')}><Link2 size={16} /> Vincular tienda</button>}
          <button type="button" className="spb-button" disabled={disabled} title="Actualizar panel" aria-label="Actualizar panel" onClick={() => run('refresh', () => load(), 'Panel actualizado.')}><RefreshCw size={16} /></button>
        </div>
      </section>
      <section className="spb-section">
        <div className="spb-fields">
          <label className="spb-field" htmlFor="spb-courier">Courier Speedbox<select id="spb-courier" value={courierId} disabled={disabled} onChange={event => setCourierId(event.target.value)}>
            <option value="">Seleccionar courier</option>{couriers.map(courier => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
          </select></label>
          <label className="spb-checkbox"><input type="checkbox" checked={active} disabled={disabled || !data.connection?.tienda_id} onChange={event => setActive(event.target.checked)} /> Integración activa</label>
        </div>
        <div className="spb-actions">
          <button type="button" className="spb-button spb-primary" disabled={disabled || !data.connection?.tienda_id || (active && !courierId)} onClick={() => run('save', () => speedboxService.guardar({ courier_id: courierId ? Number(courierId) : null, activo: active }), 'Configuracion guardada.', true)}><Save size={16} /> Guardar</button>
          <button type="button" className="spb-button" disabled={disabled || !data.connection?.activo || !data.credentials_configured} onClick={() => run('updates', speedboxService.sincronizar, 'Novedades sincronizadas.')}><RefreshCw size={16} /> Consultar novedades</button>
          {busy && <Loader size={18} className="spb-spin" aria-label="Procesando" />}
        </div>
      </section>
      <section className="spb-section"><h3>Validaciones de conexión</h3><ul className="spb-checks">{Object.entries(labels).map(([key, label]) => <li key={key}><span className={data.checks[key] ? 'spb-check-ok' : 'spb-check-pending'}>{data.checks[key] ? <Check size={15} /> : <span aria-hidden="true">-</span>}</span><span>{label}</span><span className="spb-muted">{data.checks[key] ? 'Verificado' : 'Pendiente'}</span></li>)}</ul></section>
      {reviews.length > 0 && <section className="spb-section"><h3>Pendientes de revision</h3><ul className="spb-reviews">{reviews.map(event => <li key={event.id}><strong>Speedbox {event.order_id}</strong><span>{event.detalle}</span></li>)}</ul></section>}
      <section className="spb-section"><h3>Pedidos enviados</h3>
        {(data.available_orders || []).length > 0 && <div className="spb-fields"><label className="spb-field" htmlFor="spb-pedido">Pedido confirmado<select id="spb-pedido" value={selectedOrder} disabled={disabled} onChange={event => setSelectedOrder(event.target.value)}><option value="">Seleccionar pedido</option>{data.available_orders.map(order => <option key={order.id} value={order.id}>#{order.numero_pedido} - {order.cliente}</option>)}</select></label><button type="button" className="spb-button" disabled={disabled || !selectedOrder || !data.connection?.activo} onClick={async () => { if (await run('send', () => speedboxService.enviar(Number(selectedOrder)), 'Pedido enviado.')) setSelectedOrder(''); }}><Send size={16} /> Enviar pedido</button></div>}
        {data.orders.length === 0 ? <p className="spb-muted">Sin pedidos registrados.</p> : <div className="spb-table-scroll"><table className="spb-table"><thead><tr><th>Pedido Gesicomm</th><th>ID Speedbox</th><th>Envio</th><th>Estado Speedbox</th><th>Detalle</th><th aria-label="Acciones" /></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>#{order.envio?.numero_pedido || order.envio_id}</td><td>{order.order_id || '-'}</td><td>{order.estado}</td><td>{order.status || '-'}</td><td className="spb-error-cell">{order.error || '-'}</td><td>{['error', 'incierto', 'enviando'].includes(order.estado) && <button type="button" className="spb-button" title="Reintentar pedido" aria-label={`Reintentar pedido ${order.envio_id}`} disabled={disabled} onClick={() => { setRetryOrder(order); setAcknowledged(false); }}><RefreshCw size={15} /></button>}</td></tr>)}</tbody></table></div>}</section>
      <section className="spb-section"><h3>Importes por pedido</h3>
        <div className="spb-table-scroll"><table className="spb-table"><thead><tr><th>Pedido</th><th>Venta</th><th>Envio</th><th>Fulfillment</th><th>Abastecimiento</th><th>Pago proveedor</th><th>Cobro cliente</th><th>Liquidacion</th></tr></thead><tbody>{data.orders.filter(order => order.finanzas).map(order => <tr key={order.id}><td>#{order.envio?.numero_pedido || order.envio_id}</td><td>{money(order.finanzas.venta)}</td><td>{money(order.finanzas.envio_cliente)}<br /><span className="spb-muted">A cargo: {order.finanzas.delivery_a_cargo}</span></td><td>{money(order.finanzas.fulfillment)}</td><td>{money(order.finanzas.costo_abastecimiento)}</td><td>{estado(order.finanzas.pago_proveedor)}</td><td>{estado(order.finanzas.cobro_cliente)}</td><td>{estado(order.finanzas.estado_financiero)}</td></tr>)}</tbody></table></div>
      </section>
      {(data.solicitudes_abastecimiento || []).length > 0 && <section className="spb-section"><h3>Costos de reposicion</h3><div className="spb-table-scroll"><table className="spb-table"><thead><tr><th>Solicitud</th><th>Mercaderia</th><th>Transporte a deposito</th><th>Estado</th></tr></thead><tbody>{data.solicitudes_abastecimiento.map(solicitud => <tr key={solicitud.id}><td><a href={`/mis-abastecimientos/${solicitud.id}`}>SOL-{solicitud.id}</a></td><td>{money(solicitud.costo_producto)}</td><td>{money(solicitud.costo_logistico)}</td><td>{estado(solicitud.estado)}</td></tr>)}</tbody></table></div></section>}
      <section className="spb-section"><h3>Movimientos de billetera</h3>{wallet.length === 0 ? <p className="spb-muted">Sin movimientos recibidos.</p> : <div className="spb-table-scroll"><table className="spb-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th><th>Concepto</th><th>Referencia</th><th>Detalle</th><th aria-label="Acciones" /></tr></thead><tbody>{wallet.map(event => { const payload = event.payload.data || event.payload.payload; const match = event.conciliacion; return <tr key={event.id}><td>{event.occurred_at ? new Date(event.occurred_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' }) : '-'}</td><td>{payload.direction === 'credit' ? 'Credito' : 'Debito'}</td><td>{money(payload.amount)}</td><td>{match ? conceptos[match.concepto] : 'Sin conciliar'}</td><td>{match?.solicitud_id ? `SOL-${match.solicitud_id}` : match?.envio_id ? `Pedido ${match.envio_id}` : '-'}</td><td className="spb-error-cell">{match?.nota || event.detalle || 'Registrado'}</td><td>{!match && event.event_key?.startsWith('id:') && <button type="button" className="spb-button" disabled={disabled} title="Conciliar movimiento" aria-label={`Conciliar movimiento ${event.id}`} onClick={() => { setMovement(event); setConcept(''); setReference(''); setNote(''); }}><ReceiptText size={16} /></button>}</td></tr>; })}</tbody></table></div>}</section>
    </>}
    {movement && createPortal(<dialog ref={financeDialogRef} className="spb-modal" aria-labelledby="spb-finance-title" onCancel={event => { event.preventDefault(); if (!disabled) closeFinance(); }}>
      <h3 id="spb-finance-title">Conciliar movimiento {movement.id}</h3>
      <p>{money((movement.payload.data || movement.payload.payload).amount)} · {(movement.payload.data || movement.payload.payload).direction === 'credit' ? 'Credito' : 'Debito'}</p>
      <form onSubmit={async event => { event.preventDefault(); event.stopPropagation(); const [type, id] = reference.split(':'); if (await run('conciliar', () => speedboxService.conciliar(movement.id, { concepto: concept, envio_id: type === 'pedido' ? Number(id) : null, solicitud_id: type === 'solicitud' ? Number(id) : null, nota: note }), 'Movimiento conciliado.')) closeFinance(); }}>
        <label className="spb-field">Concepto<select autoFocus required value={concept} disabled={disabled} onChange={event => { setConcept(event.target.value); setReference(''); }}><option value="">Seleccionar concepto</option>{Object.entries(conceptos).filter(([key]) => (movement.payload.data || movement.payload.payload).direction === 'credit' ? ['cobro_cliente', 'otro'].includes(key) : key !== 'cobro_cliente').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="spb-field">Referencia<select required={concept !== 'otro'} value={reference} disabled={disabled} onChange={event => setReference(event.target.value)}><option value="">Sin referencia</option>{data.orders.map(order => <option key={`p${order.envio_id}`} value={`pedido:${order.envio_id}`}>Pedido #{order.envio?.numero_pedido || order.envio_id}</option>)}{concept !== 'cobro_cliente' && (data.solicitudes_abastecimiento || []).map(solicitud => <option key={`s${solicitud.id}`} value={`solicitud:${solicitud.id}`}>SOL-{solicitud.id}</option>)}</select></label>
        <label className="spb-field">Nota de conciliacion<textarea required minLength={3} maxLength={500} rows={3} value={note} disabled={disabled} onChange={event => setNote(event.target.value)} /></label>
        <div className="spb-actions"><button type="button" className="spb-button" disabled={disabled} onClick={closeFinance}>Cancelar</button><button type="submit" className="spb-button spb-primary" disabled={disabled || !concept || (concept !== 'otro' && !reference) || note.trim().length < 3}><ReceiptText size={16} /> Conciliar</button></div>
      </form>
    </dialog>, document.body)}
    {retryOrder && <dialog ref={dialogRef} className="spb-modal" aria-labelledby="spb-retry-title" onCancel={event => { event.preventDefault(); if (!disabled) closeRetry(); }}>
      <h3 id="spb-retry-title">Reintentar pedido {retryOrder.envio_id}</h3>
      <p>{uncertain ? 'Speedbox podria haber recibido este pedido. Verifica su ID externo antes de reenviarlo.' : 'Se enviara nuevamente el pedido con los datos corregidos.'}</p>
      <code>{retryOrder.external_order_id}</code>
      {uncertain && <label className="spb-checkbox"><input autoFocus type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> Verifique en Speedbox y el pedido no existe</label>}
      <div className="spb-actions"><button type="button" className="spb-button" disabled={disabled} onClick={closeRetry}>Cancelar</button><button autoFocus={!uncertain} type="button" className="spb-button spb-primary" disabled={disabled || (uncertain && !acknowledged)} onClick={async () => { if (await run('retry', () => speedboxService.reintentar(retryOrder.envio_id, acknowledged), 'Pedido enviado.')) closeRetry(); }}><RefreshCw size={16} /> Reintentar</button></div>
    </dialog>}
  </div>;
}
