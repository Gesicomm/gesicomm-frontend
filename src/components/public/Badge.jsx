const TONOS = {
  neutro: 'border-border bg-surface-2 text-fg-muted',
  primario: 'border-primary/30 bg-primary/10 text-primary-text',
  exito: 'border-success/30 bg-success/10 text-success',
  advertencia: 'border-warning/30 bg-warning/10 text-warning',
  peligro: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-info/30 bg-info/10 text-info',
};

export default function Badge({ children, tono = 'neutro', icono: Icono, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONOS[tono]} ${className}`}
    >
      {Icono && <Icono size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}
