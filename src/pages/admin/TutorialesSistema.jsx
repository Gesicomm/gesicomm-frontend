import { useEffect, useState } from 'react';
import { Film, Save, Trash2, ExternalLink } from 'lucide-react';
import API from '../../services/api';
import { analizarVideo } from '../landing-simple/templates/video';
import './tutorialesSistema.css';

export default function TutorialesSistema() {
  const [datos, setDatos] = useState({ secciones: [], videos: {} });
  const [grupo, setGrupo] = useState('E-commerce');
  const [clave, setClave] = useState('ecommerce.inicio');
  const [borradores, setBorradores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vigente = true;
    API.get('/tutoriales').then(({ data }) => {
      if (!vigente) return;
      setDatos(data);
    }).catch(() => { if (vigente) setError('No pudimos cargar los tutoriales. Actualizá la página para reintentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const elegir = seccion => {
    setGrupo(seccion.grupo);
    setClave(seccion.clave);
    setError('');
    setAviso('');
  };

  const guardar = async valor => {
    setGuardando(true); setError(''); setAviso('');
    try {
      const { data } = await API.put(`/tutoriales/${encodeURIComponent(clave)}`, { url: valor });
      setDatos(prev => {
        const videos = { ...prev.videos };
        if (data.url) videos[clave] = data.url;
        else delete videos[clave];
        return { ...prev, videos };
      });
      setBorradores(prev => {
        const siguientes = { ...prev };
        delete siguientes[clave];
        return siguientes;
      });
      setAviso(data.url ? 'Video guardado. Ya aparece en la sección elegida.' : 'Video quitado de esta sección.');
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos guardar el video. Revisá el enlace e intentá de nuevo.');
    } finally { setGuardando(false); }
  };

  const secciones = datos.secciones.filter(seccion => seccion.grupo === grupo);
  const actual = datos.secciones.find(seccion => seccion.clave === clave);
  const url = borradores[clave] ?? datos.videos?.[clave] ?? '';
  const video = analizarVideo(datos.videos?.[clave]);
  return <main className="admin-tutoriales">
    <header><span className="admin-tutoriales-kicker">Contenido del sistema</span><h1>Tutoriales por sección</h1><p>Elegí un destino y pegá el enlace del video de YouTube. Los usuarios verán el tutorial en esa sección.</p></header>
    {cargando ? <p role="status">Cargando secciones…</p> : <div className="admin-tutoriales-layout">
      <nav aria-label="Secciones de tutoriales" className="admin-tutoriales-nav">
        <div className="admin-tutoriales-groups" role="group" aria-label="Módulo">
          {['E-commerce', 'Mi negocio'].map(nombre => <button key={nombre} type="button" aria-pressed={grupo === nombre} onClick={() => {
            const primera = datos.secciones.find(seccion => seccion.grupo === nombre);
            if (primera) elegir(primera);
          }}>{nombre}</button>)}
        </div>
        <div className="admin-tutoriales-sections">{secciones.map(seccion => <button key={seccion.clave} type="button" aria-current={clave === seccion.clave ? 'true' : undefined} onClick={() => elegir(seccion)}>
          <span>{seccion.nombre}</span><span className={datos.videos?.[seccion.clave] ? 'is-ready' : ''}>{datos.videos?.[seccion.clave] ? 'Con video' : 'Pendiente'}</span>
        </button>)}</div>
      </nav>
      <section className="admin-tutoriales-editor" aria-labelledby="admin-tutoriales-title">
        <div className="admin-tutoriales-editor-head"><span className="admin-tutoriales-icon"><Film size={22} aria-hidden="true" /></span><div><p>{grupo}</p><h2 id="admin-tutoriales-title">{actual?.nombre || 'Sección'}</h2></div></div>
        <form onSubmit={event => { event.preventDefault(); guardar(url); }}>
          <label htmlFor="admin-tutorial-url">Enlace de YouTube</label>
          <input id="admin-tutorial-url" type="url" inputMode="url" maxLength={500} value={url} onChange={event => setBorradores(prev => ({ ...prev, [clave]: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
          <p>Podés usar un enlace normal, corto o de YouTube Shorts. El video se abre en una ventana dentro del panel.</p>
          <div className="admin-tutoriales-actions"><button type="submit" disabled={guardando || !url.trim()}><Save size={18} />{guardando ? 'Guardando…' : 'Guardar video'}</button>{datos.videos?.[clave] && <button type="button" className="is-secondary" disabled={guardando} onClick={() => guardar('')}><Trash2 size={18} />Quitar video</button>}</div>
        </form>
        {error && <p className="admin-tutoriales-error" role="alert">{error}</p>}
        {aviso && <p className="admin-tutoriales-success" role="status">{aviso}</p>}
        {video?.incrustable && <div className="admin-tutoriales-preview"><h3>Vista previa</h3><iframe src={video.embed} title={`Vista previa del tutorial de ${actual?.nombre || 'esta sección'}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><a href={video.url} target="_blank" rel="noopener noreferrer">Abrir en YouTube <ExternalLink size={16} /></a></div>}
      </section>
    </div>}
  </main>;
}
