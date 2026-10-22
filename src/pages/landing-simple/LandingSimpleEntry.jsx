import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import ModoSelector from './ModoSelector';
import { precargarDetalleUltimaLanding, precargarEditor } from './precargaEditor';

/**
 * Puerta de entrada de "/landing" — si el comercio ya tiene una landing,
 * la abre directo; si no tiene ninguna (nunca creó una, o borró la única
 * que tenía — spec punto 12), muestra ModoSelector: primero cómo armarla
 * (template o lienzo en blanco) y recién después con qué template. Ese
 * selector no depende de si existe o no una Landing — por eso reaparece
 * siempre que se queda en cero.
 */
export default function LandingSimpleEntry() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [sinLandings, setSinLandings] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setSinLandings(false);
    setError('');
    precargarEditor();
    precargarDetalleUltimaLanding();
    landingSimpleService.listar()
      .then(landings => {
        if (!activo) return;
        if (!Array.isArray(landings)) throw new Error('No se pudieron cargar tus páginas de venta.');
        if (landings.length > 0) {
          navigate(`/landing/${landings[0].id}`, { replace: true });
        } else {
          setSinLandings(true);
          setCargando(false);
        }
      })
      .catch(err => {
        if (!activo) return;
        setError(err?.response?.data?.message || 'No se pudieron cargar tus páginas de venta.');
        setCargando(false);
      });
    return () => { activo = false; };
  }, [navigate, intento]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="m-6 md:m-10 rounded-lg border border-danger/40 bg-danger/10 p-5 text-danger">
        <p>{error}</p>
        <button type="button" onClick={() => setIntento(n => n + 1)} className="mt-3 rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold">
          Reintentar
        </button>
      </div>
    );
  }

  if (sinLandings) {
    return <ModoSelector />;
  }

  return null;
}
