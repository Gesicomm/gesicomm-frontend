import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Truck } from 'lucide-react';
import { etiquetaRango, etiquetaTipoPago, etiquetaCobertura, formatGs, etiquetaTiempo } from './vocabulario';

/**
 * Una ciudad de la cobertura.
 *
 * La fila muestra el precio que REALMENTE se cobraría hoy (el que resolvió el
 * motor), y al expandir aparecen todas las reglas que compitieron. Mostrar
 * sólo las reglas sueltas sería engañoso: nunca se cobran todas.
 */
export default function FulfillmentCoverageCity({ opcion }) {
  const [abierto, setAbierto] = useState(false);
  const reglas = opcion.reglas || [];
  const tiempo = etiquetaTiempo(opcion.tiempo_entrega_min_hs, opcion.tiempo_entrega_max_hs)
    || opcion.tiempo_entrega_hs || null;

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left hover:bg-surface-2"
      >
        <span className="text-fg-subtle">
          {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="flex-1 text-sm font-medium text-fg">{opcion.ciudad}</span>
        {opcion.tipo_cobertura && opcion.tipo_cobertura !== 'CIUDAD' && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {etiquetaCobertura(opcion.tipo_cobertura)}
          </span>
        )}
        {tiempo && <span className="text-[12px] text-fg-muted">{tiempo}</span>}
        <span className="text-sm font-semibold text-fg">{formatGs(opcion.costo)}</span>
      </button>

      {abierto && (
        <div className="bg-surface-2/50 px-4 pb-3 pl-11 pt-1">
          <p className="m-0 mb-2 flex items-center gap-1.5 text-[12px] text-fg-muted">
            <Truck size={12} />
            Entrega: {opcion.courier_nombre || 'sin proveedor asignado'}
          </p>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="text-left text-fg-subtle">
                <th className="pb-1 font-semibold">Cantidad</th>
                <th className="pb-1 font-semibold">Método de pago</th>
                <th className="pb-1 text-right font-semibold">Costo</th>
              </tr>
            </thead>
            <tbody>
              {reglas.map((r, i) => (
                <tr key={i} className="text-fg-muted">
                  <td className="py-0.5">{etiquetaRango(r.rango_min, r.rango_max)}</td>
                  <td className="py-0.5">{etiquetaTipoPago(r.tipo_pago)}</td>
                  <td className="py-0.5 text-right text-fg">{formatGs(r.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}
