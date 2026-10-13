import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Loader, RefreshCw, Save, Send, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { rahaService } from '../../services/rahaService';
import './raha.css';

export const ESTADOS_RAHA = { borrador: 'Trámite no iniciado', en_revision: 'Enviada a Raha', observada: 'Raha pidió correcciones', enviada_raha: 'Enviada a Raha', aprobada: 'Aprobada por Raha', rechazada: 'Rechazada por Raha' };

export const GRUPOS_RAHA = [
  { titulo: 'Empresa y representante', campos: [
    ['razon_social', 'Razón social', 'text', 'Ej: Sommix S.A.'],
    ['ruc', 'RUC', 'text', 'Ej: 80012345-6'],
    ['representante', 'Nombre del representante legal', 'text', 'Nombre y apellido completos'],
    ['cedula', 'Cédula del representante legal', 'text', 'Ej: 1.234.567'],
  ] },
  { titulo: 'Contacto y dirección', campos: [
    ['email', 'Email', 'text', 'contacto@empresa.com'],
    ['telefono', 'Teléfono', 'tel', 'Ej: 0981 123456'],
    ['direccion', 'Dirección', 'text', 'Calle, número, barrio'],
    ['ciudad', 'Ciudad', 'text', 'Ej: Asunción'],
    ['departamento', 'Departamento', 'text', 'Ej: Central'],
  ] },
  { titulo: 'Actividad comercial', campos: [
    ['actividad_economica', 'Actividad económica', 'text', 'Ej: Venta de artículos varios'],
    ['tipo_productos', 'Tipo de productos que vendés', 'textarea', 'Describí los productos que vendés'],
    ['operaciones_mensuales', 'Volumen estimado de operaciones por mes(pedidos)', 'number', 'Ej: 100'],
  ] },
  { titulo: 'Cuenta para liquidaciones', campos: [
    ['banco', 'Banco', 'text', 'Ej: Banco Itaú'],
    ['titular_cuenta', 'Titular de la cuenta', 'text', 'Nombre o razón social del titular'],
    ['numero_cuenta', 'Número de cuenta', 'text', 'Número de cuenta bancaria'],
    ['moneda', 'Moneda', 'select'],
  ] },
];

const LIMITES = { razon_social: 180, ruc: 30, representante: 180, cedula: 30, email: 150, telefono: 30, direccion: 300, ciudad: 100, departamento: 100, actividad_economica: 300, tipo_productos: 600, operaciones_mensuales: 10, banco: 100, titular_cuenta: 180, numero_cuenta: 80 };

export const TIPOS_DOC_RAHA = [['ruc', 'Constancia de RUC'], ['cedula', 'Cédula del representante legal']];

export const VALIDACIONES_RAHA = {
  razon_social: val => (!String(val || '').trim() ? 'La razón social es obligatoria.' : ''),
  ruc: val => (!String(val || '').trim() ? 'El RUC es obligatorio.' : ''),
  representante: val => (!String(val || '').trim() ? 'El nombre del representante legal es obligatorio.' : ''),
  cedula: val => (!String(val || '').trim() ? 'La cédula del representante legal es obligatoria.' : ''),
  email: val => {
    const s = String(val || '').trim();
    if (!s) return 'El email es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Ingresá un email válido (ej: contacto@empresa.com).';
    return '';
  },
  telefono: val => {
    const s = String(val || '').trim();
    if (!s) return 'El teléfono es obligatorio.';
    if (!/^[\d+ ()-]{6,30}$/.test(s)) return 'Ingresá un teléfono válido (ej: 0981 123456).';
    return '';
  },
  direccion: val => (!String(val || '').trim() ? 'La dirección es obligatoria.' : ''),
  ciudad: val => (!String(val || '').trim() ? 'La ciudad es obligatoria.' : ''),
  departamento: val => (!String(val || '').trim() ? 'El departamento es obligatorio.' : ''),
  actividad_economica: val => (!String(val || '').trim() ? 'La actividad económica es obligatoria.' : ''),
  tipo_productos: val => (!String(val || '').trim() ? 'El tipo de productos que vendés es obligatorio.' : ''),
  operaciones_mensuales: val => {
    const s = String(val || '').trim();
    if (!s) return 'El volumen mensual de operaciones es obligatorio.';
    if (!/^\d+$/.test(s) || Number(s) <= 0) return 'Ingresá un número entero mayor a 0.';
    return '';
  },
  banco: val => (!String(val || '').trim() ? 'El banco es obligatorio.' : ''),
  titular_cuenta: val => (!String(val || '').trim() ? 'El titular de la cuenta es obligatorio.' : ''),
  numero_cuenta: val => (!String(val || '').trim() ? 'El número de cuenta es obligatorio.' : ''),
};

// Semáforo: rojo = trámite sin iniciar (o a corregir), amarillo = enviado, verde = aceptado.
export function semaforoRaha(estado) {
  if (estado === 'aprobada') return { color: 'verde', titulo: 'Aprobado por Raha', texto: 'Tu conexión con Raha está activa. Ya podés proveerte con Raha.' };
  if (estado === 'en_revision' || estado === 'enviada_raha') return { color: 'amarillo', titulo: 'Solicitud enviada', texto: 'Raha recibió tu solicitud y la está evaluando. Te avisaremos cuando responda.' };
  if (estado === 'observada') return { color: 'rojo', titulo: 'Raha pidió correcciones', texto: 'Revisá la nota en el seguimiento, corregí los datos o documentos y volvé a enviar.' };
  if (estado === 'rechazada') return { color: 'rojo', titulo: 'Solicitud rechazada', texto: 'Raha rechazó la solicitud. Revisá el motivo en el seguimiento.' };
  return { color: 'rojo', titulo: 'Trámite no iniciado', texto: 'Completá los datos, adjuntá los 2 documentos y enviá la solicitud a Raha.' };
}

export function RahaSemaforo({ estado, compacto = false }) {
  const s = semaforoRaha(estado);
  return <div className={`raha-semaforo ${compacto ? 'raha-semaforo-compacto' : ''}`} role="status" aria-label={`Estado: ${s.titulo}`}>
    <div className="raha-luces" aria-hidden="true">{['rojo', 'amarillo', 'verde'].map(color => <span key={color} className={`raha-luz ${color} ${s.color === color ? 'on' : ''}`} />)}</div>
    {!compacto && <div><strong>{s.titulo}</strong><p>{s.texto}</p></div>}
  </div>;
}

export function RahaHistorial({ solicitud }) {
  return <section className="raha-section"><h3>Seguimiento</h3>
    {solicitud.historial?.length ? <ol className="raha-history">{solicitud.historial.map((entry, index) => <li key={index}>
      <div><strong>{ESTADOS_RAHA[entry.estado] || entry.estado}</strong><time>{new Date(entry.ocurrido_at).toLocaleString('es-PY')}</time></div>
      {entry.autor && <p className="raha-muted">{entry.autor}</p>}
      {entry.nota && <p>{entry.nota}</p>}{entry.referencia && <p>Referencia: {entry.referencia}</p>}
    </li>)}</ol> : <p className="raha-muted">Todavía no se presentó la solicitud.</p>}
  </section>;
}

// Estado de la última subida de cada documento, al lado del botón que la disparó
function RahaSubida({ subida }) {
  const { estado, nombre, progreso, mensaje } = subida;
  const enviando = estado === 'subiendo' && progreso != null && progreso < 100;
  const detalle = estado === 'error' ? mensaje : estado === 'ok' ? 'Archivo subido correctamente.' : enviando ? `Subiendo… ${progreso}%` : 'Guardando el archivo…';
  return <div className={`raha-subida ${estado}`} role={estado === 'error' ? 'alert' : 'status'}>
    {estado === 'error' ? <AlertCircle size={18} /> : estado === 'ok' ? <CheckCircle2 size={18} /> : <Loader size={18} className="raha-spin" />}
    {estado === 'ok' ? <span className="raha-filename">{detalle}</span> : <span className="raha-filename">{nombre}<small>{detalle}</small></span>}
    {estado === 'subiendo' && <span className={`raha-progreso ${enviando ? '' : 'indeterminado'}`} aria-hidden="true"><span style={enviando ? { width: `${progreso}%` } : undefined} /></span>}
  </div>;
}

export function RahaDocumentos({ documentos = [], editable = false, busy, subidas = {}, docErrores = {}, onUpload, onDelete, onDownload }) {
  return <section className="raha-section"><h3>Documentos <span className="raha-req" aria-hidden="true">*</span></h3>
    <div className="raha-docs">{TIPOS_DOC_RAHA.map(([tipo, label]) => {
      const docs = documentos.filter(doc => doc.tipo === tipo);
      const subida = subidas[tipo], subiendo = subida?.estado === 'subiendo';
      const tieneError = Boolean(docErrores[tipo]);
      return <div className={`raha-doc-group ${tieneError ? 'raha-doc-group-error' : ''}`} key={tipo}>
        <div className="raha-doc-head"><strong>{label} <span className="raha-req" aria-hidden="true">*</span></strong><span className={docs.length ? 'raha-ok' : tieneError ? 'raha-error-badge' : 'raha-muted'}>{docs.length ? 'Adjuntado' : 'Obligatorio'}</span></div>
        <ul>{docs.map(doc => <li key={doc.id} className={subida?.estado === 'ok' ? 'raha-doc-nuevo' : ''}>
          <FileText size={16} /><span className="raha-filename">{doc.nombre}<small>{Math.ceil(doc.size / 1024)} KB</small></span>
          <button type="button" className="raha-icon" title={`Descargar ${doc.nombre}`} aria-label={`Descargar ${doc.nombre}`} disabled={busy} onClick={() => onDownload(doc)}><Download size={16} /></button>
          {editable && onDelete && <button type="button" className="raha-icon" title={`Quitar ${doc.nombre}`} aria-label={`Quitar ${doc.nombre}`} disabled={busy} onClick={() => onDelete(doc)}><Trash2 size={16} /></button>}
        </li>)}</ul>
        {subida && <RahaSubida subida={subida} />}
        {tieneError && <span className="raha-error-msg" role="alert"><AlertCircle size={13} /> {docErrores[tipo]}</span>}
        {editable && <label className={`raha-upload ${busy ? 'raha-disabled' : ''}`}>{subiendo ? <Loader size={15} className="raha-spin" /> : <Upload size={15} />} {subiendo ? 'Subiendo…' : subida?.estado === 'error' ? 'Reintentar' : docs.length ? 'Reemplazar archivo' : 'Adjuntar archivo'}
          <input aria-label={`Adjuntar ${label}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file, tipo); }} />
        </label>}
      </div>;
    })}</div>
  </section>;
}

function mensajeSubida(err) {
  if (!err.response) return 'No hay conexión con el servidor. Revisá tu internet y volvé a intentar.';
  if (err.response.status >= 500) return 'El servidor no pudo guardar el archivo. Probá de nuevo en unos minutos; si sigue fallando, avisanos.';
  return err.response.data?.message || 'No se pudo subir el archivo.';
}

export default function RahaConexion({ tienda }) {
  const [solicitud, setSolicitud] = useState(null), [datos, setDatos] = useState({});
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [mensaje, setMensaje] = useState(''), [consentimiento, setConsentimiento] = useState(false);
  const [subidas, setSubidas] = useState({});
  const [errores, setErrores] = useState({});
  const [docErrores, setDocErrores] = useState({});
  const [consentimientoError, setConsentimientoError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const row = await rahaService.obtener(); setSolicitud(row);
      setDatos(Object.fromEntries(GRUPOS_RAHA.flatMap(group => group.campos.map(([key]) => [key, row.datos?.[key] ?? (key === 'moneda' ? 'PYG' : '')]))));
      if (!Object.keys(row.datos || {}).length) setDatos(prev => ({ ...prev, razon_social: tienda?.nombre || '', ruc: tienda?.ruc || '', email: tienda?.email || '', telefono: tienda?.telefono || tienda?.whatsapp || '', direccion: tienda?.direccion_publica || '', ciudad: tienda?.ciudad_publica || '' }));
      setConsentimiento(false);
      setErrores({});
      setDocErrores({});
      setConsentimientoError('');
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

  async function subir(file, tipo) {
    if (busy) return;
    const marcar = subida => setSubidas(prev => ({ ...prev, [tipo]: { nombre: file.name, ...subida } }));
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) { marcar({ estado: 'error', mensaje: 'Usá PDF, JPG, PNG o WebP de hasta 8 MB.' }); return; }
    setBusy(true); setError(''); setMensaje(''); marcar({ estado: 'subiendo', progreso: 0 });
    try {
      const row = await rahaService.subir(file, tipo, solicitud.version, progreso => marcar({ estado: 'subiendo', progreso }));
      if (row?.id) setSolicitud(row);
      marcar({ estado: 'ok' });
      setDocErrores(prev => ({ ...prev, [tipo]: '' }));
    } catch (err) { marcar({ estado: 'error', mensaje: mensajeSubida(err) }); }
    finally { setBusy(false); }
  }

  function quitar(doc) {
    if (!window.confirm(`¿Quitar ${doc.nombre}?`)) return;
    setSubidas(prev => ({ ...prev, [doc.tipo]: undefined }));
    action(() => rahaService.quitar(doc.id, solicitud.version), 'Archivo quitado.');
  }

  function handleChange(key, value) {
    setDatos(prev => ({ ...prev, [key]: value }));
    if (errores[key]) {
      const errorMsg = VALIDACIONES_RAHA[key]?.(value) || '';
      setErrores(prev => ({ ...prev, [key]: errorMsg }));
    }
  }

  function handleBlur(key) {
    const errorMsg = VALIDACIONES_RAHA[key]?.(datos[key]) || '';
    if (errorMsg) {
      setErrores(prev => ({ ...prev, [key]: errorMsg }));
    }
  }

  function handleEnviar(event) {
    event.preventDefault();
    setError('');
    setMensaje('');

    const nuevosErrores = {};
    for (const group of GRUPOS_RAHA) {
      for (const [key] of group.campos) {
        if (key === 'moneda') continue;
        const errorMsg = VALIDACIONES_RAHA[key]?.(datos[key]) || '';
        if (errorMsg) nuevosErrores[key] = errorMsg;
      }
    }

    const nuevosDocErrores = {};
    const docs = solicitud?.documentos || [];
    if (!docs.some(d => d.tipo === 'ruc')) {
      nuevosDocErrores.ruc = 'Debés adjuntar la constancia de RUC.';
    }
    if (!docs.some(d => d.tipo === 'cedula')) {
      nuevosDocErrores.cedula = 'Debés adjuntar la cédula del representante legal.';
    }

    let errorConsent = '';
    if (!consentimiento) {
      errorConsent = 'Debés autorizar el envío de los datos y documentos para continuar.';
    }

    setErrores(nuevosErrores);
    setDocErrores(nuevosDocErrores);
    setConsentimientoError(errorConsent);

    const hayErrores = Object.keys(nuevosErrores).length > 0 || Object.keys(nuevosDocErrores).length > 0 || Boolean(errorConsent);

    if (hayErrores) {
      setError('Por favor completá todos los campos obligatorios y adjuntá los 2 documentos requeridos.');
      setTimeout(() => {
        const primerError = document.querySelector('.raha-input-error, .raha-doc-group-error, .raha-consent-error');
        if (primerError) {
          primerError.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          primerError.focus?.();
        }
      }, 50);
      return;
    }

    action(() => rahaService.enviar({ datos, consentimiento: true, version: solicitud.version }), 'Solicitud enviada a Raha. Te avisaremos cuando responda.');
  }

  if (loading) return <div className="raha-loading"><Loader size={18} className="raha-spin" /> Cargando solicitud…</div>;

  return <div className="raha">
    <div className="raha-status"><ShieldCheck size={20} /><div><strong>Solicitud de conexión Raha</strong>{solicitud && <span className={`raha-badge ${solicitud.estado}`}>{ESTADOS_RAHA[solicitud.estado]}</span>}</div>
      <button type="button" className="raha-icon" title="Actualizar solicitud" aria-label="Actualizar solicitud" disabled={busy} onClick={cargar}><RefreshCw size={16} /></button>
    </div>
    {solicitud && <RahaSemaforo estado={solicitud.estado} />}
    {error && <div role="alert" className="raha-alert raha-error"><AlertCircle size={18} /><span>{error}</span></div>}
    {mensaje && <div role="status" className="raha-alert raha-success"><CheckCircle2 size={18} /><span>{mensaje}</span></div>}
    {!solicitud ? <button type="button" className="raha-button" onClick={cargar}><RefreshCw size={15} /> Reintentar</button> : <>
      <form noValidate onSubmit={handleEnviar}>
        {GRUPOS_RAHA.map(group => <section className="raha-section" key={group.titulo}><h3>{group.titulo}</h3><div className="raha-fields">
          {group.campos.map(([key, label, type = 'text', placeholder = '']) => <label key={key} htmlFor={`raha-${key}`} className={`raha-field ${type === 'textarea' ? 'raha-wide' : ''}`}>
            <span>{label} <span className="raha-req" aria-hidden="true">*</span></span>
            {type === 'select' ? <select id={`raha-${key}`} aria-label={label} className={errores[key] ? 'raha-input-error' : ''} value={datos[key] || 'PYG'} disabled={!editable || busy} onChange={event => handleChange(key, event.target.value)} onBlur={() => handleBlur(key)}><option value="PYG">Guaraníes (PYG)</option><option value="USD">Dólares (USD)</option></select>
              : type === 'textarea' ? <textarea id={`raha-${key}`} aria-label={label} className={errores[key] ? 'raha-input-error' : ''} placeholder={placeholder} value={datos[key] || ''} rows={3} maxLength={LIMITES[key]} disabled={!editable || busy} onChange={event => handleChange(key, event.target.value)} onBlur={() => handleBlur(key)} />
                : <input id={`raha-${key}`} aria-label={label} className={errores[key] ? 'raha-input-error' : ''} placeholder={placeholder} type={type === 'number' ? 'number' : type === 'tel' ? 'tel' : 'text'} value={datos[key] || ''} maxLength={LIMITES[key]} {...(type === 'number' ? { min: 1, max: 1000000000, step: 1 } : {})} disabled={!editable || busy} autoComplete="off" onChange={event => handleChange(key, event.target.value)} onBlur={() => handleBlur(key)} />}
            {errores[key] && <span className="raha-error-msg" role="alert"><AlertCircle size={13} /> {errores[key]}</span>}
          </label>)}
        </div></section>)}
        <RahaDocumentos documentos={solicitud.documentos} editable={editable} busy={busy} subidas={subidas} docErrores={docErrores} onUpload={subir} onDownload={doc => action(() => rahaService.documento(doc))} onDelete={quitar} />
        {editable && <section className="raha-section">
          <p className="raha-muted">PDF, JPG, PNG o WebP de hasta 8 MB. Un archivo por documento (2 en total); si subís otro, reemplaza al anterior. Los documentos no se publican en tu tienda.</p>
          <div className={`raha-consent-wrap ${consentimientoError ? 'raha-consent-error' : ''}`}>
            <label className="raha-consent">
              <input type="checkbox" checked={consentimiento} disabled={busy} onChange={event => { setConsentimiento(event.target.checked); if (event.target.checked) setConsentimientoError(''); }} />
              <span>Autorizo a Gesicom a enviar estos datos y documentos a Raha para evaluar mi registro como cliente. <span className="raha-req" aria-hidden="true">*</span></span>
            </label>
            {consentimientoError && <span className="raha-error-msg" role="alert"><AlertCircle size={13} /> {consentimientoError}</span>}
          </div>
          <div className="raha-actions">
            <button type="button" className="raha-button" disabled={busy} onClick={() => action(() => rahaService.guardar({ datos, version: solicitud.version }), 'Borrador guardado.')}><Save size={16} /> Guardar borrador</button>
            <button type="submit" className="raha-button raha-primary" disabled={busy || !consentimiento}>{busy ? <Loader size={16} className="raha-spin" /> : <Send size={16} />} Enviar solicitud</button>
          </div>
        </section>}
      </form>
      <RahaHistorial solicitud={solicitud} />
    </>}
  </div>;
}
