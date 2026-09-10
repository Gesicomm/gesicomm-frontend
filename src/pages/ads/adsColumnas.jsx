import { Package, Link2 } from 'lucide-react';
import {
  formatPYG, formatNum, formatPct, formatROAS, formatFecha, semaforoROAS,
} from './adsShared';

/**
 * Definición de las columnas de las tablas de Ads & Campañas.
 *
 * Cada columna declara:
 *  - `fija`: no se puede ocultar (identifica la fila).
 *  - `clase`: alineación (las métricas van a la derecha, tabulares).
 *  - `ordenable`: nombre del campo que entiende el backend. Sin esto el
 *    encabezado no es clickeable — el orden lo resuelve el servidor,
 *    porque la tabla está paginada y ordenar solo la página visible daría
 *    un resultado equivocado.
 *  - `direccionInicial`: hacia dónde ordena el primer clic. En métricas se
 *    quiere ver primero lo más alto; en texto, alfabético.
 *
 * Viven acá y no en la vista porque las comparten la tabla de un reporte y
 * el detalle de una campaña.
 */

const alinearDerecha = 'text-right tabular-nums';

export const COLUMNAS_PRODUCTO = [
  { id: 'producto', label: 'Producto', fija: true, ordenable: 'nombre', direccionInicial: 'ASC', render: (m) => (
    <div className="flex items-center gap-2">
      <Package size={14} color="#3d5fa3" className="shrink-0" />
      <span className="text-[0.85rem] font-semibold text-fg">{m.producto?.nombre || `Producto #${m.producto_id}`}</span>
    </div>
  ) },
  { id: 'gasto_ads', label: 'Inversión', clase: alinearDerecha, ordenable: 'gasto_ads', render: (m) => formatPYG(m.gasto_ads) },
  { id: 'pedidos', label: 'Pedidos', clase: alinearDerecha, ordenable: 'pedidos', render: (m) => formatNum(m.pedidos) },
  { id: 'cpa', label: 'CPA', clase: alinearDerecha, ordenable: 'cpa', render: (m) => formatPYG(m.cpa) },
  { id: 'confirmados', label: 'Confirmados', clase: alinearDerecha, ordenable: 'confirmados', render: (m) => formatNum(m.confirmados) },
  { id: 'pct_confirmacion', label: '% Confirmación', clase: alinearDerecha, ordenable: 'pct_confirmacion', render: (m) => formatPct(m.pct_confirmacion) },
  { id: 'cpa_confirmado', label: 'CPA confirmado', clase: alinearDerecha, render: (m) => formatPYG(m.cpa_confirmado) },
  { id: 'entregados', label: 'Entregados', clase: alinearDerecha, ordenable: 'entregados', render: (m) => formatNum(m.entregados) },
  { id: 'pct_entrega', label: '% Entrega', clase: alinearDerecha, ordenable: 'pct_entrega', render: (m) => formatPct(m.pct_entrega) },
  { id: 'cpa_entregado', label: 'CPA entregado', clase: alinearDerecha, render: (m) => formatPYG(m.cpa_entregado) },
  { id: 'costo_producto', label: 'Costo producto', clase: alinearDerecha, render: (m) => formatPYG(m.costo_producto) },
  { id: 'costo_envio', label: 'Costo envío', clase: alinearDerecha, render: (m) => formatPYG(m.costo_envio) },
  { id: 'precio_venta', label: 'Precio venta', clase: alinearDerecha, render: (m) => formatPYG(m.precio_venta) },
  { id: 'facturacion', label: 'Facturación', clase: alinearDerecha, ordenable: 'facturacion', render: (m) => formatPYG(m.facturacion) },
  { id: 'utilidad_bruta', label: 'Utilidad bruta', clase: alinearDerecha, ordenable: 'utilidad_bruta', render: (m) => formatPYG(m.utilidad_bruta) },
  { id: 'margen_bruto', label: 'Margen', clase: alinearDerecha, ordenable: 'margen_bruto', render: (m) => (
    // `null` = sin facturación en el período (margen indefinido, no 0%).
    // Mostrarlo como "0.0%" se confundía con un producto que vendió justo
    // en el punto de equilibrio.
    m.margen_bruto == null ? (
      <span className="text-fg-subtle" title="Sin facturación en el período: el margen no se puede calcular">—</span>
    ) : (
      <span className={m.margen_bruto > 0 ? 'text-success' : m.margen_bruto < 0 ? 'text-danger' : ''}>
        {formatPct(m.margen_bruto * 100)}
      </span>
    )
  ) },
];

export const VISIBLES_PRODUCTO_INICIAL = [
  'gasto_ads', 'pedidos', 'cpa', 'confirmados', 'pct_confirmacion',
  'entregados', 'pct_entrega', 'facturacion', 'utilidad_bruta', 'margen_bruto',
];

export const COLUMNAS_FILA = [
  { id: 'campana', label: 'Campaña (Meta)', fija: true, ordenable: 'nombre_campana_meta', direccionInicial: 'ASC', render: (f) => (
    <div className="flex max-w-[260px] flex-col gap-1">
      <span className="truncate text-[0.82rem] text-fg" title={f.nombre_campana_meta}>{f.nombre_campana_meta}</span>
      {f.campana
        ? <span className="truncate text-[0.7rem] text-fg-subtle">→ {f.campana.nombre_display}</span>
        : <span className="inline-flex items-center gap-1 text-[0.7rem] text-warning"><Link2 size={10} /> sin relacionar</span>}
    </div>
  ) },
  { id: 'fechas', label: 'Período', ordenable: 'fecha_inicio', render: (f) => (
    <span className="whitespace-nowrap text-[0.76rem] text-fg-muted">{formatFecha(f.fecha_inicio)} → {formatFecha(f.fecha_fin)}</span>
  ) },
  { id: 'presupuesto', label: 'Presupuesto', clase: alinearDerecha, render: (f) => (f.presupuesto != null ? formatPYG(f.presupuesto) : '—') },
  { id: 'importe_gastado', label: 'Gasto', clase: alinearDerecha, ordenable: 'importe_gastado', render: (f) => formatPYG(f.importe_gastado) },
  { id: 'resultados', label: 'Resultados', clase: alinearDerecha, render: (f) => formatNum(f.resultados) },
  { id: 'costo_por_resultado', label: 'Costo x res.', clase: alinearDerecha, render: (f) => (f.costo_por_resultado != null ? formatPYG(f.costo_por_resultado) : '—') },
  { id: 'alcance', label: 'Alcance', clase: alinearDerecha, ordenable: 'alcance', render: (f) => formatNum(f.alcance) },
  { id: 'impresiones', label: 'Impresiones', clase: alinearDerecha, ordenable: 'impresiones', render: (f) => formatNum(f.impresiones) },
  { id: 'cpm', label: 'CPM', clase: alinearDerecha, render: (f) => (f.cpm != null ? formatPYG(f.cpm) : '—') },
  { id: 'clics_enlace', label: 'Clics', clase: alinearDerecha, ordenable: 'clics_enlace', render: (f) => formatNum(f.clics_enlace) },
  { id: 'cpc', label: 'CPC', clase: alinearDerecha, render: (f) => (f.cpc != null ? formatPYG(f.cpc) : '—') },
  { id: 'ctr', label: 'CTR', clase: alinearDerecha, ordenable: 'ctr', render: (f) => (f.ctr != null ? formatPct(f.ctr, 2) : '—') },
  { id: 'compras', label: 'Compras', clase: alinearDerecha, ordenable: 'compras', render: (f) => formatNum(f.compras) },
  { id: 'costo_por_compra', label: 'Costo x compra', clase: alinearDerecha, render: (f) => (f.costo_por_compra != null ? formatPYG(f.costo_por_compra) : '—') },
  { id: 'valor_conversion_compras', label: 'Retorno', clase: alinearDerecha, render: (f) => (f.valor_conversion_compras != null ? formatPYG(f.valor_conversion_compras) : '—') },
  { id: 'roas', label: 'ROAS', clase: alinearDerecha, ordenable: 'roas', render: (f) => (
    f.roas != null ? <span style={{ color: semaforoROAS(f.roas).color }}>{formatROAS(f.roas)}</span> : '—'
  ) },
];

export const VISIBLES_FILA_INICIAL = [
  'fechas', 'importe_gastado', 'clics_enlace', 'ctr', 'compras', 'costo_por_compra', 'valor_conversion_compras', 'roas',
];
