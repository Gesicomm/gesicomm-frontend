import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Megaphone,
  Settings, LogOut, Tag, Briefcase, ChevronDown, ChevronRight
} from 'lucide-react';
import './dashboard.css';

const Sidebar = () => {
  const location = useLocation();
  const [productosOpen, setProductosOpen] = useState(
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/categorias') ||
    location.pathname.startsWith('/marcas')
  );

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  const renderLink = (item) => {
    const active = isActive(item.path);
    return (
      <li key={item.path} className="sidebar-item">
        <Link
          to={item.path}
          className={`sidebar-link ${active ? 'active' : ''}`}
          aria-current={active ? 'page' : undefined}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2>GESICOMM<span className="dot">.</span></h2>
      </header>

      <nav aria-label="Navegación principal" className="sidebar-nav-container">
        <div className="sidebar-section-label">GENERAL</div>
        <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <ul className="sidebar-list">
            {renderLink({ path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> })}

            {/* Productos con sub-menú colapsable */}
            <li className="sidebar-item">
              <button
                className={`sidebar-link sidebar-collapsible ${isActivePrefix('/products') || isActivePrefix('/categorias') || isActivePrefix('/marcas') ? 'active' : ''}`}
                onClick={() => setProductosOpen(o => !o)}
                aria-expanded={productosOpen}
              >
                <span className="sidebar-icon"><Package /></span>
                Productos
                <span className="sidebar-chevron">
                  {productosOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
              </button>
              {productosOpen && (
                <ul className="sidebar-submenu">
                  <li>
                    <Link
                      to="/products"
                      className={`sidebar-sublink ${isActive('/products') || isActivePrefix('/products/') ? 'active' : ''}`}
                    >
                      <Package size={13} /> Listado
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/categorias"
                      className={`sidebar-sublink ${isActive('/categorias') ? 'active' : ''}`}
                    >
                      <Tag size={13} /> Categorías
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/marcas"
                      className={`sidebar-sublink ${isActive('/marcas') ? 'active' : ''}`}
                    >
                      <Briefcase size={13} /> Marcas
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {renderLink({ path: '/orders', label: 'Pedidos', icon: <ShoppingCart /> })}
            {renderLink({ path: '/customers', label: 'Clientes', icon: <Users /> })}
          </ul>
        </div>

        <div className="sidebar-section-label">META</div>
        <div className="sidebar-nav" style={{ paddingTop: 0 }}>
          <ul className="sidebar-list">
            {renderLink({ path: '/ads', label: 'Ads & Campañas', icon: <Megaphone /> })}
          </ul>
        </div>
      </nav>

      <footer className="sidebar-footer">
        <ul className="sidebar-list">
          <li className="sidebar-item">
            <Link
              to="/settings"
              className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
            >
              <span className="sidebar-icon"><Settings /></span>
              Configuración
            </Link>
          </li>
          <li className="sidebar-item">
            <button className="logout-btn destructive" onClick={() => { window.location.href = '/login'; }}>
              <span className="sidebar-icon"><LogOut /></span>
              Salir
            </button>
          </li>
        </ul>
      </footer>
    </aside>
  );
};

export default Sidebar;
