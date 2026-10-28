import { useCallback, useEffect, useState } from 'react';
import { planesService } from '../services/planesService';
import { invalidarCacheSesion } from '../utils/sesion';

const CERRADAS = { fisico: false, personal: false };
const pendiente = actor => ({ actor, estado: 'cargando', rutas: CERRADAS, cuenta: null });

export default function useRutasPlan(usuario) {
  const actor = `${usuario?.id || ''}:${usuario?.rol || ''}`;
  const [datos, setDatos] = useState(() => pendiente(actor));
  const [revision, setRevision] = useState(0);
  const reintentar = useCallback(() => {
    invalidarCacheSesion();
    setRevision(value => value + 1);
  }, []);

  useEffect(() => {
    if (!usuario?.id) { setDatos(pendiente(actor)); return undefined; }
    if (usuario.rol === 'administrador') {
      setDatos({ actor, estado: 'listo', rutas: { fisico: true, personal: true }, cuenta: null });
      return undefined;
    }
    if (usuario.rol === 'solo_pedidos' || usuario.rol === 'colaborador') {
      setDatos({ actor, estado: 'listo', rutas: usuario.rutas || { fisico: true, personal: false }, cuenta: null });
      return undefined;
    }
    let vigente = true;
    let timer;
    // Una comprobación de fondo no debe desmontar formularios abiertos.
    // Si ya llegó el vencimiento, el acceso se cierra mientras se revalida.
    setDatos(prev => {
      const fin = prev.cuenta?.suscripcion?.periodo_fin;
      const vencido = fin != null && new Date(fin).getTime() <= Date.now();
      return prev.actor === actor && prev.estado === 'listo' && !vencido ? prev : pendiente(actor);
    });
    planesService.miEstado().then(cuenta => {
      if (!vigente) return;
      const fin = cuenta?.suscripcion?.periodo_fin;
      const finMs = fin == null ? null : new Date(fin).getTime();
      const vencido = finMs !== null && (!Number.isFinite(finMs) || finMs <= Date.now());
      setDatos({ actor, estado: 'listo', rutas: vencido ? CERRADAS : cuenta?.rutas || CERRADAS, cuenta });
      if (finMs !== null && Number.isFinite(finMs) && finMs > Date.now()) {
        timer = setTimeout(reintentar, Math.min(finMs - Date.now() + 25, 2147483647));
      }
    }).catch(() => {
      if (vigente) setDatos({ actor, estado: 'error', rutas: CERRADAS, cuenta: null });
    });
    return () => { vigente = false; clearTimeout(timer); };
  }, [actor, usuario?.id, usuario?.rol, usuario?.rutas?.fisico, usuario?.rutas?.personal, revision, reintentar]);

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

  return { ...(datos.actor === actor ? datos : pendiente(actor)), reintentar };
}
