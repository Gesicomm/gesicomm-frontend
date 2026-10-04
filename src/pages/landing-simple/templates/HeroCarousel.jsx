import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function imagenesHero(hero = {}) {
  const lista = Array.isArray(hero.imagenes) ? hero.imagenes : [];
  const resueltas = lista.filter(Boolean);
  if (resueltas.length) return resueltas.slice(0, 5);
  return hero.imagen ? [hero.imagen] : [];
}

export default function HeroCarousel({
  hero,
  alt = '',
  className = '',
  imageClassName = 'w-full h-full object-cover',
  style = {},
  imageOpacity = 1,
  showControls = true,
}) {
  const imagenes = useMemo(() => imagenesHero(hero), [hero]);
  const [activa, setActiva] = useState(0);
  const total = imagenes.length;

  useEffect(() => {
    setActiva(0);
  }, [imagenes.join('|')]);

  useEffect(() => {
    if (total <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiva(i => (i + 1) % total);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [total]);

  if (!total) return null;

  const irA = (indice) => setActiva((indice + total) % total);

  return (
    <div className={`gc-hero-carousel ${className}`} style={style}>
      {imagenes.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={i === activa ? alt : ''}
          aria-hidden={i !== activa}
          className={`${imageClassName} absolute inset-0 transition-opacity duration-700 ease-out ${i === activa ? 'opacity-100' : 'opacity-0'}`}
          style={{ opacity: i === activa ? imageOpacity : 0 }}
        />
      ))}
      {showControls && total > 1 && (
        <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-3 pointer-events-none">
          <button
            type="button"
            className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
            onClick={() => irA(activa - 1)}
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
            {imagenes.map((src, i) => (
              <button
                key={`dot-${src}-${i}`}
                type="button"
                className={`h-1.5 rounded-full transition-all ${i === activa ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}
                onClick={() => irA(i)}
                aria-label={`Ver imagen ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
            onClick={() => irA(activa + 1)}
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
