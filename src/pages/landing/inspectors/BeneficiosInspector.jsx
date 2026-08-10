import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { BENEFICIOS_ICONS, DEFAULT_BENEFITS } from '../LandingBenefits';


const IconPicker = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const CurrentIcon = BENEFICIOS_ICONS[value] || BENEFICIOS_ICONS['CheckCircle'];
  
  return (
    <div className="relative flex-shrink-0">
      <button 
        type="button"
        className="w-9 h-9 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] flex items-center justify-center hover:border-[var(--vit-accent)] transition-colors"
        onClick={() => setOpen(!open)}
        title="Cambiar icono"
      >
        <CurrentIcon size={18} className="text-[var(--vit-text)]" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-10 left-0 z-50 p-2 bg-[var(--vit-surface)] border border-[var(--vit-border)] rounded-md shadow-lg grid grid-cols-6 gap-1 w-64 max-h-64 overflow-y-auto">
            {Object.keys(BENEFICIOS_ICONS).map(name => {
              const Icon = BENEFICIOS_ICONS[name];
              return (
                <button
                  key={name}
                  type="button"
                  className={`p-1.5 flex items-center justify-center rounded hover:bg-[var(--vit-bg)] transition-colors ${value === name ? 'text-[var(--vit-accent)] bg-[var(--vit-bg)] border border-[var(--vit-border)]' : 'text-[var(--vit-text)]'}`}
                  onClick={() => { onChange(name); setOpen(false); }}
                  title={name}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default function BeneficiosInspector({ seccion, onUpdate }) {
  const beneficios = seccion.contenido?.beneficios || DEFAULT_BENEFITS;

  const handleUpdate = (nuevos) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, beneficios: nuevos } });
  };

  const agregarPaso = () => {
    const nuevos = [...beneficios, { icono: 'CheckCircle', titulo: '', texto: '' }];
    handleUpdate(nuevos);
  };

  const actualizarItem = (idx, campo, valor) => {
    const nuevos = [...beneficios];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    handleUpdate(nuevos);
  };

  const quitarItem = (idx) => {
    const nuevos = [...beneficios];
    nuevos.splice(idx, 1);
    handleUpdate(nuevos);
  };

  const moverItem = (idx, dir) => {
    const nuevos = [...beneficios];
    const target = idx + dir;
    if (target < 0 || target >= nuevos.length) return;
    const temp = nuevos[idx];
    nuevos[idx] = nuevos[target];
    nuevos[target] = temp;
    handleUpdate(nuevos);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider mb-3">Bloques (Máximo 4)</h4>
        
        <div className="flex flex-col gap-3 mb-3">
          {beneficios.map((b, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 rounded border border-[var(--vit-border)] bg-[var(--vit-surface)] text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-[var(--vit-muted)]">Beneficio {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moverItem(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronUp size={14}/></button>
                  <button type="button" onClick={() => moverItem(idx, 1)} disabled={idx === beneficios.length - 1} className="p-1 hover:bg-[var(--vit-bg)] rounded disabled:opacity-30"><ChevronDown size={14}/></button>
                  <button type="button" onClick={() => quitarItem(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded ml-2"><Trash2 size={14}/></button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <IconPicker 
                    value={b.icono} 
                    onChange={(val) => actualizarItem(idx, 'icono', val)} 
                  />
                  <input 
                    type="text"
                    placeholder="Título del beneficio..."
                    className="flex-1 h-9 rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] px-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none font-semibold"
                    value={b.titulo}
                    onChange={e => actualizarItem(idx, 'titulo', e.target.value)}
                  />
                </div>
                
                <textarea 
                  placeholder="Descripción del beneficio..."
                  rows={2}
                  className="w-full rounded-md border border-[var(--vit-border)] bg-[var(--vit-bg)] p-2 text-sm focus:border-[var(--vit-accent)] focus:outline-none"
                  value={b.texto}
                  onChange={e => actualizarItem(idx, 'texto', e.target.value)}
                />
              </div>
            </div>
          ))}
          
          {beneficios.length === 0 && (
            <p className="text-sm text-[var(--vit-muted-2)]">No hay beneficios cargados.</p>
          )}
        </div>
        
        {beneficios.length < 4 && (
          <button 
            type="button" 
            onClick={agregarPaso}
            className="lb-btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar beneficio
          </button>
        )}
      </div>
    </div>
  );
}
