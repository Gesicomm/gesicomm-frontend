import { Navigate } from 'react-router-dom';
import useSesion from '../hooks/useSesion';
import {
  PantallaErrorConexion,
  PantallaVerificandoSesion,
  RedirigirALogin,
} from './EstadoSesion';

/**
 * Igual que ProtectedRoute, pero además exige rol 'administrador'.
 * Un usuario autenticado con otro rol (ej. 'usuario') es redirigido
 * a su propia área en vez de ver el panel admin.
 *
 * ⚠️ Esta protección es VISUAL (UX). La verdadera seguridad la aplica
 *    el backend validando permisos en cada petición a la API.
 */
export default function AdminRoute({ children }) {
  const { estado, usuario, reintentar } = useSesion();

  if (estado === 'verificando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (estado === 'sin-sesion') return <RedirigirALogin />;

  if (usuario?.rol !== 'administrador') return <Navigate to="/mi-catalogo" replace />;

  return children;
}
