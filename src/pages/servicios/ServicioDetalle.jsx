import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, MapPin, Play } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import API from '../../services/api';
import { RAHA_PROVEEDOR } from './rahaProveedor';
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

export function ServicioDetalleVista({ servicio, integrado = false, volverA = '/buscar-servicios', vistaPrevia = false }) {
  const numero = String(servicio?.whatsapp || '').replace(/\D/g, '');
  const contacto = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, vi tu servicio ${servicio.oferta || servicio.titulo} en Gesicom y me gustaría saber más.`)}` : '';
  const Root = vistaPrevia ? 'div' : 'main';
  return <Root className={`gc-service-detail gc-panel${integrado ? ' gc-service-detail--embedded' : ''}${vistaPrevia ? ' gc-service-detail--preview' : ''}`}>
    <nav className="gc-service-detail__nav">{vistaPrevia ? <span><ArrowLeft size={18} /> Buscar proveedores</span> : <Link to={volverA}><ArrowLeft size={18} /> Buscar proveedores</Link>}{!integrado && <Link to="/" className="gc-service-detail__brand">Gesicom</Link>}</nav>
    <section className="gc-service-detail__hero">
      <div className="gc-service-detail__intro"><span className="gc-service-detail__tag">{vistaPrevia ? 'Vista previa' : servicio.proveedorGesicom ? 'Proveedor Gesicom' : 'Proveedor revisado'} · {servicio.especialidad}</span><h1>{servicio.oferta || servicio.titulo || 'Título de tu servicio'}</h1><p>{servicio.descripcion || servicio.resumen || 'Tu presentación breve va a aparecer acá.'}</p>{servicio.cobertura_resumen && <p className="gc-service-detail__coverage-summary"><MapPin size={18} /> {servicio.cobertura_resumen}</p>}<div className="gc-service-detail__person"><img className={servicio.proveedorGesicom ? 'gc-service-detail__brand-avatar' : ''} src={servicio.foto_url} alt={servicio.proveedorGesicom ? `Logo de ${servicio.nombre}` : `Foto de ${servicio.nombre}`} /><div><strong>{servicio.nombre}</strong><span>{servicio.especialidad}</span></div></div>{servicio.proveedorGesicom ? <Link className="gc-service-detail__cta" to={vistaPrevia ? '#' : `/mi-tienda/proveedores/${servicio.id}/conectar`} onClick={vistaPrevia ? event => event.preventDefault() : undefined}>Iniciar afiliación con {servicio.nombre} <ArrowRight size={18} /></Link> : contacto ? <a className="gc-service-detail__cta" href={vistaPrevia ? undefined : contacto} target={vistaPrevia ? undefined : '_blank'} rel={vistaPrevia ? undefined : 'noopener noreferrer'} onClick={vistaPrevia ? event => event.preventDefault() : undefined}>Contactar por WhatsApp <ExternalLink size={18} /></a> : <span className="gc-service-detail__sample">El contacto aparece en los perfiles reales aprobados</span>}</div>
      <div className={`gc-service-detail__cover${servicio.proveedorGesicom ? ' gc-service-detail__cover--brand' : ''}`}><img src={servicio.imagenes?.[0]?.url || servicio.foto_url} alt={servicio.imagenes?.[0]?.alt || `Presentación de ${servicio.nombre}`} /></div>
    </section>
    <div className="gc-service-detail__body"><div className="gc-service-detail__main">{servicio.cobertura && <section className="gc-service-detail__section gc-service-detail__coverage"><span className="gc-service-detail__overline">Disponibilidad</span><h2>Zonas de trabajo</h2>{servicio.cobertura.todas ? <p className="gc-service-detail__coverage-national"><MapPin size={19} /> Todo Paraguay</p> : <div className="gc-service-detail__coverage-groups">{servicio.cobertura.departamentos.map(departamento => <section key={departamento.departamento_id}><h3>{departamento.nombre}</h3><ul>{departamento.ciudades.map(ciudad => <li key={ciudad.ciudad_id}>{ciudad.nombre}</li>)}</ul></section>)}</div>}</section>}<section className="gc-service-detail__section gc-service-detail__proposal"><span className="gc-service-detail__overline">La propuesta</span><h2>Conocé el servicio</h2>{servicio.detalle_html ? <div className="gc-service-detail__rich" dangerouslySetInnerHTML={{ __html: servicio.detalle_html }} /> : <div className="gc-service-detail__rich"><p>{servicio.descripcion || servicio.resumen || 'Acá se va a mostrar la descripción detallada de tu servicio.'}</p></div>}</section>
      {servicio.mostrarPortafolio !== false && servicio.imagenes?.length > 0 && <section className="gc-service-detail__section"><span className="gc-service-detail__overline">Trabajos y referencias</span><h2>Portafolio</h2><div className="gc-service-detail__gallery">{servicio.imagenes.map((imagen, index) => <a href={vistaPrevia ? undefined : imagen.url} onClick={vistaPrevia ? event => event.preventDefault() : undefined} key={imagen.url || imagen.storage_key}><img src={imagen.url} alt={imagen.alt || `Imagen ${index + 1} del portafolio`} loading="lazy" /></a>)}</div></section>}
      {servicio.video_urls?.length > 0 && <section className="gc-service-detail__section"><span className="gc-service-detail__overline">En movimiento</span><h2>Videos del servicio</h2><div className="gc-service-detail__videos">{servicio.video_urls.map(url => { const embed = videoEmbed(url); return embed ? <iframe key={url} src={embed} title={`Video de ${servicio.nombre}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <a key={url} href={vistaPrevia ? undefined : url} onClick={vistaPrevia ? event => event.preventDefault() : undefined}><Play size={18} /> Ver video</a>; })}</div></section>}
    </div><aside className="gc-service-detail__aside"><h2>Lo que ofrece</h2>{servicio.beneficios?.length ? <ul>{servicio.beneficios.map((beneficio, index) => <li key={`${index}-${beneficio}`}><Check size={19} /> {beneficio}</li>)}</ul> : <p>{servicio.descripcion || servicio.resumen || 'Tus beneficios aparecerán acá.'}</p>}{contacto && <a className="gc-service-detail__cta" href={vistaPrevia ? undefined : contacto} onClick={vistaPrevia ? event => event.preventDefault() : undefined}>Consultar al proveedor <ArrowRight size={18} /></a>}</aside></div>
  </Root>;
}

export default function ServicioDetalle({ integrado = false }) {
  const { id } = useParams();
  const location = useLocation();
  const rutaListado = integrado ? '/mi-tienda/buscar-servicios' : '/buscar-servicios';
  const volverA = typeof location.state?.volverA === 'string' && location.state.volverA.startsWith('/') && !location.state.volverA.startsWith('//')
    ? location.state.volverA : rutaListado;
  const [servicio, setServicio] = useState(() => {
    if (id === 'raha') return RAHA_PROVEEDOR;
    return null;
  });
  const [cargando, setCargando] = useState(id !== 'raha');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id === 'raha') { setServicio(RAHA_PROVEEDOR); setCargando(false); return undefined; }
    let vigente = true;
    setServicio(null); setCargando(true); setError('');
    API.get(`/publico/servicios/${id}`).then(({ data }) => { if (vigente) setServicio(data.servicio); })
      .catch(err => { if (vigente) setError(err.response?.status === 404 ? 'Este servicio ya no está publicado.' : 'No pudimos cargar este servicio.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [id]);

  if (cargando) return <main className={`gc-service-detail gc-panel${integrado ? ' gc-service-detail--embedded' : ''}`}><p role="status">Cargando servicio…</p></main>;
  if (error) return <main className={`gc-service-detail gc-panel${integrado ? ' gc-service-detail--embedded' : ''}`}><section className="gc-service-detail__empty"><h1>Servicio no disponible</h1><p>{error}</p><Link to={volverA}>Ver otros proveedores <ArrowRight size={18} /></Link></section></main>;
  return servicio ? <ServicioDetalleVista servicio={servicio} integrado={integrado} volverA={volverA} /> : null;
}
