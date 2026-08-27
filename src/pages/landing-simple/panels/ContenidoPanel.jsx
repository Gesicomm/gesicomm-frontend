import React, { useRef } from 'react';
import { Image as ImageIcon, X, Loader } from 'lucide-react';

const MAX_IMAGEN_BYTES = 1 * 1024 * 1024;
const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-fg/30';
const LABEL = 'block text-xs font-semibold text-fg/60 mb-1.5';

export default function ContenidoPanel({ draft, onCampo, heroUrl, subiendoHero, onSubirHero, onQuitarHero, error }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGEN_BYTES) {
      onSubirHero(null, 'La imagen supera el máximo permitido de 1MB.');
      return;
    }
    onSubirHero(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL}>Título</label>
        <input type="text" value={draft.banner_titulo || ''} onChange={e => onCampo('banner_titulo', e.target.value)}
          placeholder="Título principal del hero" className={CAMPO} />
      </div>
      <div>
        <label className={LABEL}>Subtítulo</label>
        <textarea value={draft.banner_subtitulo || ''} onChange={e => onCampo('banner_subtitulo', e.target.value)}
          rows={2} placeholder="Bajada breve" className={CAMPO} />
      </div>

      <div>
        <label className={LABEL}>Imagen</label>
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 rounded-lg bg-fg/5 border border-fg/10 flex items-center justify-center overflow-hidden shrink-0">
            {subiendoHero ? <Loader size={16} className="animate-spin text-fg/50" />
              : heroUrl ? <img src={heroUrl} alt="Hero" className="w-full h-full object-cover" />
                : <ImageIcon size={16} className="text-fg/30" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-fg/10 hover:bg-fg/15 text-fg">
              Cambiar imagen
            </button>
            {heroUrl && (
              <button type="button" onClick={onQuitarHero} className="text-xs text-fg/40 hover:text-red-400 flex items-center gap-1">
                <X size={12} /> Quitar
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        </div>
        {heroUrl && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-fg/50">Opacidad de la imagen</span>
              <span className="text-xs text-fg/80">{draft.banner_opacidad !== undefined && draft.banner_opacidad !== null ? draft.banner_opacidad : 30}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={draft.banner_opacidad !== undefined && draft.banner_opacidad !== null ? draft.banner_opacidad : 30}
              onChange={e => onCampo('banner_opacidad', parseInt(e.target.value, 10))}
              className="w-full accent-primary bg-fg/10 rounded-full h-1 appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Texto del CTA</label>
          <input type="text" value={draft.banner_boton_texto || ''} onChange={e => onCampo('banner_boton_texto', e.target.value)}
            placeholder="Comprar ahora" className={CAMPO} />
        </div>
        <div>
          <label className={LABEL}>URL del CTA</label>
          <input type="text" value={draft.banner_boton_link || ''} onChange={e => onCampo('banner_boton_link', e.target.value)}
            placeholder="#productos" className={CAMPO} />
        </div>
      </div>



      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
