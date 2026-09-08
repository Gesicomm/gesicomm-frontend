import React from 'react';
import useSesion from '../hooks/useSesion';
import {
  PantallaErrorConexion,
  PantallaVerificandoSesion,
  RedirigirALogin,
} from './EstadoSesion';
import DashboardLayout from './DashboardLayout';
import UserLayout from './UserLayout';

/**
 * Elige el layout según el rol del usuario.
 *
 * Antes, si /auth/me no devolvía usuario (token vencido, backend caído) el rol
 * quedaba en null y esto renderizaba el spinner PARA SIEMPRE: la pantalla en
 * blanco con la ruedita girando que reportaban en producción. Ahora cada
 * estado tiene salida.
 */
export default function DynamicLayout({ children }) {
  const { estado, usuario, reintentar } = useSesion();

  if (estado === 'verificando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (estado === 'sin-sesion') return <RedirigirALogin />;

  return usuario?.rol === 'administrador' ? (
    <DashboardLayout>{children}</DashboardLayout>
  ) : (
    <UserLayout>{children}</UserLayout>
  );
}
