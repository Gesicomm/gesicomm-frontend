import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { landingSimpleService } from '../../services/landingSimpleService';
import LandingCodigoEditor from './LandingCodigoEditor';
import { precargarEditor, recordarUltimaLanding, tomarDetallePrecargado } from './precargaEditor';
import './pestanasEditor.css';

// Las plantillas rígidas ya casi no se usan (todo es lienzo): su editor no
// viaja en el mismo chunk que el del lienzo.
const LandingSimpleEditor = lazy(() => import('./LandingSimpleEditor'));

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
    // Entrando directo a /landing/:id (recarga, link guardado) no pasó por
    // LandingSimpleEntry: el catálogo arranca acá, junto con el detalle.
    precargarEditor();
    // Si la entrada ya lo pidió junto con la lista, se usa ese.
    (tomarDetallePrecargado(id) || landingSimpleService.obtener(id))
      .then(l => {
        if (!activo) return;
        setLanding(l);
        recordarUltimaLanding(l?.id);
      })
      .catch(err => {
        if (activo) setError(err?.response?.data?.message || 'No se pudo cargar la landing.');
      });
    return () => { activo = false; };
  }, [id]);

  if (error) {
    return <div className="m-10 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm font-medium">{error}</div>;
  }

  const cargando = (
    <div className="flex items-center justify-center gap-2 text-fg/60 p-16">
      <Loader size={20} className="animate-spin" /> Cargando...
    </div>
  );

  if (!landing) return cargando;

  return landing.template?.kind === 'codigo'
    ? <LandingCodigoEditor landingInicial={landing} />
    : <Suspense fallback={cargando}><LandingSimpleEditor landingInicial={landing} /></Suspense>;
}
