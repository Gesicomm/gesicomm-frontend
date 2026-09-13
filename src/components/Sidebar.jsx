import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Megaphone,
  Settings, LogOut, Tag, ChevronDown, ChevronRight, X,
  GraduationCap, Receipt, Truck, Sparkles, Store, Code2, BadgeDollarSign, ShieldCheck, KeyRound, CreditCard
} from 'lucide-react';
import Logo from './public/Logo';
import { cerrarSesion } from '../utils/auth';
import ThemeToggle from './public/ThemeToggle';
import { authTrackingService } from '../services/authTrackingService';

const NAV_LINK = 'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg';
const NAV_LINK_ACTIVE = 'relative bg-primary/10 text-primary-text hover:bg-primary/10 hover:text-primary-text before:absolute before:left-0 before:top-0.5 before:bottom-0.5 before:w-0.5 before:rounded-full before:bg-primary';
const SUB_LINK = 'flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors';
const SUB_LINK_ACTIVE = 'bg-primary/10 text-primary-text';
const SUB_LINK_INACTIVE = 'text-fg-subtle hover:bg-surface-2 hover:text-fg';
const ICON_WRAP = 'flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4';
const PAYMENT_EVENT_IDS = ['subscription_payment_paid', 'store_order_payment_paid', 'stock_payment_paid'];
const ACCESS_EVENT_IDS = [
  'register',
  'email_verified',
  'login_success',
  'login_failed',
  'logout',
  'otp_resent',
  'onboarding_started',
  'onboarding_store_created',
  'onboarding_landing_generated',
  'onboarding_skipped',
  'password_reset_requested',
  'password_reset_email_sent',
  'password_reset_email_failed',
  'password_reset_email_skipped',
  'password_reset_failed',
  'password_reset_completed',
];

const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const location = useLocation();

  // 'Salir' antes solo navegaba a /login: las cookies de sesión quedaban
  // vivas (el refresh token dura 7 días), así que el usuario seguía logueado
  // y con volver a cualquier ruta privada entraba de nuevo — o peor, al
  // iniciar sesión con otra cuenta se arrastraba la anterior. Hay que pedirle
  // al backend que borre las cookies antes de irse.
  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = '/login'; // recarga completa: limpia el estado en memoria
  };
  const [productosOpen, setProductosOpen] = useState(
    location.pathname.startsWith('/products') || location.pathname.startsWith('/categorias')
  );
  const [alertasAccesos, setAlertasAccesos] = useState(0);
  const [alertasPagos, setAlertasPagos] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const cargarAlertas = () => Promise.all([
      authTrackingService.notificaciones({ filtros: { solo_no_leidas: true, tipos: ACCESS_EVENT_IDS } }),
      authTrackingService.notificaciones({ filtros: { solo_no_leidas: true, tipos: PAYMENT_EVENT_IDS } }),
    ])
      .then(([accesos, pagos]) => {
        if (!cancelado) {
          setAlertasAccesos(Number(accesos?.paginacion?.total) || 0);
          setAlertasPagos(Number(pagos?.paginacion?.total) || 0);
        }
      })
      .catch(() => {});
    cargarAlertas();
    window.addEventListener('auth-tracking:updated', cargarAlertas);
    return () => {
      cancelado = true;
      window.removeEventListener('auth-tracking:updated', cargarAlertas);
    };
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  const renderLink = ({ path, label, icon, badge }) => {
    const active = isActive(path);
    return (
      <li key={path}>
        <Link
          to={path}
          onClick={onClose}
          aria-current={active ? 'page' : undefined}
          className={`${NAV_LINK} ${active ? NAV_LINK_ACTIVE : ''}`}
        >
          <span className={ICON_WRAP}>{icon}</span>
          {label}
          {badge ? <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-accent-fg">{badge}</span> : null}
        </Link>
      </li>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <Logo size={26} className="text-fg" />
          <div className="flex items-center gap-1">
            <ThemeToggle className="h-8 w-8 !border-none" />
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          <div className="mb-1.5 mt-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            General
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {renderLink({ path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> })}

            <li>
              <button
                type="button"
                onClick={() => setProductosOpen((o) => !o)}
                aria-expanded={productosOpen}
                className={`${NAV_LINK} w-full cursor-pointer border-none bg-transparent text-left ${
                  isActivePrefix('/products') || isActivePrefix('/categorias') ? NAV_LINK_ACTIVE : ''
                }`}
              >
                <span className={ICON_WRAP}><Package /></span>
                Productos
                <span className="ml-auto flex items-center text-fg-subtle">
                  {productosOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
              </button>
              {productosOpen && (
                <ul className="m-0 mt-0.5 flex list-none flex-col gap-0.5 py-1 pl-10 pr-0">
                  <li>
                    <Link
                      to="/products"
                      onClick={onClose}
                      className={`${SUB_LINK} ${isActive('/products') || isActivePrefix('/products/') ? SUB_LINK_ACTIVE : SUB_LINK_INACTIVE}`}
                    >
                      <Package size={13} /> Listado
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/categorias"
                      onClick={onClose}
                      className={`${SUB_LINK} ${isActive('/categorias') ? SUB_LINK_ACTIVE : SUB_LINK_INACTIVE}`}
                    >
                      <Tag size={13} /> Categorías
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {renderLink({ path: '/orders', label: 'Pedidos', icon: <ShoppingCart /> })}
            {renderLink({ path: '/customers', label: 'Clientes', icon: <Users /> })}
            {renderLink({ path: '/admin/educacion', label: 'Academia LMS', icon: <GraduationCap /> })}

            {/* Combos (ProductoCombo) reemplazado por Ofertas comerciales,
                dentro de la ficha de cada producto — los combos viejos
                siguen en la base, solo se sacó el link del menú. */}

            {renderLink({ path: '/landing', label: 'Landing', icon: <Sparkles /> })}
            {renderLink({ path: '/page-builder', label: 'Page Builder', icon: <Code2 /> })}
            {renderLink({ path: '/mi-tienda', label: 'Mi tienda', icon: <Store /> })}
            {renderLink({ path: '/configuracion-economica', label: 'Configuración económica', icon: <Settings /> })}
            {renderLink({ path: '/admin/planes', label: 'Planes', icon: <BadgeDollarSign /> })}
            {renderLink({ path: '/admin/tracking-onboarding', label: 'Onboarding y login', icon: <ShieldCheck />, badge: alertasAccesos > 0 ? alertasAccesos : null })}
            {renderLink({ path: '/admin/tracking-pagos', label: 'Tracking de pagos', icon: <CreditCard />, badge: alertasPagos > 0 ? alertasPagos : null })}
          </ul>

          <div className="mb-1.5 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Finanzas
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {renderLink({ path: '/finanzas/costos-gastos', label: 'Costos y Gastos', icon: <Receipt /> })}
            {renderLink({ path: '/finanzas/proveedores', label: 'Proveedores', icon: <Truck /> })}
          </ul>

          <div className="mb-1.5 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Meta
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {renderLink({ path: '/ads', label: 'Ads & Campañas', icon: <Megaphone /> })}
          </ul>
        </nav>

        <footer className="flex-shrink-0 border-t border-border p-2">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {renderLink({ path: '/settings', label: 'Configuración', icon: <Settings /> })}
            {renderLink({ path: '/admin/parametros', label: 'Parámetros del sistema', icon: <KeyRound /> })}
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className={`${NAV_LINK} w-full cursor-pointer border-none bg-transparent text-left hover:bg-danger/10 hover:text-danger`}
              >
                <span className={ICON_WRAP}><LogOut /></span>
                Salir
              </button>
            </li>
          </ul>
        </footer>
      </aside>
    </>
  );
};

export default Sidebar;
