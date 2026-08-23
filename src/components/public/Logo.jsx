import { useId } from 'react';

/**
 * Logo de Gesicomm.
 *
 * El símbolo va como SVG inline (no como <img src="/brand/...">) por dos
 * motivos: no depende de una request extra que puede llegar después del
 * primer render, y hereda el color del tema activo. El wordmark va como
 * texto HTML para que use la misma tipografía que ya carga la app — un
 * <text> dentro del SVG dependería de la resolución de fuentes del renderer.
 *
 * La geometría es la misma de public/brand/gesicomm-isotipo.svg; ver BRAND.md.
 */
export default function Logo({ size = 32, conTexto = true, className = '' }) {
  // Los IDs de gradiente son globales al documento: sin useId, dos logos en
  // la misma página (navbar y footer) colisionarían y el segundo pisaría al
  // primero.
  const idGradiente = useId();

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={conTexto ? '' : 'Gesicomm'}
        aria-hidden={conTexto ? 'true' : undefined}
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={idGradiente} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#15295A" />
            <stop offset="1" stopColor="#0B1D3D" />
          </linearGradient>
        </defs>
        <path
          d="M50.79 25.16 A20 20 0 1 0 50.79 38.84 L42 38.84"
          fill="none"
          stroke={`url(#${idGradiente})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="49" cy="49" r="6.5" fill="#FFC107" />
      </svg>

      {conTexto && (
        <span
          className="text-[1.0625rem] font-bold text-fg"
          style={{ letterSpacing: '-0.03em' }}
        >
          Gesicomm
        </span>
      )}
    </span>
  );
}
