import { useId, useState } from 'react';
import { ChevronDown, Film } from 'lucide-react';
import { analizarVideo } from '../landing-simple/templates/video';
import './tutorialTiendaLateral.css';

export default function TutorialTiendaLateral({ nombre, url, urlGeneral }) {
  const [abierto, setAbierto] = useState(false);
  const contenidoId = useId();
  const video = analizarVideo(url || urlGeneral);
  const usaGeneral = !url && Boolean(urlGeneral);

  return <aside className="tn-guide" aria-label={`Tutorial de ${nombre}`}>
    <button type="button" className="tn-guide-toggle" aria-expanded={abierto} aria-controls={contenidoId} onClick={() => setAbierto(valor => !valor)}>
      <span className="tn-guide-icon"><Film size={21} aria-hidden="true" /></span>
      <span className="tn-guide-title"><strong>Tutorial de {nombre}</strong><small>{usaGeneral ? 'Video general de Mi negocio' : video?.incrustable ? 'Mirá el video mientras configurás' : 'Espacio para el video'}</small></span>
      <ChevronDown size={20} className={`tn-guide-chevron${abierto ? ' is-open' : ''}`} aria-hidden="true" />
    </button>
    {!abierto && <div className="tn-guide-teaser" aria-hidden="true">
      {video?.miniatura && <img src={video.miniatura} alt="" />}
      <Film size={20} />
      <span>{video?.incrustable ? 'Tocá la flecha para ver el video' : 'Video próximamente'}</span>
    </div>}
    {abierto && <div id={contenidoId} className="tn-guide-content">
      {video?.incrustable ? <iframe key={video.embed} src={video.embed} title={`Tutorial de ${nombre}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <div className="tn-guide-empty"><Film size={28} aria-hidden="true" /><span>Acá va el video explicativo de {nombre}.</span><small>Video próximamente</small></div>}
      <p>{video?.incrustable ? 'El video queda a la vista mientras recorrés la configuración.' : 'El tutorial aparecerá acá cuando esté disponible.'}</p>
    </div>}
  </aside>;
}
