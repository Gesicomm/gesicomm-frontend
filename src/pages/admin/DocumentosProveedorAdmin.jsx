import { useState } from 'react';
import API from '../../services/api';

const base = id => `/publico/admin/solicitudes-proveedores/${id}`;
const errorTexto = error => error.response?.data?.message || 'No pudimos completar la operación. Intentá de nuevo.';

async function descargar(id, tipo) {
  const { data } = await API.get(`${base(id)}/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = (tipo === 'cedula_frente' || tipo === 'cedula_dorso' ? tipo + '-proveedor-' + id + '.jpg' : tipo + '-proveedor-' + id + '.pdf');
  document.body.append(enlace);
  enlace.click(); enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function DocumentosProveedorAdmin({ solicitud, onActualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [nota, setNota] = useState('');
  const docs = solicitud.documentos || {};
  const ejecutar = async (accion, mensaje) => {
    setOcupado(true); setError(''); setAviso('');
    try { await accion(); setAviso(mensaje); await onActualizar(); }
    catch (err) { setError(errorTexto(err)); }
    finally { setOcupado(false); }
  };
  const subir = archivo => {
    if (!archivo) return;
    const form = new FormData(); form.append('contrato', archivo);
    ejecutar(() => API.post(`${base(solicitud.id)}/contrato`, form), 'Contrato disponible para que el proveedor lo descargue y firme.');
  };
  const revisar = estado => ejecutar(() => API.patch(`${base(solicitud.id)}/contrato`, { estado, nota: nota.trim() }), estado === 'validado' ? 'Contrato firmado validado.' : 'Corrección solicitada al proveedor.');
  return <section className="provider-admin-documents" aria-label={`Documentos privados de ${solicitud.nombre}`}>
    <h3>Documentos privados</h3><p>La cédula y los certificados son visibles solo para administración y el proveedor.</p>
    {([['cedula_pdf', 'Cédula (frente y dorso en un PDF)', 'cedula_pdf_cargada'], ...(solicitud.datos?.tipo_postulante === 'empresa' ? [['constancia_ruc', 'Constancia de RUC', 'constancia_ruc_cargada']] : [['vida_residencia', 'Vida y residencia', 'vida_residencia_cargada'], ['antecedente_policial', 'Antecedente policial', 'antecedente_policial_cargado']])]).map(([tipo, etiqueta, bandera]) => <div className="provider-admin-documents__row" key={tipo}><div><strong>{etiqueta}</strong><span>{docs[bandera] ? 'Recibido' : 'Pendiente'}</span></div>{docs[bandera] && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, tipo), 'Documento descargado.')}>Descargar PDF</button>}</div>)}
    {!docs.cedula_pdf_cargada && (docs.cedula_frente_cargada || docs.cedula_dorso_cargada) && <p>Documentación anterior: {(['frente', 'dorso']).map(lado => docs['cedula_' + lado + '_cargada'] && <button type="button" key={lado} onClick={() => ejecutar(() => descargar(solicitud.id, 'cedula_' + lado), 'Imagen descargada.')}>Descargar {lado}</button>)}</p>}
    <div className="provider-admin-documents__row"><div><strong>Contrato para firmar</strong><span>{docs.contrato_disponible ? 'Disponible' : 'Todavía no cargado'}</span></div><div className="provider-admin-documents__actions">{docs.contrato_disponible && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, 'contrato_base'), 'Contrato descargado.')}>Descargar PDF</button>}<label className="provider-admin-documents__upload">{docs.contrato_disponible ? 'Reemplazar PDF' : 'Publicar contrato PDF'}<input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { subir(e.target.files?.[0]); e.target.value = ''; }} /></label></div></div>
    <div className="provider-admin-documents__row"><div><strong>Contrato firmado</strong><span>{docs.contrato_firmado ? ({ pendiente_revision: 'Pendiente de revisión', validado: 'Validado', correccion: 'Corrección solicitada' }[docs.contrato_estado] || 'Recibido') : 'Pendiente'}</span></div>{docs.contrato_firmado && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, 'contrato_firmado'), 'Contrato firmado descargado.')}>Descargar PDF firmado</button>}</div>
    {docs.contrato_firmado && docs.contrato_estado !== 'validado' && <div className="provider-admin-documents__review"><label>Nota para pedir una corrección<textarea rows={2} value={nota} maxLength={1000} onChange={e => setNota(e.target.value)} placeholder="Indicá qué debe corregir el proveedor" /></label><div className="provider-admin-documents__actions"><button type="button" disabled={ocupado} onClick={() => revisar('validado')}>Validar contrato</button><button type="button" disabled={ocupado || nota.trim().length < 3} onClick={() => revisar('correccion')}>Pedir corrección</button></div></div>}
    {docs.contrato_estado === 'correccion' && docs.contrato_nota && <p className="provider-admin-documents__note">Corrección enviada: {docs.contrato_nota}</p>}
    {error && <p role="alert" className="provider-error">{error}</p>}{aviso && <p role="status">{aviso}</p>}
  </section>;
}
