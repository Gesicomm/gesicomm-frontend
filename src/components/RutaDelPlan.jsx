import React, { useId } from 'react';
import { accesoDelPlan, NOMBRES_RUTA } from '../lib/rutasPlan';

export default function RutaDelPlan({ plan, value, onChange, disabled = false }) {
  const labelId = useId();
  const acceso = accesoDelPlan(plan);
  if (acceso !== 'elegir') {
    return <p className="pl-aviso text-xs py-1.5 px-3 mb-2">Acceso incluido: <strong>{NOMBRES_RUTA[acceso]}</strong>.</p>;
  }
  return (
    <div className="pl-campo-ruta mb-3">
      <span id={labelId} className="text-xs font-semibold text-muted block mb-1.5">Espacio incluido en tu plan</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={labelId}>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'fisico'}
          onClick={() => onChange('fisico')}
          disabled={disabled}
          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
            value === 'fisico'
              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold'
              : 'border-border bg-surface text-text hover:bg-surface-hover'
          }`}
        >
          <span className="text-base">📦</span>
          <div>
            <strong className="block text-xs leading-tight">E-commerce</strong>
            <small className="text-[11px] text-muted block">Productos físicos</small>
          </div>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'personal'}
          onClick={() => onChange('personal')}
          disabled={disabled}
          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
            value === 'personal'
              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold'
              : 'border-border bg-surface text-text hover:bg-surface-hover'
          }`}
        >
          <span className="text-base">👤</span>
          <div>
            <strong className="block text-xs leading-tight">Marca Personal</strong>
            <small className="text-[11px] text-muted block">Servicios y contenido</small>
          </div>
        </button>
      </div>
    </div>
  );
}
