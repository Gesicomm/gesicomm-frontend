import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from './public/Logo';
import ThemeToggle from './public/ThemeToggle';
import './dashboard.css';

const DashboardLayout = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

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
                    <ThemeToggle className="h-8 w-8 !border-none" />
                </header>

                <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
