import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { renderInput } from './SchemaInspector';

export default function FaqInspector({ seccion, schema, onUpdate }) {
  const items = seccion.contenido?.items || [];
  
  const handleUpdateConfig = (key, value) => {
    onUpdate(seccion.id, { config: { ...seccion.config, [key]: value } });
  };
  
  const handleUpdateContenido = (key, value) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  const agregarFaq = () => {
    const nuevos = [...items, { pregunta: '', respuesta: '' }];
    handleUpdateContenido('items', nuevos);
  };

  const actualizarFaq = (idx, campo, valor) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    handleUpdateContenido('items', nuevos);
  };

  const quitarFaq = (idx) => {
    const nuevos = [...items];
    nuevos.splice(idx, 1);
    handleUpdateContenido('items', nuevos);
  };

  const moverFaq = (idx, dir) => {
    const nuevos = [...items];
    const target = idx + dir;
    if (target < 0 || target >= nuevos.length) return;
    const temp = nuevos[idx];
    nuevos[idx] = nuevos[target];
    nuevos[target] = temp;
    handleUpdateContenido('items', nuevos);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Items FAQ */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Preguntas</h4>
        
        <div className="flex flex-col gap-4 mb-3">
          {items.map((f, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)] text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--vit-muted)]">#{idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moverFaq(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14}/></button>
                  <button type="button" onClick={() => moverFaq(idx, 1)} disabled={idx === items.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14}/></button>
                  <button type="button" onClick={() => quitarFaq(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded ml-2"><Trash2 size={14}/></button>
                </div>
              </div>
              
              <input 
                type="text" 
                placeholder="Pregunta"
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                value={f.pregunta || ''}
                onChange={e => actualizarFaq(idx, 'pregunta', e.target.value)}
              />
              <textarea 
                placeholder="Respuesta"
                rows={3}
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                value={f.respuesta || ''}
                onChange={e => actualizarFaq(idx, 'respuesta', e.target.value)}
              />
            </div>
          ))}
          
          {items.length === 0 && (
            <p className="text-sm text-[var(--vit-muted-2)]">No hay preguntas cargadas.</p>
          )}
        </div>
        
        {items.length < 20 && (
          <button 
            type="button" 
            onClick={agregarFaq}
            className="lb-btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar pregunta
          </button>
        )}
      </div>

      {/* Diseño General */}
      {schema.contentSchema?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Diseño</h4>
          <div className="flex flex-col gap-4">
             {schema.contentSchema.map(campo => (
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
