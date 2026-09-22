import React, { useState } from 'react';
import { Warehouse, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { redFulfillmentService } from '../../services/redFulfillment.service';

/**
 * Primer uso: la red todavía no tiene ningún centro.
 *
 * El centro se DESIGNA, no se adivina. Un depósito pertenece a alguien; que
 * su dueño sea administrador no lo convierte en infraestructura de Gesicomm
 * —hay administradores que además operan su propio comercio—, así que hace
 * falta un acto explícito.
 */
export default function FulfillmentEmptyState({ candidatos = [], onListo }) {
  const [elegido, setElegido] = useState(candidatos[0]?.id ?? null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const designar = async () => {
    if (!elegido) return;
    setGuardando(true);
    setError(null);
    try {
      await redFulfillmentService.designarCentro(elegido);
      onListo?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo designar el centro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Warehouse size={22} />
      </div>
      <h2 className="m-0 text-lg font-semibold text-fg">Configurá la red de Fulfillment de Gesicomm</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">
        Elegí el centro desde donde se van a preparar los pedidos. Después vas a poder sumar
        proveedores logísticos y definir a qué ciudades llegan y cuánto cuesta cada entrega.
      </p>

      {candidatos.length === 0 ? (
        <p className="mx-auto mt-5 max-w-lg rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
          No tenés ningún depósito propio disponible para usar como centro. Creá uno primero
          en Mi tienda → Depósitos.
        </p>
      ) : (
        <>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left">
            {candidatos.map((c) => {
              const activo = elegido === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setElegido(c.id)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                    activo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                    activo ? 'border-primary bg-primary' : 'border-fg-muted'
                  }`}>
                    {activo && <Check size={10} className="text-white" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-fg">{c.nombre}</span>
                    <span className="block text-[12px] text-fg-muted">{c.ciudad}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-md bg-danger/10 px-4 py-3 text-left text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!elegido || guardando}
            onClick={designar}
            className="mx-auto mt-5 flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Configurar centro
            <ArrowRight size={15} />
          </button>
        </>
      )}
    </div>
  );
}
