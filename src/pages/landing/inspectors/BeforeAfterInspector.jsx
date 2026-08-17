import React from 'react';
import { Upload, X, ArrowRight } from 'lucide-react';

export default function BeforeAfterInspector({ seccion, onUpdate, onUploadImagen }) {
  const { 
    imagen_antes = '', 
    imagen_despues = '', 
    etiqueta_antes = 'Antes', 
    etiqueta_despues = 'Despus',
    titulo = '',
    descripcion = ''
  } = seccion.contenido || {};

  const handleUpdate = (key, value) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  const handleUpload = async (key, event) => {
    const file = event.target.files[0];
    if (!file || !onUploadImagen) return;
    try {
      const url = await onUploadImagen(file);
      if (url) {
        handleUpdate(key, url);
      }
    } catch (error) {
      console.error("Error subiendo imagen:", error);
    }
  };

  const renderImageUploader = (key, value, label, etiquetaKey, etiquetaValue) => (
    <div className="space-y-2 p-3 bg-[var(--vit-surface)] rounded-lg border border-[var(--vit-border)]">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--vit-text)]">{label}</label>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={etiquetaValue}
          onChange={(e) => handleUpdate(etiquetaKey, e.target.value)}
          placeholder="Etiqueta (ej: Da 1)"
          className="flex-1 rounded-md border border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-3 py-1.5 text-xs text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)]"
        />
      </div>

      {value ? (
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md border border-[var(--vit-border)] group">
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <button
              onClick={() => handleUpdate(key, '')}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
              title="Eliminar imagen"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <label className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--vit-border)] bg-[var(--vit-card-bg)] py-6 text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(key, e)}
          />
          <Upload size={20} />
          <span className="text-xs font-medium">Subir imagen</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--vit-text)] mb-1">Título de sección</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => handleUpdate('titulo', e.target.value)}
          className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-3 py-2 text-sm text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)]"
          placeholder="Resultados reales"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--vit-text)] mb-1">Descripción (opcional)</label>
        <textarea
          value={descripcion}
          onChange={(e) => handleUpdate('descripcion', e.target.value)}
          className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-3 py-2 text-sm text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)] resize-y min-h-[60px]"
          placeholder="Mir el cambio..."
        />
      </div>

      <div className="pt-2 border-t border-[var(--vit-border)] space-y-4">
        {renderImageUploader('imagen_antes', imagen_antes, 'Imagen Antes', 'etiqueta_antes', etiqueta_antes)}
        
        <div className="flex justify-center text-[var(--vit-muted)]">
          <ArrowRight size={20} />
        </div>

        {renderImageUploader('imagen_despues', imagen_despues, 'Imagen Despus', 'etiqueta_despues', etiqueta_despues)}
      </div>
    </div>
  );
}
