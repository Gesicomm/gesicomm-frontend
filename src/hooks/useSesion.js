import { useCallback, useEffect, useState } from 'react';
import { verificarSesionDetallada } from '../utils/auth';

/**
 * Verifica la sesión contra el backend y expone un estado terminal.
 *
 * Lo usan los guards de ruta (ProtectedRoute, AdminRoute, RequireTienda) y
 * DynamicLayout. La regla es que SIEMPRE tienen que salir del spinner: o hay
 * sesión, o se va al login con aviso, o se muestra el error de conexión con
 * un botón para reintentar. Nunca quedarse cargando en silencio.
 *
 * @returns {{ estado: 'verificando'|'autenticado'|'sin-sesion'|'error',
 *             usuario: object|null, reintentar: () => void }}
 */
export default function useSesion() {
  const [estado, setEstado] = useState('verificando');
  const [usuario, setUsuario] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado('verificando');

    verificarSesionDetallada().then((resultado) => {
      if (!vigente) return;
      setUsuario(resultado.usuario);
      setEstado(resultado.estado);
    });

    return () => { vigente = false; };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { estado, usuario, reintentar };
}
