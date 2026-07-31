import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, LogOut, Grid, Layers, ShoppingCart } from 'lucide-react';
import { verificarSesion, cerrarSesion } from '../utils/auth';
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

  const activo = (prefijo) => location.pathname.startsWith(prefijo);

  return (
    <div className="user-layout">
      <header className="user-topbar">
        <div className="user-topbar-brand">
          <div className="user-topbar-icon"><Store size={18} /></div>
          <div>
            <h1>GESICOMM<span className="dot">.</span></h1>
            <span className="user-topbar-subtitle">Panel de usuario</span>
          </div>
        </div>

        <nav className="user-topbar-nav">
          <Link to="/mi-catalogo" className={`user-topbar-tab ${activo('/mi-catalogo') ? 'active' : ''}`}>
            <Grid size={14} /> Mi catálogo
          </Link>

          <Link to="/mis-pedidos" className={`user-topbar-tab ${activo('/mis-pedidos') ? 'active' : ''}`}>
            <ShoppingCart size={14} /> Mis pedidos & Couriers
          </Link>

          <Link to="/mis-landings" className={`user-topbar-tab ${activo('/mis-landings') ? 'active' : ''}`}>
            <Layers size={14} /> Mis landings
          </Link>

          <Link to="/mi-tienda" className={`user-topbar-tab ${activo('/mi-tienda') ? 'active' : ''}`}>
            <Store size={14} /> Mi tienda
          </Link>
        </nav>

        <div className="user-topbar-right">
          {usuario && <span className="user-topbar-name">{usuario.nombre || usuario.email}</span>}
          <button className="user-logout-btn" onClick={handleLogout}>
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>
      <main className="user-main">
        {children}
      </main>
    </div>
  );
};

export default UserLayout;
