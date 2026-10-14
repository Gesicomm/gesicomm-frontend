import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Copy, ExternalLink, Link2, Loader, ReceiptText, RefreshCw, Save, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { speedboxService } from '../../services/speedboxService';
import { apiOrigin } from '../../utils/apiBase';
import './speedbox.css';

const labels = { spec: 'Autenticación y especificación', order: 'Recepción de pedido', updates: 'Consulta de estados y billetera', webhook: 'Webhook de cambio de estado' };
const money = value => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value);
const conceptos = { pago_proveedor: 'Pago al proveedor', costo_abastecimiento: 'Costo de abastecimiento', envio: 'Envio', cobro_cliente: 'Cobro al cliente', otro: 'Otro' };
const estado = value => (value || '-').replaceAll('_', ' ');

function webhookUrlFallback(environment = 'production') {
  const origin = apiOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return '';
  const url = new URL('/api/webhooks/speedbox', origin);
  url.searchParams.set('environment', environment || 'production');
  return url.href;
}

function productionWebhookFromData(data) {
  const raw = data?.production_webhook_url || data?.webhook_url || (data ? webhookUrlFallback('production') : '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.searchParams.set('environment', 'production');
    return url.href;
  } catch {
    return raw;
  }
}

function connectionByEnvironment(data, environment) {
  return (data?.connections || []).find(conn => conn.environment === environment)
    || (data?.connection?.environment === environment ? data.connection : null);
}

export default function SpeedboxConfig() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(false);
  const [productionActive, setProductionActive] = useState(false);
  const [busy, setBusy] = useState('cargar');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retryOrder, setRetryOrder] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [productionPublicKey, setProductionPublicKey] = useState('');
  const [productionPrivateKey, setProductionPrivateKey] = useState('');
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
    const config = await speedboxService.obtener();
    setData(config);
    if (resetForm) {
      const sandbox = connectionByEnvironment(config, 'sandbox') || config.connection;
      const production = connectionByEnvironment(config, 'production');
      setActive(Boolean(sandbox?.activo));
      setProductionActive(Boolean(production?.activo));
      setPublicKey(sandbox?.public_key || config.public_key || '');
      setProductionPublicKey(production?.public_key || '');
      setPrivateKey('');
      setProductionPrivateKey('');
    }
  }
  useEffect(() => {
    let mounted = true;
    speedboxService.obtener().then(config => {
      if (!mounted) return;
      const sandbox = connectionByEnvironment(config, 'sandbox') || config.connection;
      const production = connectionByEnvironment(config, 'production');
      setData(config);
      setActive(Boolean(sandbox?.activo));
      setProductionActive(Boolean(production?.activo));
      setPublicKey(sandbox?.public_key || config.public_key || '');
      setProductionPublicKey(production?.public_key || '');
      setPrivateKey('');
      setProductionPrivateKey('');
    }).catch(err => { if (mounted) setError(err.response?.data?.message || 'No se pudo cargar RAHA.'); })
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
  const sandboxConnection = connectionByEnvironment(data, 'sandbox') || data?.connection;
  const productionConnection = connectionByEnvironment(data, 'production');
  const credentials = { public_key: publicKey.trim(), private_key: privateKey.trim() };
  const productionCredentials = { public_key: productionPublicKey.trim(), private_key: productionPrivateKey.trim() };
  const credentialsPayload = () => ({
    environment: 'sandbox',
    ...(credentials.public_key ? { public_key: credentials.public_key } : {}),
    ...(credentials.private_key ? { private_key: credentials.private_key } : {}),
  });
  const productionCredentialsPayload = () => ({
    environment: 'production',
    ...(productionCredentials.public_key ? { public_key: productionCredentials.public_key } : {}),
    ...(productionCredentials.private_key ? { private_key: productionCredentials.private_key } : {}),
  });
  const credentialsAvailable = Boolean(credentials.public_key && (credentials.private_key || sandboxConnection?.has_private_key));
  const productionCredentialsAvailable = Boolean(productionCredentials.public_key && (productionCredentials.private_key || productionConnection?.has_private_key));
  const uncertain = retryOrder && ['incierto', 'enviando'].includes(retryOrder.estado);
  const wallet = (data?.events || []).filter(event => event.tipo === 'wallet.transaction');
  const reviews = (data?.events || []).filter(event => event.estado === 'revision' && event.tipo !== 'wallet.transaction');
  const allChecks = data?.checks && Object.values(data.checks).every(Boolean);
  const productionWebhookUrl = productionWebhookFromData(data);

  async function copyWebhook() {
    if (!productionWebhookUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(productionWebhookUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = productionWebhookUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setMessage('Webhook copiado.');
    } catch {
      setError('No se pudo copiar el webhook. Seleccioná la URL y copiala manualmente.');
    }
  }

  if (busy === 'cargar') return <div className="spb-loading" role="status"><Loader size={18} className="spb-spin" /> Cargando RAHA...</div>;
  return <div className="spb-config">
    {error && <div className="spb-alert spb-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
    {message && <div className="spb-alert spb-success" role="status"><Check size={18} /><span>{message}</span></div>}
    {!data ? <button type="button" className="spb-button" disabled={disabled} onClick={() => run('cargar', () => load(true), 'Configuracion actualizada.')}><RefreshCw size={16} /> Reintentar carga</button> : <>
      <section className="spb-section">
        <h3>Portal RAHA</h3>
        <div className="spb-actions">{data.production_request_url
          ? <a className="spb-button" href={data.production_request_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UserPlus size={16} /> Abrir portal RAHA <ExternalLink size={14} aria-hidden="true" /></a>
          : <button type="button" className="spb-button" disabled title="Enlace oficial pendiente de configuracion"><UserPlus size={16} /> Portal RAHA no disponible</button>}
          {allChecks && data.production_request_url
            ? <a className="spb-button spb-primary" href={data.production_request_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ShieldCheck size={16} /> Solicitar habilitación en producción</a>
            : <button type="button" className="spb-button spb-primary" disabled><ShieldCheck size={16} /> Solicitar habilitación en producción</button>}
        </div>
      </section>
      <section className="spb-section">
        <div className="spb-heading"><h3>Credenciales sandbox</h3><span className="spb-badge spb-sandbox">Sandbox</span></div>
        <p className="spb-muted">Guardá las claves de RAHA para validar sandbox y crear pedidos automáticamente. La private key queda cifrada y no se vuelve a mostrar.</p>
        <div className="spb-fields">
          <label className="spb-field" htmlFor="spb-public-key">Public key<input id="spb-public-key" value={publicKey} disabled={disabled} autoComplete="off" onChange={event => setPublicKey(event.target.value)} placeholder="sbx_..." /></label>
          <label className="spb-field" htmlFor="spb-private-key">Private key<input id="spb-private-key" value={privateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setPrivateKey(event.target.value)} placeholder={(data?.has_private_key || data?.connection?.has_private_key) ? 'Private key guardada. Pegá una nueva para reemplazarla.' : 'Pegá la private key'} /></label>
        </div>
        <dl className="spb-summary">
          <div><dt>Endpoint sandbox</dt><dd>{data.sandbox_endpoint || 'https://speedboxpy.com/api/speedbox_sandbox.php'}</dd></div>
          <div><dt>Tienda RAHA sandbox</dt><dd>{sandboxConnection?.tienda_id || 'Sin vincular'}</dd></div>
          <div><dt>Credenciales</dt><dd>{credentialsAvailable ? 'Guardadas o listas para validar' : 'Pendientes'}</dd></div>
          <div><dt>Webhook producción</dt><dd>{productionWebhookUrl ? 'Disponible' : data.webhook_configured ? 'Falta URL pública' : 'Pendiente'}</dd></div>
          <div><dt>Automatización producción</dt><dd>{data.automatic_enabled && productionConnection?.activo ? 'Activa' : 'Pausada'}</dd></div>
        </dl>
        <div className="spb-actions">
          <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('save-sandbox', () => speedboxService.guardar({ activo: true, ...credentialsPayload() }), 'Credenciales sandbox guardadas.', true)}><Save size={16} /> Guardar sandbox</button>
        </div>
      </section>
      <section className="spb-section"><h3>Checks de conexión</h3>
        <ul className="spb-checks">{Object.entries(labels).map(([key, label]) => <li key={key}><span className={data.checks[key] ? 'spb-check-ok' : 'spb-check-pending'}>{data.checks[key] ? <Check size={15} /> : <span aria-hidden="true">-</span>}</span><span>{label}</span><span className="spb-muted">{data.checks[key] ? 'Verificado' : 'Pendiente'}</span></li>)}</ul>
        <div className="spb-step-grid">
          <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('spec', () => speedboxService.probar(credentialsPayload()), 'Autenticación verificada.')}><ShieldCheck size={16} /> Probar autenticación</button>
          <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('store', () => speedboxService.vincular(credentialsPayload()), 'Tienda sandbox vinculada.')}><Link2 size={16} /> Vincular tienda sandbox</button>
          <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable || !sandboxConnection?.tienda_id} onClick={() => run('order-test', () => speedboxService.enviarPrueba(credentialsPayload()), 'Pedido sandbox recibido por RAHA.')}><Send size={16} /> Enviar pedido sandbox</button>
          <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable || !sandboxConnection?.tienda_id} onClick={() => run('updates', () => speedboxService.sincronizar(credentialsPayload()), 'Estados y billetera consultados.')}><RefreshCw size={16} /> Consultar estados</button>
        </div>
        <div className="spb-webhook-box">
          <div><strong>Webhook producción para pegar en RAHA</strong><p className="spb-muted">Usá este enlace en el portal RAHA de producción. Gesicom identifica la tienda por tienda_id u order_id.</p></div>
          {productionWebhookUrl
            ? <code>{productionWebhookUrl}</code>
            : <p className="spb-webhook-missing">Webhook integrado en Gesicom: /api/webhooks/speedbox. Actualizá el panel para obtener la URL pública completa.</p>}
          <button type="button" className="spb-button" disabled={disabled || !productionWebhookUrl} title={productionWebhookUrl ? 'Copiar webhook producción' : 'Webhook pendiente de configuración del servidor'} onClick={copyWebhook}><Copy size={16} /> Copiar webhook</button>
        </div>
        {busy && <Loader size={18} className="spb-spin" aria-label="Procesando" />}
      </section>
      <section className="spb-section">
        <div className="spb-heading"><h3>Automatización producción</h3><span className={`spb-badge ${data.environment === 'sandbox' ? 'spb-sandbox' : ''}`}>{data.environment === 'sandbox' ? 'Sandbox' : 'Producción'}</span></div>
        <div className="spb-fields">
          <label className="spb-field" htmlFor="spb-production-public-key">Public key producción<input id="spb-production-public-key" value={productionPublicKey} disabled={disabled} autoComplete="off" onChange={event => setProductionPublicKey(event.target.value)} placeholder="sbx_live_..." /></label>
          <label className="spb-field" htmlFor="spb-production-private-key">Private key producción<input id="spb-production-private-key" value={productionPrivateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setProductionPrivateKey(event.target.value)} placeholder={productionConnection?.has_private_key ? 'Private key producción guardada. Pegá una nueva para reemplazarla.' : 'Pegá la private key de producción'} /></label>
        </div>
        <dl className="spb-summary">
          <div><dt>Tienda RAHA producción</dt><dd>{productionConnection?.tienda_id || 'Sin vincular'}</dd></div>
          <div><dt>Credenciales producción</dt><dd>{productionCredentialsAvailable ? 'Guardadas o listas para operar' : 'Pendientes'}</dd></div>
        </dl>
        <div className="spb-automation-row">
          <p className="spb-muted">RAHA gestiona su propio despacho. Gesicom solo envía a RAHA los pedidos que contengan productos de su catálogo cuando la integración está activa.</p>
          <label className="spb-checkbox"><input type="checkbox" checked={productionActive} disabled={disabled || !productionConnection?.tienda_id} onChange={event => setProductionActive(event.target.checked)} /> Integración activa</label>
        </div>
        <div className="spb-actions">
          <button type="button" className="spb-button" disabled={disabled || !productionCredentialsAvailable} onClick={() => run('store-production', () => speedboxService.vincular(productionCredentialsPayload()), 'Tienda producción vinculada.', true)}><Link2 size={16} /> Vincular tienda producción</button>
          <button type="button" className="spb-button spb-primary" disabled={disabled || (productionActive && (!productionConnection?.tienda_id || !productionCredentialsAvailable))} onClick={() => run('save-production', () => speedboxService.guardar({ activo: productionActive, ...productionCredentialsPayload() }), 'Configuración producción guardada.', true)}><Save size={16} /> Guardar producción</button>
          <button type="button" className="spb-button" disabled={disabled} title="Actualizar panel" aria-label="Actualizar panel" onClick={() => run('refresh', () => load(), 'Panel actualizado.')}><RefreshCw size={16} /></button>
        </div>
      </section>
      {reviews.length > 0 && <section className="spb-section"><h3>Pendientes de revision</h3><ul className="spb-reviews">{reviews.map(event => <li key={event.id}><strong>RAHA {event.order_id}</strong><span>{event.detalle}</span></li>)}</ul></section>}
      <section className="spb-section"><h3>Pedidos enviados</h3>
        {(data.available_orders || []).length > 0 && <div className="spb-fields"><label className="spb-field" htmlFor="spb-pedido">Pedido confirmado<select id="spb-pedido" value={selectedOrder} disabled={disabled} onChange={event => setSelectedOrder(event.target.value)}><option value="">Seleccionar pedido</option>{data.available_orders.map(order => <option key={order.id} value={order.id}>#{order.numero_pedido} - {order.cliente}</option>)}</select></label><button type="button" className="spb-button" disabled={disabled || !selectedOrder || !productionConnection?.activo} onClick={async () => { if (await run('send', () => speedboxService.enviar(Number(selectedOrder)), 'Pedido enviado.')) setSelectedOrder(''); }}><Send size={16} /> Enviar pedido</button></div>}
        {data.orders.length === 0 ? <p className="spb-muted">Sin pedidos registrados.</p> : <div className="spb-table-scroll"><table className="spb-table"><thead><tr><th>Pedido Gesicomm</th><th>ID RAHA</th><th>Envio</th><th>Estado RAHA</th><th>Detalle</th><th aria-label="Acciones" /></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>#{order.envio?.numero_pedido || order.envio_id}</td><td>{order.order_id || '-'}</td><td>{order.estado}</td><td>{order.status || '-'}</td><td className="spb-error-cell">{order.error || '-'}</td><td>{['error', 'incierto', 'enviando'].includes(order.estado) && <button type="button" className="spb-button" title="Reintentar pedido" aria-label={`Reintentar pedido ${order.envio_id}`} disabled={disabled} onClick={() => { setRetryOrder(order); setAcknowledged(false); }}><RefreshCw size={15} /></button>}</td></tr>)}</tbody></table></div>}</section>
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
      <p>{uncertain ? 'RAHA podría haber recibido este pedido. Verificá su ID externo antes de reenviarlo.' : 'Se enviará nuevamente el pedido con los datos corregidos.'}</p>
      <code>{retryOrder.external_order_id}</code>
      {uncertain && <label className="spb-checkbox"><input autoFocus type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> Verifiqué en RAHA y el pedido no existe</label>}
      <div className="spb-actions"><button type="button" className="spb-button" disabled={disabled} onClick={closeRetry}>Cancelar</button><button autoFocus={!uncertain} type="button" className="spb-button spb-primary" disabled={disabled || (uncertain && !acknowledged)} onClick={async () => { if (await run('retry', () => speedboxService.reintentar(retryOrder.envio_id, acknowledged), 'Pedido enviado.')) closeRetry(); }}><RefreshCw size={16} /> Reintentar</button></div>
    </dialog>}
  </div>;
}
