import { useState } from 'react';
import API from '../../services/api';

const mensajeError = error => error.response?.data?.message || 'No pudimos completar la operación. Intentá de nuevo.';

async function descargar(tipo) {
  const { data } = await API.get(`/proveedor/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${tipo}.pdf`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function DocumentosProveedor({ documentos = {}, tipoPostulante = 'persona', onActualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const reemplazar = async (tipo, archivo) => {
    if (!archivo || ocupado) return;
    setOcupado(true); setError(''); setAviso('');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      await API.post(`/proveedor/documentos/${tipo}`, form);
      setAviso('El documento se actualizó.');
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
  const identidad = tipoPostulante === 'empresa'
    ? [['constancia_ruc', 'Constancia de RUC', 'constancia_ruc_cargada']]
    : [['cedula_pdf', 'Cédula: frente y dorso en un PDF', 'cedula_pdf_cargada']];

  return <section className="provider-panel__card provider-documents" aria-labelledby="provider-documents-title">
    <span className="provider-panel__eyebrow">Solo vos y administración</span>
    <h2 id="provider-documents-title">Documentos de tu postulación</h2>
    <p>Los documentos de identidad y el acuerdo firmado son privados y no aparecen en Buscar proveedores.</p>
    <div className="provider-documents__grid">
      {identidad.map(([tipo, etiqueta, bandera]) => <div className="provider-documents__item" key={tipo}>
        <h3>{etiqueta}</h3>
        <p>{documentos[bandera] ? 'Recibido para revisión privada.' : 'Documento pendiente.'}</p>
        <div className="provider-documents__actions">
          {documentos[bandera] && <button type="button" onClick={() => bajar(tipo)} disabled={ocupado}>Descargar PDF</button>}
          <label className="provider-documents__upload">{documentos[bandera] ? 'Reemplazar PDF' : 'Subir PDF'}
            <input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { reemplazar(tipo, e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        <small>PDF de hasta 8 MB. Solo para revisión privada.</small>
      </div>)}
      <div className="provider-documents__item">
        <h3>Acuerdo de proveedor firmado</h3>
        <p>{documentos.contrato_firmado ? 'Recibido con tu postulación. Administración lo revisará junto con tus datos.' : 'El acuerdo firmado todavía no está adjunto.'}</p>
        <div className="provider-documents__actions">
          {documentos.contrato_firmado && <button type="button" onClick={() => bajar('contrato_firmado')} disabled={ocupado}>Descargar PDF firmado</button>}
          {documentos.contrato_firmado && <label className="provider-documents__upload">Reemplazar PDF firmado
            <input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { reemplazar('contrato-firmado', e.target.files?.[0]); e.target.value = ''; }} />
          </label>}
        </div>
        <small>PDF de hasta 8 MB. Si corregís los datos del acuerdo, generá, firmá y enviá una copia nueva.</small>
      </div>
    </div>
    {error && <p className="provider-panel__error" role="alert">{error}</p>}
    {aviso && <p className="provider-panel__success" role="status">{aviso}</p>}
  </section>;
}

