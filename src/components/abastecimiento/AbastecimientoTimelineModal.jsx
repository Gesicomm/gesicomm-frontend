import React from 'react';
import { X, History } from 'lucide-react';
import AbastecimientoTimeline from './AbastecimientoTimeline';

/** Misma línea de tiempo que se muestra inline en la tabla, pero en modal. */
export default function AbastecimientoTimelineModal({ envio, open, onClose, esAdmin = false, onConfirmarRecepcion = null }) {
  if (!open || !envio) return null;

  const esFinal = envio.abastecimiento_estado === 'recibido_en_deposito_cliente'
    || envio.abastecimiento_estado === 'disponible_en_gesicomm';

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                {esFinal ? 'Finalizado' : 'Seguimiento de abastecimiento'}
              </span>
              <h2 className="m-0 text-lg font-semibold text-fg">Pedido #{envio.numero_pedido || envio.id}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AbastecimientoTimeline
            envio={envio}
            esAdmin={esAdmin}
            onConfirmarRecepcion={onConfirmarRecepcion ? (e) => { onConfirmarRecepcion(e); onClose?.(); } : null}
          />
        </div>
      </div>
    </div>
  );
}
