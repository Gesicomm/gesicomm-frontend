import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Play } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import API from '../../services/api';
import { PORTAFOLIO_EJEMPLO, SERVICIOS_EJEMPLO } from './serviciosEjemplos';
import './servicioDetalle.css';

function videoEmbed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname === 'www.youtube.com' && parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return /^[\w-]{11}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'vimeo.com') {
      const id = parsed.pathname.slice(1);
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch { /* URL inválida */ }
  return null;
}

function ejemploDetalle(item) {
  return { ...item, titulo: item.oferta, resumen: item.descripcion, detalle_html: `<p>${item.descripcion}</p>`,
    beneficios: ['Presentación clara del trabajo', 'Comunicación directa', 'Propuesta adaptada a cada proyecto'],
    imagenes: item.id === 'ejemplo-video' ? PORTAFOLIO_EJEMPLO : [], video_urls: [] };
}

export default function ServicioDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const volverA = typeof location.state?.volverA === 'string' && location.state.volverA.startsWith('/') && !location.state.volverA.startsWith('//') && location.state.volverA !== '/buscar-servicios'
    ? location.state.volverA : '';
  const [servicio, setServicio] = useState(() => {
    const muestra = SERVICIOS_EJEMPLO.find(item => item.id === id);
    return muestra ? ejemploDetalle(muestra) : null;
  });
  const [cargando, setCargando] = useState(!String(id).startsWith('ejemplo-'));
  const [error, setError] = useState('');

  useEffect(() => {
    const muestra = SERVICIOS_EJEMPLO.find(item => item.id === id);
    if (muestra) { setServicio(ejemploDetalle(muestra)); setCargando(false); return undefined; }
    let vigente = true;
    setServicio(null); setCargando(true); setError('');
    API.get(`/publico/servicios/${id}`).then(({ data }) => { if (vigente) setServicio(data.servicio); })
      .catch(err => { if (vigente) setError(err.response?.status === 404 ? 'Este servicio ya no está publicado.' : 'No pudimos cargar este servicio.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [id]);

  const numero = String(servicio?.whatsapp || '').replace(/\D/g, '');
  const contacto = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, vi tu servicio ${servicio.oferta || servicio.titulo} en Gesicom y me gustaría saber más.`)}` : '';
  return <main className="gc-service-detail gc-panel">
    <nav className="gc-service-detail__nav"><Link to="/buscar-servicios" state={{ volverA }}><ArrowLeft size={18} /> Buscar proveedores</Link><Link to="/" className="gc-service-detail__brand">Gesicom</Link></nav>
    {cargando ? <p role="status">Cargando servicio…</p> : error ? <section className="gc-service-detail__empty"><h1>Servicio no disponible</h1><p>{error}</p><Link to="/buscar-servicios" state={{ volverA }}>Ver otros proveedores <ArrowRight size={18} /></Link></section> : servicio && <>
      <section className="gc-service-detail__hero">
        <div className="gc-service-detail__intro"><span className="gc-service-detail__tag">{servicio.ejemplo ? 'Vista de ejemplo' : 'Proveedor revisado'} · {servicio.especialidad}</span><h1>{servicio.oferta || servicio.titulo}</h1><p>{servicio.descripcion || servicio.resumen}</p><div className="gc-service-detail__person"><img src={servicio.foto_url} alt={`Foto de ${servicio.nombre}`} /><div><strong>{servicio.nombre}</strong><span>{servicio.especialidad}</span></div></div>{contacto ? <a className="gc-service-detail__cta" href={contacto} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp <ExternalLink size={18} /></a> : <span className="gc-service-detail__sample">El contacto aparece en los perfiles reales aprobados</span>}</div>
        <div className="gc-service-detail__cover"><img src={servicio.imagenes?.[0]?.url || servicio.foto_url} alt={servicio.imagenes?.[0]?.alt || `Presentación de ${servicio.nombre}`} /></div>
      </section>
      <div className="gc-service-detail__body"><div className="gc-service-detail__main"><section className="gc-service-detail__section"><span className="gc-service-detail__overline">La propuesta</span><h2>Conocé el servicio</h2>{servicio.detalle_html ? <div className="gc-service-detail__rich" dangerouslySetInnerHTML={{ __html: servicio.detalle_html }} /> : <div className="gc-service-detail__rich"><p>{servicio.descripcion || servicio.resumen}</p></div>}</section>
        {servicio.imagenes?.length > 0 && <section className="gc-service-detail__section"><span className="gc-service-detail__overline">Trabajos y referencias</span><h2>Portafolio</h2><div className="gc-service-detail__gallery">{servicio.imagenes.map((imagen, index) => <a href={imagen.url} target="_blank" rel="noopener noreferrer" key={imagen.url}><img src={imagen.url} alt={imagen.alt || `Imagen ${index + 1} del portafolio`} loading="lazy" /></a>)}</div></section>}
        {servicio.video_urls?.length > 0 && <section className="gc-service-detail__section"><span className="gc-service-detail__overline">En movimiento</span><h2>Videos del servicio</h2><div className="gc-service-detail__videos">{servicio.video_urls.map(url => { const embed = videoEmbed(url); return embed ? <iframe key={url} src={embed} title={`Video de ${servicio.nombre}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <a key={url} href={url} target="_blank" rel="noopener noreferrer"><Play size={18} /> Ver video</a>; })}</div></section>}
      </div><aside className="gc-service-detail__aside"><h2>Lo que ofrece</h2>{servicio.beneficios?.length ? <ul>{servicio.beneficios.map((beneficio, index) => <li key={`${index}-${beneficio}`}><Check size={19} /> {beneficio}</li>)}</ul> : <p>{servicio.descripcion || servicio.resumen}</p>}{contacto && <a className="gc-service-detail__cta" href={contacto} target="_blank" rel="noopener noreferrer">Consultar al proveedor <ArrowRight size={18} /></a>}</aside></div>
    </>}
  </main>;
}
