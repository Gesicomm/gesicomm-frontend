import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Film, Play, X } from 'lucide-react';
import useTutorialesSistema from '../hooks/useTutorialesSistema';
import { MODULOS_ACCESO, moduloDeRuta } from '../utils/accesos';
import { analizarVideo } from '../pages/landing-simple/templates/video';
import './tutorialDock.css';

const SECCIONES_NEGOCIO = {
  tienda: 'Tienda',
  contacto: 'Contacto',
  pasarelas: 'Pagos',
  economica: 'Costos',
  analitica: 'Analítica',
  raha: 'Conexión a proveedor',
};

export default function TutorialDock() {
  const location = useLocation();
  const moduloClave = moduloDeRuta(location.pathname);
  const modulo = MODULOS_ACCESO.find(item => item.clave === moduloClave);

  // El editor de E-commerce ya tiene sus tutoriales dentro de la vista previa.
  if (!modulo || /^\/(?:mi-landing|landing)\/[^/]+/.test(location.pathname)) return null;

  return <TutorialDockVisible modulo={modulo} search={location.search} />;
}

function TutorialDockVisible({ modulo, search }) {
  const videos = useTutorialesSistema();
  const [abierto, setAbierto] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const panelId = useId();

  const tabSolicitada = new URLSearchParams(search).get('tab');
  const tab = tabSolicitada === 'speedbox' ? 'raha' : tabSolicitada;
  const seccionNegocio = modulo.clave === 'negocio' ? (SECCIONES_NEGOCIO[tab] ? tab : 'tienda') : null;
  const nombreSeccion = seccionNegocio ? SECCIONES_NEGOCIO[seccionNegocio] : modulo.nombre;
  const url = seccionNegocio
    ? videos[`mi-negocio.${seccionNegocio}`] || videos['modulo.negocio']
    : videos[`modulo.${modulo.clave}`];
  const video = analizarVideo(url);

  useEffect(() => { setReproduciendo(false); }, [url]);
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = event => {
      if (event.key === 'Escape') { setAbierto(false); setReproduciendo(false); }
    };
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [abierto]);

  const alternar = () => {
    if (abierto) setReproduciendo(false);
    setAbierto(!abierto);
  };

  return createPortal(<div className={`gc-tutorial-dock${abierto ? ' is-open' : ''}`}>
    {abierto && <section id={panelId} className="gc-tutorial-popover" aria-label={`Tutorial de ${nombreSeccion}`}>
      <header className="gc-tutorial-popover-head">
        <span className="gc-tutorial-popover-icon"><Film size={20} aria-hidden="true" /></span>
        <div><span>Tutorial</span><h2>{nombreSeccion}</h2></div>
        <button type="button" className="gc-tutorial-close" onClick={alternar} aria-label="Minimizar tutorial"><X size={19} aria-hidden="true" /></button>
      </header>
      {video?.incrustable ? reproduciendo
        ? <iframe key={video.embed} src={`${video.embed}${video.embed.includes('?') ? '&' : '?'}autoplay=1`} title={`Video tutorial de ${nombreSeccion}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <button type="button" className="gc-tutorial-play" onClick={() => setReproduciendo(true)} aria-label={`Reproducir tutorial de ${nombreSeccion}`}>
          {video.miniatura && <img src={video.miniatura} alt="" />}
          <span><Play size={24} fill="currentColor" aria-hidden="true" /></span>
        </button>
        : <div className="gc-tutorial-empty"><Film size={27} aria-hidden="true" /><span>Acá va el video explicativo</span><small>Video próximamente</small></div>}
      <p>{video?.incrustable ? 'Podés seguir recorriendo esta sección mientras lo ves.' : 'El tutorial aparecerá acá cuando esté disponible.'}</p>
    </section>}
    <button type="button" className="gc-tutorial-trigger" onClick={alternar} aria-expanded={abierto} aria-controls={abierto ? panelId : undefined} aria-label={`${abierto ? 'Minimizar' : 'Abrir'} tutorial de ${nombreSeccion}`}>
      {abierto ? <ChevronRight size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}
      <span>Tutorial</span>
    </button>
  </div>, document.body);
}
