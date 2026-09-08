import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useSesion from '../hooks/useSesion';
import {
  PantallaErrorConexion,
  PantallaVerificandoSesion,
  RedirigirALogin,
} from './EstadoSesion';
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
  const { estado, usuario, reintentar } = useSesion();
  // 'pendiente' | 'ok' | 'sin-tienda'
  const [tienda, setTienda] = useState('pendiente');

  useEffect(() => {
    if (estado !== 'autenticado') return;
    if (usuario?.rol !== 'usuario') { setTienda('ok'); return; }

    let vigente = true;
    setTienda('pendiente');
    tiendaService.obtener()
      .then((t) => { if (vigente) setTienda(t ? 'ok' : 'sin-tienda'); })
      .catch(() => { if (vigente) setTienda('sin-tienda'); });

    return () => { vigente = false; };
  }, [estado, usuario]);

  if (estado === 'verificando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (estado === 'sin-sesion') return <RedirigirALogin />;

  if (tienda === 'pendiente') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (tienda === 'sin-tienda') return <Navigate to="/onboarding" replace />;

  return children;
}
