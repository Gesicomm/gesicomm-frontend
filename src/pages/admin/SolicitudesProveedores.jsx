import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Inbox, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import DocumentosProveedorAdmin from './DocumentosProveedorAdmin';
import CatalogoProveedorRevision from './CatalogoProveedorRevision';
import './solicitudesWeb.css';
import './solicitudesProveedores.css';

const ESTADOS = { pendiente: 'Pendientes', aceptada: 'Aceptadas', rechazada: 'Rechazadas' };
const ETIQUETAS = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' };
const fecha = valor => valor ? new Date(valor).toLocaleString('es-PY') : '—';

export default function SolicitudesProveedores() {
  const [estado, setEstado] = useState('pendiente');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState({ solicitudes: [], total: 0, total_paginas: 0, resumen: {} });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [decision, setDecision] = useState(null);
  const [nota, setNota] = useState('');
  const [errorRevision, setErrorRevision] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const notaRef = useRef(null);
  const avisoRef = useRef(null);
  const accionRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError('');
    API.get('/publico/admin/solicitudes-proveedores', { params: { estado, page, limit: 20 } })
      .then(({ data }) => {
        if (!vigente) return;
        if (page > 1 && !data.solicitudes.length) { setPage(p => p - 1); return; }
        setResultado(data);
      })
      .catch(err => { if (vigente) setError(err.response?.data?.message || 'No pudimos cargar las postulaciones. Volvé a intentar.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [estado, page, revision]);

  useEffect(() => {
    if (decision) notaRef.current?.focus();
    else if (accionRef.current) {
      document.getElementById(accionRef.current)?.focus();
      accionRef.current = null;
    }
  }, [decision]);
  useEffect(() => { if (aviso) avisoRef.current?.focus(); }, [aviso]);

  const empezar = (solicitud, siguiente, button) => {
    accionRef.current = button.id;
    setDecision({ id: solicitud.id, nombre: solicitud.nombre, estado: siguiente });
    setNota(''); setErrorRevision(''); setAviso('');
  };
  const cancelar = () => { setDecision(null); setErrorRevision(''); };
  const guardar = async event => {
    event.preventDefault();
    if (enviando.current || !decision) return;
    if (decision.estado === 'rechazada' && nota.trim().length < 3) { setErrorRevision('Indicá el motivo del rechazo.'); notaRef.current?.focus(); return; }
    enviando.current = true; setGuardando(true); setErrorRevision('');
    try {
      const { data } = await API.patch(`/publico/admin/solicitudes-proveedores/${decision.id}`, { estado: decision.estado, nota: nota.trim() });
      setAviso(`La solicitud de ${decision.nombre} fue ${ETIQUETAS[data.solicitud.estado].toLowerCase()}. La decisión quedó guardada.`);
      setDecision(null); setNota(''); setRevision(r => r + 1);
    } catch (err) {
      setErrorRevision(err.response?.data?.errores?.map(e => e.mensaje).join(' ') || err.response?.data?.message || 'No pudimos guardar la decisión. Tu nota se conserva para reintentar.');
    } finally { enviando.current = false; setGuardando(false); }
  };

  return <main className="web-requests provider-requests">
    <header className="web-requests-heading">
      <div><span className="provider-eyebrow">Red de colaboradores</span><h1>Solicitudes de proveedores</h1><p>Revisá quién quiere ofrecer sus servicios en Gesicom y registrá tu decisión.</p></div>
      <div className="provider-header-actions"><Link to="/admin/vista-proveedor">Ver vista del proveedor <ArrowRight size={17} /></Link><button type="button" disabled={cargando || guardando} onClick={() => { setDecision(null); setRevision(r => r + 1); }}><RefreshCw size={18} /> Actualizar</button></div>
    </header>
    <nav className="provider-status-filters" aria-label="Estado de las postulaciones">
      {Object.entries(ESTADOS).map(([key, label]) => <button type="button" key={key} aria-pressed={estado === key} disabled={guardando} onClick={() => { setEstado(key); setPage(1); setDecision(null); setAviso(''); }}>
        <span>{label}</span><strong>{cargando || error ? '—' : resultado.resumen[key] ?? 0}</strong>
      </button>)}
    </nav>
    <p className="provider-review-help">Al aceptar un perfil completo, se crea un borrador en el espacio del proveedor. Podrá preparar y publicar sus servicios. La aceptación no otorga certificación ni envía un aviso automático.</p>
    {aviso && <p className="provider-notice" role="status" tabIndex={-1} ref={avisoRef}>{aviso}</p>}
    {cargando ? <p role="status">Cargando postulaciones…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(r => r + 1)}>Reintentar</button></div> : !resultado.solicitudes.length ?
      <div className="web-requests-empty"><Inbox size={32} /><h2>No hay solicitudes {ESTADOS[estado].toLowerCase()}</h2><p>Las postulaciones enviadas desde “Ofrecer mis servicios” llegan a esta bandeja para su revisión.</p></div> : <>
        <div className="web-requests-list">{resultado.solicitudes.map(s => <article className="web-request" key={s.id} aria-labelledby={`provider-${s.id}`}>
          <div className="web-request-top"><span className="provider-status" data-state={s.estado}>{ETIQUETAS[s.estado]} · #{s.id}</span><time dateTime={s.recibido_en}>{fecha(s.recibido_en)}</time></div>
          <h2 id={`provider-${s.id}`}>{s.nombre}</h2>
          <p className="provider-specialty">{s.datos.especialidad || 'Especialidad no indicada'}</p>
          {s.datos.foto_url && <img className="provider-review-photo" src={s.datos.foto_url} alt={`Foto de ${s.nombre}`} />}
          <p className="provider-offer"><strong>Postulante:</strong> {s.datos.tipo_postulante === 'empresa' ? 'Empresa' : 'Persona'}</p>
          <dl className="provider-data">
            <div><dt>Correo electrónico</dt><dd><a href={`mailto:${s.email}`}>{s.email}</a></dd></div>
            <div><dt>WhatsApp</dt><dd>{s.datos.whatsapp || 'No indicado'}</dd></div>
            {s.datos.tipo_postulante !== 'empresa' && <div><dt>Cédula / documento</dt><dd>{s.datos.documento || 'No indicado'}</dd></div>}
            <div><dt>RUC</dt><dd>{s.datos.ruc || 'No indicado'}</dd></div>
            {s.datos.tipo_postulante === 'empresa' && <><div><dt>Razón social</dt><dd>{s.datos.razon_social || 'No indicada'}</dd></div><div><dt>Dirección de la empresa</dt><dd>{s.datos.direccion_empresa || 'No indicada'}</dd></div></>}
          </dl>
          <DocumentosProveedorAdmin solicitud={s} onActualizar={() => setRevision(r => r + 1)} />
          {s.datos.descripcion && <div className="provider-description"><h3>Qué ofrece</h3><p>{s.datos.descripcion}</p></div>}
          <details><summary>Ver mensaje original</summary><div className="web-request-message">{s.mensaje}</div></details>
          {s.estado === 'pendiente' && s.faltantes?.length > 0 && <p className="provider-incomplete" role="note">Falta completar: {s.faltantes.join(', ')}.</p>}
          {s.estado === 'pendiente' ? decision?.id === s.id ? <form className="provider-decision" onSubmit={guardar} aria-label={`Revisar solicitud de ${s.nombre}`}>
            <h3>{decision.estado === 'aceptada' ? 'Aceptar' : 'Rechazar'} la solicitud de {s.nombre}</h3>
            <label htmlFor={`nota-${s.id}`}>{decision.estado === 'rechazada' ? 'Motivo del rechazo (obligatorio)' : 'Nota de revisión (opcional)'}</label>
            <textarea id={`nota-${s.id}`} ref={notaRef} value={nota} onChange={e => setNota(e.target.value)} maxLength={2000} rows={3} required={decision.estado === 'rechazada'} disabled={guardando} aria-describedby={`nota-ayuda-${s.id}`} />
            <p id={`nota-ayuda-${s.id}`}>La nota es interna y queda guardada junto con la decisión.</p>
            {errorRevision && <p role="alert" className="provider-error">{errorRevision}</p>}
            <div className="provider-actions"><button type="submit" disabled={guardando} className={decision.estado === 'aceptada' ? 'provider-accept' : 'provider-reject'}>{guardando ? 'Guardando…' : decision.estado === 'aceptada' ? 'Confirmar aceptación' : 'Confirmar rechazo'}</button><button type="button" onClick={cancelar} disabled={guardando}>Cancelar</button></div>
          </form> : <div className="provider-actions"><button id={`aceptar-${s.id}`} type="button" className="provider-accept" disabled={guardando || (s.faltantes?.length ?? 1) > 0} onClick={e => empezar(s, 'aceptada', e.currentTarget)}><Check size={18} /> Aceptar solicitud</button><button id={`rechazar-${s.id}`} type="button" className="provider-reject" disabled={guardando} onClick={e => empezar(s, 'rechazada', e.currentTarget)}><X size={18} /> Rechazar</button></div> :
            <div className="provider-reviewed"><p><strong>{ETIQUETAS[s.estado]}</strong> el {fecha(s.revisado_en)}{s.revisado_por ? ` · Administrador #${s.revisado_por}` : ''}</p>{s.nota_revision && <p className="provider-note">{s.nota_revision}</p>}</div>}
        </article>)}</div>
        <nav className="web-requests-pagination" aria-label="Páginas de postulaciones"><button type="button" disabled={page <= 1 || guardando} onClick={() => { setPage(p => p - 1); setDecision(null); }}>Anterior</button><span>Página {page} de {Math.max(1, resultado.total_paginas)}</span><button type="button" disabled={page >= resultado.total_paginas || guardando} onClick={() => { setPage(p => p + 1); setDecision(null); }}>Siguiente</button></nav>
      </>}

    {/* Un escalón más abajo que las postulaciones de arriba: allá se decide
        quién entra, acá qué mercadería trae cada proveedor aceptado. */}
    <CatalogoProveedorRevision />
  </main>;
}
