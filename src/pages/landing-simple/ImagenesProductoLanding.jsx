import React, { useRef, useState } from 'react';
import { Upload, X, Star, RotateCcw } from 'lucide-react';
import { imagenesParaLanding } from './datosRuntime';

export default function ImagenesProductoLanding({ item, onCambiar, onSubirImagen }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const fotos = imagenesParaLanding(item);
  const propia = Array.isArray(item.imagenes_landing);
  function agregarLink() {
    const url = link.trim();
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || url.length > 2048) throw new Error();
    } catch {
      setError('Ingresá un link completo de imagen que empiece con https:// o http://.'); return;
    }
    if (fotos.length >= 10) { setError('Podés mostrar hasta 10 imágenes por producto en esta landing.'); return; }
    if (fotos.includes(url)) { setError('Esta imagen ya está en la galería.'); return; }
    onCambiar('imagenes_landing', [...fotos, url]); setLink(''); setError('');
  }
  async function subir(event) {
    const archivos = Array.from(event.target.files || []);
    event.target.value = '';
    if (!archivos.length || !onSubirImagen) return;
    if (archivos.length + fotos.length > 10) { setError('Podés mostrar hasta 10 imágenes por producto en esta landing.'); return; }
    if (archivos.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024)) {
      setError('Elegí imágenes JPG, PNG o WEBP de hasta 5 MB.'); return;
    }
    setError(''); setSubiendo(true);
    const nuevas = [];
    try {
      for (const archivo of archivos) nuevas.push(await onSubirImagen(archivo));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No pudimos subir las imágenes. Intentá nuevamente.');
    } finally {
      if (nuevas.length) onCambiar('imagenes_landing', [...fotos, ...nuevas]);
      setSubiendo(false);
    }
  }
  return <fieldset className="space-y-3">
    <legend className="mb-2 text-sm font-semibold text-fg">Imágenes de esta landing</legend>
    <p className="text-xs text-fg-muted">La primera foto es la portada. Los cambios se aplican al inicio y la ficha de esta landing; las fotos del catálogo se conservan.</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {fotos.map((url, idx) => <div key={url} className="rounded-xl border border-border bg-surface overflow-hidden">
        <img src={url} alt={`Foto ${idx + 1} de ${item.nombre}`} className="h-24 w-full object-contain bg-white" />
        <div className="p-2 flex items-center justify-between gap-1">
          <button type="button" disabled={subiendo || idx === 0} aria-label={`Usar foto ${idx + 1} como portada`} onClick={() => onCambiar('imagenes_landing', [url, ...fotos.filter(f => f !== url)])} className="inline-flex items-center gap-1 text-xs text-primary-text disabled:text-fg-muted"><Star size={13} />{idx === 0 ? 'Portada' : 'Elegir portada'}</button>
          <button type="button" disabled={subiendo} aria-label={`Quitar foto ${idx + 1} de esta landing`} onClick={() => onCambiar('imagenes_landing', fotos.filter(f => f !== url))} className="p-1 rounded text-fg-muted hover:text-danger"><X size={14} /></button>
        </div>
      </div>)}
    </div>
    <label className="block text-xs text-fg-muted">Agregar imagen por link
      <input type="url" value={link} disabled={subiendo} onChange={e => setLink(e.target.value)} placeholder="https://ejemplo.com/foto.webp" className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg" />
    </label>
    <button type="button" disabled={subiendo || !link.trim() || fotos.length >= 10} onClick={agregarLink} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text disabled:opacity-50">Agregar link</button>
    <p className="text-xs text-fg-muted">Usá un enlace directo a una imagen pública. Los archivos que subís se guardan en el bucket; los links conservan su dirección original.</p>
    {!fotos.length && <p className="text-xs text-fg-muted">Este producto se mostrará sin imágenes en esta landing.</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!onSubirImagen || subiendo || fotos.length >= 10} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary-text disabled:opacity-50"><Upload size={14} />{subiendo ? 'Subiendo imágenes…' : 'Subir imágenes'}</button>
      {propia && <button type="button" disabled={subiendo} onClick={() => onCambiar('imagenes_landing', undefined)} className="inline-flex items-center gap-1 text-xs text-fg-muted"><RotateCcw size={13} />Usar imágenes del catálogo</button>}
    </div>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label={`Subir imágenes de ${item.nombre} para esta landing`} className="sr-only" disabled={!onSubirImagen || subiendo} onChange={subir} />
    <p className="text-xs text-fg-muted">JPG, PNG o WEBP · Hasta 5 MB por foto · Máximo 10 fotos.</p>
    {!onSubirImagen && <p className="text-xs text-fg-muted">Guardá la landing para habilitar la subida de nuevas imágenes.</p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </fieldset>;
}
