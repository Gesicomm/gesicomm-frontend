/**
 * Logo de Gesicom — símbolo "G." + wordmark.
 *
 * El wordmark se escribe **Gesicom**, con una sola m. El dominio sigue
 * siendo gesicomm.com (con dos): es una URL, no la marca — no unificar.
 *
 * El símbolo va como SVG inline (no como <img src="/brand/...">) por dos
 * motivos: no depende de una request extra que puede llegar después del
 * primer render, y hereda el color del tema activo. El wordmark va como
 * texto HTML para que use la misma tipografía que ya carga la app — un
 * <text> dentro del SVG dependería de la resolución de fuentes del renderer.
 *
 * La G hereda el texto del tema y el detalle usa Signal Coral.
 * La geometría del símbolo se conserva en esta etapa de paleta.
 */
export default function Logo({ size = 32, conTexto = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={conTexto ? '' : 'Gesicom'}
        aria-hidden={conTexto ? 'true' : undefined}
        className="flex-shrink-0"
      >
        <path
          d="M48.27 24.31 A18.9 18.9 0 1 0 49.49 35.93 L37 35.93"
          fill="none"
          stroke="currentColor"
          strokeWidth="8.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="49" cy="48.5" r="6.5" fill="var(--color-brand-coral)" />
      </svg>

      {conTexto && (
        <span
          className="text-[1.0625rem] font-bold"
          style={{ letterSpacing: '-0.03em' }}
        >
          Gesicom
        </span>
      )}
    </span>
  );
}
