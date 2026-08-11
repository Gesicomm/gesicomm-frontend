import React, { useState, useRef, useEffect } from 'react';
import { getMediaUrl } from '../../services/api';


export default function LandingBeforeAfter({ seccion }) {
  const { config = {}, contenido = {} } = seccion || {};
  
  
  const { 
    imagen_antes, 
    imagen_despues, 
    etiqueta_antes = 'Antes', 
    etiqueta_despues = 'Despus',
    titulo,
    descripcion
  } = contenido;

  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    
    // Support for both mouse and touch events
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseDown = () => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  if (!imagen_antes && !imagen_despues) return null;

  return (
    <section className={` py-16`}>
      <div className="mx-auto max-w-4xl px-4 text-center">
        {titulo && (
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--l-text)]">{titulo}</h2>
        )}
        {descripcion && (
          <p className="mb-10 text-lg text-[var(--l-text-muted)] max-w-2xl mx-auto">{descripcion}</p>
        )}
        
        <div 
          ref={containerRef}
          className="relative w-full aspect-square md:aspect-video overflow-hidden rounded-2xl select-none group touch-none shadow-2xl"
          onMouseMove={(e) => { if (e.buttons === 1) handleMove(e); }}
          onTouchMove={handleMove}
        >
          {/* Imagen Antes (Base) */}
          <div className="absolute inset-0 w-full h-full">
            {imagen_antes ? (
              <img src={imagen_antes ? getMediaUrl(imagen_antes) : ""} alt={etiqueta_antes} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full bg-[var(--l-bg-alt)] flex items-center justify-center text-[var(--l-text-muted)]">Falta imagen Antes</div>
            )}
            <span className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm">{etiqueta_antes}</span>
          </div>
          
          {/* Imagen Despus (Clipper) */}
          <div 
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
          >
            {imagen_despues ? (
              <img src={imagen_despues ? getMediaUrl(imagen_despues) : ""} alt={etiqueta_despues} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full bg-[var(--l-bg)] flex items-center justify-center text-[var(--l-text-muted)]">Falta imagen Despus</div>
            )}
            <span className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm">{etiqueta_despues}</span>
          </div>

          {/* Slider Thumb */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize hover:bg-[var(--l-primary)] transition-colors duration-150 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            style={{ left: `calc(${sliderPosition}% - 2px)` }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <path d="M15 18l-6-6 6-6" />
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
