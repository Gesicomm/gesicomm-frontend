import { numeroPedidoVisible } from '../../lib/pedidoNumero';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Loader,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { speedboxService } from '../../services/speedboxService';
import { apiOrigin } from '../../utils/apiBase';
import './speedbox.css';

const labels = {
  spec: 'Autenticación y especificación',
  store: 'Creación de tienda RAHA',
  order: 'Recepción de pedido',
  updates: 'Consulta de estados y billetera',
  webhook: 'Webhook de cambio de estado',
};
const money = value => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(value || 0);
const conceptos = { pago_proveedor: 'Pago al proveedor', costo_abastecimiento: 'Costo de abastecimiento', envio: 'Envio', cobro_cliente: 'Cobro al cliente', otro: 'Otro' };
const estado = value => (value || '-').replaceAll('_', ' ');
const ambiente = value => value === 'production' ? 'Produccion' : value === 'sandbox' ? 'Sandbox' : '-';
const tiendaRaha = order => order.raha_tienda_id ? `#${order.raha_tienda_id}${order.raha_store_name ? ` · ${order.raha_store_name}` : ''}` : '-';

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

function sandboxWebhookFromData(data) {
  const raw = data?.sandbox_webhook_url || data?.webhook_url || (data ? webhookUrlFallback('sandbox') : '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.searchParams.set('environment', 'sandbox');
    return url.href;
  } catch {
    return raw;
  }
}

function connectionByEnvironment(data, environment) {
  return (data?.connections || []).find(conn => conn.environment === environment)
    || (data?.connection?.environment === environment ? data.connection : null);
}

function limpiarPayload(payload = {}) {
  const limpio = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      limpio[key] = value;
    }
  }
  return limpio;
}

function PaginacionDinamica({ paginacion, loading, onChangePage, onChangeLimit }) {
  const { page = 1, limit = 10, total = 0, totalPages = 1 } = paginacion || {};
  if (total === 0 && totalPages <= 1) return null;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="spb-pagination">
      <div className="spb-pagination-info">
        <span>Mostrando {start} - {end} de {total} registros</span>
        {loading && <Loader size={14} className="spb-spin" aria-label="Cargando página" />}
      </div>
      <div className="spb-pagination-controls">
        <label className="spb-pagination-limit">
          <span>Por pág:</span>
          <select value={limit} disabled={loading} onChange={e => onChangeLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          type="button"
          className="spb-button spb-page-btn"
          disabled={loading || page <= 1}
          onClick={() => onChangePage(page - 1)}
          aria-label="Página anterior"
          title="Anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="spb-page-current">Pág {page} de {Math.max(1, totalPages)}</span>
        <button
          type="button"
          className="spb-button spb-page-btn"
          disabled={loading || page >= totalPages}
          onClick={() => onChangePage(page + 1)}
          aria-label="Página siguiente"
          title="Siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function SpeedboxConfig({ onConfigChange } = {}) {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(false);
  const [productionActive, setProductionActive] = useState(false);
  const [busy, setBusy] = useState('cargar');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [productionPublicKey, setProductionPublicKey] = useState('');
  const [productionPrivateKey, setProductionPrivateKey] = useState('');
  const financeDialogRef = useRef(null);
  const [movement, setMovement] = useState(null);
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // Movimientos de billetera state
  const [movimientosItems, setMovimientosItems] = useState([]);
  const [movimientosPaginacion, setMovimientosPaginacion] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [movimientosFiltros, setMovimientosFiltros] = useState({ search: '', movimiento: '', concepto: '' });
  const [searchMovimiento, setSearchMovimiento] = useState('');
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  useEffect(() => {
    if (movement && financeDialogRef.current && !financeDialogRef.current.open) financeDialogRef.current.showModal();
  }, [movement]);
  function closeFinance() { financeDialogRef.current?.close(); setMovement(null); }

  const loadMovimientos = useCallback(async (page = 1, filters = movimientosFiltros, limit = movimientosPaginacion.limit) => {
    if (typeof speedboxService.listarMovimientos !== 'function') return;
    setMovimientosLoading(true);
    try {
      const res = await speedboxService.listarMovimientos(limpiarPayload({ page, limit, ...filters }));
      setMovimientosItems(res.items || []);
      setMovimientosPaginacion(res.paginacion || { page, limit, total: (res.items || []).length, totalPages: 1 });
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setMovimientosLoading(false);
    }
  }, [movimientosFiltros, movimientosPaginacion.limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMovimientosFiltros(prev => {
        if (prev.search === searchMovimiento) return prev;
        const next = { ...prev, search: searchMovimiento };
        loadMovimientos(1, next);
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchMovimiento, loadMovimientos]);

  function applyConfig(config, resetForm = false) {
    setData(config);
    onConfigChange?.();
    const sandbox = connectionByEnvironment(config, 'sandbox') || config.connection;
    const production = connectionByEnvironment(config, 'production');
    setActive(Boolean(sandbox?.activo));
    setProductionActive(Boolean(production?.activo));
    if (resetForm) {
      setPublicKey(sandbox?.public_key || config.public_key || '');
      setProductionPublicKey(production?.public_key || '');
      setPrivateKey('');
      setProductionPrivateKey('');
    } else {
      setPublicKey(prev => prev || sandbox?.public_key || config.public_key || '');
      setProductionPublicKey(prev => prev || production?.public_key || '');
    }

    if (config.events) {
      const walletEvents = config.events.filter(e => e.tipo === 'wallet.transaction');
      setMovimientosItems(walletEvents.map(e => {
        const payload = e.payload?.data || e.payload?.payload || e.payload || {};
        const match = e.conciliacion;
        return {
          id: e.id,
          event_key: e.event_key,
          occurred_at: e.occurred_at,
          direction: payload.direction,
          amount: payload.amount,
          concepto: match ? match.concepto : null,
          referencia_texto: match?.solicitud_id ? `SOL-${match.solicitud_id}` : match?.envio_id ? `Pedido ${match.numero_pedido_visible || '—'}` : '-',
          detalle: match?.nota || e.detalle || 'Registrado',
          puede_conciliar: !match && Boolean(e.event_key?.startsWith('id:')),
          payload: e.payload,
        };
      }));
      setMovimientosPaginacion(p => ({ ...p, total: walletEvents.length, totalPages: Math.ceil(walletEvents.length / p.limit) || 1 }));
    }
  }

  async function load(resetForm = false) {
    const config = await speedboxService.obtener();
    applyConfig(config, resetForm);
    if (typeof speedboxService.listarMovimientos === 'function' && !config.events?.length) {
      loadMovimientos(1, movimientosFiltros);
    }
  }

  useEffect(() => {
    let mounted = true;
    speedboxService.obtener().then(config => {
      if (!mounted) return;
      applyConfig(config);
      if (typeof speedboxService.listarMovimientos === 'function' && !config.events?.length) {
        loadMovimientos(1, movimientosFiltros);
      }
    }).catch(err => {
      if (mounted) setError(err.response?.data?.message || 'No se pudo cargar RAHA.');
    }).finally(() => {
      if (mounted) setBusy('');
    });
    return () => { mounted = false; };
  }, []);

  async function run(action, handler, success, resetForm = false) {
    setBusy(action); setError(''); setMessage('');
    try {
      await handler();
      await load(resetForm);
      setMessage(success);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'No se pudo completar la operacion.');
      return false;
    } finally {
      setBusy('');
    }
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
  const reviews = (data?.events || []).filter(event => event.estado === 'revision' && event.tipo !== 'wallet.transaction');
  const allChecks = Object.keys(labels).every(key => Boolean(data?.checks?.[key]));
  const productionWebhookUrl = productionWebhookFromData(data);
  const sandboxWebhookUrl = sandboxWebhookFromData(data);
  const sandboxStoreActionLabel = sandboxConnection?.tienda_id ? 'Recrear tienda sandbox en RAHA' : 'Crear tienda sandbox en RAHA';
  const productionStoreActionLabel = productionConnection?.tienda_id ? 'Recrear tienda producción en RAHA' : 'Crear tienda producción en RAHA';

  async function copyText(value, success) {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setMessage(success);
    } catch {
      setError('No se pudo copiar. Seleccioná la URL y copiala manualmente.');
    }
  }
  const copySandboxWebhook = () => copyText(sandboxWebhookUrl, 'Webhook sandbox copiado.');
  const copyProductionWebhook = () => copyText(productionWebhookUrl, 'Webhook producción copiado.');

  const availableReferenceOrders = data?.orders || [];
  const availableReferenceSolicitudes = data?.solicitudes_abastecimiento || [];

  if (busy === 'cargar') return <div className="spb-loading" role="status"><Loader size={18} className="spb-spin" /> Cargando RAHA...</div>;
  return (
    <div className="spb-config">
      {error && <div className="spb-alert spb-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
      {message && <div className="spb-alert spb-success" role="status"><Check size={18} /><span>{message}</span></div>}
      {!data ? (
        <button type="button" className="spb-button" disabled={disabled} onClick={() => run('cargar', () => load(true), 'Configuracion actualizada.')}>
          <RefreshCw size={16} /> Reintentar carga
        </button>
      ) : (
        <>
          <section className="spb-section">
            <h3>Portal RAHA</h3>
            <div className="spb-actions">
              {data.production_request_url ? (
                <a className="spb-button" href={data.production_request_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                  <UserPlus size={16} /> Abrir portal RAHA <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : (
                <button type="button" className="spb-button" disabled title="Enlace oficial pendiente de configuracion">
                  <UserPlus size={16} /> Portal RAHA no disponible
                </button>
              )}
              {allChecks && data.production_request_url ? (
                <a className="spb-button spb-primary" href={data.production_request_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                  <ShieldCheck size={16} /> Solicitar habilitación en producción
                </a>
              ) : (
                <button type="button" className="spb-button spb-primary" disabled>
                  <ShieldCheck size={16} /> Solicitar habilitación en producción
                </button>
              )}
            </div>
          </section>

          <section className="spb-section">
            <div className="spb-heading">
              <h3>Credenciales sandbox</h3>
              <span className="spb-badge spb-sandbox">Sandbox</span>
            </div>
            <p className="spb-muted">Guardá la API Key y la API Secret de RAHA para validar sandbox y crear pedidos automáticamente. La API Secret queda cifrada y no se vuelve a mostrar.</p>
            <div className="spb-fields">
              <label className="spb-field" htmlFor="spb-public-key">
                API Key
                <input id="spb-public-key" value={publicKey} disabled={disabled} autoComplete="off" onChange={event => setPublicKey(event.target.value)} placeholder="sbx_..." />
              </label>
              <label className="spb-field" htmlFor="spb-private-key">
                API Secret
                <input id="spb-private-key" value={privateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setPrivateKey(event.target.value)} placeholder={(data?.has_private_key || data?.connection?.has_private_key) ? 'API Secret guardada. Pegá una nueva para reemplazarla.' : 'Pegá la API Secret'} />
              </label>
            </div>
            <dl className="spb-summary">
              <div><dt>Endpoint sandbox</dt><dd>{data.sandbox_endpoint || 'https://speedboxpy.com/api/speedbox_sandbox.php'}</dd></div>
              <div><dt>Endpoint Gesicom para crear tienda</dt><dd>{data.create_store_endpoint || '/api/integraciones/speedbox/store'}</dd></div>
              <div><dt>Tienda RAHA sandbox</dt><dd>{sandboxConnection?.tienda_id || 'Sin vincular'}</dd></div>
              <div><dt>Credenciales</dt><dd>{credentialsAvailable ? 'Guardadas o listas para validar' : 'Pendientes'}</dd></div>
              <div><dt>Webhook sandbox</dt><dd>{sandboxWebhookUrl ? 'Disponible' : data.webhook_configured ? 'Falta URL pública' : 'Pendiente'}</dd></div>
              <div><dt>Webhook producción</dt><dd>{productionWebhookUrl ? 'Disponible' : data.webhook_configured ? 'Falta URL pública' : 'Pendiente'}</dd></div>
              <div><dt>Automatización producción</dt><dd>{data.automatic_enabled && productionConnection?.activo ? 'Activa' : 'Pausada'}</dd></div>
            </dl>
            <div className="spb-actions">
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('save-sandbox', () => speedboxService.guardar({ activo: Boolean(sandboxConnection?.tienda_id), ...credentialsPayload() }), 'Credenciales sandbox guardadas.', true)}>
                <Save size={16} /> Guardar sandbox
              </button>
            </div>
          </section>

          <section className="spb-section">
            <h3>Checks de conexión</h3>
            <ul className="spb-checks">
              {Object.entries(labels).map(([key, label]) => (
                <li key={key}>
                  <span className={data.checks[key] ? 'spb-check-ok' : 'spb-check-pending'}>
                    {data.checks[key] ? <Check size={15} /> : <span aria-hidden="true">-</span>}
                  </span>
                  <span>{label}</span>
                  <span className="spb-muted">{data.checks[key] ? 'Verificado' : 'Pendiente'}</span>
                </li>
              ))}
            </ul>
            <div className="spb-step-grid">
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('spec', () => speedboxService.probar(credentialsPayload()), 'Autenticación verificada.')}>
                <ShieldCheck size={16} /> Probar autenticación
              </button>
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('store', () => speedboxService.vincular({ ...credentialsPayload(), force_recreate: Boolean(sandboxConnection?.tienda_id) }), 'Tienda sandbox creada o vinculada en RAHA.')}>
                <Link2 size={16} /> {sandboxStoreActionLabel}
              </button>
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable || !sandboxConnection?.tienda_id} onClick={() => run('order-test', () => speedboxService.enviarPrueba(credentialsPayload()), 'Pedido sandbox recibido por RAHA.')}>
                <Send size={16} /> Enviar pedido sandbox
              </button>
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable || !sandboxConnection?.tienda_id} onClick={() => run('updates', () => speedboxService.sincronizar(credentialsPayload()), 'Estados y billetera consultados.')}>
                <RefreshCw size={16} /> Consultar estados
              </button>
            </div>
            <div className="spb-webhook-box">
              <div>
                <strong>Webhook sandbox para pruebas</strong>
                <p className="spb-muted">Usá este enlace en el portal sandbox de RAHA. Para probar local necesitás una URL HTTPS pública hacia tu backend local.</p>
              </div>
              {sandboxWebhookUrl ? <code>{sandboxWebhookUrl}</code> : <p className="spb-webhook-missing">Webhook integrado en Gesicom: /api/webhooks/speedbox. Actualizá el panel para obtener la URL pública completa.</p>}
              <button type="button" className="spb-button" disabled={disabled || !sandboxWebhookUrl} title={sandboxWebhookUrl ? 'Copiar webhook sandbox' : 'Webhook pendiente de configuración del servidor'} onClick={copySandboxWebhook}>
                <Copy size={16} /> Copiar sandbox
              </button>
            </div>
            <div className="spb-webhook-box">
              <div>
                <strong>Webhook producción para pegar en RAHA</strong>
                <p className="spb-muted">Usá este enlace solamente cuando RAHA habilite producción.</p>
              </div>
              {productionWebhookUrl ? <code>{productionWebhookUrl}</code> : <p className="spb-webhook-missing">Webhook integrado en Gesicom: /api/webhooks/speedbox. Actualizá el panel para obtener la URL pública completa.</p>}
              <button type="button" className="spb-button" disabled={disabled || !productionWebhookUrl} title={productionWebhookUrl ? 'Copiar webhook producción' : 'Webhook pendiente de configuración del servidor'} onClick={copyProductionWebhook}>
                <Copy size={16} /> Copiar producción
              </button>
            </div>
            {busy && <Loader size={18} className="spb-spin" aria-label="Procesando" />}
          </section>

          <section className="spb-section">
            <div className="spb-heading">
              <h3>Automatización producción</h3>
              <span className={`spb-badge ${data.environment === 'sandbox' ? 'spb-sandbox' : ''}`}>{data.environment === 'sandbox' ? 'Sandbox' : 'Producción'}</span>
            </div>
            <div className="spb-fields">
              <label className="spb-field" htmlFor="spb-production-public-key">
                API Key producción
                <input id="spb-production-public-key" value={productionPublicKey} disabled={disabled} autoComplete="off" onChange={event => setProductionPublicKey(event.target.value)} placeholder="sbx_live_..." />
              </label>
              <label className="spb-field" htmlFor="spb-production-private-key">
                API Secret producción
                <input id="spb-production-private-key" value={productionPrivateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setProductionPrivateKey(event.target.value)} placeholder={productionConnection?.has_private_key ? 'API Secret producción guardada. Pegá una nueva para reemplazarla.' : 'Pegá la API Secret de producción'} />
              </label>
            </div>
            <dl className="spb-summary">
              <div><dt>Tienda RAHA producción</dt><dd>{productionConnection?.tienda_id || 'Sin vincular'}</dd></div>
              <div><dt>Credenciales producción</dt><dd>{productionCredentialsAvailable ? 'Guardadas o listas para operar' : 'Pendientes'}</dd></div>
            </dl>
            <div className="spb-automation-row">
              <p className="spb-muted">RAHA gestiona su propio despacho. Gesicom solo envía a RAHA los pedidos que contengan productos de su catálogo cuando la integración está activa.</p>
              <label className="spb-checkbox">
                <input type="checkbox" checked={productionActive} disabled={disabled || !productionConnection?.tienda_id} onChange={event => setProductionActive(event.target.checked)} /> Integración activa
              </label>
            </div>
            <div className="spb-actions">
              <button type="button" className="spb-button" disabled={disabled || !productionCredentialsAvailable} onClick={() => run('store-production', () => speedboxService.vincular({ ...productionCredentialsPayload(), force_recreate: Boolean(productionConnection?.tienda_id) }), 'Tienda producción creada o vinculada en RAHA.', true)}>
                <Link2 size={16} /> {productionStoreActionLabel}
              </button>
              <button type="button" className="spb-button spb-primary" disabled={disabled || (productionActive && (!productionConnection?.tienda_id || !productionCredentialsAvailable))} onClick={() => run('save-production', () => speedboxService.guardar({ activo: productionActive, ...productionCredentialsPayload() }), 'Configuración producción guardada.', true)}>
                <Save size={16} /> Guardar producción
              </button>
              <button type="button" className="spb-button" disabled={disabled} title="Actualizar panel" aria-label="Actualizar panel" onClick={() => run('refresh', () => load(), 'Panel actualizado.')}>
                <RefreshCw size={16} />
              </button>
            </div>
          </section>

          {reviews.length > 0 && (
            <section className="spb-section">
              <h3>Pendientes de revision</h3>
              <ul className="spb-reviews">
                {reviews.map(event => (
                  <li key={event.id}>
                    <strong>RAHA {event.order_id}</strong>
                    <span>{event.detalle}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* MOVIMIENTOS DE BILLETERA */}

          <section className="spb-section">
            <h3>Movimientos de billetera</h3>
            <div className="spb-toolbar">
              <div className="spb-search-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Buscar movimientos de billetera"
                  placeholder="Buscar en detalle o clave..."
                  value={searchMovimiento}
                  onChange={e => setSearchMovimiento(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por movimiento"
                value={movimientosFiltros.movimiento}
                onChange={e => {
                  const next = { ...movimientosFiltros, movimiento: e.target.value };
                  setMovimientosFiltros(next);
                  loadMovimientos(1, next);
                }}
              >
                <option value="">Todos los movimientos</option>
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
              </select>
              <select
                aria-label="Filtrar por concepto"
                value={movimientosFiltros.concepto}
                onChange={e => {
                  const next = { ...movimientosFiltros, concepto: e.target.value };
                  setMovimientosFiltros(next);
                  loadMovimientos(1, next);
                }}
              >
                <option value="">Todos los conceptos</option>
                <option value="sin_conciliar">Movimientos sin conciliar</option>
                <option value="pago_proveedor">Pago al proveedor</option>
                <option value="costo_abastecimiento">Costo de abastecimiento</option>
                <option value="envio">Envío</option>
                <option value="cobro_cliente">Cobro al cliente</option>
                <option value="otro">Otro</option>
              </select>
              {(searchMovimiento || movimientosFiltros.movimiento || movimientosFiltros.concepto) && (
                <button
                  type="button"
                  className="spb-button"
                  onClick={() => {
                    setSearchMovimiento('');
                    const next = { search: '', movimiento: '', concepto: '' };
                    setMovimientosFiltros(next);
                    loadMovimientos(1, next);
                  }}
                  title="Limpiar filtros"
                >
                  <RotateCcw size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className={`spb-table-scroll ${movimientosLoading ? 'spb-table-loading' : ''}`}>
              <table className="spb-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Movimiento</th>
                    <th>Importe</th>
                    <th>Concepto</th>
                    <th>Referencia</th>
                    <th>Detalle</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {movimientosItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="spb-empty-row">
                        {movimientosLoading ? 'Cargando movimientos...' : 'Sin movimientos recibidos.'}
                      </td>
                    </tr>
                  ) : (
                    movimientosItems.map(event => {
                      const isCredit = event.direction === 'credit' || (event.payload?.data || event.payload?.payload)?.direction === 'credit';
                      const amount = event.amount !== undefined ? event.amount : (event.payload?.data || event.payload?.payload)?.amount;
                      const match = event.conciliacion;
                      const conceptoKey = event.concepto || match?.concepto;
                      const refTexto = event.referencia_texto || (match?.solicitud_id ? `SOL-${match.solicitud_id}` : match?.envio_id ? `Pedido ${match.numero_pedido_visible || '—'}` : (event.solicitud_id ? `SOL-${event.solicitud_id}` : event.numero_pedido_visible || '-'));
                      const detalleTexto = event.detalle || match?.nota || 'Registrado';
                      const puedeConciliar = event.puede_conciliar !== undefined ? event.puede_conciliar : (!match && Boolean(event.event_key?.startsWith('id:')));

                      return (
                        <tr key={event.id}>
                          <td>{event.occurred_at ? new Date(event.occurred_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' }) : '-'}</td>
                          <td>{isCredit ? 'Credito' : 'Debito'}</td>
                          <td>{money(amount)}</td>
                          <td>{conceptoKey ? (conceptos[conceptoKey] || conceptoKey) : 'Sin conciliar'}</td>
                          <td>{refTexto}</td>
                          <td className="spb-error-cell">{detalleTexto}</td>
                          <td>
                            {puedeConciliar && (
                              <button
                                type="button"
                                className="spb-button"
                                disabled={disabled}
                                title="Conciliar movimiento"
                                aria-label={`Conciliar movimiento ${event.id}`}
                                onClick={() => {
                                  setMovement(event);
                                  setConcept('');
                                  setReference('');
                                  setNote('');
                                }}
                              >
                                <ReceiptText size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginacionDinamica
              paginacion={movimientosPaginacion}
              loading={movimientosLoading}
              onChangePage={page => loadMovimientos(page, movimientosFiltros)}
              onChangeLimit={limit => {
                setMovimientosPaginacion(p => ({ ...p, limit }));
                loadMovimientos(1, movimientosFiltros, limit);
              }}
            />
          </section>
        </>
      )}

      {movement && createPortal(
        <dialog ref={financeDialogRef} className="spb-modal" aria-labelledby="spb-finance-title" onCancel={event => { event.preventDefault(); if (!disabled) closeFinance(); }}>
          <h3 id="spb-finance-title">Conciliar movimiento {movement.id}</h3>
          <p>{money(movement.amount !== undefined ? movement.amount : (movement.payload?.data || movement.payload?.payload)?.amount)} · {(movement.direction === 'credit' || (movement.payload?.data || movement.payload?.payload)?.direction === 'credit') ? 'Credito' : 'Debito'}</p>
          <form onSubmit={async event => {
            event.preventDefault();
            event.stopPropagation();
            const [type, id] = reference.split(':');
            if (await run('conciliar', () => speedboxService.conciliar(movement.id, {
              concepto: concept,
              envio_id: type === 'pedido' ? Number(id) : null,
              solicitud_id: type === 'solicitud' ? Number(id) : null,
              nota: note
            }), 'Movimiento conciliado.')) {
              closeFinance();
              loadMovimientos(movimientosPaginacion.page, movimientosFiltros);
            }
          }}>
            <label className="spb-field">
              Concepto
              <select autoFocus required value={concept} disabled={disabled} onChange={event => { setConcept(event.target.value); setReference(''); }}>
                <option value="">Seleccionar concepto</option>
                {Object.entries(conceptos).filter(([key]) => (movement.direction === 'credit' || (movement.payload?.data || movement.payload?.payload)?.direction === 'credit') ? ['cobro_cliente', 'otro'].includes(key) : key !== 'cobro_cliente').map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="spb-field">
              Referencia
              <select required={concept !== 'otro'} value={reference} disabled={disabled} onChange={event => setReference(event.target.value)}>
                <option value="">Sin referencia</option>
                {availableReferenceOrders.map(order => (
                  <option key={`p${order.envio_id || order.id}`} value={`pedido:${order.envio_id || order.id}`}>
                    Pedido {order.numero_pedido_visible || (order.envio ? numeroPedidoVisible(order.envio) : order.envio_id || order.id)}
                  </option>
                ))}
                {concept !== 'cobro_cliente' && availableReferenceSolicitudes.map(solicitud => (
                  <option key={`s${solicitud.id}`} value={`solicitud:${solicitud.id}`}>
                    SOL-{solicitud.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="spb-field">
              Nota de conciliacion
              <textarea required minLength={3} maxLength={500} rows={3} value={note} disabled={disabled} onChange={event => setNote(event.target.value)} />
            </label>
            <div className="spb-actions">
              <button type="button" className="spb-button" disabled={disabled} onClick={closeFinance}>Cancelar</button>
              <button type="submit" className="spb-button spb-primary" disabled={disabled || !concept || (concept !== 'otro' && !reference) || note.trim().length < 3}>
                <ReceiptText size={16} /> Conciliar
              </button>
            </div>
          </form>
        </dialog>,
        document.body
      )}

    </div>
  );
}
