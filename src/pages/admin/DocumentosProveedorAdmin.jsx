import { useState } from 'react';
import API from '../../services/api';

const base = id => `/publico/admin/solicitudes-proveedores/${id}`;
const errorTexto = error => error.response?.data?.message || 'No pudimos completar la operación. Intentá de nuevo.';

async function descargar(id, tipo) {
  const { data } = await API.get(`${base(id)}/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = tipo === 'cedula' ? `cedula-proveedor-${id}.jpg` : tipo === 'contrato_base' ? `contrato-proveedor-${id}.pdf` : `contrato-firmado-${id}.pdf`;
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
    <h3>Documentos privados</h3><p>La cédula y los contratos son visibles solo para administración y el proveedor.</p>
    <div className="provider-admin-documents__row"><div><strong>Foto de cédula</strong><span>{docs.cedula_cargada ? 'Recibida' : 'Pendiente'}</span></div>{docs.cedula_cargada && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, 'cedula'), 'Foto descargada.')}>Descargar foto</button>}</div>
    <div className="provider-admin-documents__row"><div><strong>Contrato para firmar</strong><span>{docs.contrato_disponible ? 'Disponible' : 'Todavía no cargado'}</span></div><div className="provider-admin-documents__actions">{docs.contrato_disponible && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, 'contrato_base'), 'Contrato descargado.')}>Descargar PDF</button>}<label className="provider-admin-documents__upload">{docs.contrato_disponible ? 'Reemplazar PDF' : 'Publicar contrato PDF'}<input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { subir(e.target.files?.[0]); e.target.value = ''; }} /></label></div></div>
    <div className="provider-admin-documents__row"><div><strong>Contrato firmado</strong><span>{docs.contrato_firmado ? ({ pendiente_revision: 'Pendiente de revisión', validado: 'Validado', correccion: 'Corrección solicitada' }[docs.contrato_estado] || 'Recibido') : 'Pendiente'}</span></div>{docs.contrato_firmado && <button type="button" disabled={ocupado} onClick={() => ejecutar(() => descargar(solicitud.id, 'contrato_firmado'), 'Contrato firmado descargado.')}>Descargar PDF firmado</button>}</div>
    {docs.contrato_firmado && docs.contrato_estado !== 'validado' && <div className="provider-admin-documents__review"><label>Nota para pedir una corrección<textarea rows={2} value={nota} maxLength={1000} onChange={e => setNota(e.target.value)} placeholder="Indicá qué debe corregir el proveedor" /></label><div className="provider-admin-documents__actions"><button type="button" disabled={ocupado} onClick={() => revisar('validado')}>Validar contrato</button><button type="button" disabled={ocupado || nota.trim().length < 3} onClick={() => revisar('correccion')}>Pedir corrección</button></div></div>}
    {docs.contrato_estado === 'correccion' && docs.contrato_nota && <p className="provider-admin-documents__note">Corrección enviada: {docs.contrato_nota}</p>}
    {error && <p role="alert" className="provider-error">{error}</p>}{aviso && <p role="status">{aviso}</p>}
  </section>;
}
