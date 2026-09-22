import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, MapPin, Check } from 'lucide-react';
import { depositoService } from '../../services/deposito.service';

/**
 * Qué couriers pueden despachar desde este depósito.
 *
 * La tarifa NO se define acá: pertenece al courier y su cobertura, y se
 * administra en Pedidos → Delivery. Por eso cada courier muestra cuántas
 * reglas de cobertura tiene: habilitar uno sin cobertura no sirve de nada,
 * y conviene que se vea antes de guardar.
 */
export default function CouriersDepositoModal({ deposito, open, onClose, onGuardado }) {
  const [couriers, setCouriers] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !deposito) return;
    setCargando(true);
    setError(null);
    depositoService.listarCouriersDeposito(deposito.id)
      .then((data) => {
        setCouriers(data.couriers || []);
        setSeleccionados(new Set((data.couriers || []).filter((c) => c.habilitado).map((c) => c.id)));
      })
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar los couriers.'))
      .finally(() => setCargando(false));
  }, [open, deposito]);

  if (!open || !deposito) return null;

  const alternar = (id) => {
    setSeleccionados((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id); else copia.add(id);
      return copia;
    });
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await depositoService.guardarCouriersDeposito(deposito.id, [...seleccionados]);
      onGuardado?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los couriers.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <div>
              <h2 className="m-0 text-lg font-semibold text-fg">Couriers habilitados</h2>
              <p className="m-0 mt-0.5 text-sm text-fg-muted">{deposito.nombre} · {deposito.ciudad}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="m-0 mb-4 text-sm text-fg-muted">
            Elegí con qué couriers se puede despachar desde este depósito. Las ciudades y tarifas de cada
            courier se cargan en <strong>Pedidos → Delivery</strong>.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          )}

          {cargando ? (
            <div className="flex h-24 items-center justify-center text-sm text-fg-muted">Cargando couriers...</div>
          ) : couriers.length === 0 ? (
            <p className="m-0 text-sm text-fg-muted">
              Todavía no tenés couriers cargados. Creá uno en Pedidos → Delivery y volvé acá para habilitarlo.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {couriers.map((c) => {
                const activo = seleccionados.has(c.id);
                const sinCobertura = c.ciudades_cubiertas === 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => alternar(c.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                        activo ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
                      }`}
                    >
                      <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                        activo ? 'border-primary bg-primary' : 'border-fg-muted'
                      }`}>
                        {activo && <Check size={10} className="text-white" />}
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-fg">{c.nombre}</span>
                        </span>
                        <span className={`mt-0.5 flex items-center gap-1 text-[12px] ${sinCobertura ? 'text-warning' : 'text-fg-muted'}`}>
                          <MapPin size={11} />
                          {sinCobertura
                            ? 'Sin ciudades cargadas: no va a poder cotizar envíos'
                            : `${c.ciudades_cubiertas} regla(s) de cobertura`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
          <span className="text-[13px] text-fg-muted">
            {seleccionados.size} de {couriers.length} habilitado(s)
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={guardando} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={guardar} disabled={guardando || cargando} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
