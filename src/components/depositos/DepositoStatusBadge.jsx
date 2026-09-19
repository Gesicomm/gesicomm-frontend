import React from 'react';

export default function DepositoStatusBadge({ activo }) {
  if (activo) {
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-fg-muted/10 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
      Inactivo
    </span>
  );
}
