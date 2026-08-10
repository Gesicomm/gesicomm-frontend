import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { renderInput } from './SchemaInspector';

export default function ComoFuncionaInspector({ seccion, schema, onUpdate }) {
  const pasos = seccion.contenido?.pasos || [];
  
  const handleUpdateConfig = (key, value) => {
    onUpdate(seccion.id, { config: { ...seccion.config, [key]: value } });
  };
  
  const handleUpdateContenido = (key, value) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, [key]: value } });
  };

  const agregarPaso = () => {
    const nuevos = [...pasos, ''];
    handleUpdateContenido('pasos', nuevos);
  };

  const actualizarPaso = (idx, valor) => {
    const nuevos = [...pasos];
    nuevos[idx] = valor;
    handleUpdateContenido('pasos', nuevos);
  };

  const quitarPaso = (idx) => {
    const nuevos = [...pasos];
    nuevos.splice(idx, 1);
    handleUpdateContenido('pasos', nuevos);
  };

  const moverPaso = (idx, dir) => {
    const nuevos = [...pasos];
    const target = idx + dir;
    if (target < 0 || target >= nuevos.length) return;
    const temp = nuevos[idx];
    nuevos[idx] = nuevos[target];
    nuevos[target] = temp;
    handleUpdateContenido('pasos', nuevos);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Pasos */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Pasos</h4>
        
        <div className="flex flex-col gap-2 mb-3">
          {pasos.map((p, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-2 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)] text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--vit-muted)]">Paso {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moverPaso(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14}/></button>
                  <button type="button" onClick={() => moverPaso(idx, 1)} disabled={idx === pasos.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14}/></button>
                  <button type="button" onClick={() => quitarPaso(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded ml-2"><Trash2 size={14}/></button>
                </div>
              </div>
              
              <textarea 
                placeholder="Descripción del paso..."
                rows={2}
                className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                value={p}
                onChange={e => actualizarPaso(idx, e.target.value)}
              />
            </div>
          ))}
          
          {pasos.length === 0 && (
            <p className="text-sm text-[var(--vit-muted-2)]">No hay pasos cargados.</p>
          )}
        </div>
        
        {pasos.length < 10 && (
          <button 
            type="button" 
            onClick={agregarPaso}
            className="lb-btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar paso
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
