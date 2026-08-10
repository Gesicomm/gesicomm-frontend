import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ImagePlus, Loader } from 'lucide-react';
import { renderInput } from './SchemaInspector';
import StarRating from '../StarRating';
import { getMediaUrl } from '../../../services/api';

export default function TestimoniosInspector({ seccion, schema, onUpdate }) {
  const items = seccion.contenido?.items || [];
  const [subiendo, setSubiendo] = useState(null);
  
  const handleUpdateConfig = (key, value) => {
    onUpdate(seccion.id, { config: { ...seccion.config, [key]: value } });
  };
  
  const handleUpdateContenido = (key, value) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  const agregarItem = () => {
    const nuevos = [...items, { nombre: '', calificacion: 5, comentario: '', foto: null }];
    handleUpdateContenido('items', nuevos);
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    handleUpdateContenido('items', nuevos);
  };

  const quitarItem = (idx) => {
    const nuevos = [...items];
    nuevos.splice(idx, 1);
    handleUpdateContenido('items', nuevos);
  };

  const moverItem = (idx, dir) => {
    const nuevos = [...items];
    const target = idx + dir;
    if (target < 0 || target >= nuevos.length) return;
    const temp = nuevos[idx];
    nuevos[idx] = nuevos[target];
    nuevos[target] = temp;
    handleUpdateContenido('items', nuevos);
  };

  // Simulación de subida de foto, en el editor real esto debería llamar a un helper
  // que use fetch/axios y luego devuelva la URL.
  const handleSubirFoto = async (idx, file) => {
    if (!file) return;
    setSubiendo(idx);
    
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      
      const token = localStorage.getItem('token');
      // Subir archivo a endpoint genérico de media
      const res = await fetch('/api/public/v1/media/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        actualizarItem(idx, 'foto', data.url);
      } else {
        alert('Error al subir la imagen');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setSubiendo(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Items */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Opiniones</h4>
        
        <div className="flex flex-col gap-4 mb-3">
          {items.map((t, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)] text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[var(--vit-muted)]">#{idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moverItem(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14}/></button>
                  <button type="button" onClick={() => moverItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14}/></button>
                  <button type="button" onClick={() => quitarItem(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded ml-2"><Trash2 size={14}/></button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-16 h-16 shrink-0 bg-[var(--vit-bg)] rounded overflow-hidden flex items-center justify-center border border-[var(--vit-border)] relative group">
                  {t.foto ? (
                    <>
                      <img src={getMediaUrl(t.foto)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                        <label className="cursor-pointer text-white">
                          <Trash2 size={14} onClick={(e) => { e.preventDefault(); actualizarItem(idx, 'foto', null); }} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer text-[var(--vit-muted)] hover:text-[var(--vit-text)] flex flex-col items-center gap-1 w-full h-full justify-center">
                      {subiendo === idx ? <Loader size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        hidden 
                        onChange={e => handleSubirFoto(idx, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 flex-1">
                  <input 
                    type="text" 
                    placeholder="Nombre del cliente"
                    className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                    value={t.nombre || ''}
                    onChange={e => actualizarItem(idx, 'nombre', e.target.value)}
                  />
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-[var(--vit-muted)]">Calificación:</span>
                     <StarRating value={t.calificacion} onChange={(v) => actualizarItem(idx, 'calificacion', v)} size={14} />
                  </div>
                </div>
              </div>
              
              <textarea 
                placeholder="Lo que dijo tu cliente..."
                rows={3}
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                value={t.comentario || ''}
                onChange={e => actualizarItem(idx, 'comentario', e.target.value)}
              />
            </div>
          ))}
          
          {items.length === 0 && (
            <p className="text-sm text-[var(--vit-muted-2)]">No hay testimonios cargados.</p>
          )}
        </div>
        
        {items.length < 20 && (
          <button 
            type="button" 
            onClick={agregarItem}
            className="lb-btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar testimonio
          </button>
        )}
      </div>

      {/* Diseño General */}
      {schema.settingsSchema.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Diseño</h4>
          <div className="flex flex-col gap-4">
             {schema.settingsSchema.map(campo => (
                <label key={campo.key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[var(--vit-text)]">{campo.label}</span>
                  {renderInput(
                    campo, 
                    ['color_fondo', 'color_texto'].includes(campo.key) ? seccion.config?.[campo.key] : seccion.contenido?.[campo.key], 
                    (key, val) => {
                       if (['color_fondo', 'color_texto'].includes(key)) handleUpdateConfig(key, val);
                       else handleUpdateContenido(key, val);
                    }
                  )}
                </label>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
