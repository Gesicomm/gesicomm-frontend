import React from 'react';
import { Warehouse, MapPin, ArrowRight } from 'lucide-react';

export default function FulfillmentCenterCard({ centro, onAbrir }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Warehouse size={18} />
          </span>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              Centro de fulfillment
            </span>
            <h3 className="m-0 text-base font-semibold text-fg">{centro.nombre}</h3>
            <p className="m-0 mt-0.5 flex items-center gap-1 text-[13px] text-fg-muted">
              <MapPin size={12} />
              {[centro.ciudad, centro.departamento].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
          centro.activo
            ? 'bg-success/10 text-success'
            : 'bg-fg-muted/10 text-fg-muted'
        }`}>
          {centro.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {centro.direccion && (
        <p className="m-0 mb-3 text-[13px] text-fg-muted">{centro.direccion}</p>
      )}

      <button
        type="button"
        onClick={() => onAbrir?.(centro)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Ver operación
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
