import useSesion from '../hooks/useSesion';
import {
  PantallaErrorConexion,
  PantallaVerificandoSesion,
  RedirigirALogin,
} from './EstadoSesion';

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
  const { estado, reintentar } = useSesion();

  if (estado === 'verificando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (estado === 'sin-sesion') return <RedirigirALogin />;

  return children;
}
