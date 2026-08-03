/**
 * Primitivas de composición del sitio público: ancho de página, ritmo
 * vertical y encabezado de sección. Que estén acá y no repetidas en cada
 * página es lo que mantiene el espaciado consistente entre secciones.
 */

/** Ancho máximo y padding lateral estándar de todo el sitio. */
export function Container({ children, className = '', ancho = 'normal' }) {
  const anchos = {
    estrecho: 'max-w-3xl',
    normal: 'max-w-6xl',
    ancho: 'max-w-7xl',
  };

  return (
    <div className={`mx-auto w-full ${anchos[ancho]} px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

/** Bloque de sección con el ritmo vertical del sitio. */
export function Section({ children, className = '', id, ancho = 'normal', ...resto }) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`} {...resto}>
      <Container ancho={ancho}>{children}</Container>
    </section>
  );
}

/** Etiqueta chica en mayúsculas que antecede al título de sección. */
export function Eyebrow({ children, className = '' }) {
  return (
    <p
      className={`text-xs font-semibold uppercase text-primary ${className}`}
      style={{ letterSpacing: '0.08em' }}
    >
      {children}
    </p>
  );
}

/**
 * Encabezado de sección: eyebrow + título + bajada.
 * `centrado` alinea al medio y acota la medida de la bajada.
 */
export function SectionHeading({ eyebrow, titulo, descripcion, centrado = false, className = '' }) {
  return (
    <div className={`${centrado ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl'} ${className}`}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2
        className="text-3xl font-bold text-fg sm:text-4xl"
        style={{ letterSpacing: '-0.03em' }}
      >
        {titulo}
      </h2>
      {descripcion && (
        <p className="mt-4 text-base leading-relaxed text-fg-muted sm:text-lg">
          {descripcion}
        </p>
      )}
    </div>
  );
}
