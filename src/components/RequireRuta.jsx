import { Navigate } from 'react-router-dom';
import useSesion from '../hooks/useSesion';
import useRutasPlan from '../hooks/useRutasPlan';
import { PantallaErrorConexion, PantallaVerificandoSesion, RedirigirALogin } from './EstadoSesion';
export default function RequireRuta({ ruta, children }) {
  const sesion = useSesion();
  const acceso = useRutasPlan(sesion.usuario);
  const reintentar = () => { sesion.reintentar(); acceso.reintentar(); };
  if (sesion.estado === 'sin-sesion') return <RedirigirALogin />;
  if (sesion.estado === 'error' || acceso.estado === 'error') return <PantallaErrorConexion onReintentar={reintentar} />;
  if (sesion.estado !== 'autenticado' || acceso.estado === 'cargando') return <PantallaVerificandoSesion onReintentar={reintentar} />;
  if (!acceso.rutas[ruta]) return <Navigate to="/seleccionar-modulo" replace />;
  return children;
}
