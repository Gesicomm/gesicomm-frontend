export const ESTADOS_RAHA = {
  pendiente_envio: { label: 'Pendiente de envío a RAHA', color: 'bg-surface-2 text-fg-muted border-border' },
  pendiente_confirmacion: { label: 'Pendiente de confirmación', color: 'bg-warning/10 text-warning-text border-warning/20' },
  cargado: { label: 'Cargado', color: 'bg-info/10 text-info-text border-info/20' },
  en_camino: { label: 'En camino', color: 'bg-primary/10 text-primary-text border-primary/20' },
  entregado: { label: 'Entregado', color: 'bg-success/10 text-success-text border-success/20' },
  devuelto: { label: 'Devuelto', color: 'bg-danger/10 text-danger-text border-danger/20' },
  requiere_revision: { label: 'Requiere revisión', color: 'bg-danger/10 text-danger-text border-danger/20' },
};

export function estadoRaha(estado) {
  return ESTADOS_RAHA[estado] || { label: estado || 'Sin actualización', color: 'bg-surface-2 text-fg-muted border-border' };
}

export function formatGs(valor) {
  return `Gs. ${Math.round(Number(valor) || 0).toLocaleString('es-PY')}`;
}

export function formatFecha(fecha, hora = false) {
  if (!fecha || !Number.isFinite(new Date(fecha).getTime())) return '—';
  return new Date(fecha).toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit',
    month: 'short', year: 'numeric', ...(hora ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
