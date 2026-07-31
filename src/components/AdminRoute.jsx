import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { verificarSesion } from '../utils/auth';

/**
 * Igual que ProtectedRoute, pero además exige rol 'administrador'.
 * Un usuario autenticado con otro rol (ej. 'usuario') es redirigido
 * a su propia área en vez de ver el panel admin.
 *
 * ⚠️ Esta protección es VISUAL (UX). La verdadera seguridad la aplica
 *    el backend validando permisos en cada petición a la API.
 */
export default function AdminRoute({ children }) {
  const [estado, setEstado] = useState('verificando'); // 'verificando' | 'admin' | 'otro-rol' | 'no-autenticado'

  useEffect(() => {
    verificarSesion().then((usuario) => {
      if (!usuario) return setEstado('no-autenticado');
      setEstado(usuario.rol === 'administrador' ? 'admin' : 'otro-rol');
    });
  }, []);

  if (estado === 'verificando') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#050505',
      }}>
        <div className="loader"></div>
      </div>
    );
  }

  if (estado === 'no-autenticado') {
    return <Navigate to="/login" replace />;
  }

  if (estado === 'otro-rol') {
    return <Navigate to="/mi-catalogo" replace />;
  }

  return children;
}
