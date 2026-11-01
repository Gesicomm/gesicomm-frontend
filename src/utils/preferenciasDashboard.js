import { useState, useEffect } from 'react';
import { sesionVerificadaVigente, verificarSesionDetallada } from './auth';

// Solo preferencias de interfaz: nunca credenciales, clientes ni resultados
// financieros. La cuenta y la tienda separan las vistas en equipos compartidos.
export function clavePreferenciaDashboard(vista) {
  const usuario = sesionVerificadaVigente()?.usuario;
  if (!usuario?.id || !usuario?.tiendaId) return null;
  return `gesicomm.dashboard.${vista}.v1.${usuario.id}.${usuario.tiendaId}`;
}

export function leerPreferenciaDashboard(vista) {
  try {
    const clave = clavePreferenciaDashboard(vista);
    if (!clave) return {};
    const valor = JSON.parse(localStorage.getItem(clave) || 'null');
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  } catch { return {}; }
}

export function guardarPreferenciaDashboard(vista, valor) {
  try {
    const clave = clavePreferenciaDashboard(vista);
    if (clave) localStorage.setItem(clave, JSON.stringify(valor));
  } catch { /* Sin almacenamiento, la vista sigue funcionando. */ }
}

// La caché de /auth/me dura cinco segundos. Confirmamos la identidad al
// montar y retenemos solo la clave de esta vista: editar después de ese
// plazo también debe guardar, sin sobrescribir antes de haber restaurado.
export function usePreferenciaDashboard(vista, inicial) {
  const [valor, setValor] = useState(inicial);
  const [clave, setClave] = useState(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let vigente = true;
    verificarSesionDetallada().then(({ usuario }) => {
      if (!vigente) return;
      const key = usuario?.id && usuario?.tiendaId
        ? `gesicomm.dashboard.${vista}.v1.${usuario.id}.${usuario.tiendaId}` : null;
      let guardado;
      try { guardado = key ? JSON.parse(localStorage.getItem(key) || 'null') : null; } catch { /* sin preferencia */ }
      if (guardado && typeof guardado === 'object' && !Array.isArray(guardado)) {
        setValor(previo => ({ ...previo, ...guardado }));
      }
      setClave(key);
      setListo(true);
    }).catch(() => { if (vigente) setListo(true); });
    return () => { vigente = false; };
  }, [vista]);
  useEffect(() => {
    if (listo && clave) {
      try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
    }
  }, [listo, clave, valor]);
  return [valor, setValor, listo];
}
