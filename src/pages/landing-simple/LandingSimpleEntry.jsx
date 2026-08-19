import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import TemplateSelector from './TemplateSelector';

/**
 * Puerta de entrada de "/landing" — si el comercio ya tiene una landing
 * rígida, la abre directo; si no tiene ninguna (nunca creó una, o borró
 * la única que tenía — spec punto 12), muestra el selector de los 3
 * templates. La lista de templates sale de LandingTemplate (kind=rigido),
 * nunca depende de si existe o no una Landing — por eso reaparece siempre.
 */
export default function LandingSimpleEntry() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [sinLandings, setSinLandings] = useState(false);

  useEffect(() => {
    let activo = true;
    landingSimpleService.listar()
      .then(landings => {
        if (!activo) return;
        if (landings.length > 0) {
          navigate(`/landing/${landings[0].id}`, { replace: true });
        } else {
          setSinLandings(true);
          setCargando(false);
        }
      })
      .catch(() => { if (activo) { setSinLandings(true); setCargando(false); } });
    return () => { activo = false; };
  }, [navigate]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 text-white/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  if (sinLandings) {
    return <TemplateSelector />;
  }

  return null;
}
