import { useState } from 'react';
import API from '../../services/api';

const mensajeError = error => error.response?.data?.message || 'No pudimos completar la operación. Intentá de nuevo.';

async function descargar(tipo) {
  const { data } = await API.get(`/proveedor/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = (tipo === 'cedula_frente' || tipo === 'cedula_dorso') ? tipo + '.jpg' : tipo === 'contrato_base' ? 'contrato-proveedor.pdf' : tipo === 'contrato_firmado' ? 'contrato-firmado.pdf' : tipo + '.pdf';
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function DocumentosProveedor({ documentos = {}, tipoPostulante = 'persona', onActualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const subir = async (tipo, archivo) => {
    if (!archivo || ocupado) return;
    setOcupado(true); setError(''); setAviso('');
    try {
      const form = new FormData(); form.append('archivo', archivo);
      await API.post(`/proveedor/documentos/${tipo}`, form);
      setAviso(tipo === 'contrato-firmado' ? 'Recibimos tu contrato firmado. El administrador lo revisará.' : 'El documento se actualizó.');
      await onActualizar();
    } catch (err) { setError(mensajeError(err)); }
    finally { setOcupado(false); }
  };
  const bajar = async tipo => {
    setOcupado(true); setError('');
    try { await descargar(tipo); }
    catch (err) { setError(mensajeError(err)); }
    finally { setOcupado(false); }
  };
  const estado = documentos.contrato_estado || 'sin_contrato';
  return <section className="provider-panel__card provider-documents" aria-labelledby="provider-documents-title">
    <span className="provider-panel__eyebrow">Solo vos y administración</span>
    <h2 id="provider-documents-title">Documentos de tu postulación</h2>
    <p>{tipoPostulante === 'empresa' ? 'La constancia de RUC y el contrato se usan para revisar tu postulación. No aparecen en Buscar proveedores.' : 'Tu cédula, los certificados y los contratos se usan para revisar tu postulación. No aparecen en Buscar proveedores.'}</p>
    <div className="provider-documents__grid">
      {(tipoPostulante === 'empresa' ? [['constancia_ruc', 'Constancia de RUC', 'constancia_ruc_cargada']] : [['cedula_pdf', 'Cédula: frente y dorso en un PDF', 'cedula_pdf_cargada'], ['vida_residencia', 'Vida y residencia', 'vida_residencia_cargada'], ['antecedente_policial', 'Antecedente policial', 'antecedente_policial_cargado']]).map(([tipo, etiqueta, bandera]) => <div className="provider-documents__item" key={tipo}><h3>{etiqueta}</h3><p>{documentos[bandera] ? 'Recibido para revisión privada.' : 'Documento pendiente.'}</p><div className="provider-documents__actions">{documentos[bandera] && <button type="button" onClick={() => bajar(tipo)} disabled={ocupado}>Descargar PDF</button>}<label className="provider-documents__upload">{documentos[bandera] ? 'Reemplazar PDF' : 'Subir PDF'}<input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { subir(tipo, e.target.files?.[0]); e.target.value = ''; }} /></label></div><small>PDF de hasta 8 MB. Solo para revisión privada.</small></div>)}
      {tipoPostulante !== 'empresa' && !documentos.cedula_pdf_cargada && (documentos.cedula_frente_cargada || documentos.cedula_dorso_cargada) && <p>Documentación anterior: {(['frente', 'dorso']).map(lado => documentos['cedula_' + lado + '_cargada'] && <button type="button" key={lado} onClick={() => bajar('cedula_' + lado)}>Descargar {lado}</button>)}</p>}
      <div className="provider-documents__item"><h3>Contrato de proveedor</h3><p>{estado === 'sin_contrato' ? 'Cuando esté listo, el administrador publicará aquí el PDF para firmar.' : estado === 'pendiente_firma' ? 'Descargá el PDF, firmalo y subilo de nuevo.' : estado === 'pendiente_revision' ? 'Recibimos el PDF firmado. Está pendiente de revisión.' : estado === 'validado' ? 'El administrador validó tu contrato firmado.' : 'El administrador pidió una corrección del contrato firmado.'}</p>{estado === 'correccion' && documentos.contrato_nota && <p className="provider-documents__note">Corrección solicitada: {documentos.contrato_nota}</p>}<div className="provider-documents__actions">{documentos.contrato_disponible && <button type="button" onClick={() => bajar('contrato_base')} disabled={ocupado}>Descargar contrato PDF</button>}{documentos.contrato_firmado && <button type="button" onClick={() => bajar('contrato_firmado')} disabled={ocupado}>Mi PDF firmado</button>}{documentos.contrato_disponible && estado !== 'validado' && <label className="provider-documents__upload">{documentos.contrato_firmado ? 'Reemplazar PDF firmado' : 'Subir PDF firmado'}<input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { subir('contrato-firmado', e.target.files?.[0]); e.target.value = ''; }} /></label>}</div>{documentos.contrato_disponible && <small>PDF de hasta 8 MB. Conservá una copia del documento firmado.</small>}</div>
    </div>
    {error && <p className="provider-panel__error" role="alert">{error}</p>}{aviso && <p className="provider-panel__success" role="status">{aviso}</p>}
  </section>;
}
