import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Download, Loader, RefreshCw, Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { rahaService } from '../../services/rahaService';
import { ESTADOS_RAHA, GRUPOS_RAHA, RahaDocumentos, RahaHistorial } from '../tienda/RahaConexion';
import '../tienda/raha.css';
export default function RahaSolicitudes() {
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('solicitud')) || null;
  const [rows, setRows] = useState([]), [total, setTotal] = useState(0), [offset, setOffset] = useState(0), [filtro, setFiltro] = useState('en_revision');
  const [solicitud, setSolicitud] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [estado, setEstado] = useState('observada'), [nota, setNota] = useState(''), [referencia, setReferencia] = useState('');
  const detailRequest = useRef(0);
  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await rahaService.listar({ estado: filtro || undefined, offset }); setRows(result.solicitudes); setTotal(result.total); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo cargar la bandeja.'); }
    finally { setLoading(false); }
  }, [filtro, offset]);
  const detalle = useCallback(async () => {
    const requestId = ++detailRequest.current;
    setSolicitud(null); setNota(''); setReferencia(''); setEstado('observada');
    if (!id) return;
    setLoading(true); setError('');
    try { const row = await rahaService.detalle(id); if (requestId === detailRequest.current) setSolicitud(row); }
    catch (err) { if (requestId === detailRequest.current) setError(err.response?.data?.message || 'No se pudo cargar la solicitud.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { detalle(); }, [detalle]);
  async function action(fn) {
    if (busy) return; setBusy(true); setError('');
    try { const result = await fn(); if (result?.id) { setSolicitud(result); setEstado('observada'); setNota(''); setReferencia(''); await cargar(); } }
    catch (err) { setError(err.response?.data?.message || 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }
  const transitions = solicitud?.estado === 'en_revision' ? ['observada', 'enviada_raha', 'rechazada'] : solicitud?.estado === 'enviada_raha' ? ['observada', 'aprobada', 'rechazada'] : [];
  return <main className="raha raha-admin"><header className="raha-status"><div><h1>Solicitudes Raha</h1></div><button type="button" className="raha-icon" title="Actualizar bandeja" aria-label="Actualizar bandeja" disabled={busy || loading} onClick={() => { cargar(); detalle(); }}><RefreshCw size={18} /></button></header>
    {error && <div className="raha-alert raha-error" role="alert"><AlertCircle size={18} />{error}</div>}
    <div className="raha-admin-layout"><aside className="raha-queue"><label className="raha-field"><span>Estado de solicitudes</span><select value={filtro} onChange={event => { setFiltro(event.target.value); setOffset(0); }}><option value="">Todas las presentadas</option>{Object.entries(ESTADOS_RAHA).filter(([key]) => key !== 'borrador').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <p className="raha-muted">{total} solicitudes</p>
      {loading && <Loader size={18} className="raha-spin" aria-label="Cargando" />}
      <ul>{rows.map(row => <li key={row.id}><button type="button" className="raha-button" aria-pressed={id === row.id} onClick={() => setParams({ solicitud: row.id })}><strong>#{row.id} · {row.tienda?.nombre}</strong><span>{ESTADOS_RAHA[row.estado]}</span></button></li>)}</ul>
      {!loading && rows.length === 0 && <p className="raha-muted">No hay solicitudes en este estado.</p>}
      <div className="raha-actions"><button type="button" className="raha-icon" aria-label="Página anterior" title="Página anterior" disabled={!offset || loading} onClick={() => setOffset(prev => prev - 30)}><ArrowLeft size={16} /></button><button type="button" className="raha-icon" aria-label="Página siguiente" title="Página siguiente" disabled={offset + 30 >= total || loading} onClick={() => setOffset(prev => prev + 30)}><ArrowRight size={16} /></button></div>
    </aside><div className="raha-details">{!solicitud ? <p className="raha-muted">{id && loading ? 'Cargando solicitud…' : 'Seleccioná una solicitud.'}</p> : <>
      <div className="raha-status"><div><strong>Solicitud #{solicitud.id}</strong><span className={`raha-badge ${solicitud.estado}`}>{ESTADOS_RAHA[solicitud.estado]}</span></div><button type="button" className="raha-button" disabled={busy} onClick={() => action(() => rahaService.expediente(solicitud.id))}><Download size={16} /> Descargar expediente</button></div>
      {GRUPOS_RAHA.map(group => <section className="raha-section" key={group.titulo}><h3>{group.titulo}</h3><dl className="raha-fields">{group.campos.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{solicitud.datos[key] || '—'}</dd></div>)}</dl></section>)}
      <RahaDocumentos documentos={solicitud.documentos} busy={busy} onDownload={doc => action(() => rahaService.documento(doc))} />
      <RahaHistorial solicitud={solicitud} />
      {transitions.length > 0 && <form className="raha-section" onSubmit={event => { event.preventDefault(); action(() => rahaService.revisar(solicitud.id, { estado, nota, referencia, version: solicitud.version })); }}><h3>Registrar revisión manual</h3><div className="raha-fields">
        <label className="raha-field"><span>Resultado de la revisión</span><select value={estado} disabled={busy} onChange={event => setEstado(event.target.value)}>{transitions.map(key => <option key={key} value={key}>{ESTADOS_RAHA[key]}</option>)}</select></label>
        <label className="raha-field"><span>Referencia del envío o respuesta de Raha</span><input value={referencia} maxLength={180} required={['enviada_raha', 'aprobada'].includes(estado)} disabled={busy} onChange={event => setReferencia(event.target.value)} /></label>
        <label className="raha-field raha-wide"><span>Nota para el comercio</span><textarea required minLength={5} maxLength={1000} rows={3} value={nota} disabled={busy} onChange={event => setNota(event.target.value)} /></label>
      </div><div className="raha-actions" style={{ marginTop: 16 }}><button type="submit" className="raha-button raha-primary" disabled={busy}><Save size={16} /> Registrar resultado</button></div></form>}
    </>}</div></div>
  </main>;
}
