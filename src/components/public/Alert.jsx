import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

const TONOS = {
  info: {
    contenedor: 'border-info/30 bg-info/8',
    icono: 'text-info',
    Icono: Info,
  },
  exito: {
    contenedor: 'border-success/30 bg-success/8',
    icono: 'text-success',
    Icono: CheckCircle2,
  },
  advertencia: {
    contenedor: 'border-warning/35 bg-warning/8',
    icono: 'text-warning',
    Icono: AlertTriangle,
  },
  peligro: {
    contenedor: 'border-danger/35 bg-danger/8',
    icono: 'text-danger',
    Icono: ShieldAlert,
  },
};

/**
 * Bloque destacado para advertencias legales y confirmaciones.
 *
 * Los tonos advertencia y peligro llevan role="alert" para que un lector de
 * pantalla los anuncie apenas aparecen; info y éxito no, para no interrumpir
 * la lectura de un documento con avisos que son solo contexto.
 */
export default function Alert({ tono = 'info', titulo, children, className = '' }) {
  const { contenedor, icono, Icono } = TONOS[tono];
  const esUrgente = tono === 'advertencia' || tono === 'peligro';

  return (
    <div
      className={`flex gap-3.5 rounded-lg border p-4 ${contenedor} ${className}`}
      {...(esUrgente ? { role: 'alert' } : {})}
    >
      <Icono size={18} className={`mt-0.5 flex-shrink-0 ${icono}`} aria-hidden="true" />
      <div className="min-w-0 text-sm leading-relaxed text-fg-muted">
        {titulo && <p className="mb-1 font-semibold text-fg">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
