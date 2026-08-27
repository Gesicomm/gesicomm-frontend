import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal de confirmación reutilizable — reemplaza window.confirm() nativo
 * en cualquier acción destructiva o irreversible del panel admin.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary-text'}`}>
          <AlertTriangle size={18} />
        </div>
        <h3 id="confirm-dialog-title" className="m-0 mt-4 text-base font-semibold text-fg">
          {title}
        </h3>
        {description && (
          <p className="m-0 mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-3.5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
