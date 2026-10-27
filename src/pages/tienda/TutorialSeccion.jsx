import { useEffect, useState } from 'react';
import { Film, X } from 'lucide-react';
import { analizarVideo } from '../landing-simple/templates/video';
import './tutorialSeccion.css';

export default function TutorialSeccion({ nombre, url, destacado = false }) {
  const [abierto, setAbierto] = useState(false);
  const video = analizarVideo(url);

  useEffect(() => { setAbierto(false); }, [url, nombre]);
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = event => { if (event.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierto]);

  return <>
    <section className={`tn-tutorial${destacado ? ' is-featured' : ''}`} aria-label={`Tutorial de ${nombre}`}>
      <div className="tn-tutorial-info"><span className="tn-tutorial-icon"><Film size={22} aria-hidden="true" /></span><div><h3>Tutorial de {nombre}</h3><p>{video?.incrustable ? 'Mirá el video para conocer esta sección.' : 'Acá vas a encontrar el video explicativo de esta sección.'}</p></div></div>
      {video?.incrustable ? <button className="tn-tutorial-media is-ready" type="button" onClick={() => setAbierto(true)}>
        {video.miniatura && <img src={video.miniatura} alt="" />}
        <span><Film size={24} aria-hidden="true" />Ver tutorial</span>
      </button> : <div className="tn-tutorial-media is-pending"><Film size={25} aria-hidden="true" /><span>Espacio para el video explicativo</span><small>Video próximamente</small></div>}
    </section>
    {abierto && video?.incrustable && <div className="tn-tutorial-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAbierto(false); }}>
      <div className="tn-tutorial-dialog" role="dialog" aria-modal="true" aria-label={`Tutorial de ${nombre}`}>
        <div className="tn-tutorial-dialog-head"><h2>Tutorial de {nombre}</h2><button type="button" autoFocus onClick={() => setAbierto(false)} aria-label="Cerrar tutorial"><X size={20} /></button></div>
        <iframe src={video.embed} title={`Tutorial de ${nombre}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    </div>}
  </>;
}
