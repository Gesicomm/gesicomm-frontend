import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './dashboard.css'; // Importaremos los estilos aquí

const Sidebar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/products', label: 'Productos', icon: '📦' },
        { path: '/orders', label: 'Pedidos', icon: '🛒' },
        { path: '/customers', label: 'Clientes', icon: '👥' },
        { path: '/settings', label: 'Configuración', icon: '⚙️' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>GESICOMM<span className="dot">.</span></h2>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <button className="logout-btn" onClick={() => {
                    // TODO: Implement actual logout via context/api
                    window.location.href = '/login';
                }}>
                    <span className="sidebar-icon">🚪</span> Salir
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
