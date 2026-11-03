import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bold, Check, Eye, ImagePlus, Italic, List, ListOrdered, Pencil, Plus, Save, Trash2, Underline } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import API, { getMediaUrl } from '../../services/api';
import { limpiarTextoFooter } from '../landing-simple/paginasFooter';
import { PORTAFOLIO_EJEMPLO } from '../servicios/serviciosEjemplos';
import { ServicioDetalleVista } from '../servicios/ServicioDetalle';
import DocumentosProveedor from './DocumentosProveedor';
import './proveedorPanel.css';
import '../servicios/buscarServicios.css';

const CATEGORIAS = [['productos_logistica', 'Productos, envíos y logística'], ['editor_videos', 'Editor de videos'], ['media_buyer', 'Publicidad'], ['webmaster', 'Desarrollo web'], ['partner_certificado', 'Otros servicios']];
const vacio = { categoria: 'editor_videos', titulo: '', resumen: '', detalle_html: '', beneficios: [], video_urls: [], imagenes: [], estado: 'borrador' };
const mensajeError = (err, respaldo) => err.response?.data?.errores?.map(item => item.mensaje).join(' ') || err.response?.data?.message || respaldo;
const estadoPostulacion = { pendiente: 'En revisión', aceptada: 'Aceptada', rechazada: 'Rechazada' };

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
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [tipoVistaPrevia, setTipoVistaPrevia] = useState('directorio');
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
  const editar = item => { setSeleccion(item.id); setForm({ ...vacio, ...item, categoria: ['mercaderias', 'envios'].includes(item.categoria) ? 'productos_logistica' : item.categoria, titulo: item.titulo === 'Nuevo servicio' ? '' : item.titulo, beneficios: item.beneficios || [], video_urls: item.video_urls || [], imagenes: item.imagenes || [] }); setSucio(false); setAviso(''); setVistaPrevia(false); setTipoVistaPrevia('directorio'); };
  const cambiar = (key, value) => { setForm(v => ({ ...v, [key]: value })); setSucio(true); };
  const crear = async () => { setOcupado(true); setError(''); try { const { data } = await API.post('/proveedor/servicios'); setServicios(v => [data.servicio, ...v]); editar(data.servicio); } catch (err) { setError(mensajeError(err, 'No pudimos crear el servicio.')); } finally { setOcupado(false); } };
  const guardar = async estadoDestino => { if (!form || ocupado) return; setOcupado(true); setError(''); setAviso(''); try { const { data } = await API.patch(`/proveedor/servicios/${seleccion}`, { ...form, estado: estadoDestino, video_urls: form.video_urls.filter(Boolean), beneficios: form.beneficios.filter(Boolean), imagenes: form.imagenes.map(({ storage_key, alt }) => ({ storage_key, alt: alt || '' })) }); setForm(data.servicio); setServicios(v => v.map(item => item.id === seleccion ? data.servicio : item)); setSucio(false); setAviso(estadoDestino === 'publicado' ? 'Servicio publicado. Ya podés verlo en Buscar proveedores.' : 'Borrador guardado.'); } catch (err) { setError(mensajeError(err, 'No pudimos guardar el servicio.')); } finally { setOcupado(false); } };
  const subir = async archivo => { if (!archivo || !seleccion) return null; if (form.imagenes.length >= 6) { setError('Podés subir hasta seis imágenes por servicio.'); return null; } setOcupado(true); setError(''); try { const body = new FormData(); body.append('imagen', archivo); const { data } = await API.post(`/proveedor/servicios/${seleccion}/imagenes`, body); cambiar('imagenes', [...form.imagenes, data.imagen]); return data.imagen.url; } catch (err) { setError(mensajeError(err, 'No pudimos subir la imagen.')); return null; } finally { setOcupado(false); } };
  const quitar = async imagen => { setOcupado(true); setError(''); try { await API.delete(`/proveedor/servicios/${seleccion}/imagenes`, { data: { storage_key: imagen.storage_key } }); cambiar('imagenes', form.imagenes.filter(item => item.storage_key !== imagen.storage_key)); } catch (err) { setError(mensajeError(err, 'No pudimos quitar la imagen.')); } finally { setOcupado(false); } };
  const volver = () => { if (sucio && !window.confirm('Tenés cambios sin guardar. ¿Querés salir del editor?')) return; setSeleccion(null); setForm(null); setSucio(false); setVistaPrevia(false); };
  const modoPostulacion = Boolean(estado && !estado.rol_proveedor && !estado.postulacion);
  const titulo = demo ? 'Vista del proveedor' : modoPostulacion ? 'Alta manual de proveedor' : estado?.postulacion && !estado.rol_proveedor ? 'Mi postulación' : 'Mis servicios';
  const descripcion = demo ? 'Así se ve el espacio que recibirá un proveedor aprobado. Los datos de esta vista son de ejemplo.'
    : modoPostulacion ? 'La incorporación de proveedores de mercadería se coordina directamente con el equipo Gesicom.'
      : estado?.postulacion && !estado.rol_proveedor ? 'Consultá el estado de tu solicitud y mantené actualizados tus documentos.'
        : 'Mostrá tu trabajo, editá tu portafolio y compartí tu propuesta.';
  const espacioActivo = demo || Boolean(estado?.rol_proveedor && estado.postulacion?.estado === 'aceptada');
  const especialidadActual = CATEGORIAS.find(([id]) => id === form?.categoria)?.[1] || 'Servicio profesional';
  const proveedorVista = { nombre: estado?.nombre || 'Tu nombre', especialidad: especialidadActual, oferta: form?.titulo || '', descripcion: form?.resumen || '', categoria: form?.categoria, detalle_html: form?.detalle_html || '', beneficios: form?.beneficios || [], video_urls: (form?.video_urls || []).filter(Boolean), imagenes: (form?.imagenes || []).map(imagen => ({ ...imagen, url: getMediaUrl(imagen.url) })), foto_url: getMediaUrl(estado?.postulacion?.foto_url), whatsapp: estado?.postulacion?.whatsapp || '' };

  const editorServicio = form && <section className="provider-panel__card provider-panel__workspace" aria-labelledby="provider-service-editor-title">
    <div className="provider-panel__workspace-head"><span>{form.estado === 'publicado' ? 'Editando servicio publicado' : 'Completá tu servicio'}</span><button type="button" onClick={volver}>Volver a mis servicios</button></div>
    <h2 id="provider-service-editor-title">{form.titulo || 'Tu servicio'}</h2>
    <p>Completá tu propuesta y revisá la presentación antes de publicarla en Buscar proveedores.</p>
    {!demo && <div className="provider-panel__view-switch" role="group" aria-label="Cambiar entre edición y vista previa"><button type="button" className={!vistaPrevia ? 'is-active' : ''} aria-pressed={!vistaPrevia} onClick={() => setVistaPrevia(false)}><Pencil size={18} /> Editar contenido</button><button type="button" className={vistaPrevia ? 'is-active' : ''} aria-pressed={vistaPrevia} onClick={() => setVistaPrevia(true)}><Eye size={18} /> Vista previa</button></div>}
    {vistaPrevia ? <div className="provider-panel__preview">
      <div className="provider-panel__preview-head"><div><strong>Así se verá tu publicación</strong><p>La vista se actualiza con lo que escribís. Tus cambios siguen sin publicar.</p></div><div role="group" aria-label="Parte de la publicación a previsualizar"><button type="button" className={tipoVistaPrevia === 'directorio' ? 'is-active' : ''} aria-pressed={tipoVistaPrevia === 'directorio'} onClick={() => setTipoVistaPrevia('directorio')}>En Buscar proveedores</button><button type="button" className={tipoVistaPrevia === 'ficha' ? 'is-active' : ''} aria-pressed={tipoVistaPrevia === 'ficha'} onClick={() => setTipoVistaPrevia('ficha')}>Ficha completa</button></div></div>
      {tipoVistaPrevia === 'directorio' ? <div className="provider-panel__directory-preview"><article className="gc-service-card"><div className="gc-service-photo">{proveedorVista.foto_url && <img src={proveedorVista.foto_url} alt={`Foto de ${proveedorVista.nombre}`} />}<span className="gc-service-verified">Perfil revisado</span></div><div className="gc-service-info"><span className="gc-service-category">{proveedorVista.especialidad}</span><h3>{proveedorVista.oferta || 'El título de tu servicio'}</h3><p className="gc-service-person">{proveedorVista.nombre}</p><p className="gc-service-description">{proveedorVista.descripcion || 'Tu presentación breve va a aparecer acá.'}</p><span className="gc-service-contact gc-service-contact-demo">Ver servicio <ArrowRight size={18} /></span></div></article><p>Esta tarjeta aparece en los resultados del directorio y abre la ficha del servicio.</p></div> : <ServicioDetalleVista servicio={proveedorVista} integrado vistaPrevia volverA="/mi-tienda/buscar-servicios" />}
    </div> : <div className="provider-panel__edit-grid">
      <form className="provider-panel__form" onSubmit={event => { event.preventDefault(); guardar('borrador'); }}>
        <div className="provider-panel__fields">
          <label>Especialidad<select value={form.categoria} onChange={event => cambiar('categoria', event.target.value)} disabled={ocupado || demo}>{CATEGORIAS.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></label>
          <label>Título del servicio<input value={form.titulo} maxLength={120} onChange={event => cambiar('titulo', event.target.value)} placeholder="Ej.: Edición de videos para redes" disabled={ocupado || demo} /></label>
        </div>
        <label>Presentación breve<textarea value={form.resumen} maxLength={500} rows={4} onChange={event => cambiar('resumen', event.target.value)} placeholder="Explicá qué ofrecés. Para publicar necesitás al menos 30 caracteres." disabled={ocupado || demo} /><small>{form.resumen.trim().length < 30 ? `Mínimo 30 caracteres para publicar. Te faltan ${30 - form.resumen.trim().length}.` : `${form.resumen.trim().length}/500 · mínimo alcanzado`}</small></label>
        <label>Detalles de tu servicio<EditorRico html={form.detalle_html} onChange={value => cambiar('detalle_html', value)} onPegarImagen={subir} disabled={ocupado || demo} /><small>Podés dar formato al texto y pegar imágenes en la descripción.</small></label>
        <label>Qué incluye tu servicio<textarea value={form.beneficios.join('\n')} rows={4} onChange={event => cambiar('beneficios', event.target.value.split('\n').slice(0, 12))} placeholder="Una característica por línea" disabled={ocupado || demo} /><small>Hasta 12 puntos; cada uno puede tener hasta 150 caracteres.</small></label>
        <div className="provider-panel__form-section"><h3>Videos de muestra</h3><p>Agregá enlaces de YouTube o Vimeo (hasta cuatro).</p>{[0, 1, 2, 3].map(index => <label key={index}>Video {index + 1}<input type="url" value={form.video_urls[index] || ''} onChange={event => { const siguiente = [...form.video_urls]; siguiente[index] = event.target.value; cambiar('video_urls', siguiente); }} placeholder="https://www.youtube.com/watch?v=..." disabled={ocupado || demo} /></label>)}</div>
        <div className="provider-panel__actions">{!demo && <><button type="button" disabled={ocupado || !sucio} onClick={() => guardar('borrador')}><Save size={18} /> Guardar borrador</button><button type="button" className="provider-panel__primary" disabled={ocupado || form.titulo.trim().length < 5 || form.resumen.trim().length < 30} onClick={() => guardar('publicado')}>{ocupado ? 'Guardando…' : form.estado === 'publicado' ? 'Guardar y mantener publicado' : 'Publicar servicio'} <ArrowRight size={18} /></button></>}</div>
        {demo && <p>La vista previa no permite modificar servicios reales.</p>}
      </form>
      <aside className="provider-panel__gallery"><h2>Fotos del servicio</h2><p>Mostrá ejemplos de tu trabajo. Podés cargar hasta seis imágenes JPG, PNG o WebP de 200 × 200 px o más (5 MB cada una).</p>
        <div className="provider-panel__images">{form.imagenes.map(imagen => <div key={imagen.storage_key}><img src={getMediaUrl(imagen.url)} alt={imagen.alt || 'Imagen del servicio'} /><button type="button" aria-label="Quitar imagen" disabled={ocupado || demo} onClick={() => quitar(imagen)}><Trash2 size={17} /></button><input value={imagen.alt || ''} maxLength={120} aria-label="Descripción de la imagen" onChange={event => cambiar('imagenes', form.imagenes.map(item => item.storage_key === imagen.storage_key ? { ...item, alt: event.target.value } : item))} disabled={ocupado || demo} /></div>)}</div>
        {form.imagenes.length < 6 && <label className="provider-panel__upload"><ImagePlus size={20} /> Agregar una foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado || demo} onChange={event => { const archivo = event.target.files?.[0]; if (archivo) subir(archivo); event.target.value = ''; }} /></label>}
      </aside>
    </div>}
  </section>;

  return <main className={`provider-panel gc-panel ${modoPostulacion ? 'provider-panel--application-mode' : ''}`}><header className="provider-panel__header"><div><span className="provider-panel__eyebrow">Espacio de proveedor · Gesicom</span><h1>{titulo}</h1><p>{descripcion}</p></div><Link to="/mi-tienda/buscar-servicios">Volver a buscar proveedores <ArrowRight size={18} /></Link></header>
    {demo && <p className="provider-panel__notice">Vista previa de administración. Para editar servicios reales, ingresá con una cuenta de proveedor aprobada.</p>}
    {cargando ? <p role="status">Cargando tu espacio…</p> : <>
      {error && <p className="provider-panel__error" role="alert">{error}</p>}{aviso && <p className="provider-panel__success" role="status"><Check size={18} /> {aviso}</p>}
      {modoPostulacion && <section className="provider-panel__card provider-panel__manual-intake"><span className="provider-panel__eyebrow">Incorporación manual</span><h2>Proveedores de mercadería</h2><p>Por ahora no se aceptan postulaciones independientes desde esta pantalla. La carga y el envío de la información se coordinan con el equipo Gesicom.</p><p>RAHA continúa como proveedor de productos y logística. Los couriers se incorporan por su flujo logístico correspondiente.</p><Link to="/mi-tienda/buscar-servicios">Ver proveedores disponibles <ArrowRight size={18} /></Link></section>}
      {!demo && estado?.postulacion && <>
        <section className="provider-panel__card provider-panel__application-status" aria-live="polite">
          <span className="provider-panel__eyebrow">Postulación #{estado.postulacion.id}</span>
          <h2>Estado: {estadoPostulacion[estado.postulacion.estado] || 'Recibida'}</h2>
          {estado.postulacion.estado === 'pendiente' && !estado.postulacion.contrato_vigente && <p>Esta postulación anterior sigue en revisión. El equipo de Gesicom coordinará manualmente cualquier información adicional.</p>}
          {estado.postulacion.estado === 'pendiente' && estado.postulacion.contrato_vigente && <p>El equipo de Gesicom está revisando tus datos y el acuerdo firmado. Podés reemplazar el PDF si necesitás corregir el escaneo.</p>}
          {estado.postulacion.estado === 'aceptada' && <p>Tu postulación fue aceptada. Completá tu servicio y publicalo para que aparezca en Buscar proveedores.</p>}
          {estado.postulacion.estado === 'rechazada' && <p>Esta postulación fue rechazada. Las nuevas incorporaciones de proveedores de mercadería se coordinan manualmente con el equipo Gesicom.</p>}
        </section>
        {espacioActivo && (form ? editorServicio : <>
          <section className="provider-panel__list-heading" aria-labelledby="provider-services-title"><div><span className="provider-panel__eyebrow">Tu perfil público</span><h2 id="provider-services-title">Tus servicios</h2><p>Completá y publicá una propuesta para que aparezca en el directorio.</p></div>{!demo && <button type="button" className="provider-panel__primary" onClick={crear} disabled={ocupado}><Plus size={18} /> Agregar otro servicio</button>}</section>
          {servicios.length ? <div className="provider-panel__cards">{servicios.map(item => <article className="provider-panel__service" key={item.id}><span>{item.estado === 'publicado' ? 'Publicado' : 'Borrador'}</span><h3>{item.titulo && item.titulo !== 'Nuevo servicio' ? item.titulo : 'Tu servicio todavía no tiene título'}</h3><p>{item.resumen || 'Agregá una descripción para presentar tu propuesta.'}</p><div><button type="button" onClick={() => editar(item)}>{item.estado === 'publicado' ? 'Editar servicio' : 'Completar servicio'} <ArrowRight size={16} /></button>{item.estado === 'publicado' && <Link to={`/mi-tienda/buscar-servicios/${item.id}`}>Ver publicación</Link>}</div></article>)}</div> : <section className="provider-panel__card provider-panel__empty"><h3>Tu servicio todavía no está publicado</h3><p>Empezá completando una propuesta. Podés agregar una descripción, fotos, videos y los detalles de lo que ofrecés.</p>{!demo && <button type="button" className="provider-panel__primary" onClick={crear} disabled={ocupado}><Plus size={18} /> Crear mi servicio</button>}</section>}
        </>)}
        {estado.postulacion.estado !== 'rechazada' && <DocumentosProveedor documentos={estado.postulacion.documentos} tipoPostulante={estado.postulacion.tipo_postulante} onActualizar={cargar} />}
      </>}
    </>}
  </main>;
}
