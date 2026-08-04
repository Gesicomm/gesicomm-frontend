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

/**
 * Etiqueta de campo que antecede al título de sección. Va en mono porque
 * nombra la sección, no la narra: es el rótulo de la carpeta, no su
 * contenido.
 */
export function Eyebrow({ children, className = '' }) {
  return <p className={`etiqueta text-fg-subtle ${className}`}>{children}</p>;
}

/**
 * Encabezado de sección: eyebrow + título + bajada.
 *
 * Alineado a la izquierda por defecto. `centrado` sigue existiendo para las
 * páginas que lo piden explícitamente, pero dejó de ser el comportamiento
 * normal: una página entera centrada no tiene dónde apoyar la lectura.
 */
export function SectionHeading({ eyebrow, titulo, descripcion, centrado = false, className = '' }) {
  return (
    <div className={`${centrado ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <h2 className="titular text-3xl text-fg sm:text-[2.6rem]">{titulo}</h2>
      {descripcion && (
        <p className="mt-5 text-base leading-relaxed text-fg-muted">{descripcion}</p>
      )}
    </div>
  );
}
