import React from 'react';

/**
 * Precio ancla (el tachado al lado del precio real) de un producto EN ESTA
 * LANDING. Se guarda en landing_items.precio_ancla: no toca el precio del
 * producto ni el que ese mismo producto muestra en otra página.
 *
 * Vive acá y no dentro de una pantalla porque se carga en dos lugares —el
 * paso de ofertas del wizard de IA y "Configurar venta" del editor— y el
 * mismo dato con dos controles distintos se aprende dos veces.
 */

export const claveItem = item => `${item.tipo}:${item.id}`;

const gs = n => `Gs ${Number(n || 0).toLocaleString('es-PY')}`;

/** Misma cadena que itemPanelARuntime: el catálogo trae varios precios. */
export const precioDeVenta = p =>
  p?.precio_efectivo ?? p?.precio_usuario ?? p?.precio_base ?? p?.precio ?? 0;

export default function PrecioAncla({ venta, valor, onCambiar, id }) {
  const n = Number(String(valor ?? '').replace(/\D/g, '')) || 0;
  const valido = n > venta;
  const pct = valido ? Math.round((1 - venta / n) * 100) : 0;
  const campo = id || `ancla-${venta}`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="text-[12px] text-fg-muted" htmlFor={campo}>Precio tachado</label>
      <input
        id={campo}
        inputMode="numeric"
        value={valor ?? ''}
        onChange={e => onCambiar(e.target.value.replace(/\D/g, ''))}
        placeholder="Opcional"
        className="h-8 w-28 rounded-lg border border-border bg-surface-2 px-2 text-[13px] text-fg tabular-nums placeholder:text-fg-subtle focus:border-primary focus:outline-none"
      />
      {/* El error dice qué hacer, no solo que está mal. */}
      {valor && !valido && (
        <span className="text-[12px] text-warning">Tiene que ser mayor que {gs(venta)}</span>
      )}
      {valido && (
        <span className="text-[12px] font-semibold text-success">
          Se ve <s className="opacity-70">{gs(n)}</s> · −{pct}%
        </span>
      )}
    </div>
  );
}
