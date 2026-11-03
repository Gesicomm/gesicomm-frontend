import { useState } from 'react';
import API from '../../services/api';

const base = id => `/publico/admin/solicitudes-proveedores/${id}`;

async function descargar(id, tipo) {
  const { data } = await API.get(`${base(id)}/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${tipo}-proveedor-${id}.${tipo.startsWith('cedula_') && tipo !== 'cedula_pdf' ? 'jpg' : 'pdf'}`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function DocumentosProveedorAdmin({ solicitud }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const docs = solicitud.documentos || {};
  const tipos = solicitud.datos?.tipo_postulante === 'empresa'
    ? [['constancia_ruc', 'Constancia de RUC', 'constancia_ruc_cargada']]
    : [...(docs.cedula_frente_cargada || docs.cedula_dorso_cargada
      ? [['cedula_frente', 'Cédula · frente', 'cedula_frente_cargada'], ['cedula_dorso', 'Cédula · dorso', 'cedula_dorso_cargada']]
      : [['cedula_pdf', 'Cédula (frente y dorso en un PDF)', 'cedula_pdf_cargada']]), ['antecedente_policial', 'Antecedentes policiales', 'antecedente_policial_cargado']];

  const bajar = async tipo => {
    setOcupado(true);
    setError('');
    try { await descargar(solicitud.id, tipo); }
    catch (err) { setError(err.response?.data?.message || 'No pudimos descargar el documento. Intentá de nuevo.'); }
    finally { setOcupado(false); }
  };

  return <section className="provider-admin-documents" aria-label={`Documentos de ${solicitud.nombre}`}>
    <h3>Documentos para revisar</h3>
    <p>Los archivos de identidad y el acuerdo firmado son privados; solo están disponibles para administración.</p>
    {tipos.map(([tipo, etiqueta, bandera]) => <div className="provider-admin-documents__row" key={tipo}>
      <div><strong>{etiqueta}</strong><span>{docs[bandera] ? 'Recibido' : 'Pendiente'}</span></div>
      {docs[bandera] && <button type="button" disabled={ocupado} onClick={() => bajar(tipo)}>{tipo.startsWith('cedula_') && tipo !== 'cedula_pdf' ? 'Ver imagen' : 'Descargar PDF'}</button>}
    </div>)}
    <div className="provider-admin-documents__row">
      <div><strong>Acuerdo de proveedor firmado</strong><span>{docs.contrato_firmado ? 'Recibido con la postulación' : 'Pendiente'}</span></div>
      {docs.contrato_firmado && <button type="button" disabled={ocupado} onClick={() => bajar('contrato_firmado')}>Descargar PDF firmado</button>}
    </div>
    {docs.contrato_firmado && <p className="provider-document-fingerprint">Versión {solicitud.datos?.contrato_version || 'anterior'} · SHA-256 {solicitud.datos?.contrato_huella || 'no disponible'}</p>}
    {error && <p role="alert" className="provider-error">{error}</p>}
  </section>;
}

