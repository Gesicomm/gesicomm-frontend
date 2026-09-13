import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import LandingSimpleEditor from './LandingSimpleEditor';
import LandingCodigoEditor from './LandingCodigoEditor';

/**
 * "/landing/:id" — la ruta es una sola, pero hay dos editores según cómo
 * se creó la landing (ver ModoSelector):
 *
 *   template.kind === 'rigido' → LandingSimpleEditor (paneles de contenido)
 *   template.kind === 'codigo' → LandingCodigoEditor (HTML/CSS/JS)
 *
 * La landing se carga acá y se le pasa ya resuelta al editor que
 * corresponda (`landingInicial`), así el modo se decide una sola vez y no
 * hay una segunda llamada al detalle.
 */
export default function EditorSegunModo() {
  const { id } = useParams();
  const [landing, setLanding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    setLanding(null);
    setError('');
    landingSimpleService.obtener(id)
      .then(l => { if (activo) setLanding(l); })
      .catch(err => {
        if (activo) setError(err?.response?.data?.message || 'No se pudo cargar la landing.');
      });
    return () => { activo = false; };
  }, [id]);

  if (error) {
    return <div className="m-10 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm font-medium">{error}</div>;
  }

  if (!landing) {
    return (
      <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
        <Loader size={20} className="animate-spin" /> Cargando...
      </div>
    );
  }

  return landing.template?.kind === 'codigo'
    ? <LandingCodigoEditor landingInicial={landing} />
    : <LandingSimpleEditor landingInicial={landing} />;
}
