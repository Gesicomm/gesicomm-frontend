import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingService } from '../../services/landingService';
import LandingEditor from './LandingEditor';
import '../vitrina/vitrina.css';

/**
 * Puerta de entrada de "/mi-landing" — con el MVP capado a una sola
 * landing por tienda (ver landing.service.js MAX_LANDINGS_POR_TIENDA), ya
 * no tiene sentido un listado: o la tienda ya tiene su landing (se va
 * directo a editarla) o todavía no (se queda acá y LandingEditor se monta
 * en modo creación, sin :id en la URL).
 */
export default function MiLandingEntry() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    landingService.listar()
      .then(landings => {
        if (!activo) return;
        if (landings.length > 0) {
          navigate(`/mi-landing/${landings[0].id}`, { replace: true });
        } else {
          setCargando(false);
        }
      })
      .catch(() => { if (activo) setCargando(false); }); // si falla el listado, se deja crear igual — crear() vuelve a fallar con un error más claro si hace falta
    return () => { activo = false; };
  }, [navigate]);

  if (cargando) {
    return (
      <div className="vit-page">
        <div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Cargando...</p></div>
      </div>
    );
  }

  return <LandingEditor />;
}
