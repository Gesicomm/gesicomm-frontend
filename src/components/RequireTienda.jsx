import { destinoColaborador, rutaPermitida } from '../utils/accesos';
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
import { huboSesion } from '../utils/sesion';
import { verificarSesionDetallada } from '../utils/auth';

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

  // El plan no depende de la respuesta de /auth/me (los dos salen de la
  // cookie): se pide a la par en vez de esperar a la sesión. Solo si esta
  // pestaña ya tuvo sesión — sin eso, un 401 acá mandaría al login con el
  // aviso de "sesión vencida" a quien nunca entró.
  useEffect(() => {
    if (!huboSesion()) return;
    planesService.miEstado().catch(() => {});
    // Mi e-commerce: el editor espera al catálogo completo para armar la
    // selección, y el catálogo es el pedido más lento. Arranca acá, junto con
    // la sesión, en vez de esperar a que se monte la entrada (ver
    // precargaEditor). El detalle necesita saber quién es el usuario.
    if (/^\/landing(\/|$)/.test(location.pathname)) {
      import('../pages/landing-simple/precargaEditor').then((m) => {
        m.precargarEditor();
        verificarSesionDetallada().then((r) => { if (r.estado === 'autenticado') m.precargarDetalleUltimaLanding(); });
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (usuario?.rol === 'colaborador' && (!usuario.tiendaId || !rutaPermitida(usuario, location.pathname))) return <Navigate to={destinoColaborador(usuario)} replace />;

  if (acceso === 'pendiente') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (acceso === 'sin-plan') return <Navigate to="/planes" replace />;
  if (acceso === 'sin-tienda') return <Navigate to="/onboarding" replace />;
  if (acceso === 'sin-tienda-activa') return <Navigate to="/seleccionar-tienda" state={{ desde: location.pathname }} replace />;

  return children;
}
