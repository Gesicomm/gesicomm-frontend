import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Link2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Unlink,
  Users,
} from 'lucide-react';
import useSesion from '../hooks/useSesion';
import shopifyService from '../services/shopifyService';

const cardStyle = {
  background: 'var(--color-surface, var(--color-bg))',
  border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
  borderRadius: '14px',
  padding: '1.5rem',
};

const inputStyle = {
  width: '100%',
  borderRadius: '10px',
  border: '1px solid color-mix(in srgb, var(--color-fg) 16%, transparent)',
  background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)',
  color: 'var(--color-fg)',
  padding: '0.65rem 0.95rem',
  fontSize: '15px',
  outline: 'none',
};

const secondaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.6rem 1rem',
  borderRadius: '10px',
  border: '1px solid color-mix(in srgb, var(--color-fg) 16%, transparent)',
  background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
  color: 'var(--color-fg)',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

export default function ShopifyIntegration({ embeddedInSettings = false } = {}) {
  const { usuario, cargando: cargandoSesion } = useSesion();
  const [searchParams] = useSearchParams();
  const shopParam = searchParams.get('shop') || '';
  const connectedParam = searchParams.get('connected');
  const errorParam = searchParams.get('error');

  const [modoConexion, setModoConexion] = useState('credentials');
  const [shopInput, setShopInput] = useState(shopParam);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(true);

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncingAction, setSyncingAction] = useState('');

  const [activeTab, setActiveTab] = useState('pedidos');
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteQuery, setClienteQuery] = useState('');
  const [loadingTab, setLoadingTab] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [logs, setLogs] = useState([]);

  const cargarEstado = useCallback(async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const data = await shopifyService.getStatus();
      setStatusData(data);
      setLogs(data.logs || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No pudimos cargar el estado de Shopify.');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      cargarEstado();
    }
  }, [usuario, cargarEstado]);

  useEffect(() => {
    if (!usuario || !shopParam || connectedParam !== '1') return;
    shopifyService
      .linkStore(shopParam)
      .then(() => {
        toast.success(`Tienda ${shopParam} conectada a Gesicom.`);
        cargarEstado();
      })
      .catch(() => {
        cargarEstado();
      });
  }, [usuario, shopParam, connectedParam, cargarEstado]);

  useEffect(() => {
    if (errorParam) {
      toast.error('No se pudo completar la autorización con Shopify. Intentá nuevamente.');
    }
  }, [errorParam]);

  const tiendasConectadas = (statusData?.tiendas || []).filter((t) => t.estado === 'conectado');
  const tiendaActiva = tiendasConectadas[0] || null;
  const permisosRequeridos = Array.isArray(statusData?.permisosRequeridos) ? statusData.permisosRequeridos : [];

  const cargarPedidosShopify = useCallback(async (shopifyTiendaId) => {
    if (!shopifyTiendaId) return;
    setLoadingTab(true);
    try {
      const res = await shopifyService.listPedidos({ shopifyTiendaId, limit: 25 });
      setPedidos(res.pedidos || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No pudimos obtener los pedidos desde Shopify.');
    } finally {
      setLoadingTab(false);
    }
  }, []);

  const cargarClientesShopify = useCallback(async (shopifyTiendaId, query = '') => {
    if (!shopifyTiendaId) return;
    setLoadingTab(true);
    try {
      const res = await shopifyService.listClientes({ shopifyTiendaId, query, limit: 25 });
      setClientes(res.clientes || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No pudimos obtener los clientes desde Shopify.');
    } finally {
      setLoadingTab(false);
    }
  }, []);

  useEffect(() => {
    if (!tiendaActiva) return;
    setMostrarGuia(false);
    if (activeTab === 'pedidos') {
      cargarPedidosShopify(tiendaActiva.id);
    } else if (activeTab === 'clientes') {
      cargarClientesShopify(tiendaActiva.id, clienteQuery);
    }
  }, [tiendaActiva?.id, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConectar = async (e) => {
    e.preventDefault();
    const cleanedShop = shopInput.trim();
    if (!cleanedShop) {
      toast.error('Ingresá el dominio de tu tienda Shopify (ej: mi-tienda.myshopify.com).');
      return;
    }

    if (modoConexion === 'credentials') {
      const cleanedId = clientIdInput.trim();
      const cleanedSecret = clientSecretInput.trim();
      if (!cleanedId || !cleanedSecret) {
        toast.error('Pegá el ID de cliente y el Secreto del cliente de tu app en Dev Dashboard.');
        return;
      }
      setSyncingAction('connect-credentials');
      try {
        const res = await shopifyService.connectWithCredentials({
          shop: cleanedShop,
          clientId: cleanedId,
          clientSecret: cleanedSecret,
        });
        toast.success(`Tienda ${res.tienda?.shop_name || res.tienda?.shop_domain} conectada.`);
        setClientSecretInput('');
        await cargarEstado();
      } catch (err) {
        toast.error(err?.response?.data?.message || 'No pudimos validar las credenciales con Shopify.');
      } finally {
        setSyncingAction('');
      }
      return;
    }

    const cleanedToken = tokenInput.trim();
    if (!cleanedToken) {
      toast.error('Pegá tu Admin API Access Token (empieza con shpat_).');
      return;
    }

    setSyncingAction('connect-token');
    try {
      const res = await shopifyService.connectWithToken({
        shop: cleanedShop,
        accessToken: cleanedToken,
      });
      toast.success(`Tienda ${res.tienda?.shop_name || res.tienda?.shop_domain} conectada.`);
      setTokenInput('');
      await cargarEstado();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No pudimos conectar con Shopify. Revisá el dominio y el token.');
    } finally {
      setSyncingAction('');
    }
  };

  const handleCopiarPermisos = async () => {
    if (permisosRequeridos.length === 0) return;
    try {
      await navigator.clipboard.writeText(permisosRequeridos.join(', '));
      toast.success('Lista de permisos copiada al portapapeles.');
    } catch {
      toast.error('No se pudo copiar automáticamente.');
    }
  };

  const ejecutarSync = async (tipo, fn, shopifyTiendaId) => {
    setSyncingAction(`${tipo}-${shopifyTiendaId}`);
    try {
      const res = await fn(shopifyTiendaId);
      if (tipo === 'todo') {
        toast.success(
          `Sincronización completa: ${res.productos?.procesados || 0} productos, ${res.stock?.actualizados || 0} stocks, ${res.pedidos?.procesados || 0} pedidos.`
        );
      } else {
        const count = res.procesados ?? res.actualizados ?? 0;
        toast.success(`Sincronización de ${tipo} completada (${count}).`);
      }
      await cargarEstado();
      if (activeTab === 'pedidos') cargarPedidosShopify(shopifyTiendaId);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Error al sincronizar ${tipo}.`);
    } finally {
      setSyncingAction('');
    }
  };

  const handleFiltrarLogs = async (tipo) => {
    setFiltroTipo(tipo);
    try {
      const res = await shopifyService.listLogs(tipo ? { tipo } : {});
      setLogs(res.logs || []);
    } catch {
      toast.error('No pudimos filtrar el historial.');
    }
  };

  const handleDesconectar = async (shopifyTiendaId) => {
    setSyncingAction(`disconnect-${shopifyTiendaId}`);
    try {
      await shopifyService.disconnect(shopifyTiendaId);
      toast.success('Tienda Shopify desconectada.');
      setPedidos([]);
      setClientes([]);
      await cargarEstado();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al desconectar la tienda.');
    } finally {
      setSyncingAction('');
    }
  };

  if (cargandoSesion) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: '16px' }}>
        Cargando integración con Shopify...
      </div>
    );
  }

  if (!usuario) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ ...cardStyle, maxWidth: '34rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.14)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-fg)' }}>Conectar Shopify con Gesicom</h1>
              <p style={{ margin: '0.2rem 0 0', fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                Sincronizá productos, stock, clientes, pedidos y ventas gratis con tu token de Shopify.
              </p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-fg-muted)', lineHeight: 1.55 }}>
            Iniciá sesión en tu cuenta de Gesicom para pegar el token de tu tienda Shopify, seguir la guía paso a paso y empezar a sincronizar tus pedidos, clientes y productos.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link
              to={`/login?redirect=${encodeURIComponent('/configuracion?tab=integracion&proveedor=shopify')}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', borderRadius: '10px', background: '#10b981', color: '#ffffff', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }}
            >
              <Link2 size={16} />
              Iniciar sesión en Gesicom
            </Link>
            <Link to="/privacy" style={{ ...secondaryBtnStyle, textDecoration: 'none' }}>
              Privacidad y Términos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        ...(embeddedInSettings ? {} : { maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }),
      }}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.14)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-fg)' }}>
              Integración con Shopify
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '14px', color: 'var(--color-fg-muted)' }}>
              Conectá tu tienda Shopify usando tu Token de API de administración (sin costo ni aprobaciones externas).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargarEstado}
          disabled={loading}
          style={{ ...secondaryBtnStyle, opacity: loading ? 0.6 : 1 }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Guía paso a paso */}
      <div className="card" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setMostrarGuia((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'var(--color-fg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HelpCircle size={20} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-fg)' }}>
                ¿Cómo obtener tu Token de Shopify en 2 minutos? (Paso a paso)
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                No necesitás pagar ni esperar aprobaciones: creás una app personalizada dentro de tu propio Shopify.
              </p>
            </div>
          </div>
          {mostrarGuia ? <ChevronUp size={18} color="var(--color-fg-muted)" /> : <ChevronDown size={18} color="var(--color-fg-muted)" />}
        </button>

        {mostrarGuia && (
          <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)', paddingTop: '1.25rem', fontSize: '15px', color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>
                Entrá a tu panel de Shopify (<strong style={{ color: 'var(--color-fg)' }}>admin.shopify.com</strong>) y hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Configuración</strong> (abajo a la izquierda).
                <div style={{ fontSize: '13.5px', color: 'var(--color-fg-subtle)', marginTop: '0.2rem' }}>
                  Arriba a la izquierda, debajo del nombre de tu tienda (o en <strong style={{ color: 'var(--color-fg)' }}>Configuración → Dominios</strong>), vas a ver tu dominio exacto <code style={{ color: 'var(--color-fg)' }}>tu-tienda.myshopify.com</code>.
                </div>
              </li>
              <li>
                En el menú izquierdo de <strong style={{ color: 'var(--color-fg)' }}>Configuración</strong>, hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Apps</strong> → botón{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Desarrollar apps</strong> → en la pantalla{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Desarrollo de apps</strong>, hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Desarrollar apps en Dev Dashboard</strong>.
              </li>
              <li>
                En el Dev Dashboard, andá a <strong style={{ color: 'var(--color-fg)' }}>Apps</strong> →{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Crear app</strong> →{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Crear app de forma manual</strong>, ponéle de nombre{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Gesicom</strong>, hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Crear app</strong> y luego en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Lanzar</strong>.
              </li>
              <li>
                Entrá a <strong style={{ color: 'var(--color-fg)' }}>Versiones → Crear versión</strong>, bajá hasta{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Acceso a la API → Alcances</strong>, marcá estos permisos (podés usar{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Seleccionar de la lista</strong>) y hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Lanzar</strong>:
                <div style={{ marginTop: '0.65rem', padding: '0.9rem', borderRadius: '10px', background: 'color-mix(in srgb, var(--color-fg) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)' }}>
                  {permisosRequeridos.length === 0 ? (
                    <span style={{ fontSize: '14px', color: 'var(--color-fg-subtle)' }}>Cargando permisos configurados...</span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem' }}>
                        {permisosRequeridos.map((scope) => (
                          <code
                            key={scope}
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                              color: 'var(--color-fg)',
                            }}
                          >
                            {scope}
                          </code>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopiarPermisos}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', padding: 0, color: '#10b981', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Copy size={15} />
                        Copiar lista de permisos
                      </button>
                    </>
                  )}
                </div>
              </li>
              <li>
                En <strong style={{ color: 'var(--color-fg)' }}>Panel general → Instalaciones</strong>, hacé clic en{' '}
                <strong style={{ color: 'var(--color-fg)' }}>App de prueba</strong>, elegí tu tienda y autorizá la instalación.
              </li>
              <li>
                Entrá a <strong style={{ color: 'var(--color-fg)' }}>Configuración → Credenciales</strong> en el Dev Dashboard, copiá tu{' '}
                <strong style={{ color: 'var(--color-fg)' }}>ID de cliente</strong> y tu{' '}
                <strong style={{ color: 'var(--color-fg)' }}>Secreto del cliente</strong> (haciendo clic en el ojo para revelarlo) y pegalos en el formulario de abajo.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Formulario de conexión */}
      <form onSubmit={handleConectar} className="card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <KeyRound size={18} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-fg)' }}>
              Conectar tu tienda Shopify
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setModoConexion('credentials')}
              style={{
                ...secondaryBtnStyle,
                padding: '0.4rem 0.75rem',
                fontSize: '13px',
                background: modoConexion === 'credentials' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                borderColor: modoConexion === 'credentials' ? '#10b981' : 'color-mix(in srgb, var(--color-fg) 14%, transparent)',
                color: modoConexion === 'credentials' ? '#10b981' : 'var(--color-fg-muted)',
              }}
            >
              ID y Secreto (Dev Dashboard)
            </button>
            <button
              type="button"
              onClick={() => setModoConexion('token')}
              style={{
                ...secondaryBtnStyle,
                padding: '0.4rem 0.75rem',
                fontSize: '13px',
                background: modoConexion === 'token' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                borderColor: modoConexion === 'token' ? '#10b981' : 'color-mix(in srgb, var(--color-fg) 14%, transparent)',
                color: modoConexion === 'token' ? '#10b981' : 'var(--color-fg-muted)',
              }}
            >
              Token heredado (shpat_)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-fg)' }}>
              Dominio de tu tienda Shopify
            </label>
            <input
              type="text"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              placeholder="mi-tienda.myshopify.com"
              style={inputStyle}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-fg-subtle)' }}>
              Usá el dominio interno de Shopify (ej: <code>mi-tienda.myshopify.com</code>).
            </span>
          </div>

          {modoConexion === 'credentials' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-fg)' }}>
                  ID de cliente (Client ID)
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="61a932c262d84dffd7b2..."
                  style={inputStyle}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-fg-subtle)' }}>
                  Copiado desde <strong>Configuración → Credenciales</strong> en Dev Dashboard.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-fg)' }}>
                  Secreto del cliente (Client Secret)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecretInput}
                    onChange={(e) => setClientSecretInput(e.target.value)}
                    placeholder="shpss_xxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? 'Ocultar secreto' : 'Mostrar secreto'}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-fg-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--color-fg-subtle)' }}>
                  Se guarda cifrado y Gesicom renueva el acceso automáticamente.
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-fg)' }}>
                Admin API Access Token
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-fg-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--color-fg-subtle)' }}>
                Solo para apps personalizadas heredadas que muestran <code>shpat_...</code>.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={syncingAction === 'connect-token' || syncingAction === 'connect-credentials'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: (syncingAction === 'connect-token' || syncingAction === 'connect-credentials') ? 0.6 : 1,
            }}
          >
            <KeyRound size={16} />
            {(syncingAction === 'connect-token' || syncingAction === 'connect-credentials') ? 'Validando conexión...' : 'Conectar tienda'}
          </button>
        </div>
      </form>

      {/* Tiendas conectadas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-fg)' }}>
          Tiendas conectadas
        </h3>

        {tiendasConectadas.length === 0 ? (
          <div className="card" style={{ ...cardStyle, color: 'var(--color-fg-muted)', fontSize: '15px' }}>
            Todavía no tenés ninguna tienda Shopify conectada. Seguí los 6 pasos de arriba para conectar la tuya.
          </div>
        ) : (
          tiendasConectadas.map((tienda) => (
            <div key={tienda.id} className="card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-fg)' }}>
                      {tienda.shop_name || tienda.shop_domain}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.65rem', borderRadius: '999px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <CheckCircle2 size={13} />
                      Conectada
                    </span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                    {tienda.shop_domain}
                    {tienda.currency ? ` · Moneda: ${tienda.currency}` : ''}
                    {tienda.ultima_sincronizacion_at
                      ? ` · Última sincronización: ${new Date(tienda.ultima_sincronizacion_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDesconectar(tienda.id)}
                  disabled={Boolean(syncingAction)}
                  style={{ ...secondaryBtnStyle, borderColor: 'rgba(244, 63, 94, 0.35)', color: '#f43f5e' }}
                >
                  <Unlink size={15} />
                  Desconectar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => ejecutarSync('todo', shopifyService.syncTodo, tienda.id)}
                  disabled={Boolean(syncingAction)}
                  style={{ ...secondaryBtnStyle, background: '#10b981', borderColor: '#10b981', color: '#ffffff', fontWeight: 600 }}
                >
                  <RefreshCw size={15} className={syncingAction === `todo-${tienda.id}` ? 'spin' : ''} />
                  Sincronizar todo
                </button>
                <button
                  type="button"
                  onClick={() => ejecutarSync('productos', shopifyService.syncProductos, tienda.id)}
                  disabled={Boolean(syncingAction)}
                  style={secondaryBtnStyle}
                >
                  <Package size={15} />
                  Productos
                </button>
                <button
                  type="button"
                  onClick={() => ejecutarSync('stock', shopifyService.syncStock, tienda.id)}
                  disabled={Boolean(syncingAction)}
                  style={secondaryBtnStyle}
                >
                  <Boxes size={15} />
                  Stock
                </button>
                <button
                  type="button"
                  onClick={() => ejecutarSync('pedidos', shopifyService.syncPedidos, tienda.id)}
                  disabled={Boolean(syncingAction)}
                  style={secondaryBtnStyle}
                >
                  <ShoppingCart size={15} />
                  Pedidos y ventas
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pedidos, Clientes e Historial */}
      {tiendaActiva && (
        <div className="card" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)', paddingBottom: '0.85rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { id: 'pedidos', label: 'Pedidos de Shopify', Icon: ShoppingCart },
                { id: 'clientes', label: 'Clientes de Shopify', Icon: Users },
                { id: 'logs', label: 'Historial', Icon: RefreshCw },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  style={{
                    ...secondaryBtnStyle,
                    background: activeTab === id ? 'color-mix(in srgb, var(--color-primary) 16%, transparent)' : 'transparent',
                    borderColor: activeTab === id ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                    color: activeTab === id ? 'var(--color-primary-text)' : 'var(--color-fg-muted)',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'clientes' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  cargarClientesShopify(tiendaActiva.id, clienteQuery);
                }}
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <input
                  type="text"
                  value={clienteQuery}
                  onChange={(e) => setClienteQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  style={{ ...inputStyle, width: 'auto', minWidth: '180px', padding: '0.45rem 0.75rem', fontSize: '14px' }}
                />
                <button type="submit" style={secondaryBtnStyle}>
                  <Search size={14} />
                  Buscar
                </button>
              </form>
            )}
          </div>

          {activeTab === 'pedidos' && (
            loadingTab ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fg-muted)' }}>Cargando pedidos desde Shopify...</p>
            ) : pedidos.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fg-muted)' }}>No hay pedidos recientes en esta tienda.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-fg-muted)' }}>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Pedido</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Fecha</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Cliente</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Pago</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Envío</th>
                      <th style={{ padding: '0.6rem 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', color: 'var(--color-fg)' }}>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>{p.customer_name}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)' }}>{p.financial_status}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)' }}>{p.fulfillment_status}</td>
                        <td style={{ padding: '0.65rem 0', fontWeight: 600 }}>{p.total_price} {p.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'clientes' && (
            loadingTab ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fg-muted)' }}>Cargando clientes desde Shopify...</p>
            ) : clientes.length === 0 ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fg-muted)' }}>No encontramos clientes en esta tienda.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-fg-muted)' }}>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Nombre</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Email</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Teléfono</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Ciudad</th>
                      <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Pedidos</th>
                      <th style={{ padding: '0.6rem 0' }}>Total gastado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', color: 'var(--color-fg)' }}>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)' }}>{c.email || '—'}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)' }}>{c.phone || '—'}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)' }}>{c.city || '—'}</td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>{c.orders_count}</td>
                        <td style={{ padding: '0.65rem 0', fontWeight: 600 }}>{c.total_spent} {c.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {['', 'token', 'productos', 'stock', 'pedidos', 'webhook', 'oauth'].map((tipo) => (
                  <button
                    key={tipo || 'todos'}
                    type="button"
                    onClick={() => handleFiltrarLogs(tipo)}
                    style={{
                      ...secondaryBtnStyle,
                      padding: '0.4rem 0.75rem',
                      fontSize: '13px',
                      background: filtroTipo === tipo ? 'color-mix(in srgb, var(--color-primary) 16%, transparent)' : 'transparent',
                      borderColor: filtroTipo === tipo ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-fg) 12%, transparent)',
                      color: filtroTipo === tipo ? 'var(--color-primary-text)' : 'var(--color-fg-muted)',
                    }}
                  >
                    {tipo || 'Todos'}
                  </button>
                ))}
              </div>
              {logs.length === 0 ? (
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fg-muted)' }}>Sin eventos registrados todavía.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)', color: 'var(--color-fg-muted)' }}>
                        <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Fecha</th>
                        <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Tipo</th>
                        <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Estado</th>
                        <th style={{ padding: '0.6rem 0.75rem 0.6rem 0' }}>Cantidad</th>
                        <th style={{ padding: '0.6rem 0' }}>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', color: 'var(--color-fg)' }}>
                          <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at || log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', fontWeight: 600 }}>{log.tipo}</td>
                          <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>
                            <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: log.estado === 'ok' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)', color: log.estado === 'ok' ? '#10b981' : '#f43f5e' }}>
                              {log.estado}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>{log.cantidad}</td>
                          <td style={{ padding: '0.65rem 0', color: 'var(--color-fg-muted)' }}>
                            {log.mensaje_error || (log.detalle ? JSON.stringify(log.detalle) : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
