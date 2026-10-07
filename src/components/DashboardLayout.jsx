import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';
import NotificationBell from './NotificationBell';
import { notificationsService } from '../services/notifications.service';
import './dashboard.css';

const DashboardLayout = ({ children }) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const isLandingRoute = Boolean(
        location.pathname.match(/\/(mi-landing|landing)\/[a-zA-Z0-9_-]+/) ||
        location.pathname.includes('/mi-landing/producto/')
    );

    // El panel de administración no tenía campanita: los avisos in-app (por
    // ejemplo, un comprobante de abastecimiento esperando validación) se
    // creaban en la base pero el admin no los veía en ningún lado.
    const refreshNotifications = useCallback(async () => {
        try {
            const data = await notificationsService.getNotifications({ leida: false, limit: 50 });
            setNotifications(data.data || []);
            setUnreadCount(data.no_leidas || 0);
        } catch {
            /* la campanita nunca debe romper el layout */
        }
    }, []);

    useEffect(() => {
        refreshNotifications();
        const id = setInterval(refreshNotifications, 60000);
        const alVolver = () => { if (!document.hidden) refreshNotifications(); };
        document.addEventListener('visibilitychange', alVolver);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', alVolver);
        };
    }, [refreshNotifications]);

    const campanita = (
        <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onRefresh={refreshNotifications}
            onMarkAsRead={async (id) => {
                await notificationsService.markAsRead(id);
                refreshNotifications();
            }}
            onMarkAllAsRead={async () => {
                await notificationsService.markAllAsRead();
                refreshNotifications();
            }}
        />
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-canvas text-fg">
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4 lg:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                            aria-label="Abrir menú"
                        >
                            <Menu size={20} />
                        </button>
                        <Logo size={24} className="text-fg" />
                    </div>
                    <div className="flex items-center gap-2">
                        {campanita}
                        <ThemeToggle className="h-8 w-8 !border-none" />
                    </div>
                </header>

                <header className="hidden h-14 flex-shrink-0 items-center justify-end gap-2 border-b border-border px-6 lg:flex">
                    {campanita}
                    <ThemeToggle className="h-8 w-8 !border-none" />
                </header>

                <main 
                    className={`flex-1 flex flex-col ${isLandingRoute ? '' : 'overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8'}`}
                    style={{
                        minHeight: 0,
                        overflowY: isLandingRoute ? 'hidden' : 'auto',
                        overflowX: isLandingRoute ? 'hidden' : undefined,
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
