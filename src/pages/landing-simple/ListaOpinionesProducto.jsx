import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

const campo = 'mt-1 w-full h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg';
const directo = (_parte, _titulo, nodo) => nodo;

export default function ListaOpinionesProducto({ items = [], onCambiar, onSubirImagen, ocultarSinOpiniones = true, renderCampo = directo }) {
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(null);
  const inputs = useRef({});
  const actuales = useRef(items);
  actuales.current = items;
  const cambiar = (idx, cambios) => onCambiar(actuales.current.map((v, i) => i === idx ? { ...v, ...cambios } : v));
  async function subir(event, idx) {
    const archivo = event.target.files?.[0]; event.target.value = '';
    if (!archivo || !onSubirImagen) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setError('Elegí una foto JPG, PNG o WEBP de hasta 5 MB.'); return;
    }
    setError(''); setSubiendo(idx);
    try { cambiar(idx, { foto: await onSubirImagen(archivo) }); }
    catch (err) { setError(err.response?.data?.message || err.message || 'No pudimos subir la foto. Intentá nuevamente.'); }
    finally { setSubiendo(null); }
  }
  return <fieldset className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
    <legend className="px-1 text-sm font-semibold text-fg">Opiniones reales</legend>
    <p className="text-xs leading-relaxed text-fg-muted">Podés subir una foto de la persona o pegar una URL pública. {ocultarSinOpiniones ? 'Si no agregás opiniones, la sección se oculta.' : 'Al activar el bloque, se muestra su título aunque todavía no haya opiniones cargadas.'}</p>
    {items.length === 0 ? <p className="text-xs text-fg-muted">Todavía no hay opiniones para esta ficha.</p> : <div className="space-y-2">{items.map((opinion, idx) => {
      const control = (parte, titulo, nodo) => renderCampo(parte, titulo, nodo, opinion, idx);
      return <div key={idx} className="rounded-lg border border-border bg-surface-2/70 p-2 space-y-2" role="group" aria-label={`Opinión ${idx + 1}`}>
        <div className={`grid grid-cols-1 gap-2 ${renderCampo === directo ? 'sm:grid-cols-[1fr_90px_auto]' : ''}`}>
          {control('nombre', 'Nombre del cliente', <input className={campo} aria-label="Nombre del cliente" value={opinion.nombre || ''} maxLength={60} placeholder="Nombre" onChange={e => cambiar(idx, { nombre: e.target.value })} />)}
          {control('estrellas', 'Estrellas', <input className={campo} aria-label="Estrellas" type="number" min="1" max="5" step="0.1" inputMode="decimal" value={opinion.calificacion || 5} onChange={e => cambiar(idx, { calificacion: e.target.value })} />)}
          <button type="button" disabled={subiendo !== null} onClick={() => onCambiar(items.filter((_, i) => i !== idx))} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar</button>
        </div>
        {control('foto', 'Foto de la persona', <div className="grid grid-cols-1 gap-2 sm:grid-cols-[64px_1fr] sm:items-end">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-surface text-[11px] font-semibold text-fg-muted">{opinion.foto ? <img src={getMediaUrl(opinion.foto)} alt="" className="h-full w-full object-cover" loading="lazy" /> : 'Foto'}</div>
          <label className="block text-xs text-fg-muted">Foto de la persona<input className={campo} type="url" value={opinion.foto || ''} maxLength={500} placeholder="https://ejemplo.com/persona.webp" onChange={e => cambiar(idx, { foto: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" disabled={!onSubirImagen || subiendo !== null} onClick={() => inputs.current[idx]?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-primary-text disabled:opacity-50"><Upload size={13} /> {subiendo === idx ? 'Subiendo...' : 'Subir foto'}</button>{opinion.foto && <button type="button" disabled={subiendo !== null} onClick={() => cambiar(idx, { foto: '' })} className="h-9 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:text-danger">Quitar foto</button>}</div>
          <input aria-label={`Archivo de foto de opinión ${idx + 1}`} ref={el => { inputs.current[idx] = el; }} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!onSubirImagen || subiendo !== null} onChange={e => subir(e, idx)} />
        </div>)}
        {control('comentario', 'Comentario', <textarea className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg" aria-label="Comentario" rows={2} maxLength={220} value={opinion.comentario || ''} placeholder="Comentario real del cliente" onChange={e => cambiar(idx, { comentario: e.target.value })} />)}
        {control('detalle', 'Detalle', <input className={campo} aria-label="Detalle" value={opinion.detalle || ''} maxLength={80} placeholder="Ej: Compra verificada" onChange={e => cambiar(idx, { detalle: e.target.value })} />)}
      </div>;
    })}</div>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {!onSubirImagen && <p className="text-xs text-fg-muted">Guardá la landing para habilitar la subida de fotos de opiniones.</p>}
    {items.length < 6 && <button type="button" onClick={() => onCambiar([...items, { nombre: '', comentario: '', detalle: '', calificacion: 5, foto: '' }])} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text">+ Agregar opinión</button>}
  </fieldset>;
}
