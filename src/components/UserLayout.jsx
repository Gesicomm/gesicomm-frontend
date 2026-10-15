import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store, LogOut, Grid, ShoppingCart, Megaphone, Settings, User,
  GraduationCap, Lock, Sparkles, X, Menu, LayoutDashboard,
  Receipt, Truck, PanelLeftClose, Bot, BadgeDollarSign, MapPin, PackageCheck,
  PackageSearch, Circle, ChevronDown, ChevronRight, Check, Plus, TrendingUp, Ship
} from 'lucide-react';
import { verificarSesion, cerrarSesion } from '../utils/auth';
import { getProgresoSidebar } from '../services/educacionApi';
import { planesService } from '../services/planesService';
import { notificationsService } from '../services/notifications.service';
import { tiendaService } from '../services/tiendaService';
import NotificationBell from './NotificationBell';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';
import PerfilModal from './PerfilModal';
import './dashboard.css';
import '../pages/vitrina/vitrina.css';
import '../pages/educacion/EducacionView.css';

// Editor de landing: el contenedor principal no se desplaza nunca (cada panel
// tiene su propio scroll). Con overflow:hidden igual se podia correr por codigo
// o por el navegador (scrollIntoView, foco) y la pantalla quedaba subida con una
// franja vacia abajo; overflow:clip no es desplazable. Sin soporte, hidden.
const OVERFLOW_FIJO = typeof CSS !== 'undefined' && CSS.supports?.('overflow', 'clip') ? 'clip' : 'hidden';

const ICONOS_SIDEBAR = {
  Store,
  Grid,
  ShoppingCart,
  Megaphone,
  Settings,
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  Receipt,
  Truck,
  Bot,
  BadgeDollarSign,
  MapPin,
  PackageCheck,
  PackageSearch,
  Ship,
  Circle,
  TrendingUp,
};

const UserLayout = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [progresoSidebar, setProgresoSidebar] = useState({
    menusDesbloqueados: [],
    bloqueos: {},
    modulos: [],
  });
  const [modalBloqueo, setModalBloqueo] = useState(null); // { menu, moduloRequerido, moduloId }
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopClosed, setDesktopClosed] = useState(false);
  const [tiendaActiva, setTiendaActiva] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [tiendaMenuAbierto, setTiendaMenuAbierto] = useState(false);
  const [cambiandoTienda, setCambiandoTienda] = useState(false);
  const [perfilModalAbierto, setPerfilModalAbierto] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // La RUTA manda sobre sessionStorage para decidir qué menú se muestra.
  // sessionStorage es por pestaña y se pierde en vueltas externas como el OAuth
  // de Meta: al volver a /automatizacion/configuracion el valor ya no estaba y,
  // como la condición era !== 'marca_personal', caía al menú de e-commerce.
  const enMarcaPersonal =
    location.pathname.startsWith('/automatizacion') ||
    sessionStorage.getItem('moduloActivo') === 'marca_personal';

  useEffect(() => {
    const handleUsuarioActualizado = (e) => {
      if (e?.detail) {
        setUsuario((prev) => ({ ...(prev || {}), ...e.detail }));
      }
    };
    window.addEventListener('usuario-actualizado', handleUsuarioActualizado);
    return () => {
      window.removeEventListener('usuario-actualizado', handleUsuarioActualizado);
    };
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [vencidosCount, setVencidosCount] = useState(0);

  // Ocultar automáticamente en rutas de edición de landing
  const isLandingRoute = Boolean(
    location.pathname.match(/\/(mi-landing|landing)\/[a-zA-Z0-9_-]+/) ||
    location.pathname.includes('/mi-landing/producto/')
  );

  useEffect(() => {
    if (isLandingRoute) {
      setDesktopClosed(true);
    } else {
      setDesktopClosed(false);
    }
  }, [isLandingRoute]);

  const refreshNotifications = async () => {
    try {
      const data = await notificationsService.getNotifications({ leida: false, limit: 50 });
      setNotifications(data.data || []);
      setUnreadCount(data.no_leidas || 0);
      setVencidosCount(data.seguimientos_vencidos || 0);
    } catch (e) {
      console.error('Error fetching notifications', e);
    }
  };

  useEffect(() => {
    let activo = true;
    verificarSesion().then((sesion) => {
      if (!activo) return;
      setUsuario(sesion);
      if (sesion?.rol === 'usuario') {
        planesService.miEstado()
          .then(estado => { if (activo) setEstadoCuenta(estado); })
          .catch(() => { if (activo) setEstadoCuenta(null); });
        // Qué tienda está activa — para mostrarlo siempre visible en el
        // sidebar. null es un estado válido (sin tienda activa todavía).
        tiendaService.obtener()
          .then(tienda => { if (activo) setTiendaActiva(tienda); })
          .catch(() => { if (activo) setTiendaActiva(null); });
        // Todas sus tiendas, para el combo de cambio rápido.
        tiendaService.mias()
          .then(lista => { if (activo) setTiendas(Array.isArray(lista) ? lista : []); })
          .catch(() => { if (activo) setTiendas([]); });
      } else {
        setEstadoCuenta(null);
      }
    });
    cargarProgreso();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!usuario) return;
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [usuario]);

  const cargarProgreso = async () => {
    try {
      const data = await getProgresoSidebar();
      setProgresoSidebar({
        ...data,
        bloqueos: data.bloqueos || data.menusBloqueados || data.menus_bloqueados || {},
        modulos: Array.isArray(data.modulos) ? data.modulos : [],
      });
    } catch (err) {
      console.error('Error al cargar progreso del sidebar:', err);
      setProgresoSidebar(prev => ({
        ...prev,
        modulos: [],
      }));
    }
  };

  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = '/login';
  };

  // Recarga completa (no navigate): los datos de casi toda la app —
  // pedidos, dashboard, costos, notificaciones— dependen de la tienda
  // activa y ya se cargaron en memoria con la tienda anterior.
  const cambiarTienda = async (tienda) => {
    if (cambiandoTienda || tienda.id === tiendaActiva?.id) { setTiendaMenuAbierto(false); return; }
    setCambiandoTienda(true);
    try {
      await tiendaService.seleccionar(tienda.id);
      window.location.href = '/mi-dashboard';
    } catch (e) {
      console.error('Error al cambiar de tienda', e);
      setCambiandoTienda(false);
    }
  };

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);
  const codigoPlan = estadoCuenta?.suscripcion?.plan?.codigo || null;

  // Comprueba si una ruta está bloqueada por requerimientos pedagógicos
  const checkBloqueo = (menuKey) => {
    if (!progresoSidebar?.bloqueos) return null;
    return progresoSidebar.bloqueos[menuKey] || null;
  };

  const handleItemClick = (e, item, bloqueo) => {
    if (bloqueo) {
      e.preventDefault();
      setModalBloqueo({
        menu: item.label,
        ...bloqueo,
      });
    } else {
      setMobileOpen(false);
    }
  };

  const renderLink = (item) => {
    const active = isActive(item.path) || (item.prefix && isActivePrefix(item.prefix))
      || (item.path === '/mis-pedidos' && isActive('/pedidos/configuracion'));
    const menuKey = item.menuKey || item.path.replace('/', '');
    const bloqueo = checkBloqueo(menuKey);
    const danger = !bloqueo && item.danger;

    return (
      <li key={item.path} className="sidebar-item">
        <Link
          to={bloqueo ? '#' : item.path}
          onClick={(e) => handleItemClick(e, item, bloqueo)}
          className={`sidebar-link ${active ? 'active' : ''} ${bloqueo ? 'locked-link' : ''}`}
          style={bloqueo ? { opacity: 0.65 } : {}}
        >
          <span className="sidebar-icon" style={danger ? { color: "var(--color-danger)" } : {}}>
            {bloqueo ? <Lock size={14} style={{ color: "var(--color-warning)" }} /> : item.icon}
          </span>
          <span style={{ flex: 1, ...(danger ? { color: "var(--color-danger)", fontWeight: 600 } : {}) }}>{item.label}</span>
          {bloqueo && (
            <span style={{
              fontSize: '10px',
              background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
              color: "var(--color-warning)",
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              Bloqueado
            </span>
          )}
          {item.badge && !item.badgeDanger && (
            <span style={{
              fontSize: '10px',
              background: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
              color: "var(--color-primary-text)",
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              {item.badge}
            </span>
          )}
          {item.badgeDanger && (
            <span style={{
              fontSize: '10px',
              background: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
              color: "var(--color-danger)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              boxShadow: "0 0 6px color-mix(in srgb, var(--color-danger) 50%, transparent)"
            }}>
              {item.badgeDanger}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const normalizarItemSidebar = (item) => {
    const Icono = ICONOS_SIDEBAR[item.icono] || Circle;
    const badgeDanger = item.dangerBadgeKey === 'seguimientos_vencidos' && vencidosCount > 0
      ? vencidosCount
      : null;
    const menuKey = item.menuKey || item.menu_key;
    const label = item.label || item.etiqueta;

    return {
      ...item,
      label,
      menuKey,
      icon: <Icono size={14} />,
      danger: Boolean(badgeDanger),
      badgeDanger,
    };
  };

  const moduloEsVisible = (item) => {
    const rolesPermitidos = item.rolesPermitidos || item.roles_permitidos || [];
    if (Array.isArray(rolesPermitidos) && rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario?.rol)) {
      return false;
    }

    const requierePlan = item.requierePlan || item.requiere_plan;
    if (requierePlan && requierePlan !== codigoPlan) {
      return false;
    }

    return true;
  };

  const renderSidebarDinamico = () => {
    const contexto = enMarcaPersonal ? 'marca_personal' : 'ecommerce';
    const modulosBase = progresoSidebar.modulos;
    const grupos = modulosBase
      .filter((item) => item.contexto === contexto)
      // La configuración de flujos se abre desde Gestión Comercial.
      // Filtrar también el catálogo del servidor conserva la ubicación
      // cuando una cuenta aún recibe el módulo anterior en el sidebar.
      .filter((item) => (item.menuKey || item.menu_key) !== 'pedidos-configuracion' && item.path !== '/pedidos/configuracion')
      .filter(moduloEsVisible)
      .reduce((acc, item) => {
        const seccion = usuario?.rol === 'solo_pedidos' && item.menuKey === 'mis-pedidos'
          ? 'VENTAS'
          : item.seccion;
        if (!acc.has(seccion)) acc.set(seccion, []);
        acc.get(seccion).push(normalizarItemSidebar(item));
        return acc;
      }, new Map());

    const secciones = Array.from(grupos.entries());
    return secciones.map(([seccion, items]) => (
      <React.Fragment key={`${contexto}-${seccion}`}>
        <div className="sidebar-section-label" style={{ color: "var(--color-fg-muted)", fontSize: '10px', fontWeight: 700 }}>
          {seccion}
        </div>
        <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <ul className="sidebar-list">
            {items.map(renderLink)}
          </ul>
        </div>
      </React.Fragment>
    ));
  };

  return (
    <div className="dashboard-layout user-layout-container">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-ink/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar fixed inset-y-0 left-0 transition-transform duration-200 ease-out z-40 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          desktopClosed ? 'lg:hidden' : 'lg:static lg:translate-x-0'
        }`}
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <header className="sidebar-header" style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <Logo size={26} className="text-fg" />
            <span style={{ fontSize: '0.68rem', color: "var(--color-fg-muted)", textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Panel de Usuario
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <NotificationBell 
              notifications={notifications} 
              unreadCount={unreadCount} 
              onMarkAsRead={async (id) => {
                await notificationsService.markAsRead(id);
                refreshNotifications();
              }}
              onMarkAllAsRead={async () => {
                await notificationsService.markAllAsRead();
                refreshNotifications();
              }}
              onRefresh={refreshNotifications}
              align="left"
            />
            <ThemeToggle className="h-8 w-8 !border-none" />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() => setDesktopClosed(true)}
              className="hidden h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:flex"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </header>

        {usuario?.rol === 'usuario' && tiendaActiva && (
          <div style={{ position: 'relative', margin: '0.5rem 0.75rem' }}>
            <button
              type="button"
              onClick={() => setTiendaMenuAbierto(v => !v)}
              title="Cambiar de tienda"
              aria-expanded={tiendaMenuAbierto}
              aria-haspopup="listbox"
              disabled={cambiandoTienda}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                padding: '0.55rem 0.75rem', borderRadius: '8px',
                border: '1px solid var(--color-border)', background: 'var(--color-canvas)',
                cursor: cambiandoTienda ? 'wait' : 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary-text)", overflow: 'hidden',
              }}>
                {tiendaActiva.logo_imagen
                  ? <img src={tiendaActiva.logo_imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Store size={12} />}
              </span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-fg)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {tiendaActiva.nombre}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, color: "var(--color-fg-muted)", transform: tiendaMenuAbierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {tiendaMenuAbierto && (
              <>
                <div
                  onClick={() => setTiendaMenuAbierto(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  aria-hidden="true"
                />
                <ul
                  role="listbox"
                  aria-label="Tus tiendas"
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    padding: '0.35rem', margin: 0, listStyle: 'none',
                    maxHeight: '260px', overflowY: 'auto',
                  }}
                >
                  {tiendas.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={t.id === tiendaActiva.id}
                        onClick={() => cambiarTienda(t)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                          padding: '0.5rem 0.6rem', borderRadius: '6px', border: 'none',
                          background: t.id === tiendaActiva.id ? 'rgba(61, 95, 163, 0.12)' : 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary-text)", overflow: 'hidden',
                        }}>
                          {t.logo_imagen
                            ? <img src={t.logo_imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Store size={11} />}
                        </span>
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--color-fg)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.nombre}
                        </span>
                        {t.id === tiendaActiva.id && <Check size={14} style={{ flexShrink: 0, color: "var(--color-primary-text)" }} />}
                      </button>
                    </li>
                  ))}
                  <li style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => { setTiendaMenuAbierto(false); navigate('/onboarding', { state: { nueva: true } }); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                        padding: '0.5rem 0.6rem', borderRadius: '6px', border: 'none',
                        background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        fontSize: '0.78rem', color: "var(--color-fg-muted, var(--color-fg-muted))",
                      }}
                    >
                      <Plus size={14} /> Crear otra tienda
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
        )}

        <nav aria-label="Navegación de usuario" className="sidebar-nav-container">
          {renderSidebarDinamico()}
        </nav>

        <footer className="sidebar-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setPerfilModalAbierto(true)}
            className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors hover:bg-surface-2 group cursor-pointer border border-transparent hover:border-border bg-transparent mb-1"
            title="Editar perfil y contraseña"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: "color-mix(in srgb, var(--color-primary) 20%, transparent)", color: "var(--color-primary-text)",
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 'bold', flexShrink: 0
              }}>
                {usuario?.nombre ? usuario.nombre.slice(0, 1).toUpperCase() : <User size={12} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--color-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {usuario?.nombre || usuario?.email || 'Mi Perfil'}
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  color: "var(--color-fg-subtle, var(--color-fg-muted))",
                }}>
                  Editar perfil
                </span>
              </div>
            </div>
            <ChevronRight size={13} className="text-fg-subtle group-hover:text-fg transition-colors flex-shrink-0" />
          </button>
          <ul className="sidebar-list">
            {renderLink({ 
              path: enMarcaPersonal ? '/automatizacion/configuracion' : '/configuracion', 
              label: 'Configuración', 
              icon: <Settings size={14} /> 
            })}
            <li className="sidebar-item">
              <button className="logout-btn destructive" onClick={handleLogout} style={{ width: '100%' }}>
                <span className="sidebar-icon"><LogOut size={14} /></span>
                Salir
              </button>
            </li>
          </ul>
        </footer>
      </aside>

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className={`flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4 ${desktopClosed ? '' : 'lg:hidden'}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setDesktopClosed(false);
                } else {
                  setMobileOpen(true);
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <Logo size={24} className="text-fg" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <NotificationBell 
              notifications={notifications} 
              unreadCount={unreadCount} 
              onMarkAsRead={async (id) => {
                await notificationsService.markAsRead(id);
                refreshNotifications();
              }}
              onMarkAllAsRead={async () => {
                await notificationsService.markAllAsRead();
                refreshNotifications();
              }}
              onRefresh={refreshNotifications}
            />
            <ThemeToggle className="h-8 w-8 !border-none" />
          </div>
        </header>

        <main
          className="dashboard-main"
          style={{
            background: 'var(--color-canvas)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            padding: 0,
            overflowY: isLandingRoute ? OVERFLOW_FIJO : 'auto',
            overflowX: isLandingRoute ? OVERFLOW_FIJO : undefined,
          }}
        >
          {children}
        </main>
      </div>

      {/* Modal de Advertencia de Bloqueo por Módulo no Aprobado */}
      {modalBloqueo && (
        <div className="examen-modal-overlay">
          <div className="sidebar-locked-modal">
            <div className="sidebar-locked-icon">
              <Lock size={32} />
            </div>
            <h3>Sección Bloqueada</h3>
            <p>
              Para acceder a <strong>{modalBloqueo.menu}</strong>, primero debes completar y aprobar la evaluación del curso:
              <br />
              <strong style={{ color: "var(--color-primary-text)", display: 'block', marginTop: '0.5rem' }}>
                "{modalBloqueo.tituloModulo || 'Módulo Requerido'}"
              </strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn-academia-action secondary"
                onClick={() => setModalBloqueo(null)}
              >
                Entendido
              </button>
              <button
                className="btn-academia-action primary"
                onClick={() => {
                  setModalBloqueo(null);
                  navigate('/academia');
                }}
              >
                <GraduationCap size={16} /> Ir a la Academia
              </button>
            </div>
          </div>
        </div>
      )}
      <PerfilModal
        isOpen={perfilModalAbierto}
        onClose={() => setPerfilModalAbierto(false)}
        usuarioActual={usuario}
        onUsuarioActualizado={(u) => setUsuario((prev) => ({ ...(prev || {}), ...u }))}
      />
    </div>
  );
};

export default UserLayout;
