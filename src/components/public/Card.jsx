/**
 * Tarjeta del sitio público.
 *
 * `interactiva` agrega el realce en hover; se reserva para tarjetas que son
 * enlaces o abren algo. Una tarjeta puramente informativa que reacciona al
 * mouse promete una interacción que no existe.
 */
export default function Card({ children, className = '', interactiva = false, ...resto }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-6 ${
        interactiva ? 'transition-colors hover:border-border-strong hover:bg-surface-2' : ''
      } ${className}`}
      {...resto}
    >
      {children}
    </div>
  );
}

/**
 * Tarjeta con ícono, título y texto: el patrón de las grillas de
 * características e integraciones.
 */
export function FeatureCard({ icono: Icono, titulo, children, className = '' }) {
  return (
    <Card interactiva className={className}>
      {Icono && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Icono size={19} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold text-fg" style={{ letterSpacing: '-0.02em' }}>
        {titulo}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>
    </Card>
  );
}
