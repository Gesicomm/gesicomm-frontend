import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Search, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { TutorialHeaderAction } from '../../components/TutorialDock';
import { RAHA_PROVEEDOR } from './rahaProveedor';
import './buscarServicios.css';

const CATEGORIAS = [
  ['', 'Todas las especialidades'],
  ['productos_logistica', 'Productos, envíos y logística'],
  ['editor_videos', 'Editor de videos'],
  ['media_buyer', 'Publicidad'],
  ['webmaster', 'Desarrollo web'],
  ['partner_certificado', 'Otros servicios'],
];

export default function BuscarServicios({ independiente = false, integrado = false }) {
  const location = useLocation();
  const rutaDeSistema = typeof location.state?.volverA === 'string' && location.state.volverA.startsWith('/') && !location.state.volverA.startsWith('//') && location.state.volverA !== '/buscar-servicios'
    ? location.state.volverA : location.pathname !== '/buscar-servicios' ? location.pathname : '';
  const rutaDetalle = integrado || location.pathname.startsWith('/mi-tienda/') ? '/mi-tienda/buscar-servicios' : '/buscar-servicios';
  const volverASistema = integrado && location.pathname === '/mi-tienda' ? '/mi-tienda/buscar-servicios' : rutaDeSistema || rutaDetalle;
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setBusqueda(texto.trim()); setPagina(1); }, 280);
    return () => clearTimeout(timer);
  }, [texto]);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true); setError('');
    API.get('/publico/servicios', { params: { busqueda, categoria, page: pagina }, signal: controller.signal })
      .then(({ data }) => { setResultado(data); })
      .catch(err => { if (err.code !== 'ERR_CANCELED') setError('No pudimos cargar los servicios. Probá de nuevo.'); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [busqueda, categoria, pagina, revision]);

  const limpiar = () => { setTexto(''); setBusqueda(''); setCategoria(''); setPagina(1); };
  const coincideRaha = (!categoria || categoria === 'productos_logistica') && (!busqueda || `${RAHA_PROVEEDOR.nombre} ${RAHA_PROVEEDOR.especialidad} ${RAHA_PROVEEDOR.oferta} ${RAHA_PROVEEDOR.descripcion}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const mostrarRaha = coincideRaha && pagina === 1;
  const servicios = [...(mostrarRaha ? [RAHA_PROVEEDOR] : []), ...(resultado?.servicios || [])];
  const totalServicios = (resultado?.total || 0) + (coincideRaha ? 1 : 0);
  const paginasDirectorio = resultado?.total_paginas || 0;

  return <div className={`gc-services ${independiente ? 'gc-services-standalone' : ''}`}>
    {independiente && <header className="gc-services-sitehead"><Link to="/" className="gc-services-brand"><span className="gc-services-brandmark">G</span> Gesicom</Link><Link to={rutaDeSistema || '/'} className="gc-services-back">{rutaDeSistema ? 'Volver a mi sistema' : 'Volver al inicio'} <ArrowRight size={16} /></Link></header>}
    <section className="gc-services-hero" aria-labelledby="gc-services-title">
      <div className="gc-services-hero-copy"><span className="gc-services-eyebrow"><Sparkles size={16} /> Red de colaboradores Gesicom</span>
        <h1 id="gc-services-title">Encontrá el talento que <em>hace avanzar</em> tu negocio.</h1>
        <p>Explorá profesionales y equipos que pueden ayudarte con tus productos, envíos, contenido y presencia digital.</p>
        <div className="gc-services-hero-note"><span className="gc-services-note-icon"><Users size={19} /></span><span>Perfiles revisados por el equipo de Gesicom</span></div>
      </div>
      <div className="gc-services-hero-art" aria-hidden="true"><div className="gc-services-orbit gc-services-orbit-one" /><div className="gc-services-orbit gc-services-orbit-two" /><span className="gc-services-art-center">✳</span><span className="gc-services-art-chip gc-services-chip-one">Ideas que conectan</span><span className="gc-services-art-chip gc-services-chip-two">Tu próximo aliado ↗</span></div>
    </section>

    <section className="gc-services-content" aria-label="Directorio de proveedores">
      <div className="gc-services-toolbar"><div><span className="gc-services-section-kicker">Explorá la red</span><div className="gc-services-heading-row"><h2>Buscar proveedores</h2><div className="gc-services-tutorial"><TutorialHeaderAction /></div></div><p>Filtrá por especialidad o buscá lo que necesitás.</p></div>
        <div className="gc-services-controls"><label className="gc-services-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Buscar por nombre o servicio</span><input type="search" placeholder="Fotografía, envíos, videos…" value={texto} onChange={e => setTexto(e.target.value)} /></label>
          <label className="gc-services-select"><SlidersHorizontal size={19} aria-hidden="true" /><span className="sr-only">Filtrar por tipo de proveedor</span><select value={categoria} onChange={e => { setCategoria(e.target.value); setPagina(1); }}>{CATEGORIAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      </div>
      <div className="gc-services-resultline" role="status">{cargando ? 'Buscando servicios…' : error ? '' : `${totalServicios} servicio${totalServicios === 1 ? '' : 's'} disponible${totalServicios === 1 ? '' : 's'}`}</div>
      {error ? <div className="gc-services-empty" role="alert"><h3>La búsqueda no cargó</h3><p>{error}</p><button type="button" onClick={() => setRevision(n => n + 1)}>Reintentar <ArrowRight size={16} /></button></div> : cargando ? <div className="gc-services-grid" aria-hidden="true">{[1, 2, 3].map(n => <div className="gc-services-skeleton" key={n} />)}</div> : servicios.length ? <>
        <div className="gc-services-grid">{servicios.map((servicio, index) => {
          return <article className="gc-service-card" key={servicio.id}>
            <Link className="gc-service-card-link" to={`${rutaDetalle}/${servicio.id}`} state={{ volverA: volverASistema }} aria-label={`Ver ficha completa de ${servicio.nombre}`} />
            <div className={`gc-service-photo${servicio.proveedorGesicom ? ' gc-service-photo--brand' : ''}`}><img src={servicio.foto_url} alt={servicio.proveedorGesicom ? `Logo de ${servicio.nombre}` : `Foto de ${servicio.nombre}`} loading="lazy" /><span className="gc-service-verified">{servicio.proveedorGesicom ? 'Proveedor Gesicom' : 'Perfil revisado'}</span></div>
            <div className="gc-service-info"><div className="gc-service-tags" aria-label={`Tipo de servicio: ${servicio.especialidad}`}><span className="gc-service-category">{servicio.especialidad}</span>{servicio.etiquetas?.map(etiqueta => <span className="gc-service-tag" key={etiqueta}>{etiqueta}</span>)}</div><h3>{servicio.oferta}</h3><p className="gc-service-person">{servicio.nombre}</p><p className="gc-service-description">{servicio.descripcion}</p>{servicio.cobertura_resumen && <p className="gc-service-zones"><MapPin size={17} aria-hidden="true" />{servicio.cobertura_resumen}</p>}
              <Link className="gc-service-contact" to={`${rutaDetalle}/${servicio.id}`} state={{ volverA: volverASistema }} aria-label={`Más información sobre ${servicio.oferta}`}>Más información <ArrowRight size={18} /></Link></div>
          </article>;
        })}</div>
        {paginasDirectorio > 1 && <nav className="gc-services-pages" aria-label="Páginas de servicios"><button type="button" disabled={pagina <= 1} onClick={() => setPagina(n => n - 1)}>Anterior</button><span>Página {pagina} de {paginasDirectorio}</span><button type="button" disabled={pagina >= paginasDirectorio} onClick={() => setPagina(n => n + 1)}>Siguiente</button></nav>}
      </> : <div className="gc-services-empty"><span className="gc-services-empty-icon"><Search size={30} /></span><h3>{busqueda || categoria ? 'No encontramos servicios con esos filtros' : 'Pronto vas a encontrar servicios acá'}</h3><p>{busqueda || categoria ? 'Probá otra palabra o elegí una especialidad diferente.' : 'Estamos revisando los primeros perfiles para que encuentres colaboradores con una presentación clara y completa.'}</p>{(busqueda || categoria) && <button type="button" onClick={limpiar}>Limpiar filtros <X size={16} /></button>}</div>}
    </section>
  </div>;
}
