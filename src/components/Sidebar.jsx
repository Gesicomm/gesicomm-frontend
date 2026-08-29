import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Megaphone,
  Settings, LogOut, Tag, ChevronDown, ChevronRight, X,
  GraduationCap, Receipt, Truck, Sparkles
} from 'lucide-react';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';

const NAV_LINK = 'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg';
const NAV_LINK_ACTIVE = 'relative bg-primary/10 text-primary-text hover:bg-primary/10 hover:text-primary-text before:absolute before:left-0 before:top-0.5 before:bottom-0.5 before:w-0.5 before:rounded-full before:bg-primary';
const SUB_LINK = 'flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors';
const SUB_LINK_ACTIVE = 'bg-primary/10 text-primary-text';
const SUB_LINK_INACTIVE = 'text-fg-subtle hover:bg-surface-2 hover:text-fg';
const ICON_WRAP = 'flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4';

const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  const [productosOpen, setProductosOpen] = useState(
    location.pathname.startsWith('/products') || location.pathname.startsWith('/categorias')
  );

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  const renderLink = ({ path, label, icon }) => {
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
            {renderLink({ path: '/configuracion-economica', label: 'Configuración económica', icon: <Settings /> })}
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
            <li>
              <button
                type="button"
                onClick={() => { window.location.href = '/login'; }}
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
