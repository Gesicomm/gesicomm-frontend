import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useSesion from '../hooks/useSesion';
import {
  PantallaErrorConexion,
  PantallaVerificandoSesion,
  RedirigirALogin,
} from './EstadoSesion';
import { tiendaService } from '../services/tiendaService';
import { planesService } from '../services/planesService';

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
  // 'pendiente' | 'ok' | 'sin-plan' | 'sin-tienda'
  const [acceso, setAcceso] = useState('pendiente');

  useEffect(() => {
    if (estado !== 'autenticado') return;
    if (usuario?.rol !== 'usuario') { setAcceso('ok'); return; }

    let vigente = true;
    setAcceso('pendiente');

    planesService.miEstado()
      .then((estadoCuenta) => {
        if (!vigente) return null;
        if (!estadoCuenta?.tiene_suscripcion_activa) {
          setAcceso('sin-plan');
          return null;
        }
        return tiendaService.obtener().then(tienda => ({ tienda }));
      })
      .then((resultado) => {
        if (!vigente || resultado === null) return;
        setAcceso(resultado.tienda ? 'ok' : 'sin-tienda');
      })
      .catch(() => { if (vigente) setAcceso('sin-tienda'); });

    return () => { vigente = false; };
  }, [estado, usuario]);

  if (estado === 'verificando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (estado === 'sin-sesion') return <RedirigirALogin />;

  if (acceso === 'pendiente') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (acceso === 'sin-plan') return <Navigate to="/planes" replace />;
  if (acceso === 'sin-tienda') return <Navigate to="/onboarding" replace />;

  return children;
}
