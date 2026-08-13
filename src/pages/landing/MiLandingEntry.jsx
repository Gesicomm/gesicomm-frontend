import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingService } from '../../services/landingService';
import LandingEditor from './LandingEditor';
import '../vitrina/vitrina.css';

/**
 * Puerta de entrada de "/mi-landing" — la tienda siempre tiene 3 páginas
 * fijas (Inicio/Catálogo/Contacto, ver landing.service.js
 * asegurarPaginasFijas()), así que esto solo las garantiza y aterriza en
 * Inicio; el resto de la navegación entre páginas la maneja LandingEditor
 * con sus propios tabs.
 */
export default function MiLandingEntry() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    landingService.paginas()
      .then(paginas => {
        if (!activo) return;
        const inicio = paginas.find(p => p.tipo_pagina === 'inicio') || paginas[0];
        if (inicio) {
          navigate(`/mi-landing/${inicio.id}`, { replace: true });
        } else {
          setCargando(false);
        }
      })
      .catch(() => { if (activo) setCargando(false); });
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
