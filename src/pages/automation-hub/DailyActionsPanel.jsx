import React, { useEffect, useState } from 'react';
import { manychatApi } from '../../services/automationHubApi';

const FORMATO_LABEL = { R: 'Video / Reel', C: 'Carrusel', H: 'Historias' };

export default function DailyActionsPanel() {
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setAcciones(await manychatApi.accionesPendientes());
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const vincular = async (item) => {
    setProcesandoId(item.id);
    try {
      await manychatApi.marcarVinculado(item.id);
      await cargar();
    } finally {
      setProcesandoId(null);
    }
  };

  if (cargando) {
    return <div className="p-6 text-center text-sm text-fg-muted">Cargando...</div>;
  }

  if (!acciones.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        No hay vinculaciones de ManyChat pendientes.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {acciones.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-primary">{item.tracking_code}</div>
              <div className="mt-1 text-xs text-fg-muted">
                {FORMATO_LABEL[item.format]} · {item.topic} · CTA: <strong>{item.keyword}</strong>
              </div>
            </div>
            <button
              type="button"
              disabled={procesandoId === item.id}
              onClick={() => vincular(item)}
              className="h-9 shrink-0 rounded-md bg-success/10 px-3 text-xs font-semibold text-success disabled:opacity-60"
            >
              ✓ Vinculación completada
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
