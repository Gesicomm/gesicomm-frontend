import { useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import './solicitudesWeb.css';
import CodigosPrueba from './CodigosPrueba';

const TIPOS = { prueba: 'Prueba gratuita', vendedor: 'Empezar como vendedor', proveedor: 'Proveedor de servicios', demo: 'Demostración', consulta: 'Consulta comercial' };

export default function SolicitudesWeb() {
  const [verCodigos, setVerCodigos] = useState(false);
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState({ mensajes: [], total: 0, total_paginas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    API.get('/publico/admin/contacto', { params: { area: 'comercial', tipo: tipo || undefined, page, limit: 20 } })
      .then(({ data }) => { if (vigente) setResultado(data); })
      .catch(() => { if (vigente) setError('No pudimos cargar las solicitudes. Volvé a intentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [tipo, page, revision]);

  return <main className="web-requests">
    <header className="web-requests-heading"><div><h1>Solicitudes de la web</h1><p>Pruebas gratuitas, vendedores y proveedores que quieren empezar con Gesicom.</p></div>
      <button type="button" onClick={() => setRevision(r => r + 1)} disabled={cargando}><RefreshCw size={18} /> Actualizar</button>
    </header>
    <button type="button" className="trial-code-toggle" aria-expanded={verCodigos} aria-controls="admin-trial-codes" onClick={() => setVerCodigos(v => !v)}>Códigos de prueba gratuita</button>
    {verCodigos && <div id="admin-trial-codes"><CodigosPrueba /></div>}
    <p><Link to="/admin/solicitudes-proveedores">Revisar solicitudes de proveedores →</Link></p>
    <section className="web-requests-filters" aria-label="Filtros de solicitudes">
      <label>Tipo de solicitud<select value={tipo} onChange={e => { setTipo(e.target.value); setPage(1); }}><option value="">Todas las solicitudes</option>{Object.entries(TIPOS).filter(([key]) => key !== 'consulta').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {!cargando && !error && <span>{resultado.total} solicitudes recibidas</span>}
    </section>
    {cargando ? <p role="status">Cargando solicitudes…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(r => r + 1)}>Reintentar</button></div> : !resultado.mensajes.length ? <div className="web-requests-empty"><Mail size={32} /><h2>Todavía no hay solicitudes</h2><p>Las solicitudes enviadas desde la landing aparecerán acá con sus datos de contacto.</p></div> : <>
      <div className="web-requests-list">{resultado.mensajes.map(m => <article className="web-request" key={m.id}>
        <div className="web-request-top"><span className="web-request-type">{TIPOS[m.tipo] || TIPOS.consulta}</span><time dateTime={m.recibido_en}>{new Date(m.recibido_en).toLocaleString('es-PY')}</time></div>
        <h2>{m.nombre}</h2><a href={`mailto:${m.email}`}>{m.email}</a>
        <p className="web-request-subject">{m.asunto}</p>
        <details><summary>Ver solicitud completa · #{m.id}</summary><div className="web-request-message">{m.mensaje}</div></details>
      </article>)}</div>
      <nav className="web-requests-pagination" aria-label="Páginas de solicitudes"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {Math.max(1, resultado.total_paginas)}</span><button disabled={page >= resultado.total_paginas} onClick={() => setPage(p => p + 1)}>Siguiente</button></nav>
    </>}
  </main>;
}
