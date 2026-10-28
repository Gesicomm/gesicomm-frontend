import { useCallback, useEffect, useState } from 'react';
import { planesService } from '../services/planesService';
import { invalidarCacheSesion } from '../utils/sesion';
const CERRADAS = { fisico: false, personal: false };
export default function useRutasPlan(usuario) {
  const [datos, setDatos] = useState({ estado: 'cargando', rutas: CERRADAS, cuenta: null });
  const [revision, setRevision] = useState(0);
  const reintentar = useCallback(() => { invalidarCacheSesion(); setRevision(value => value + 1); }, []);
  useEffect(() => {
    if (!usuario?.id) return undefined;
    if (usuario.rol === 'administrador') { setDatos({ estado: 'listo', rutas: { fisico: true, personal: true }, cuenta: null }); return undefined; }
    if (usuario.rol === 'solo_pedidos' || usuario.rol === 'colaborador') { setDatos({ estado: 'listo', rutas: usuario.rutas || { fisico: true, personal: false }, cuenta: null }); return undefined; }
    let vigente = true;
    let timer;
    setDatos(prev => ({ ...prev, estado: 'cargando' }));
    planesService.miEstado().then(cuenta => {
      if (!vigente) return;
      setDatos({ estado: 'listo', rutas: cuenta?.rutas || CERRADAS, cuenta });
      const fin = new Date(cuenta?.suscripcion?.periodo_fin).getTime();
      if (Number.isFinite(fin) && fin > Date.now()) timer = setTimeout(reintentar, Math.min(fin - Date.now() + 25, 2147483647));
    }).catch(() => { if (vigente) setDatos({ estado: 'error', rutas: CERRADAS, cuenta: null }); });
    return () => { vigente = false; clearTimeout(timer); };
  }, [usuario?.id, usuario?.rol, revision, reintentar]);
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') reintentar(); };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('plan-acceso-actualizado', reintentar);
    return () => {
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('plan-acceso-actualizado', reintentar);
    };
  }, [reintentar]);
  return { ...datos, reintentar };
}
