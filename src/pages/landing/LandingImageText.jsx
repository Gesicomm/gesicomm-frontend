import React from 'react';
import { getMediaUrl } from '../../services/api';

export default function LandingImageText({ seccion }) {
  const { template = 'image_left', config = {}, contenido = {} } = seccion || {};
  const { titulo, texto, boton_texto, boton_link, imagen } = contenido;
  
  // Base classes for the container based on template
  const isImageLeft = template === 'image_left' || template === 'image_large_left';
  const isLarge = template === 'image_large_left' || template === 'image_large_right';
  const isTop = template === 'image_top';
  const isOverlay = template === 'overlay';
  const isSplit = template === 'split_50_50';

  if (isOverlay) {
    return (
      <section 
        className="relative flex items-center justify-center py-24 px-6 overflow-hidden min-h-[400px]"
      >
        {imagen && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getMediaUrl(imagen)})` }}
          />
        )}
        <div className="absolute inset-0 z-10 bg-black/50" />
        
        <div className="relative z-20 max-w-2xl mx-auto text-center">
          {titulo && <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">{titulo}</h2>}
          {texto && <p className="text-lg md:text-xl text-white/90 mb-8 whitespace-pre-wrap">{texto}</p>}
          {boton_texto && (
            <a 
              href={boton_link || '#'} 
              className="inline-block px-8 py-3 rounded bg-white text-black font-semibold hover:bg-gray-100 transition"
              onClick={(e) => { if(!boton_link) e.preventDefault(); }}
            >
              {boton_texto}
            </a>
          )}
        </div>
      </section>
    );
  }

  if (isSplit) {
    return (
      <section className="flex flex-col md:flex-row w-full">
        <div className={`w-full md:w-1/2 flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 ${isImageLeft ? 'md:order-2' : ''}`}>
          {titulo && <h2 className="text-3xl lg:text-4xl font-bold text-[var(--l-text)] mb-6">{titulo}</h2>}
          {texto && <p className="text-lg text-[var(--l-text-muted)] mb-8 whitespace-pre-wrap leading-relaxed">{texto}</p>}
          {boton_texto && (
            <div>
              <a 
                href={boton_link || '#'} 
                className="inline-block px-8 py-3 rounded bg-[var(--l-primary)] text-[var(--l-on-primary)] font-semibold hover:opacity-90 transition shadow-lg"
                onClick={(e) => { if(!boton_link) e.preventDefault(); }}
              >
                {boton_texto}
              </a>
            </div>
          )}
        </div>
        <div className={`w-full md:w-1/2 min-h-[300px] md:min-h-full ${isImageLeft ? 'md:order-1' : ''}`}>
          {imagen ? (
            <img src={getMediaUrl(imagen)} alt={titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--l-surface)] flex items-center justify-center min-h-[300px] text-[var(--l-text-muted)]">
              [Imagen]
            </div>
          )}
        </div>
      </section>
    );
  }

  // Standard layouts (image_left, image_right, image_top)
  return (
    <section className="py-16 md:py-24 px-[var(--l-gutter)]">
      <div className={`max-w-7xl mx-auto flex flex-col ${isTop ? 'items-center text-center' : (isImageLeft ? 'md:flex-row' : 'md:flex-row-reverse')} gap-12 lg:gap-20 items-center`}>
        
        {/* Image Column */}
        <div className={`w-full ${isTop ? 'max-w-4xl mb-8' : (isLarge ? 'md:w-3/5' : 'md:w-1/2')}`}>
          {imagen ? (
            <img src={getMediaUrl(imagen)} alt={titulo} className="w-full h-auto rounded-xl shadow-xl object-cover" />
          ) : (
            <div className="w-full aspect-[4/3] bg-[var(--l-surface)] rounded-xl flex items-center justify-center text-[var(--l-text-muted)] shadow-inner">
              [Imagen]
            </div>
          )}
        </div>

        {/* Text Column */}
        <div className={`w-full ${isTop ? 'max-w-3xl' : (isLarge ? 'md:w-2/5' : 'md:w-1/2')}`}>
          {titulo && <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--l-text)] mb-6 leading-tight">{titulo}</h2>}
          {texto && <p className="text-lg text-[var(--l-text-muted)] mb-8 whitespace-pre-wrap leading-relaxed">{texto}</p>}
          {boton_texto && (
            <a 
              href={boton_link || '#'} 
              className="inline-block px-8 py-3 rounded bg-[var(--l-primary)] text-[var(--l-on-primary)] font-semibold hover:-translate-y-1 hover:shadow-lg transition-all"
              onClick={(e) => { if(!boton_link) e.preventDefault(); }}
            >
              {boton_texto}
            </a>
          )}
        </div>
        
      </div>
    </section>
  );
}
