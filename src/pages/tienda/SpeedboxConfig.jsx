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

  // 1. Pedidos enviados state
  const [pedidosItems, setPedidosItems] = useState([]);
  const [pedidosPaginacion, setPedidosPaginacion] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [pedidosFiltros, setPedidosFiltros] = useState({ search: '', ambiente: '', estado: '', status: '' });
  const [searchPedido, setSearchPedido] = useState('');
  const [pedidosLoading, setPedidosLoading] = useState(false);

  // 2. Importes por pedido state
  const [importesItems, setImportesItems] = useState([]);
  const [importesPaginacion, setImportesPaginacion] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [importesFiltros, setImportesFiltros] = useState({ search: '', pago_proveedor: '', cobro_cliente: '', estado_financiero: '' });
  const [searchImporte, setSearchImporte] = useState('');
  const [importesLoading, setImportesLoading] = useState(false);

  // 3. Costos de reposición state
  const [costosItems, setCostosItems] = useState([]);
  const [costosPaginacion, setCostosPaginacion] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [costosFiltros, setCostosFiltros] = useState({ search: '', estado: '' });
  const [searchCosto, setSearchCosto] = useState('');
  const [costosLoading, setCostosLoading] = useState(false);

  // 4. Movimientos de billetera state
  const [movimientosItems, setMovimientosItems] = useState([]);
  const [movimientosPaginacion, setMovimientosPaginacion] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [movimientosFiltros, setMovimientosFiltros] = useState({ search: '', movimiento: '', concepto: '' });
  const [searchMovimiento, setSearchMovimiento] = useState('');
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  useEffect(() => {
    if (retryOrder && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [retryOrder]);
  function closeRetry() { dialogRef.current?.close(); setRetryOrder(null); }

  useEffect(() => {
    if (movement && financeDialogRef.current && !financeDialogRef.current.open) financeDialogRef.current.showModal();
  }, [movement]);
  function closeFinance() { financeDialogRef.current?.close(); setMovement(null); }

  const loadPedidos = useCallback(async (page = 1, filters = pedidosFiltros, limit = pedidosPaginacion.limit) => {
    if (typeof speedboxService.listarPedidos !== 'function') return;
    setPedidosLoading(true);
    try {
      const res = await speedboxService.listarPedidos(limpiarPayload({ page, limit, ...filters }));
      setPedidosItems(res.items || []);
      setPedidosPaginacion(res.paginacion || { page, limit, total: (res.items || []).length, totalPages: 1 });
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setPedidosLoading(false);
    }
  }, [pedidosFiltros, pedidosPaginacion.limit]);

  const loadImportes = useCallback(async (page = 1, filters = importesFiltros, limit = importesPaginacion.limit) => {
    if (typeof speedboxService.listarImportes !== 'function') return;
    setImportesLoading(true);
    try {
      const res = await speedboxService.listarImportes(limpiarPayload({ page, limit, ...filters }));
      setImportesItems(res.items || []);
      setImportesPaginacion(res.paginacion || { page, limit, total: (res.items || []).length, totalPages: 1 });
    } catch (err) {
      console.error('Error cargando importes:', err);
    } finally {
      setImportesLoading(false);
    }
  }, [importesFiltros, importesPaginacion.limit]);

  const loadCostos = useCallback(async (page = 1, filters = costosFiltros, limit = costosPaginacion.limit) => {
    if (typeof speedboxService.listarCostosReposicion !== 'function') return;
    setCostosLoading(true);
    try {
      const res = await speedboxService.listarCostosReposicion(limpiarPayload({ page, limit, ...filters }));
      setCostosItems(res.items || []);
      setCostosPaginacion(res.paginacion || { page, limit, total: (res.items || []).length, totalPages: 1 });
    } catch (err) {
      console.error('Error cargando costos:', err);
    } finally {
      setCostosLoading(false);
    }
  }, [costosFiltros, costosPaginacion.limit]);

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

  // Debounced search updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setPedidosFiltros(prev => {
        if (prev.search === searchPedido) return prev;
        const next = { ...prev, search: searchPedido };
        loadPedidos(1, next);
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchPedido, loadPedidos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setImportesFiltros(prev => {
        if (prev.search === searchImporte) return prev;
        const next = { ...prev, search: searchImporte };
        loadImportes(1, next);
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchImporte, loadImportes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCostosFiltros(prev => {
        if (prev.search === searchCosto) return prev;
        const next = { ...prev, search: searchCosto };
        loadCostos(1, next);
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchCosto, loadCostos]);

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

    // Populate fallback items from config if provided (useful for tests and SSR)
    if (config.orders) {
      setPedidosItems(config.orders);
      setPedidosPaginacion(p => ({ ...p, total: config.orders.length, totalPages: Math.ceil(config.orders.length / p.limit) || 1 }));
      const importes = config.orders.filter(o => o.finanzas).map(o => ({
        id: o.id,
        envio_id: o.envio_id,
        envio: o.envio,
        numero_pedido_visible: o.envio ? numeroPedidoVisible(o.envio) : '-',
        venta: o.finanzas.venta,
        envio_cliente: o.finanzas.envio_cliente,
        delivery_a_cargo: o.finanzas.delivery_a_cargo,
        fulfillment: o.finanzas.fulfillment,
        costo_abastecimiento: o.finanzas.costo_abastecimiento,
        pago_proveedor: o.finanzas.pago_proveedor,
        cobro_cliente: o.finanzas.cobro_cliente,
        estado_financiero: o.finanzas.estado_financiero,
      }));
      setImportesItems(importes);
      setImportesPaginacion(p => ({ ...p, total: importes.length, totalPages: Math.ceil(importes.length / p.limit) || 1 }));
    }
    if (config.solicitudes_abastecimiento) {
      setCostosItems(config.solicitudes_abastecimiento);
      setCostosPaginacion(p => ({ ...p, total: config.solicitudes_abastecimiento.length, totalPages: Math.ceil(config.solicitudes_abastecimiento.length / p.limit) || 1 }));
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
    if (typeof speedboxService.listarPedidos === 'function' && !config.orders?.length) {
      loadPedidos(1, pedidosFiltros);
    }
    if (typeof speedboxService.listarImportes === 'function' && !config.orders?.length) {
      loadImportes(1, importesFiltros);
    }
    if (typeof speedboxService.listarCostosReposicion === 'function' && !config.solicitudes_abastecimiento?.length) {
      loadCostos(1, costosFiltros);
    }
    if (typeof speedboxService.listarMovimientos === 'function' && !config.events?.length) {
      loadMovimientos(1, movimientosFiltros);
    }
  }

  useEffect(() => {
    let mounted = true;
    speedboxService.obtener().then(config => {
      if (!mounted) return;
      applyConfig(config);
      if (typeof speedboxService.listarPedidos === 'function' && !config.orders?.length) {
        loadPedidos(1, pedidosFiltros);
      }
      if (typeof speedboxService.listarImportes === 'function' && !config.orders?.length) {
        loadImportes(1, importesFiltros);
      }
      if (typeof speedboxService.listarCostosReposicion === 'function' && !config.solicitudes_abastecimiento?.length) {
        loadCostos(1, costosFiltros);
      }
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
  const uncertain = retryOrder && ['incierto', 'enviando'].includes(retryOrder.estado);
  const reviews = (data?.events || []).filter(event => event.estado === 'revision' && event.tipo !== 'wallet.transaction');
  const allChecks = data?.checks && Object.values(data.checks).every(Boolean);
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

  const availableReferenceOrders = (pedidosItems.length > 0 ? pedidosItems : (data?.orders || []));
  const availableReferenceSolicitudes = (costosItems.length > 0 ? costosItems : (data?.solicitudes_abastecimiento || []));

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
            <p className="spb-muted">Guardá las claves de RAHA para validar sandbox y crear pedidos automáticamente. La private key queda cifrada y no se vuelve a mostrar.</p>
            <div className="spb-fields">
              <label className="spb-field" htmlFor="spb-public-key">
                Public key
                <input id="spb-public-key" value={publicKey} disabled={disabled} autoComplete="off" onChange={event => setPublicKey(event.target.value)} placeholder="sbx_..." />
              </label>
              <label className="spb-field" htmlFor="spb-private-key">
                Private key
                <input id="spb-private-key" value={privateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setPrivateKey(event.target.value)} placeholder={(data?.has_private_key || data?.connection?.has_private_key) ? 'Private key guardada. Pegá una nueva para reemplazarla.' : 'Pegá la private key'} />
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
              <button type="button" className="spb-button" disabled={disabled || !credentialsAvailable} onClick={() => run('save-sandbox', () => speedboxService.guardar({ activo: true, ...credentialsPayload() }), 'Credenciales sandbox guardadas.', true)}>
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
                Public key producción
                <input id="spb-production-public-key" value={productionPublicKey} disabled={disabled} autoComplete="off" onChange={event => setProductionPublicKey(event.target.value)} placeholder="sbx_live_..." />
              </label>
              <label className="spb-field" htmlFor="spb-production-private-key">
                Private key producción
                <input id="spb-production-private-key" value={productionPrivateKey} disabled={disabled} autoComplete="off" type="password" onChange={event => setProductionPrivateKey(event.target.value)} placeholder={productionConnection?.has_private_key ? 'Private key producción guardada. Pegá una nueva para reemplazarla.' : 'Pegá la private key de producción'} />
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

          {/* 1. PEDIDOS ENVIADOS */}
          <section className="spb-section">
            <h3>Pedidos enviados</h3>
            {(data.available_orders || []).length > 0 && (
              <div className="spb-fields">
                <label className="spb-field" htmlFor="spb-pedido">
                  Pedido confirmado
                  <select id="spb-pedido" value={selectedOrder} disabled={disabled} onChange={event => setSelectedOrder(event.target.value)}>
                    <option value="">Seleccionar pedido</option>
                    {data.available_orders.map(order => (
                      <option key={order.id} value={order.id}>{numeroPedidoVisible(order)} - {order.cliente}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="spb-button"
                  disabled={disabled || !selectedOrder || !productionConnection?.activo}
                  onClick={async () => {
                    if (await run('send', () => speedboxService.enviar(Number(selectedOrder)), 'Pedido enviado.')) {
                      setSelectedOrder('');
                      loadPedidos(1, pedidosFiltros);
                      loadImportes(1, importesFiltros);
                    }
                  }}
                >
                  <Send size={16} /> Enviar pedido
                </button>
              </div>
            )}

            <div className="spb-toolbar">
              <div className="spb-search-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Buscar pedidos enviados"
                  placeholder="Buscar pedido, ID externo, ID RAHA..."
                  value={searchPedido}
                  onChange={e => setSearchPedido(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por ambiente"
                value={pedidosFiltros.ambiente}
                onChange={e => {
                  const next = { ...pedidosFiltros, ambiente: e.target.value };
                  setPedidosFiltros(next);
                  loadPedidos(1, next);
                }}
              >
                <option value="">Todos los ambientes</option>
                <option value="sandbox">Sandbox</option>
                <option value="production">Producción</option>
              </select>
              <select
                aria-label="Filtrar por estado de envío"
                value={pedidosFiltros.estado}
                onChange={e => {
                  const next = { ...pedidosFiltros, estado: e.target.value };
                  setPedidosFiltros(next);
                  loadPedidos(1, next);
                }}
              >
                <option value="">Todos los envíos</option>
                <option value="enviado">Enviado</option>
                <option value="enviando">Enviando</option>
                <option value="incierto">Incierto</option>
                <option value="error">Error</option>
                <option value="pendiente">Pendiente</option>
              </select>
              <select
                aria-label="Filtrar por estado RAHA"
                value={pedidosFiltros.status}
                onChange={e => {
                  const next = { ...pedidosFiltros, status: e.target.value };
                  setPedidosFiltros(next);
                  loadPedidos(1, next);
                }}
              >
                <option value="">Todos los estados RAHA</option>
                <option value="pendiente_confirmacion">Pendiente confirmación</option>
                <option value="en_camino">En camino</option>
                <option value="entregado">Entregado</option>
                <option value="devuelto">Devuelto</option>
                <option value="cancelado">Cancelado</option>
              </select>
              {(searchPedido || pedidosFiltros.ambiente || pedidosFiltros.estado || pedidosFiltros.status) && (
                <button
                  type="button"
                  className="spb-button"
                  onClick={() => {
                    setSearchPedido('');
                    const next = { search: '', ambiente: '', estado: '', status: '' };
                    setPedidosFiltros(next);
                    loadPedidos(1, next);
                  }}
                  title="Limpiar filtros"
                >
                  <RotateCcw size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className={`spb-table-scroll ${pedidosLoading ? 'spb-table-loading' : ''}`}>
              <table className="spb-table">
                <thead>
                  <tr>
                    <th>Pedido Gesicomm</th>
                    <th>Ambiente</th>
                    <th>Tienda RAHA</th>
                    <th>ID externo</th>
                    <th>ID RAHA</th>
                    <th>Envio</th>
                    <th>Estado RAHA</th>
                    <th>HTTP</th>
                    <th>Detalle</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {pedidosItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="spb-empty-row">
                        {pedidosLoading ? 'Cargando pedidos...' : 'Sin pedidos registrados.'}
                      </td>
                    </tr>
                  ) : (
                    pedidosItems.map(order => (
                      <tr key={order.id}>
                        <td>{order.numero_pedido_visible || (order.envio ? numeroPedidoVisible(order.envio) : '-')}</td>
                        <td>{ambiente(order.environment)}</td>
                        <td>{tiendaRaha(order)}</td>
                        <td><code>{order.external_order_id}</code></td>
                        <td>{order.order_id || '-'}</td>
                        <td>{order.estado}</td>
                        <td>{order.status || '-'}</td>
                        <td>{order.remote_http_status || '-'}</td>
                        <td className="spb-error-cell">{order.error || '-'}</td>
                        <td>
                          {['error', 'incierto', 'enviando'].includes(order.estado) && (
                            <button
                              type="button"
                              className="spb-button"
                              title="Reintentar pedido"
                              aria-label={`Reintentar pedido ${order.envio_id}`}
                              disabled={disabled}
                              onClick={() => { setRetryOrder(order); setAcknowledged(false); }}
                            >
                              <RefreshCw size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginacionDinamica
              paginacion={pedidosPaginacion}
              loading={pedidosLoading}
              onChangePage={page => loadPedidos(page, pedidosFiltros)}
              onChangeLimit={limit => {
                setPedidosPaginacion(p => ({ ...p, limit }));
                loadPedidos(1, pedidosFiltros, limit);
              }}
            />
          </section>

          {/* 2. IMPORTES POR PEDIDO */}
          <section className="spb-section">
            <h3>Importes por pedido</h3>
            <div className="spb-toolbar">
              <div className="spb-search-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Buscar importes por pedido"
                  placeholder="Buscar por pedido..."
                  value={searchImporte}
                  onChange={e => setSearchImporte(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por pago a proveedor"
                value={importesFiltros.pago_proveedor}
                onChange={e => {
                  const next = { ...importesFiltros, pago_proveedor: e.target.value };
                  setImportesFiltros(next);
                  loadImportes(1, next);
                }}
              >
                <option value="">Todos los pagos proveedor</option>
                <option value="no_requiere">No requiere</option>
                <option value="pendiente">Pendiente</option>
                <option value="validado">Validado</option>
              </select>
              <select
                aria-label="Filtrar por cobro al cliente"
                value={importesFiltros.cobro_cliente}
                onChange={e => {
                  const next = { ...importesFiltros, cobro_cliente: e.target.value };
                  setImportesFiltros(next);
                  loadImportes(1, next);
                }}
              >
                <option value="">Todos los cobros cliente</option>
                <option value="contra_entrega">Contra entrega</option>
                <option value="anticipado">Anticipado</option>
              </select>
              <select
                aria-label="Filtrar por estado de liquidación"
                value={importesFiltros.estado_financiero}
                onChange={e => {
                  const next = { ...importesFiltros, estado_financiero: e.target.value };
                  setImportesFiltros(next);
                  loadImportes(1, next);
                }}
              >
                <option value="">Todas las liquidaciones</option>
                <option value="pendiente_liquidacion">Pendiente liquidación</option>
                <option value="liquidado">Liquidado</option>
              </select>
              {(searchImporte || importesFiltros.pago_proveedor || importesFiltros.cobro_cliente || importesFiltros.estado_financiero) && (
                <button
                  type="button"
                  className="spb-button"
                  onClick={() => {
                    setSearchImporte('');
                    const next = { search: '', pago_proveedor: '', cobro_cliente: '', estado_financiero: '' };
                    setImportesFiltros(next);
                    loadImportes(1, next);
                  }}
                  title="Limpiar filtros"
                >
                  <RotateCcw size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className={`spb-table-scroll ${importesLoading ? 'spb-table-loading' : ''}`}>
              <table className="spb-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Venta</th>
                    <th>Envio</th>
                    <th>Fulfillment</th>
                    <th>Abastecimiento</th>
                    <th>Pago proveedor</th>
                    <th>Cobro cliente</th>
                    <th>Liquidacion</th>
                  </tr>
                </thead>
                <tbody>
                  {importesItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="spb-empty-row">
                        {importesLoading ? 'Cargando importes...' : 'Sin importes registrados.'}
                      </td>
                    </tr>
                  ) : (
                    importesItems.map(item => {
                      const venta = item.venta !== undefined ? item.venta : item.finanzas?.venta;
                      const envioCliente = item.envio_cliente !== undefined ? item.envio_cliente : item.finanzas?.envio_cliente;
                      const deliveryACargo = item.delivery_a_cargo || item.finanzas?.delivery_a_cargo;
                      const fulfillment = item.fulfillment !== undefined ? item.fulfillment : item.finanzas?.fulfillment;
                      const abastecimiento = item.costo_abastecimiento !== undefined ? item.costo_abastecimiento : item.finanzas?.costo_abastecimiento;
                      const pagoProveedor = item.pago_proveedor || item.finanzas?.pago_proveedor;
                      const cobroCliente = item.cobro_cliente || item.finanzas?.cobro_cliente;
                      const liquidacion = item.estado_financiero || item.finanzas?.estado_financiero;

                      return (
                        <tr key={item.id}>
                          <td>{item.numero_pedido_visible || (item.envio ? numeroPedidoVisible(item.envio) : '-')}</td>
                          <td>{money(venta)}</td>
                          <td>
                            {money(envioCliente)}
                            <br />
                            <span className="spb-muted">A cargo: {deliveryACargo}</span>
                          </td>
                          <td>{money(fulfillment)}</td>
                          <td>{money(abastecimiento)}</td>
                          <td>{estado(pagoProveedor)}</td>
                          <td>{estado(cobroCliente)}</td>
                          <td>{estado(liquidacion)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginacionDinamica
              paginacion={importesPaginacion}
              loading={importesLoading}
              onChangePage={page => loadImportes(page, importesFiltros)}
              onChangeLimit={limit => {
                setImportesPaginacion(p => ({ ...p, limit }));
                loadImportes(1, importesFiltros, limit);
              }}
            />
          </section>

          {/* 3. COSTOS DE REPOSICION */}
          <section className="spb-section">
            <h3>Costos de reposicion</h3>
            <div className="spb-toolbar">
              <div className="spb-search-wrap">
                <Search size={15} aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Buscar costo de reposición"
                  placeholder="Buscar solicitud (ej: SOL-24)..."
                  value={searchCosto}
                  onChange={e => setSearchCosto(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por estado de solicitud"
                value={costosFiltros.estado}
                onChange={e => {
                  const next = { ...costosFiltros, estado: e.target.value };
                  setCostosFiltros(next);
                  loadCostos(1, next);
                }}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente_pago">Pendiente pago</option>
                <option value="pago_validado">Pago validado</option>
                <option value="en_transito">En tránsito</option>
                <option value="recepcionado">Recepcionado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              {(searchCosto || costosFiltros.estado) && (
                <button
                  type="button"
                  className="spb-button"
                  onClick={() => {
                    setSearchCosto('');
                    const next = { search: '', estado: '' };
                    setCostosFiltros(next);
                    loadCostos(1, next);
                  }}
                  title="Limpiar filtros"
                >
                  <RotateCcw size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className={`spb-table-scroll ${costosLoading ? 'spb-table-loading' : ''}`}>
              <table className="spb-table">
                <thead>
                  <tr>
                    <th>Solicitud</th>
                    <th>Mercaderia</th>
                    <th>Transporte a deposito</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {costosItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="spb-empty-row">
                        {costosLoading ? 'Cargando costos...' : 'Sin solicitudes de reposición.'}
                      </td>
                    </tr>
                  ) : (
                    costosItems.map(solicitud => (
                      <tr key={solicitud.id}>
                        <td><a href={`/mis-abastecimientos/${solicitud.id}`}>SOL-{solicitud.id}</a></td>
                        <td>{money(solicitud.costo_producto)}</td>
                        <td>{money(solicitud.costo_logistico)}</td>
                        <td>{estado(solicitud.estado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginacionDinamica
              paginacion={costosPaginacion}
              loading={costosLoading}
              onChangePage={page => loadCostos(page, costosFiltros)}
              onChangeLimit={limit => {
                setCostosPaginacion(p => ({ ...p, limit }));
                loadCostos(1, costosFiltros, limit);
              }}
            />
          </section>

          {/* 4. MOVIMIENTOS DE BILLETERA */}
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

      {retryOrder && (
        <dialog ref={dialogRef} className="spb-modal" aria-labelledby="spb-retry-title" onCancel={event => { event.preventDefault(); if (!disabled) closeRetry(); }}>
          <h3 id="spb-retry-title">Reintentar pedido {retryOrder.envio_id}</h3>
          <p>{uncertain ? 'RAHA podría haber recibido este pedido. Verificá su ID externo antes de reenviarlo.' : 'Se enviará nuevamente el pedido con los datos corregidos.'}</p>
          <code>{retryOrder.external_order_id}</code>
          {uncertain && (
            <label className="spb-checkbox">
              <input autoFocus type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> Verifiqué en RAHA y el pedido no existe
            </label>
          )}
          <div className="spb-actions">
            <button type="button" className="spb-button" disabled={disabled} onClick={closeRetry}>Cancelar</button>
            <button
              autoFocus={!uncertain}
              type="button"
              className="spb-button spb-primary"
              disabled={disabled || (uncertain && !acknowledged)}
              onClick={async () => {
                if (await run('retry', () => speedboxService.reintentar(retryOrder.envio_id, acknowledged), 'Pedido enviado.')) {
                  closeRetry();
                  loadPedidos(pedidosPaginacion.page, pedidosFiltros);
                }
              }}
            >
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
