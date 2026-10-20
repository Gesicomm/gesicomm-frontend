import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import IconoLibreCombo, { esImagenIcono } from '../IconoLibreCombo';

export default function EmojiOImagenCombo({ valor, onChange, onSubirImagen, numero }) {
  const archivoRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const cambioRef = useRef(onChange);
  cambioRef.current = onChange;
  async function subir(e) {
    const archivo = e.target.files?.[0]; e.target.value = '';
    if (!archivo || !onSubirImagen) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setError('Elegí un ícono JPG, PNG o WEBP de hasta 5 MB.'); return;
    }
    setError(''); setSubiendo(true);
    try { const url = await onSubirImagen(archivo); cambioRef.current(url); }
    catch (err) { setError(err.response?.data?.message || err.message || 'No pudimos subir el ícono. Intentá nuevamente.'); }
    finally { setSubiendo(false); }
  }
  return <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2 text-2xl [&_img]:h-7 [&_img]:w-7 [&_img]:object-contain"><IconoLibreCombo valor={valor} /></div>
      <input aria-label={`Emoji del beneficio ${numero}`} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg"
        value={esImagenIcono(valor) ? '' : valor || ''} disabled={subiendo} placeholder="Escribí o pegá un emoji, ej. ✨" maxLength={80} onChange={e => { setError(''); onChange(e.target.value); }} />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label={`Subir ícono del beneficio ${numero}`} disabled={!onSubirImagen || subiendo} onClick={() => archivoRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-primary-text disabled:opacity-50"><Upload size={13} />{subiendo ? 'Subiendo…' : 'Subir ícono'}</button>
      {valor && <button type="button" aria-label={`Quitar ícono del beneficio ${numero}`} disabled={subiendo} onClick={() => { setError(''); onChange(''); }} className="text-xs text-fg-muted hover:text-danger">Quitar ícono</button>}
      <input ref={archivoRef} aria-label={`Archivo de ícono del beneficio ${numero}`} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={!onSubirImagen || subiendo} onChange={subir} />
    </div>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {!onSubirImagen && <p className="text-xs text-fg-muted">Guardá la landing para habilitar la subida de íconos.</p>}
  </div>;
}
