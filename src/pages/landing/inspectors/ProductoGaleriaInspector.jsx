import React, { useState } from 'react';
import { Trash2, ImagePlus, Loader, ChevronUp, ChevronDown } from 'lucide-react';
import { getMediaUrl } from '../../../services/api';

/**
 * Inspector de "Galería de producto" — a diferencia de las fotos del
 * producto en el catálogo (que son las mismas para toda la tienda), acá
 * se suben imágenes propias de ESTA sección/ESTE producto. Vacío = usa
 * las del catálogo (ver ProductoGaleriaBlock.jsx).
 */
export default function ProductoGaleriaInspector({ seccion, onUpdate, onUploadImagen }) {
  const contenido = seccion.contenido || {};
  const imagenes = contenido.imagenes || [];
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  const actualizarImagenes = (nuevas) => {
    onUpdate(seccion.id, { contenido: { ...contenido, imagenes: nuevas } });
  };

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadImagen) return;
    setSubiendo(true);
    setError(null);
    try {
      const url = await onUploadImagen(file);
      actualizarImagenes([...imagenes, url]);
    } catch (err) {
      setError(err.message || 'Error al subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  const quitar = (idx) => actualizarImagenes(imagenes.filter((_, i) => i !== idx));
  const mover = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= imagenes.length) return;
    const nuevas = [...imagenes];
    [nuevas[idx], nuevas[target]] = [nuevas[target], nuevas[idx]];
    actualizarImagenes(nuevas);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-2">Imágenes de esta sección</h4>
        <p className="text-xs text-[var(--vit-muted-2)] mb-3">
          Si no subís ninguna, se muestran las fotos del producto del catálogo. Subiendo acá, estas reemplazan a esas SOLO en esta sección.
        </p>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <div className="flex flex-col gap-2 mb-3">
          {imagenes.map((url, idx) => (
            <div key={url + idx} className="relative group flex items-center gap-2 p-2 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)]">
              <img src={getMediaUrl(url)} alt="" className="w-14 h-14 object-cover rounded" />
              <span className="flex-1 text-xs text-[var(--vit-muted)] truncate">Imagen {idx + 1}</span>
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === imagenes.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14} /></button>
              <button type="button" onClick={() => quitar(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <label className="lb-btn-secondary flex items-center justify-center gap-2 cursor-pointer w-full">
          {subiendo ? <Loader size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {subiendo ? 'Subiendo...' : 'Agregar imagen'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={subiendo} onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}
