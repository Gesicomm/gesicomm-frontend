/**
 * Logo de Gesicom — círculo abierto, check y punto digital.
 *
 * El wordmark se escribe **Gesicom**, con una sola m. El dominio sigue
 * siendo gesicomm.com (con dos): es una URL, no la marca — no unificar.
 *
 * El círculo hereda el color del tema. Check y punto usan el acento de marca.
 */
export default function Logo({ size = 32, conTexto = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role={conTexto ? undefined : 'img'}
        aria-label={conTexto ? undefined : 'Gesicom'}
        aria-hidden={conTexto ? 'true' : undefined}
        className="flex-shrink-0"
      >
        <path
          d="M62 17 A35 35 0 1 0 81 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          strokeLinecap="butt"
        />
        <path d="M26 52 L42 68 L77 31" fill="none" stroke="var(--color-brand-coral)" strokeWidth="13" strokeLinecap="square" strokeLinejoin="miter" />
        <circle cx="83" cy="18" r="8" fill="var(--color-brand-coral)" />
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
