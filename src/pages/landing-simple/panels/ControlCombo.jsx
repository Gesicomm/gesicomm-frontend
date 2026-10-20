import React, { createContext, useContext } from 'react';

export const ContextoControlCombo = createContext(null);

// Etiqueta, valor y visibilidad forman una sola unidad del inspector.
export default function ControlCombo({ label, parte, children, mostrar, onMostrar, disabled = false }) {
  const control = useContext(ContextoControlCombo);
  return <div data-combo-campo={parte || undefined} className="space-y-1.5">
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold text-fg-muted">{label}</span>
      {parte && control && <label className="inline-flex shrink-0 items-center gap-1.5 text-xs text-fg-muted cursor-pointer">
        <input type="checkbox" disabled={disabled} className="accent-primary disabled:opacity-40" aria-label={`Mostrar ${control.nombres?.[parte] || label}`}
          checked={mostrar ?? control.partes?.[parte] !== false} onChange={e => onMostrar ? onMostrar(e.target.checked) : control.cambiar(parte, e.target.checked)} />Mostrar
      </label>}
    </div>
    {children}
  </div>;
}

export function ChecksCombo({ partes }) {
  return <div className="grid gap-3">{partes.map(([parte, label]) => <ControlCombo key={parte} parte={parte} label={label} />)}</div>;
}
