import { useState } from 'react';
import API from '../../services/api';

const mensajeError = error => error.response?.data?.message || 'No pudimos completar la operación. Intentá de nuevo.';

async function descargar(tipo) {
  const { data } = await API.get(`/proveedor/documentos/${tipo}`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = tipo.startsWith('cedula_') ? `${tipo}.jpg` : tipo === 'contrato_base' ? 'contrato-proveedor.pdf' : 'contrato-firmado.pdf';
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function DocumentosProveedor({ documentos = {}, onActualizar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const subir = async (tipo, archivo) => {
    if (!archivo || ocupado) return;
    setOcupado(true); setError(''); setAviso('');
    try {
      const form = new FormData(); form.append('archivo', archivo);
      await API.post(`/proveedor/documentos/${tipo}`, form);
      setAviso(tipo.startsWith('cedula-') ? 'La foto de tu cédula se actualizó.' : 'Recibimos tu contrato firmado. El administrador lo revisará.');
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
    <p>Tu número de cédula, las fotos del frente y dorso, y los contratos se usan para revisar tu postulación. No aparecen en Buscar proveedores.</p>
    <div className="provider-documents__grid">
      {([['frente', 'Frente'], ['dorso', 'Dorso']]).map(([lado, etiqueta]) => <div className="provider-documents__item" key={lado}><h3>{etiqueta} de la cédula</h3><p>{documentos[`cedula_${lado}_cargada`] ? 'Recibida para revisión privada.' : `Subí una imagen legible del ${lado} de tu cédula.`}</p><div className="provider-documents__actions">{documentos[`cedula_${lado}_cargada`] && <button type="button" onClick={() => bajar(`cedula_${lado}`)} disabled={ocupado}>Descargar {lado}</button>}<label className="provider-documents__upload">{documentos[`cedula_${lado}_cargada`] ? `Actualizar ${lado}` : `Subir ${lado}`}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={e => { subir(`cedula-${lado}`, e.target.files?.[0]); e.target.value = ''; }} /></label></div><small>JPG, PNG o WebP. Imagen legible de al menos 500 × 300 px, hasta 8 MB.</small></div>)}
      <div className="provider-documents__item"><h3>Contrato de proveedor</h3><p>{estado === 'sin_contrato' ? 'Cuando esté listo, el administrador publicará aquí el PDF para firmar.' : estado === 'pendiente_firma' ? 'Descargá el PDF, firmalo y subilo de nuevo.' : estado === 'pendiente_revision' ? 'Recibimos el PDF firmado. Está pendiente de revisión.' : estado === 'validado' ? 'El administrador validó tu contrato firmado.' : 'El administrador pidió una corrección del contrato firmado.'}</p>{estado === 'correccion' && documentos.contrato_nota && <p className="provider-documents__note">Corrección solicitada: {documentos.contrato_nota}</p>}<div className="provider-documents__actions">{documentos.contrato_disponible && <button type="button" onClick={() => bajar('contrato_base')} disabled={ocupado}>Descargar contrato PDF</button>}{documentos.contrato_firmado && <button type="button" onClick={() => bajar('contrato_firmado')} disabled={ocupado}>Mi PDF firmado</button>}{documentos.contrato_disponible && estado !== 'validado' && <label className="provider-documents__upload">{documentos.contrato_firmado ? 'Reemplazar PDF firmado' : 'Subir PDF firmado'}<input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => { subir('contrato-firmado', e.target.files?.[0]); e.target.value = ''; }} /></label>}</div>{documentos.contrato_disponible && <small>PDF de hasta 8 MB. Conservá una copia del documento firmado.</small>}</div>
    </div>
    {error && <p className="provider-panel__error" role="alert">{error}</p>}{aviso && <p className="provider-panel__success" role="status">{aviso}</p>}
  </section>;
}
