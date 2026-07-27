import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Megaphone, Settings, LogOut } from 'lucide-react';
import './dashboard.css';

const Sidebar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { path: '/products', label: 'Productos', icon: <Package /> },
        { path: '/orders', label: 'Pedidos', icon: <ShoppingCart /> },
        { path: '/customers', label: 'Clientes', icon: <Users /> },
    ];

    const metaItems = [
        { path: '/ads', label: 'Ads & Campañas', icon: <Megaphone /> },
    ];

    const bottomItems = [
        { path: '/settings', label: 'Configuración', icon: <Settings /> },
    ];

    const renderLinks = (items) => (
        <ul className="sidebar-list">
            {items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                    <li key={item.path} className="sidebar-item">
                        <Link
                            to={item.path}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <aside className="sidebar">
            <header className="sidebar-header">
                <h2>GESICOMM<span className="dot">.</span></h2>
            </header>
            
            <nav aria-label="Navegación principal" className="sidebar-nav-container">
                <div className="sidebar-section-label">GENERAL</div>
                <div className="sidebar-nav" style={{ paddingTop: 0, paddingBottom: 0 }}>
                    {renderLinks(navItems)}
                </div>

                <div className="sidebar-section-label">META</div>
                <div className="sidebar-nav" style={{ paddingTop: 0 }}>
                    {renderLinks(metaItems)}
                </div>
            </nav>

            <footer className="sidebar-footer">
                <ul className="sidebar-list">
                    {bottomItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path} className="sidebar-item">
                                <Link
                                    to={item.path}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <span className="sidebar-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                    <li className="sidebar-item">
                        <button className="logout-btn destructive" onClick={() => {
                            window.location.href = '/login';
                        }}>
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

