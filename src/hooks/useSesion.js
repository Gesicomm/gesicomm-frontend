import { useCallback, useEffect, useState } from 'react';
import { sesionVerificadaVigente, verificarSesionDetallada } from '../utils/auth';

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
  // Un guard que se monta debajo de otro (RequireTienda → DynamicLayout) ya
  // tiene la sesión confirmada hace instantes: arranca con ella en vez de
  // pasar por el spinner y una segunda ida al servidor.
  const [inicial] = useState(() => sesionVerificadaVigente());
  const [estado, setEstado] = useState(inicial ? inicial.estado : 'verificando');
  const [usuario, setUsuario] = useState(inicial ? inicial.usuario : null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    if (!(intento === 0 && inicial)) setEstado('verificando');

    verificarSesionDetallada().then((resultado) => {
      if (!vigente) return;
      setUsuario(resultado.usuario);
      setEstado(resultado.estado);
    });

    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  return { estado, usuario, reintentar };
}
