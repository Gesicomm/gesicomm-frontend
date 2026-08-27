/**
 * Línea de tiempo vertical: pasos numerados unidos por una guía.
 *
 * Se usa para procesos con orden real (cómo se tramita una eliminación de
 * datos, cómo se responde un incidente), por eso el marcado es una lista
 * ordenada: el orden es información, no decoración.
 */
export default function Timeline({ pasos, className = '' }) {
  return (
    <ol className={`relative ${className}`}>
      {pasos.map((paso, indice) => {
        const esUltimo = indice === pasos.length - 1;

        return (
          <li key={paso.titulo} className="relative flex gap-5 pb-8 last:pb-0">
            {/* Guía vertical entre marcadores. aria-hidden porque es la
                representación visual del orden que la <ol> ya comunica. */}
            {!esUltimo && (
              <span
                aria-hidden="true"
                className="absolute left-[1.1875rem] top-10 h-[calc(100%-1.75rem)] w-px bg-border"
              />
            )}

            <span
              aria-hidden="true"
              className="relative z-10 flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary-text"
              style={{ height: '2.375rem', width: '2.375rem' }}
            >
              {indice + 1}
            </span>

            <div className="min-w-0 pt-1.5">
              <h3 className="text-base font-semibold text-fg" style={{ letterSpacing: '-0.02em' }}>
                {paso.titulo}
              </h3>
              {paso.plazo && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  {paso.plazo}
                </p>
              )}
              <div className="mt-2 text-sm leading-relaxed text-fg-muted">{paso.descripcion}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
