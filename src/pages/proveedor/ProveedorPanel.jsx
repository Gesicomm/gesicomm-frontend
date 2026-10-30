import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bold, Check, ImagePlus, Italic, List, ListOrdered, Plus, Save, Trash2, Underline } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const necesarios = persona ? ['foto', 'cedula_pdf', 'vida_residencia', 'antecedente_policial'] : ['foto', 'cedula_pdf', 'constancia_ruc'];
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
  return <section className="provider-panel__card"><span className="provider-panel__eyebrow">Primer paso</span><h2>Presentá tu propuesta</h2><p>Contanos qué servicios querés ofrecer. Cuando aprobemos tu perfil, vas a poder crear y editar cada servicio.</p>
    <form className="provider-panel__form" onSubmit={enviar}>
      <label>¿Te postulás como persona o empresa? *<select value={datos.tipo_postulante} onChange={e => setDatos(v => ({ ...v, tipo_postulante: e.target.value }))}><option value="persona">Persona</option><option value="empresa">Empresa</option></select></label>
      <div className="provider-panel__fields">{campo('nombre', persona ? 'Nombre *' : 'Nombre del representante *')}{campo('apellido', persona ? 'Apellido *' : 'Apellido del representante *')}{campo('documento', 'Número de cédula *')}{campo('whatsapp', 'WhatsApp *', { type: 'tel' })}
        {!persona && <>{campo('razon_social', 'Razón social *')}{campo('ruc', 'RUC de la empresa *')}{campo('direccion_empresa', 'Dirección de la empresa *')}</>}
        <label>Especialidad *<select value={datos.categoria} onChange={e => setDatos(v => ({ ...v, categoria: e.target.value }))}>{CATEGORIAS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <label>Descripción de los servicios que vas a ofrecer *<textarea value={datos.descripcion} onChange={e => setDatos(v => ({ ...v, descripcion: e.target.value }))} minLength={30} maxLength={1000} required rows={5} placeholder="Contá qué hacés, para quién y cómo trabajás." /></label>
      {archivo('foto', 'Foto de perfil *', 'JPG, PNG o WebP. Mínimo 200 × 200 px, hasta 5 MB.', 'image/jpeg,image/png,image/webp')}
      {archivo('cedula_pdf', 'Cédula: frente y dorso en un solo PDF *', 'Incluí ambas caras legibles en un único PDF de hasta 8 MB. Solo para revisión privada.')}
      {persona ? <>{archivo('vida_residencia', 'Certificado de vida y residencia (PDF) *', 'PDF de hasta 8 MB.')}{archivo('antecedente_policial', 'Antecedente policial (PDF) *', 'PDF de hasta 8 MB.')}</> : archivo('constancia_ruc', 'Constancia de RUC (PDF) *', 'PDF de hasta 8 MB.')}
      <p className="provider-panel__privacy">Los documentos se usan solo para revisión privada. La postulación se vinculará al correo {email}.</p>
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

  return <main className="provider-panel gc-panel"><header className="provider-panel__header"><div><span className="provider-panel__eyebrow">Espacio de proveedor · Gesicom</span><h1>{demo ? 'Vista del proveedor' : 'Mis servicios'}</h1><p>{demo ? 'Así se ve el espacio que recibirá un proveedor aprobado. Los datos de esta vista son de ejemplo.' : 'Mostrá tu trabajo, editá tu portafolio y compartí tu propuesta.'}</p></div><Link to="/buscar-servicios">Buscar proveedores <ArrowRight size={18} /></Link></header>
    {demo && <p className="provider-panel__notice">Vista previa de administración. Para editar servicios reales, ingresá con una cuenta de proveedor aprobada.</p>}
    {cargando ? <p role="status">Cargando tu espacio…</p> : <>
      {error && <p className="provider-panel__error" role="alert">{error}</p>}{aviso && <p className="provider-panel__success" role="status"><Check size={18} /> {aviso}</p>}
      {estado?.rol_proveedor && estado.postulacion && <DocumentosProveedor documentos={estado.postulacion.documentos} tipoPostulante={estado.postulacion.tipo_postulante} onActualizar={cargar} />}
      {!estado?.rol_proveedor ? <section className="provider-panel__card provider-panel__welcome"><h2>Sumate como proveedor</h2><p>Activá tu espacio para postularte. Tu cuenta y tus accesos actuales se conservan.</p><button className="provider-panel__primary" disabled={ocupado} onClick={activar}>Activar espacio de proveedor <ArrowRight size={18} /></button></section> : (!estado.postulacion || repostular) ? <Postulacion email={estado.email} nombre={estado.nombre} onEnviada={() => { setRepostular(false); cargar(); }} /> : estado.postulacion.estado !== 'aceptada' ? <section className="provider-panel__card provider-panel__welcome"><span className="provider-panel__eyebrow">Postulación {estado.postulacion.estado}</span><h2>{estado.postulacion.estado === 'rechazada' ? 'Tu postulación no fue aprobada' : 'Estamos revisando tu propuesta'}</h2><p>{estado.postulacion.estado === 'rechazada' ? 'Podés escribir a Gesicom para conocer los próximos pasos.' : 'Cuando aprobemos tu perfil, vas a poder editar y publicar tus servicios desde acá.'}</p><button onClick={cargar} type="button">Actualizar estado</button>{estado.postulacion.estado === 'rechazada' && <button onClick={() => setRepostular(true)} type="button">Enviar nueva postulación</button>}</section> : form ? <div className="provider-panel__workspace"><div className="provider-panel__workspace-head"><button type="button" onClick={volver}>← Volver a mis servicios</button><span>{form.estado === 'publicado' ? 'Publicado' : 'Borrador'}{sucio ? ' · Cambios sin guardar' : ''}</span></div><div className="provider-panel__edit-grid"><section className="provider-panel__card provider-panel__form"><span className="provider-panel__eyebrow">Editá tu propuesta</span><h2>{form.titulo || 'Nuevo servicio'}</h2><label>Título del servicio<input value={form.titulo} onChange={e => cambiar('titulo', e.target.value)} maxLength={120} placeholder="Ej.: Videos que cuentan tu historia" disabled={demo} /></label><label>Especialidad<select value={form.categoria} onChange={e => cambiar('categoria', e.target.value)} disabled={demo}>{CATEGORIAS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Resumen para la tarjeta<textarea value={form.resumen} onChange={e => cambiar('resumen', e.target.value)} maxLength={500} rows={4} placeholder="Explicá qué ofrecés en pocas frases." disabled={demo} /></label><label>Descripción completa</label><EditorRico html={form.detalle_html} onChange={value => cambiar('detalle_html', value)} onPegarImagen={subir} disabled={demo || ocupado} /><small>Usá negritas, cursivas, listas y pegá imágenes. Las imágenes cuentan dentro del límite de seis.</small><label>Beneficios <small>Uno por línea, hasta doce</small><textarea value={form.beneficios.join('\n')} onChange={e => cambiar('beneficios', e.target.value.split('\n').slice(0, 12))} rows={5} placeholder={'Atención personalizada\nEntrega puntual'} disabled={demo} /></label><label>Videos de YouTube o Vimeo <small>Un enlace por línea, hasta cuatro</small><textarea value={form.video_urls.join('\n')} onChange={e => cambiar('video_urls', e.target.value.split('\n').slice(0, 4))} rows={3} placeholder="https://www.youtube.com/watch?v=..." disabled={demo} /></label></section><aside className="provider-panel__card provider-panel__gallery"><h2>Portafolio visual</h2><p>Subí hasta seis imágenes de tus trabajos. La primera será la portada del servicio.</p><div className="provider-panel__images">{form.imagenes.map(imagen => <div key={imagen.storage_key}><img src={imagen.url} alt={imagen.alt || 'Imagen del portafolio'} /><input aria-label="Descripción de la imagen" value={imagen.alt || ''} onChange={e => cambiar('imagenes', form.imagenes.map(item => item.storage_key === imagen.storage_key ? { ...item, alt: e.target.value } : item))} maxLength={120} disabled={demo} /><button type="button" onClick={() => quitar(imagen)} disabled={demo || ocupado} aria-label="Quitar imagen"><Trash2 size={17} /></button></div>)}</div>{form.imagenes.length < 6 && !demo && <label className="provider-panel__upload"><ImagePlus size={22} /> Agregar imagen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { subir(e.target.files?.[0]); e.target.value = ''; }} disabled={ocupado} /></label>}<small>JPG, PNG o WebP · hasta 5 MB cada imagen.</small></aside></div><footer className="provider-panel__actions">{!demo && <><button type="button" onClick={() => guardar('borrador')} disabled={ocupado}><Save size={18} /> Guardar borrador</button><button className="provider-panel__primary" type="button" onClick={() => guardar('publicado')} disabled={ocupado}>Publicar servicio <ArrowRight size={18} /></button></>}{form.estado === 'publicado' && <Link to={`/buscar-servicios/${seleccion}`}>Ver ficha pública <ArrowRight size={18} /></Link>}</footer></div> : <><div className="provider-panel__list-heading"><div><span className="provider-panel__eyebrow">Tu portafolio</span><h2>Servicios que ofrecés</h2></div>{!demo && <button className="provider-panel__primary" onClick={crear} disabled={ocupado}><Plus size={18} /> Nuevo servicio</button>}</div><div className="provider-panel__cards">{servicios.map(item => <article className="provider-panel__service" key={item.id}><span>{item.estado === 'publicado' ? 'Publicado' : 'Borrador'}</span><h3>{item.titulo}</h3><p>{item.resumen || 'Empezá a contar qué incluye este servicio.'}</p><div><button type="button" onClick={() => editar(item)}>{demo ? 'Ver editor' : 'Editar servicio'} <ArrowRight size={18} /></button>{item.estado === 'publicado' && <Link to={`/buscar-servicios/${item.id}`}>Más información</Link>}</div></article>)}</div></>}
    </>}
  </main>;
}
