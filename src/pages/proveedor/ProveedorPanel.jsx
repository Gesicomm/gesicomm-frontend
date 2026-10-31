import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bold, Check, ImagePlus, Italic, List, ListOrdered, Plus, Save, Trash2, Underline } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import API from '../../services/api';
import { limpiarTextoFooter } from '../landing-simple/paginasFooter';
import { PORTAFOLIO_EJEMPLO } from '../servicios/serviciosEjemplos';
import DocumentosProveedor from './DocumentosProveedor';
import './proveedorPanel.css';

const CATEGORIAS = [['mercaderias', 'Mercaderías'], ['envios', 'Envíos y logística'], ['editor_videos', 'Editor de videos'], ['media_buyer', 'Publicidad'], ['webmaster', 'Desarrollo web'], ['partner_certificado', 'Otros servicios']];
const vacio = { categoria: 'editor_videos', titulo: '', resumen: '', detalle_html: '', beneficios: [], video_urls: [], imagenes: [], estado: 'borrador' };
const mensajeError = (err, respaldo) => err.response?.data?.errores?.map(item => item.mensaje).join(' ') || err.response?.data?.message || respaldo;

function EditorRico({ html, onChange, onPegarImagen, disabled }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html || ''; }, [html]);
  const sincronizar = () => onChange(limpiarTextoFooter(ref.current?.innerHTML || ''));
  const comando = nombre => { ref.current?.focus(); document.execCommand(nombre, false); sincronizar(); };
  const pegar = async event => {
    const imagen = [...event.clipboardData.files].find(file => file.type.startsWith('image/'));
    if (!imagen) { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); sincronizar(); return; }
    event.preventDefault();
    const url = await onPegarImagen(imagen);
    if (url) { ref.current?.focus(); document.execCommand('insertHTML', false, `<img src="${url}" alt="Imagen del servicio">`); sincronizar(); }
  };
  return <div className="provider-editor"><div className="provider-editor__toolbar" role="toolbar" aria-label="Formato del texto">{[['bold', 'Negrita', Bold], ['italic', 'Cursiva', Italic], ['underline', 'Subrayado', Underline], ['insertUnorderedList', 'Viñetas', List], ['insertOrderedList', 'Lista numerada', ListOrdered]].map(([cmd, label, Icon]) => <button type="button" key={cmd} title={label} aria-label={label} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => comando(cmd)}><Icon size={18} /></button>)}</div><div ref={ref} className="provider-editor__canvas" contentEditable={!disabled} suppressContentEditableWarning onInput={sincronizar} onPaste={pegar} aria-label="Descripción completa del servicio" role="textbox" aria-multiline="true" data-placeholder="Contá cómo trabajás, qué incluís y por qué elegirte. Podés usar títulos, listas y pegar imágenes." /></div>;
}

function Postulacion({ email, nombre, onEnviada }) {
  const partes = String(nombre || '').trim().split(/\s+/);
  const [datos, setDatos] = useState({ nombre: partes[0] || '', apellido: partes.slice(1).join(' '), documento: '', ruc: '', whatsapp: '', categoria: 'editor_videos', tipo_postulante: 'persona', razon_social: '', direccion_empresa: '', descripcion: '' });
  const [archivos, setArchivos] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const campo = (key, label, props = {}) => <label>{label}<input value={datos[key]} onChange={e => setDatos(v => ({ ...v, [key]: e.target.value }))} required {...props} /></label>;
  const archivo = (key, label, ayuda, accept = 'application/pdf,.pdf') => <label key={key}>{label}<input type="file" accept={accept} onChange={e => setArchivos(v => ({ ...v, [key]: e.target.files?.[0] || null }))} required /><small>{ayuda}</small></label>;
  const persona = datos.tipo_postulante === 'persona';
  const necesarios = persona ? ['foto', 'cedula_pdf', 'vida_residencia', 'antecedente_policial'] : ['foto', 'constancia_ruc'];
  const enviar = async event => {
    event.preventDefault();
    if (ocupado) return;
    if (necesarios.some(key => !archivos[key])) { setError('Completá todos los documentos requeridos.'); return; }
    setOcupado(true); setError('');
    try {
      const form = new FormData();
      Object.entries({ ...datos, email }).forEach(([key, value]) => form.append(key, value));
      necesarios.forEach(key => form.append(key, archivos[key]));
      await API.post('/publico/solicitudes-proveedores', form);
      onEnviada();
    }
    catch (err) { setError(mensajeError(err, 'No pudimos enviar la postulación.')); }
    finally { setOcupado(false); }
  };
  return <section className="provider-panel__card provider-panel__application"><div className="provider-panel__application-intro"><span className="provider-panel__eyebrow">Postulación de proveedor</span><h2>Presentá tu propuesta</h2><p>Completá tus datos y contanos qué servicios ofrecés. El equipo de Gesicom revisará tu solicitud.</p><div className="provider-panel__steps"><span><b>1</b> Tus datos</span><span><b>2</b> Tu propuesta</span><span><b>3</b> Documentación privada</span></div></div>
    <form className="provider-panel__form" onSubmit={enviar}>
      <section className="provider-panel__form-section"><div className="provider-panel__section-heading"><span>01</span><div><h3>Datos de contacto</h3><p>Elegí cómo te postulás para mostrar solo lo que corresponde.</p></div></div>
      <label>Tipo de postulante<select value={datos.tipo_postulante} onChange={e => setDatos(v => ({ ...v, tipo_postulante: e.target.value }))}><option value="persona">Persona</option><option value="empresa">Empresa</option></select></label>
      <div className="provider-panel__fields">{campo('nombre', persona ? 'Nombre *' : 'Nombre del representante *')}{campo('apellido', persona ? 'Apellido *' : 'Apellido del representante *')}{persona && campo('documento', 'Número de cédula *')}{campo('whatsapp', 'WhatsApp *', { type: 'tel', autoComplete: 'tel' })}
        {!persona && <>{campo('razon_social', 'Razón social *')}{campo('ruc', 'RUC de la empresa *')}{campo('direccion_empresa', 'Dirección de la empresa *')}</>}
        <label>Especialidad *<select value={datos.categoria} onChange={e => setDatos(v => ({ ...v, categoria: e.target.value }))}>{CATEGORIAS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div></section>
      <section className="provider-panel__form-section"><div className="provider-panel__section-heading"><span>02</span><div><h3>Tu propuesta</h3><p>La descripción ayuda al equipo a entender qué querés ofrecer.</p></div></div><label>Descripción de los servicios que vas a ofrecer *<textarea value={datos.descripcion} onChange={e => setDatos(v => ({ ...v, descripcion: e.target.value }))} minLength={30} maxLength={1000} required rows={5} placeholder="Contá qué hacés, para quién y cómo trabajás." /></label></section>
      <section className="provider-panel__form-section"><div className="provider-panel__section-heading"><span>03</span><div><h3>Perfil y documentos</h3><p>{persona ? 'Los documentos personales son privados y solo los ve administración.' : 'Para empresas solicitamos únicamente la constancia de RUC. No pedimos cédula de la empresa.'}</p></div></div><div className="provider-panel__fields provider-panel__uploads">{archivo('foto', 'Foto de perfil *', 'JPG, PNG o WebP. Mínimo 200 × 200 px, hasta 5 MB.', 'image/jpeg,image/png,image/webp')}{persona ? <>{archivo('cedula_pdf', 'Cédula: frente y dorso en un solo PDF *', 'Incluí ambas caras en un PDF de hasta 8 MB.')}{archivo('vida_residencia', 'Certificado de vida y residencia (PDF) *', 'PDF de hasta 8 MB.')}{archivo('antecedente_policial', 'Antecedente policial (PDF) *', 'PDF de hasta 8 MB.')}</> : archivo('constancia_ruc', 'Constancia de RUC (PDF) *', 'PDF de hasta 8 MB.')}</div><p className="provider-panel__privacy">La postulación se vinculará al correo {email}. Los documentos se usan solo para revisión privada.</p></section>
      {error && <p role="alert" className="provider-panel__error">{error}</p>}<button className="provider-panel__primary" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar postulación'} <ArrowRight size={18} /></button>
    </form>
  </section>;
}

export default function ProveedorPanel({ demo = false }) {
  const [estado, setEstado] = useState(demo ? { rol_proveedor: true, nombre: 'Ana Ejemplo', email: 'ana@ejemplo.com', postulacion: { estado: 'aceptada', especialidad: 'Editor de videos' } } : null);
  const [servicios, setServicios] = useState(demo ? [{ ...vacio, id: 'ejemplo-video', titulo: 'Videos que cuentan tu historia', resumen: 'Edición de Reels, videos de producto y piezas para redes. Una propuesta visual pensada para que tu marca se destaque.', detalle_html: '<h2>Contenido que conecta</h2><p>Transformo ideas en <strong>videos breves y claros</strong> para mostrar productos, contar historias y ganar presencia en redes.</p><p>Trabajo con una propuesta visual adaptada a cada marca, desde la selección de clips hasta la edición final.</p>', beneficios: ['Edición de Reels y videos de producto', 'Piezas listas para publicar', 'Ajustes según tu identidad visual'], imagenes: PORTAFOLIO_EJEMPLO, estado: 'publicado' }] : []);
  const [seleccion, setSeleccion] = useState(null);
  const [form, setForm] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(!demo);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [sucio, setSucio] = useState(false);
  const [repostular, setRepostular] = useState(false);
  const location = useLocation();
  const rutaRetorno = typeof location.state?.volverA === 'string' && location.state.volverA.startsWith('/') && !location.state.volverA.startsWith('//')
    ? location.state.volverA : '';

  const cargar = async () => {
    if (demo) return;
    setCargando(true); setError('');
    try { const { data } = await API.get('/proveedor/estado'); setEstado(data); if (data.rol_proveedor && data.postulacion?.estado === 'aceptada') { const respuesta = await API.get('/proveedor/servicios'); setServicios(respuesta.data.servicios); } }
    catch (err) { setError(mensajeError(err, 'No pudimos cargar tu espacio de proveedor.')); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, [demo]);
  const editar = item => { setSeleccion(item.id); setForm({ ...vacio, ...item, beneficios: item.beneficios || [], video_urls: item.video_urls || [], imagenes: item.imagenes || [] }); setSucio(false); setAviso(''); };
  const cambiar = (key, value) => { setForm(v => ({ ...v, [key]: value })); setSucio(true); };
  const activar = async () => { setOcupado(true); setError(''); try { const { data } = await API.post('/proveedor/activar'); setEstado(data); } catch (err) { setError(mensajeError(err, 'No pudimos activar tu espacio.')); } finally { setOcupado(false); } };
  const crear = async () => { setOcupado(true); setError(''); try { const { data } = await API.post('/proveedor/servicios'); setServicios(v => [data.servicio, ...v]); editar(data.servicio); } catch (err) { setError(mensajeError(err, 'No pudimos crear el servicio.')); } finally { setOcupado(false); } };
  const guardar = async estadoDestino => { if (!form || ocupado) return; setOcupado(true); setError(''); setAviso(''); try { const { data } = await API.patch(`/proveedor/servicios/${seleccion}`, { ...form, estado: estadoDestino, video_urls: form.video_urls.filter(Boolean), beneficios: form.beneficios.filter(Boolean), imagenes: form.imagenes.map(({ storage_key, alt }) => ({ storage_key, alt: alt || '' })) }); setForm(data.servicio); setServicios(v => v.map(item => item.id === seleccion ? data.servicio : item)); setSucio(false); setAviso(estadoDestino === 'publicado' ? 'Servicio publicado. Ya podés verlo en Buscar proveedores.' : 'Borrador guardado.'); } catch (err) { setError(mensajeError(err, 'No pudimos guardar el servicio.')); } finally { setOcupado(false); } };
  const subir = async archivo => { if (!archivo || !seleccion) return null; if (form.imagenes.length >= 6) { setError('Podés subir hasta seis imágenes por servicio.'); return null; } setOcupado(true); setError(''); try { const body = new FormData(); body.append('imagen', archivo); const { data } = await API.post(`/proveedor/servicios/${seleccion}/imagenes`, body); cambiar('imagenes', [...form.imagenes, data.imagen]); return data.imagen.url; } catch (err) { setError(mensajeError(err, 'No pudimos subir la imagen.')); return null; } finally { setOcupado(false); } };
  const quitar = async imagen => { setOcupado(true); setError(''); try { await API.delete(`/proveedor/servicios/${seleccion}/imagenes`, { data: { storage_key: imagen.storage_key } }); cambiar('imagenes', form.imagenes.filter(item => item.storage_key !== imagen.storage_key)); } catch (err) { setError(mensajeError(err, 'No pudimos quitar la imagen.')); } finally { setOcupado(false); } };
  const volver = () => { if (sucio && !window.confirm('Tenés cambios sin guardar. ¿Querés salir del editor?')) return; setSeleccion(null); setForm(null); setSucio(false); };
  const modoPostulacion = Boolean(estado && (!estado.rol_proveedor || !estado.postulacion || repostular));

  return <main className={`provider-panel gc-panel ${modoPostulacion ? 'provider-panel--application-mode' : ''}`}><header className="provider-panel__header"><div><span className="provider-panel__eyebrow">Espacio de proveedor · Gesicom</span><h1>{demo ? 'Vista del proveedor' : 'Mis servicios'}</h1><p>{demo ? 'Así se ve el espacio que recibirá un proveedor aprobado. Los datos de esta vista son de ejemplo.' : 'Mostrá tu trabajo, editá tu portafolio y compartí tu propuesta.'}</p></div><Link to="/buscar-servicios" state={{ volverA: rutaRetorno && rutaRetorno !== '/buscar-servicios' ? rutaRetorno : '/mi-dashboard' }}>Buscar proveedores <ArrowRight size={18} /></Link></header>
    {demo && <p className="provider-panel__notice">Vista previa de administración. Para editar servicios reales, ingresá con una cuenta de proveedor aprobada.</p>}
    {cargando ? <p role="status">Cargando tu espacio…</p> : <>
      {error && <p className="provider-panel__error" role="alert">{error}</p>}{aviso && <p className="provider-panel__success" role="status"><Check size={18} /> {aviso}</p>}
      {estado?.rol_proveedor && estado.postulacion && <DocumentosProveedor documentos={estado.postulacion.documentos} tipoPostulante={estado.postulacion.tipo_postulante} onActualizar={cargar} />}
    </>}
  </main>;
}
