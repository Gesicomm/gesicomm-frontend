import React, { useRef } from 'react';
import { Image as ImageIcon, X, Loader } from 'lucide-react';

const MAX_IMAGEN_BYTES = 1 * 1024 * 1024;

export default function MarcaPanel({ draft, onCampo, logoUrl, subiendoLogo, onSubirLogo, onQuitarLogo, error }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGEN_BYTES) {
      onSubirLogo(null, 'El logo supera el máximo permitido de 1MB.');
      return;
    }
    onSubirLogo(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">Logo</label>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-gray-100 border border-fg/10 flex items-center justify-center overflow-hidden shrink-0">
            {subiendoLogo ? <Loader size={18} className="animate-spin text-fg/50" />
              : logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                : <ImageIcon size={18} className="text-fg/30" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg">
              Cambiar imagen
            </button>
            {logoUrl && (
              <button type="button" onClick={onQuitarLogo} className="text-xs text-fg/40 hover:text-red-400 flex items-center gap-1">
                <X size={12} /> Quitar
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg/60 mb-1.5">Nombre del comercio</label>
        <input
          type="text"
          value={draft.titulo || ''}
          onChange={e => onCampo('titulo', e.target.value)}
          placeholder="Ej: Fuerza Gym"
          className="w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
