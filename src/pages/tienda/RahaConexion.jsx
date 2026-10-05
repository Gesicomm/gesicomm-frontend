import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Loader, RefreshCw, Save, Send, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { rahaService } from '../../services/rahaService';
import './raha.css';
export const ESTADOS_RAHA = { borrador: 'Borrador', en_revision: 'En revisión de Gesicom', observada: 'Requiere correcciones', enviada_raha: 'Enviada manualmente a Raha', aprobada: 'Aprobación de Raha registrada', rechazada: 'Rechazada' };
export const GRUPOS_RAHA = [
  { titulo: 'Empresa y representante', campos: [['razon_social', 'Razón social'], ['ruc', 'RUC'], ['representante', 'Nombre del representante legal'], ['cedula', 'Cédula del representante legal']] },
  { titulo: 'Contacto y dirección', campos: [['email', 'Email', 'email'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección'], ['ciudad', 'Ciudad'], ['departamento', 'Departamento']] },
  { titulo: 'Actividad comercial', campos: [['actividad_economica', 'Actividad económica'], ['tipo_productos', 'Tipo de productos que vendés', 'textarea'], ['operaciones_mensuales', 'Volumen estimado de operaciones por mes(pedidos)', 'number']] },
  { titulo: 'Cuenta para liquidaciones', campos: [['banco', 'Banco'], ['titular_cuenta', 'Titular de la cuenta'], ['numero_cuenta', 'Número de cuenta'], ['moneda', 'Moneda', 'select']] },
];
const LIMITES = { razon_social: 180, ruc: 30, representante: 180, cedula: 30, email: 150, telefono: 30, direccion: 300, ciudad: 100, departamento: 100, actividad_economica: 300, tipo_productos: 600, operaciones_mensuales: 10, banco: 100, titular_cuenta: 180, numero_cuenta: 80 };
const TIPOS_DOC = [['ruc', 'Constancia de RUC', true], ['cedula', 'Cédula del representante legal', true]];
export function RahaHistorial({ solicitud }) {
  return <section className="raha-section"><h3>Seguimiento</h3>
    {solicitud.historial?.length ? <ol className="raha-history">{solicitud.historial.map((entry, index) => <li key={index}>
      <div><strong>{ESTADOS_RAHA[entry.estado] || entry.estado}</strong><time>{new Date(entry.ocurrido_at).toLocaleString('es-PY')}</time></div>
      {entry.nota && <p>{entry.nota}</p>}{entry.referencia && <p>Referencia: {entry.referencia}</p>}
    </li>)}</ol> : <p className="raha-muted">Todavía no se presentó la solicitud.</p>}
  </section>;
}
export function RahaDocumentos({ documentos = [], editable = false, busy, onUpload, onDelete, onDownload }) {
  return <section className="raha-section"><h3>Documentos e imágenes</h3>
    <div className="raha-docs">{TIPOS_DOC.map(([tipo, label, required]) => <div className="raha-doc-group" key={tipo}>
      <div className="raha-doc-head"><strong>{label}</strong><span className="raha-muted">{required ? 'Obligatorio' : 'Opcional'}</span></div>
      <ul>{documentos.filter(doc => doc.tipo === tipo).map(doc => <li key={doc.id}>
        <FileText size={16} /><span className="raha-filename">{doc.nombre}<small>{Math.ceil(doc.size / 1024)} KB</small></span>
        <button type="button" className="raha-icon" title={`Descargar ${doc.nombre}`} aria-label={`Descargar ${doc.nombre}`} disabled={busy} onClick={() => onDownload(doc)}><Download size={16} /></button>
        {editable && <button type="button" className="raha-icon" title={`Quitar ${doc.nombre}`} aria-label={`Quitar ${doc.nombre}`} disabled={busy} onClick={() => onDelete(doc)}><Trash2 size={16} /></button>}
      </li>)}</ul>
      {editable && <label className={`raha-upload ${busy ? 'raha-disabled' : ''}`}><Upload size={15} /> Adjuntar archivo
        <input aria-label={`Adjuntar ${label}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy || documentos.length >= 12} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file, tipo); }} />
      </label>}
    </div>)}</div>
  </section>;
}
export default function RahaConexion({ tienda }) {
  const [solicitud, setSolicitud] = useState(null), [datos, setDatos] = useState({});
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [mensaje, setMensaje] = useState(''), [consentimiento, setConsentimiento] = useState(false);
  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const row = await rahaService.obtener(); setSolicitud(row);
      setDatos(Object.fromEntries(GRUPOS_RAHA.flatMap(group => group.campos.map(([key]) => [key, row.datos?.[key] ?? (key === 'moneda' ? 'PYG' : '')]))));
      if (!Object.keys(row.datos || {}).length) setDatos(prev => ({ ...prev, razon_social: tienda?.nombre || '', ruc: tienda?.ruc || '', email: tienda?.email || '', telefono: tienda?.telefono || tienda?.whatsapp || '', direccion: tienda?.direccion_publica || '', ciudad: tienda?.ciudad_publica || '' }));
      setConsentimiento(false);
    } catch (err) { setError(err.response?.data?.message || 'No se pudo cargar la solicitud.'); }
    finally { setLoading(false); }
  }, [tienda]);
  useEffect(() => { cargar(); }, [cargar]);
  async function action(fn, success) {
    if (busy) return;
    setBusy(true); setError(''); setMensaje('');
    try { const row = await fn(); if (row?.id) setSolicitud(row); if (success) setMensaje(success); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }
  const editable = ['borrador', 'observada'].includes(solicitud?.estado);
  function subir(file, tipo) {
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) { setError('Usá PDF, JPG, PNG o WebP de hasta 8 MB.'); return; }
    action(() => rahaService.subir(file, tipo, solicitud.version), 'Archivo adjuntado.');
  }
  if (loading) return <div className="raha-loading"><Loader size={18} className="raha-spin" /> Cargando solicitud…</div>;
  return <div className="raha">
    <div className="raha-status"><ShieldCheck size={20} /><div><strong>Solicitud de conexión Raha</strong>{solicitud && <span className={`raha-badge ${solicitud.estado}`}>{ESTADOS_RAHA[solicitud.estado]}</span>}</div>
      <button type="button" className="raha-icon" title="Actualizar solicitud" aria-label="Actualizar solicitud" disabled={busy} onClick={cargar}><RefreshCw size={16} /></button>
    </div>
    {error && <div role="alert" className="raha-alert raha-error"><AlertCircle size={18} />{error}</div>}
    {mensaje && <div role="status" className="raha-alert raha-success"><CheckCircle2 size={18} />{mensaje}</div>}
    {!solicitud ? <button type="button" className="raha-button" onClick={cargar}><RefreshCw size={15} /> Reintentar</button> : <>
      <form onSubmit={event => { event.preventDefault(); if (consentimiento) action(() => rahaService.enviar({ datos, consentimiento: true, version: solicitud.version }), 'Solicitud presentada a Gesicom para revisión manual.'); }}>
        {GRUPOS_RAHA.map(group => <section className="raha-section" key={group.titulo}><h3>{group.titulo}</h3><div className="raha-fields">
          {group.campos.map(([key, label, type = 'text']) => <label key={key} className={`raha-field ${type === 'textarea' ? 'raha-wide' : ''}`}><span>{label}</span>
            {type === 'select' ? <select value={datos[key]} disabled={!editable || busy} onChange={event => setDatos(prev => ({ ...prev, [key]: event.target.value }))}><option value="PYG">Guaraníes (PYG)</option><option value="USD">Dólares (USD)</option></select>
              : type === 'textarea' ? <textarea required value={datos[key]} rows={3} maxLength={LIMITES[key]} disabled={!editable || busy} onChange={event => setDatos(prev => ({ ...prev, [key]: event.target.value }))} />
                : <input required type={type} value={datos[key]} maxLength={LIMITES[key]} {...(type === 'number' ? { min: 0, max: 1000000000, step: 1 } : {})} disabled={!editable || busy} autoComplete="off" onChange={event => setDatos(prev => ({ ...prev, [key]: event.target.value }))} />}
          </label>)}
        </div></section>)}
        <RahaDocumentos documentos={solicitud.documentos} editable={editable} busy={busy} onUpload={subir} onDownload={doc => action(() => rahaService.documento(doc))} onDelete={doc => { if (window.confirm(`¿Quitar ${doc.nombre}?`)) action(() => rahaService.quitar(doc.id, solicitud.version), 'Archivo quitado.'); }} />
        {editable && <section className="raha-section">
          <p className="raha-muted">PDF, JPG, PNG o WebP. Hasta 8 MB por archivo y 12 adjuntos. Los documentos no se publican en tu tienda.</p>
          <label className="raha-consent"><input type="checkbox" checked={consentimiento} disabled={busy} onChange={event => setConsentimiento(event.target.checked)} />Autorizo a Raha a revisar estos datos y documentos y enviarlos manualmente a Raha para evaluar mi registro.</label>
          <div className="raha-actions"><button type="button" className="raha-button" disabled={busy} onClick={() => action(() => rahaService.guardar({ datos, version: solicitud.version }), 'Borrador guardado.')}><Save size={16} /> Guardar borrador</button>
            <button type="submit" className="raha-button raha-primary" disabled={busy || !consentimiento}>{busy ? <Loader size={16} className="raha-spin" /> : <Send size={16} />} Enviar solicitud</button></div>
        </section>}
      </form>
      <RahaHistorial solicitud={solicitud} />
    </>}
  </div>;
}
