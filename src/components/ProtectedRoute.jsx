import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { verificarSesion } from '../utils/auth';

/**
 * Componente de Ruta Protegida.
 *
 * Verifica con el BACKEND si la sesión es válida antes de renderizar.
 * ⚠️ Esta protección es VISUAL (UX). La verdadera seguridad la aplica
 *    el backend validando el JWT en cada petición a la API.
 *
 * Rutas protegidas: /dashboard, /products, /orders, /customers, /settings
 * Rutas públicas:   /login, /
 *
 * Uso:
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children }) {
  const [estado, setEstado] = useState('verificando'); // 'verificando' | 'autenticado' | 'no-autenticado'

  useEffect(() => {
    verificarSesion().then((usuario) => {
      setEstado(usuario ? 'autenticado' : 'no-autenticado');
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

  return children;
}
