import React from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-main">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
