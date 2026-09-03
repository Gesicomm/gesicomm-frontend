import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store, LogOut, Grid, Layers, ShoppingCart, Megaphone, Settings, User,
  GraduationCap, Lock, Sparkles, X, ChevronRight, Menu, LayoutDashboard,
  Package, BarChart3, Receipt, Truck, PanelLeftClose, Bot
} from 'lucide-react';
import { verificarSesion, cerrarSesion } from '../utils/auth';
import { getProgresoSidebar } from '../services/educacionApi';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';
import './dashboard.css';
import '../pages/vitrina/vitrina.css';
import '../pages/educacion/EducacionView.css';

const UserLayout = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [progresoSidebar, setProgresoSidebar] = useState({
    menusDesbloqueados: [],
    bloqueos: {},
  });
  const [modalBloqueo, setModalBloqueo] = useState(null); // { menu, moduloRequerido, moduloId }
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopClosed, setDesktopClosed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Ocultar automáticamente en rutas de edición de landing/funnel
  const isLandingRoute = Boolean(
    location.pathname.match(/\/(mi-landing|landing|funnel)\/[a-zA-Z0-9_-]+/) ||
    location.pathname.includes('funnel-selector') ||
    location.pathname.includes('/mi-landing/producto/')
  );

  useEffect(() => {
    if (isLandingRoute) {
      setDesktopClosed(true);
    } else {
      setDesktopClosed(false);
    }
  }, [isLandingRoute]);

  useEffect(() => {
    verificarSesion().then(setUsuario);
    cargarProgreso();
  }, []);

  const cargarProgreso = async () => {
    try {
      const data = await getProgresoSidebar();
      setProgresoSidebar(data);
    } catch (err) {
      console.error('Error al cargar progreso del sidebar:', err);
    }
  };

  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

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

    return (
      <li key={item.path} className="sidebar-item">
        <Link
          to={bloqueo ? '#' : item.path}
          onClick={(e) => handleItemClick(e, item, bloqueo)}
          className={`sidebar-link ${active ? 'active' : ''} ${bloqueo ? 'locked-link' : ''}`}
          style={bloqueo ? { opacity: 0.65 } : {}}
        >
          <span className="sidebar-icon">
            {bloqueo ? <Lock size={14} style={{ color: '#fbbf24' }} /> : item.icon}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
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
          {item.badge && (
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
        </Link>
      </li>
    );
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
          {usuario?.rol !== 'solo_pedidos' && (
            <>
              <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>APRENDIZAJE</div>
              <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
                <ul className="sidebar-list">
                  {renderLink({
                    path: '/academia',
                    label: 'Academia & Cursos',
                    icon: <GraduationCap size={14} style={{ color: '#60a5fa' }} />,
                    badge: 'PRO'
                  })}
                </ul>
              </div>
            </>
          )}

          <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>GENERAL</div>
          <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <ul className="sidebar-list">
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/mi-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} />, menuKey: 'mi-dashboard' })}
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/mi-catalogo', label: 'Vitrina B2B', icon: <Grid size={14} />, menuKey: 'mi-catalogo' })}
              
              {renderLink({ path: '/products', label: 'Mis Productos', icon: <Package size={14} />, prefix: '/products', menuKey: 'products' })}
              
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/configuracion-economica', label: 'Config. económica', icon: <Settings size={14} />, menuKey: 'configuracion-economica' })}
              
              {renderLink({ path: '/mis-pedidos', label: 'Mis pedidos & Couriers', icon: <ShoppingCart size={14} />, menuKey: 'mis-pedidos' })}
              
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/landing', label: 'Landing', icon: <Sparkles size={14} />, prefix: '/landing', menuKey: 'landing' })}
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/mi-tienda', label: 'Mi tienda', icon: <Store size={14} />, menuKey: 'mi-tienda' })}
              {usuario?.rol !== 'solo_pedidos' && renderLink({ path: '/automatizacion', label: 'Canales de Venta', icon: <Bot size={14} />, menuKey: 'canales-de-venta' })}
            </ul>
          </div>

          {usuario?.rol !== 'solo_pedidos' && (
            <>
              <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>FINANZAS</div>
              <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
                <ul className="sidebar-list">
                  {renderLink({ path: '/finanzas/costos-gastos', label: 'Costos y Gastos', icon: <Receipt size={14} />, menuKey: 'finanzas-costos-gastos' })}
                  {usuario?.rol === 'administrador' && renderLink({ path: '/finanzas/proveedores', label: 'Proveedores', icon: <Truck size={14} />, menuKey: 'finanzas-proveedores' })}
                </ul>
              </div>

              <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>META</div>
              <div className="sidebar-nav" style={{ paddingTop: 0 }}>
                <ul className="sidebar-list">
                  {renderLink({ path: '/mis-anuncios', label: 'Ads & Campañas', icon: <Megaphone size={14} />, menuKey: 'mis-anuncios' })}
                </ul>
              </div>
            </>
          )}
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
            {renderLink({ path: '/configuracion', label: 'Configuración', icon: <Settings size={14} /> })}
            <li className="sidebar-item">
              <button className="logout-btn destructive" onClick={handleLogout} style={{ width: '100%' }}>
                <span className="sidebar-icon"><LogOut size={14} /></span>
                Salir
              </button>
            </li>
          </ul>
        </footer>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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
          <ThemeToggle className="h-8 w-8 !border-none" />
        </header>

        <main className="dashboard-main" style={{ background: 'var(--color-canvas)', flex: 1, padding: 0, overflowY: 'auto' }}>
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
