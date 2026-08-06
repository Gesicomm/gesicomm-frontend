import React from 'react';
import { Star } from 'lucide-react';

/**
 * 1-5 estrellas, de solo lectura o interactiva (pasando onChange). No fija
 * color propio — hereda `currentColor` del contenedor, así sirve tanto en
 * la landing pública (--l-primary) como en el editor privado (--vit-accent)
 * sin duplicar el componente para cada paleta.
 */
export default function StarRating({ value = 0, size = 14, onChange, label }) {
  const interactiva = typeof onChange === 'function';
  const estrellas = [1, 2, 3, 4, 5];

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactiva ? 'radiogroup' : 'img'}
      aria-label={label || `${value} de 5 estrellas`}
    >
      {estrellas.map((n) => {
        const llena = n <= value;
        const icono = (
          <Star
            size={size}
            fill={llena ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            className={llena ? '' : 'opacity-30'}
          />
        );
        if (!interactiva) return <span key={n}>{icono}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
            onClick={() => onChange(n)}
            className="p-0.5 leading-none cursor-pointer transition-transform hover:scale-110"
          >
            {icono}
          </button>
        );
      })}
    </div>
  );
}
