import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Store, LogOut, Grid, Layers, ShoppingCart, Megaphone, Settings, User
} from 'lucide-react';
import { verificarSesion, cerrarSesion } from '../utils/auth';
import './dashboard.css'; // Reutilizar estilos de la barra lateral del dashboard
import '../pages/vitrina/vitrina.css';

const UserLayout = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const location = useLocation();

  useEffect(() => {
    verificarSesion().then(setUsuario);
  }, []);

  const handleLogout = async () => {
    await cerrarSesion();
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  const renderLink = (item) => {
    const active = isActive(item.path) || (item.prefix && isActivePrefix(item.prefix));
    return (
      <li key={item.path} className="sidebar-item">
        <Link
          to={item.path}
          className={`sidebar-link ${active ? 'active' : ''}`}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <div className="dashboard-layout user-layout-container" style={{ '--bg-primary': '#10b981' }}>
      <aside className="sidebar" style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <header className="sidebar-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
            }}>
              <Store size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                GESICOMM<span className="dot" style={{ color: '#10b981' }}>.</span>
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Panel de Usuario
              </span>
            </div>
          </div>
        </header>

        <nav aria-label="Navegación de usuario" className="sidebar-nav-container">
          <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>GENERAL</div>
          <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <ul className="sidebar-list">
              {renderLink({ path: '/mi-catalogo', label: 'Mi catálogo', icon: <Grid size={14} /> })}
              {renderLink({ path: '/mis-pedidos', label: 'Mis pedidos & Couriers', icon: <ShoppingCart size={14} /> })}
              {renderLink({ path: '/mi-landing', label: 'Mi landing', icon: <Layers size={14} />, prefix: '/mi-landing' })}
              {renderLink({ path: '/mi-tienda', label: 'Mi tienda', icon: <Store size={14} /> })}
            </ul>
          </div>

          <div className="sidebar-section-label" style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>META</div>
          <div className="sidebar-nav" style={{ paddingTop: 0 }}>
            <ul className="sidebar-list">
              {renderLink({ path: '/mis-anuncios', label: 'Ads & Campañas', icon: <Megaphone size={14} /> })}
            </ul>
          </div>
        </nav>

        <footer className="sidebar-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
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

      <main className="dashboard-main" style={{ background: '#050505', flex: 1, padding: 0, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default UserLayout;
