import React from 'react';
import { Warehouse, MapPin, Truck, Coins } from 'lucide-react';

function formatGs(valor) {
  if (valor === null || valor === undefined) return null;
  return `Gs. ${Math.max(0, Math.round(Number(valor) || 0)).toLocaleString('es-PY')}`;
}

function Kpi({ icono: Icono, etiqueta, valor, detalle }) {
  return (
    <div className="flex-1 min-w-[160px] rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-fg-muted">
        <Icono size={15} />
        <span className="text-[11px] font-bold uppercase tracking-wider">{etiqueta}</span>
      </div>
      <p className="m-0 text-2xl font-bold text-fg">{valor}</p>
      {detalle && <p className="m-0 mt-0.5 text-[12px] text-fg-muted">{detalle}</p>}
    </div>
  );
}

/**
 * Indicadores de la red.
 *
 * Deliberadamente NO hay "tarifa promedio": un promedio sobre reglas con
 * rangos y métodos de pago distintos no significa nada. El rango desde/hasta
 * sí es derivable y honesto. Lo mismo con el tiempo: si no hay datos
 * numéricos suficientes se muestra un guion, nunca un plazo inventado.
 */
export default function FulfillmentKpis({ resumen }) {
  if (!resumen) return null;

  const tiempo = resumen.tiempo_min_hs != null
    ? (resumen.tiempo_max_hs && resumen.tiempo_max_hs !== resumen.tiempo_min_hs
      ? `${resumen.tiempo_min_hs}–${resumen.tiempo_max_hs} h`
      : `${resumen.tiempo_min_hs} h`)
    : null;

  return (
    <div className="flex flex-wrap gap-3">
      <Kpi
        icono={Warehouse}
        etiqueta="Centros activos"
        valor={resumen.centros_activos}
        detalle={resumen.centros_totales > resumen.centros_activos
          ? `${resumen.centros_totales} en total`
          : null}
      />
      <Kpi
        icono={MapPin}
        etiqueta="Ciudades cubiertas"
        valor={resumen.ciudades_cubiertas}
        detalle={resumen.departamentos_cubiertos
          ? `${resumen.departamentos_cubiertos} departamento(s)`
          : null}
      />
      <Kpi icono={Truck} etiqueta="Proveedores" valor={resumen.proveedores_activos} detalle="activos" />
      <Kpi
        icono={Coins}
        etiqueta="Tarifas"
        valor={resumen.tarifa_desde != null ? `desde ${formatGs(resumen.tarifa_desde)}` : '—'}
        detalle={[
          resumen.tarifa_hasta != null ? `hasta ${formatGs(resumen.tarifa_hasta)}` : null,
          tiempo ? `entrega ${tiempo}` : null,
        ].filter(Boolean).join(' · ') || null}
      />
    </div>
  );
}
