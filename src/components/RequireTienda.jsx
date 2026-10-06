import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
 * 'usuario') tenga una tienda ACTIVA. Una cuenta puede tener varias
 * tiendas — si no tiene ninguna la manda a /onboarding (crear la primera),
 * si tiene alguna pero ninguna está seleccionada la manda a
 * /seleccionar-tienda (elegir con cuál trabajar).
 *
 * A un usuario con otro rol (ej. 'administrador') no se le exige tienda —
 * este guard es específico del área de usuario final.
 *
 * ⚠️ Igual que los otros guards: es UX, no seguridad real. El backend ya
 *    devuelve 409 en las rutas que dependen de una tienda si no hay una activa.
 */
export default function RequireTienda({ children }) {
  const { estado, usuario, reintentar } = useSesion();
  const location = useLocation();
  // 'pendiente' | 'ok' | 'sin-plan' | 'sin-tienda' | 'sin-tienda-activa'
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
        if (usuario.tiendaId) return { activa: true };
        // Sin tienda activa resuelta: puede ser que no tenga ninguna
        // todavía (onboarding) o que tenga varias y no haya elegido
        // (selector) — hace falta el listado para distinguir los dos casos.
        return tiendaService.mias().then(tiendas => ({ activa: false, tiendas }));
      })
      .then((resultado) => {
        if (!vigente || resultado === null) return;
        if (resultado.activa) { setAcceso('ok'); return; }
        setAcceso(resultado.tiendas.length === 0 ? 'sin-tienda' : 'sin-tienda-activa');
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
  if (acceso === 'sin-tienda-activa') return <Navigate to="/seleccionar-tienda" state={{ desde: location.pathname }} replace />;

  return children;
}
