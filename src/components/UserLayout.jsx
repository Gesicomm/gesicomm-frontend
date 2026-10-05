import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store, LogOut, Grid, ShoppingCart, Megaphone, Settings, User,
  GraduationCap, Lock, Sparkles, X, Menu, LayoutDashboard,
  Receipt, Truck, PanelLeftClose, Bot, BadgeDollarSign, MapPin, PackageCheck,
  Circle
} from 'lucide-react';
import { verificarSesion, cerrarSesion } from '../utils/auth';
import { getProgresoSidebar } from '../services/educacionApi';
import { planesService } from '../services/planesService';
import { notificationsService } from '../services/notifications.service';
import NotificationBell from './NotificationBell';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';
import './dashboard.css';
import '../pages/vitrina/vitrina.css';
import '../pages/educacion/EducacionView.css';

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
  Circle,
};

const SIDEBAR_FALLBACK = [
  { contexto: 'ecommerce', seccion: 'VENTAS', path: '/mi-tienda', label: 'Mi tienda', icono: 'Store', menuKey: 'mi-tienda', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'VENTAS', path: '/mi-tienda/depositos', label: 'Depósitos', icono: 'MapPin', menuKey: 'mi-tienda-depositos', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'VENTAS', path: '/mi-catalogo', label: 'Productos', icono: 'Grid', menuKey: 'mi-catalogo', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'MARKETING', path: '/landing', label: 'Páginas de venta', icono: 'Sparkles', menuKey: 'landing', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'MARKETING', path: '/mis-anuncios', label: 'Publicidad', icono: 'Megaphone', menuKey: 'mis-anuncios', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'OPERACIONES', path: '/mis-pedidos', label: 'Pedidos', icono: 'ShoppingCart', menuKey: 'mis-pedidos', dangerBadgeKey: 'seguimientos_vencidos' },
  { contexto: 'ecommerce', seccion: 'OPERACIONES', path: '/inventario', label: 'Inventario / Ingresos', icono: 'PackageCheck', menuKey: 'inventario', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'OPERACIONES', path: '/mis-abastecimientos', label: 'Mis Abastecimientos', icono: 'Truck', menuKey: 'mis-abastecimientos', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'OPERACIONES', path: '/pedidos/configuracion', label: 'Flujos y plantillas', icono: 'Settings', menuKey: 'pedidos-configuracion', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'ANÁLISIS', path: '/mi-dashboard', label: 'Dashboard', icono: 'LayoutDashboard', menuKey: 'mi-dashboard', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'ANÁLISIS', path: '/finanzas/costos-gastos', label: 'Control financiero', icono: 'Receipt', menuKey: 'finanzas-costos-gastos', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'ANÁLISIS', path: '/finanzas/proveedores', label: 'Proveedores', icono: 'Truck', menuKey: 'finanzas-proveedores', rolesPermitidos: ['administrador'] },
  { contexto: 'ecommerce', seccion: 'APRENDIZAJE', path: '/academia', label: 'Academia & Cursos', icono: 'GraduationCap', menuKey: 'academia', badge: 'PRO', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'ecommerce', seccion: 'AFILIADOS', path: '/afiliados', label: 'Quiero ser afiliado', icono: 'BadgeDollarSign', menuKey: 'afiliados', requierePlan: 'founders', rolesPermitidos: ['usuario', 'administrador'] },
  { contexto: 'marca_personal', seccion: 'MARCA PERSONAL', path: '/automatizacion', label: 'Automation Hub', icono: 'Bot', menuKey: 'automatizacion', rolesPermitidos: ['usuario', 'administrador'] },
];

const UserLayout = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [progresoSidebar, setProgresoSidebar] = useState({
    menusDesbloqueados: [],
    bloqueos: {},
    modulos: null,
  });
  const [modalBloqueo, setModalBloqueo] = useState(null); // { menu, moduloRequerido, moduloId }
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopClosed, setDesktopClosed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // La RUTA manda sobre sessionStorage para decidir qué menú se muestra.
  // sessionStorage es por pestaña y se pierde en vueltas externas como el OAuth
  // de Meta: al volver a /automatizacion/configuracion el valor ya no estaba y,
  // como la condición era !== 'marca_personal', caía al menú de e-commerce.
  const enMarcaPersonal =
    location.pathname.startsWith('/automatizacion') ||
    sessionStorage.getItem('moduloActivo') === 'marca_personal';

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
        modulos: Array.isArray(data.modulos) ? data.modulos : null,
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
    const active = isActive(item.path) || (item.prefix && isActivePrefix(item.prefix));
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
          <span className="sidebar-icon" style={danger ? { color: '#ef4444' } : {}}>
            {bloqueo ? <Lock size={14} style={{ color: '#fbbf24' }} /> : item.icon}
          </span>
          <span style={{ flex: 1, ...(danger ? { color: '#ef4444', fontWeight: 600 } : {}) }}>{item.label}</span>
          {bloqueo && (
            <span style={{
              fontSize: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
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
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
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
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
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
    const label = menuKey === 'pedidos-configuracion'
      ? 'Flujos y plantillas'
      : (item.label || item.etiqueta);

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
    const modulosBase = progresoSidebar?.modulos === null ? SIDEBAR_FALLBACK : progresoSidebar.modulos;
    const grupos = modulosBase
      .filter((item) => item.contexto === contexto)
      .filter(moduloEsVisible)
      .reduce((acc, item) => {
        const seccion = usuario?.rol === 'solo_pedidos' && item.menuKey === 'mis-pedidos'
          ? 'VENTAS'
          : item.seccion;
        if (!acc.has(seccion)) acc.set(seccion, []);
        acc.get(seccion).push(normalizarItemSidebar(item));
        return acc;
      }, new Map());

    return Array.from(grupos.entries()).map(([seccion, items]) => (
      <React.Fragment key={`${contexto}-${seccion}`}>
        <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>
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
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
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
            <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
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

        <nav aria-label="Navegación de usuario" className="sidebar-nav-container">
          {renderSidebarDinamico()}
        </nav>

        <footer className="sidebar-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(61, 95, 163, 0.15)', color: '#7d9bd6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold'
            }}>
              {usuario?.nombre ? usuario.nombre.slice(0, 1).toUpperCase() : <User size={12} />}
            </div>
            {usuario && (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {usuario.nombre || usuario.email}
              </span>
            )}
          </div>
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
            minHeight: 0,
            padding: 0,
            overflowY: isLandingRoute ? 'hidden' : 'auto',
            overflowX: isLandingRoute ? 'hidden' : undefined,
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
              <strong style={{ color: '#60a5fa', display: 'block', marginTop: '0.5rem' }}>
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
    </div>
  );
};

export default UserLayout;
