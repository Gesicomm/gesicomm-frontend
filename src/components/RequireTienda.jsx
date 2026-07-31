import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { verificarSesion } from '../utils/auth';
import { tiendaService } from '../services/tiendaService';

/**
 * Igual que ProtectedRoute, pero además exige que el usuario (rol
 * 'usuario') ya haya completado el onboarding (tiene una tienda creada).
 * Si no la tiene, lo manda a /onboarding antes de dejarlo entrar a
 * cualquier sección del panel de usuario (catálogo, landings, pedidos...).
 *
 * A un usuario con otro rol (ej. 'administrador') no se le exige tienda —
 * este guard es específico del área de usuario final.
 *
 * ⚠️ Igual que los otros guards: es UX, no seguridad real. El backend ya
 *    devuelve 409 en las rutas que dependen de una tienda si no existe.
 */
export default function RequireTienda({ children }) {
  const [estado, setEstado] = useState('verificando'); // 'verificando' | 'ok' | 'sin-tienda' | 'no-autenticado'

  useEffect(() => {
    verificarSesion().then(async (usuario) => {
      if (!usuario) return setEstado('no-autenticado');
      if (usuario.rol !== 'usuario') return setEstado('ok');
      const tienda = await tiendaService.obtener().catch(() => null);
      setEstado(tienda ? 'ok' : 'sin-tienda');
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

  if (estado === 'sin-tienda') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
