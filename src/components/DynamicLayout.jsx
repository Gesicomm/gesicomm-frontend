import React, { useState, useEffect } from 'react';
import { verificarSesion } from '../utils/auth';
import DashboardLayout from './DashboardLayout';
import UserLayout from './UserLayout';

export default function DynamicLayout({ children }) {
  const [rol, setRol] = useState(null);

  useEffect(() => {
    verificarSesion().then(u => {
      if (u) setRol(u.rol);
    });
  }, []);

  if (!rol) return <div className="flex h-screen items-center justify-center bg-canvas"><div className="loader"></div></div>;

  return rol === 'administrador' ? (
    <DashboardLayout>{children}</DashboardLayout>
  ) : (
    <UserLayout>{children}</UserLayout>
  );
}
