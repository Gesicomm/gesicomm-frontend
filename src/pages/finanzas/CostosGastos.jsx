import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Download, Settings, X, Receipt, TrendingDown, TrendingUp,
  Wallet, PiggyBank, Percent, MoreVertical, Calendar, CreditCard, Truck,
  FileText, CheckCircle, Repeat, Package, ChevronLeft, ChevronRight, HelpCircle, Scale,
} from 'lucide-react';
import { costosGastosService, categoriasCostosGastosService, proveedoresService } from '../../services/costosGastosService';
import { formatMoneda } from '../../utils/currency';
import { getMediaUrl } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import ConfirmDialog from '../../components/ConfirmDialog';
import CostoGastoForm from './CostoGastoForm';
import CategoriasConfig from './CategoriasConfig';

const PRESETS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: '3meses', label: 'Últimos 3 meses' },
  { id: 'anio', label: 'Este año' },
  { id: 'personalizado', label: 'Personalizado' },
];

const GRUPO_LABELS = {
  operacion: 'Operación', administracion: 'Administración', marketing: 'Marketing',
  tecnologia: 'Tecnología', financiero: 'Financiero', otros: 'Otros',
};

const FRECUENCIA_LABELS = {
  semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual',
  trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
};

const ESTADO_BADGE = {
  pendiente: 'bg-warning/10 text-warning border-warning/20',
  pagado: 'bg-success/10 text-success border-success/20',
  cancelado: 'bg-danger/10 text-danger border-danger/20',
};

const ESTADO_LABEL = { pendiente: 'Pendiente', pagado: 'Pagado', cancelado: 'Cancelado' };
const TIPO_LABEL = { ingreso: 'Ingreso', costo: 'Costo', gasto: 'Gasto' };
const TIPO_BADGE = {
  ingreso: 'bg-success/10 text-success border-success/20',
  costo: 'bg-info/10 text-info border-info/20',
  gasto: 'bg-primary/10 text-primary-text border-primary/20',
};

const TABS_MOVIMIENTOS = [
  {
    id: 'egresos',
    label: 'Costos y gastos',
    titulo: 'Detalle de costos y gastos',
    descripcion: 'Egresos que alimentan costos variables, gastos fijos y salidas reales de dinero.',
  },
  {
    id: 'ingresos',
    label: 'Ingresos manuales',
    titulo: 'Ingresos cargados manualmente',
    descripcion: 'Entradas registradas fuera de pedidos, como aportes, intereses cobrados u otros ingresos.',
  },
  {
    id: 'todos',
    label: 'Todo junto',
    titulo: 'Detalle de movimientos financieros',
    descripcion: 'Vista completa para auditar ingresos, costos y gastos línea por línea.',
  },
];

function labelTipo(tipo) {
  return TIPO_LABEL[tipo] || tipo || 'Movimiento';
}

function claseTipo(tipo) {
  return TIPO_BADGE[tipo] || 'bg-surface-2 text-fg-muted border-border';
}

function labelEstado(estado, tipo) {
  if (tipo === 'ingreso' && estado === 'pagado') return 'Cobrado';
  return ESTADO_LABEL[estado] || estado || '—';
}

function iso(d) { return d.toLocaleDateString('sv-SE', { timeZone: 'America/Asuncion' }); }

function calcularRangoPeriodo(preset, personalizado) {
  const hoy = new Date();
  switch (preset) {
    case 'hoy': {
      const d = iso(hoy);
      return { fecha_desde: d, fecha_hasta: d };
    }
    case 'semana': {
      const diaSemana = hoy.getDay() || 7;
      const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - diaSemana + 1);
      return { fecha_desde: iso(inicio), fecha_hasta: iso(hoy) };
    }
    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { fecha_desde: iso(inicio), fecha_hasta: iso(hoy) };
    }
    case 'mes_anterior': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { fecha_desde: iso(inicio), fecha_hasta: iso(fin) };
    }
    case '3meses': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
      return { fecha_desde: iso(inicio), fecha_hasta: iso(hoy) };
    }
    case 'anio': {
      const inicio = new Date(hoy.getFullYear(), 0, 1);
      return { fecha_desde: iso(inicio), fecha_hasta: iso(hoy) };
    }
    case 'personalizado':
      return personalizado.fecha_desde && personalizado.fecha_hasta ? personalizado : { fecha_desde: iso(hoy), fecha_hasta: iso(hoy) };
    default:
      return { fecha_desde: null, fecha_hasta: null };
  }
}

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function Badge({ children, className }) {
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${className}`}>{children}</span>;
}

/** Tooltip accesible: botón (no span) para que llegue con Tab y lo anuncie
 * el lector de pantalla; se posiciona con un portal para no quedar cortado
 * por el overflow de las tarjetas. */
function Ayuda({ texto }) {
  const [posicion, setPosicion] = useState(null);
  const botonRef = useRef(null);

  const mostrar = useCallback(() => {
    const rect = botonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ancho = Math.min(260, window.innerWidth - 32);
    const margen = 16;
    const leftCentrado = rect.left + (rect.width / 2) - (ancho / 2);
    setPosicion({
      top: rect.bottom + 8,
      left: Math.max(margen, Math.min(leftCentrado, window.innerWidth - ancho - margen)),
      width: ancho,
    });
  }, []);
  const ocultar = useCallback(() => setPosicion(null), []);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        aria-label={typeof texto === 'string' ? texto : 'Ayuda contextual'}
        className="text-fg-subtle hover:text-fg-muted"
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
      >
        <HelpCircle size={12} aria-hidden="true" />
      </button>
      {posicion && createPortal(
        <span
          role="tooltip"
          className="fixed z-50 rounded-md border border-border bg-surface-3 p-2.5 text-xs leading-snug text-fg shadow-xl"
          style={{ top: posicion.top, left: posicion.left, width: posicion.width }}
        >
          {texto}
        </span>,
        document.body
      )}
    </>
  );
}

function InfoChip({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-fg-subtle">{icon} {label}</div>
      <div className="text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function CardResumen({ icon, label, valor, tono = 'default', sufijo, ayuda }) {
  const tonoClases = {
    default: 'text-fg',
    success: 'text-success',
    danger: 'text-danger',
    primary: 'text-primary-text',
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
        {icon}{label}{ayuda && <Ayuda texto={ayuda} />}
      </div>
      <div className={`text-xl font-bold ${tonoClases[tono]}`}>
        {valor}{sufijo}
      </div>
    </div>
  );
}

/**
 * Balance general del período: cuánto entró, cuánto salió y cuánto queda
 * disponible. Reutiliza el mismo `resumen` del backend (mismos números que
 * las tarjetas de abajo) pero en formato "gané / gasté / me sobra" que es
 * como el usuario piensa su presupuesto, sin tener que interpretar
 * "Resultado" o "Margen".
 */
function PresupuestoGeneral({ resumen }) {
  if (!resumen) return null;
  const ingresos = Number(resumen.ingresos) || 0;
  const egresos = Number(resumen.total_egresos) || 0;
  const saldo = Number(resumen.resultado) || 0;
  const positivo = saldo >= 0;
  const porcentajeGastado = ingresos > 0 ? Math.min(100, Math.round((egresos / ingresos) * 100)) : (egresos > 0 ? 100 : 0);

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Scale size={15} className="text-primary-text" />
        <h2 className="m-0 text-sm font-bold text-fg">Presupuesto general del período</h2>
        <Ayuda texto="Comparación simple entre lo que ingresó (ventas netas de pedidos entregados + otros ingresos registrados) y lo que salió (costos + gastos), para saber de un vistazo cuánto te queda disponible. Usa los mismos datos que las tarjetas de abajo." />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="text-xs text-fg-subtle">Ingresos</div>
            <div className="text-base font-bold text-success">{formatMoneda(ingresos)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <TrendingDown size={16} />
          </div>
          <div>
            <div className="text-xs text-fg-subtle">Egresos</div>
            <div className="text-base font-bold text-danger">{formatMoneda(egresos)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positivo ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            <PiggyBank size={16} />
          </div>
          <div>
            <div className="text-xs text-fg-subtle">{positivo ? 'Resultado positivo' : 'Resultado negativo'}</div>
            <div className={`text-base font-bold ${positivo ? 'text-success' : 'text-danger'}`}>{formatMoneda(Math.abs(saldo))}</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${porcentajeGastado >= 100 ? 'bg-danger' : porcentajeGastado >= 80 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${porcentajeGastado}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">
          {ingresos > 0
            ? `Los egresos equivalen al ${porcentajeGastado}% de los ingresos netos de este período.`
            : 'Todavía no registraste ingresos en este período.'}
        </p>
      </div>
    </div>
  );
}

function formatPct(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return `${Number(valor).toLocaleString('es-PY', { maximumFractionDigits: 1 })}%`;
}

function KpiReporte({ label, value, type = 'money', tone = 'default', icon }) {
  const tonos = {
    default: 'text-fg',
    success: 'text-success',
    danger: 'text-danger',
    primary: 'text-primary-text',
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-subtle">{icon}{label}</div>
      <div className={`text-lg font-bold ${tonos[tone]}`}>{type === 'percent' ? formatPct(value) : formatMoneda(value)}</div>
    </div>
  );
}

function ReporteBloque({ titulo, filas, totalLabel, total, tone = 'default' }) {
  const totalClass = tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-fg';
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-center text-xs font-bold uppercase text-fg">{titulo}</h3>
      <div className="space-y-2">
        {filas.map(fila => (
          <div key={fila.id || fila.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 text-fg-muted">{fila.label}{fila.pendiente ? <span className="ml-1 text-xs text-fg-subtle">(sin módulo)</span> : ''}</span>
            <span className="shrink-0 font-semibold text-fg">{formatMoneda(fila.valor)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm font-bold">
        <span className="text-fg">{totalLabel}</span>
        <span className={totalClass}>{formatMoneda(total)}</span>
      </div>
    </section>
  );
}

function ResultadoOperativo({ resultado }) {
  if (!resultado) return null;
  const positivo = Number(resultado.utilidad_operativa) >= 0;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Ingresos netos</span>
            <strong className="text-fg">{formatMoneda(resultado.ingresos_netos)}</strong>
          </div>
          <div className="my-1 flex items-center justify-between text-sm">
            <span className="text-fg-muted">− Costos variables</span>
            <strong className="text-danger">{formatMoneda(resultado.costos_variables)}</strong>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
            <span>Margen de contribución</span>
            <span className="text-primary-text">{formatMoneda(resultado.margen_contribucion)}</span>
          </div>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Margen de contribución</span>
            <strong className="text-fg">{formatMoneda(resultado.margen_contribucion)}</strong>
          </div>
          <div className="my-1 flex items-center justify-between text-sm">
            <span className="text-fg-muted">− Gastos fijos</span>
            <strong className="text-danger">{formatMoneda(resultado.gastos_fijos)}</strong>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
            <span>Utilidad operativa</span>
            <span className={positivo ? 'text-success' : 'text-danger'}>{formatMoneda(resultado.utilidad_operativa)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <span className="text-fg-muted">Margen neto</span>
        <strong className={positivo ? 'text-success' : 'text-danger'}>{formatPct(resultado.margen_neto)}</strong>
      </div>
    </div>
  );
}

function FlujoCaja({ flujo }) {
  if (!flujo) return null;
  const positivo = Number(flujo.saldo_final_caja) >= 0;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase text-fg">
        <span className="h-px flex-1 bg-border" />
        ↓ Flujo de dinero ↓
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <InfoFlujo label="Saldo inicial de caja" value={flujo.saldo_inicial_caja} />
        <InfoFlujo label="Cobros reales" value={flujo.entradas_reales} tone="success" />
        <InfoFlujo label="Salidas reales" value={flujo.salidas_reales} tone="danger" />
        <InfoFlujo label="Saldo final de caja" value={flujo.saldo_final_caja} tone={positivo ? 'success' : 'danger'} strong />
      </div>
      <p className="mt-3 text-xs text-fg-subtle">UTILIDAD ≠ CAJA. {flujo.nota}</p>
    </div>
  );
}

function InfoFlujo({ label, value, tone = 'default', strong }) {
  const color = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-fg';
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xs text-fg-subtle">{label}</div>
      <div className={`${strong ? 'text-lg' : 'text-base'} font-bold ${color}`}>{formatMoneda(value)}</div>
    </div>
  );
}

function ComparacionPeriodo({ comparacion }) {
  if (!comparacion?.filas?.length) return null;
  const valor = (fila, campo) => fila.tipo === 'porcentaje' ? formatPct(fila[campo]) : formatMoneda(fila[campo]);
  const variacion = (fila) => {
    if (fila.variacion === null) return 'Nuevo';
    const signo = Number(fila.variacion) > 0 ? '+' : '';
    return `${signo}${fila.variacion}${fila.unidad_variacion === 'pp' ? ' pp' : '%'}`;
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="m-0 text-sm font-bold text-fg">Comparación con período anterior</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-2 text-fg-subtle">
            <tr>
              <th className="p-3 text-left font-medium">Indicador</th>
              <th className="p-3 text-right font-medium">Anterior</th>
              <th className="p-3 text-right font-medium">Actual</th>
              <th className="p-3 text-right font-medium">Variación</th>
            </tr>
          </thead>
          <tbody>
            {comparacion.filas.map(fila => (
              <tr key={fila.indicador} className="border-t border-border">
                <td className="p-3 font-medium text-fg">{fila.indicador}</td>
                <td className="p-3 text-right text-fg-muted">{valor(fila, 'anterior')}</td>
                <td className="p-3 text-right font-semibold text-fg">{valor(fila, 'actual')}</td>
                <td className={`p-3 text-right font-bold ${Number(fila.variacion) >= 0 || fila.variacion === null ? 'text-success' : 'text-danger'}`}>{variacion(fila)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteFlujoCajaVisual({ reporte, loading }) {
  if (loading && !reporte) {
    return <div className="mb-6 rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">Construyendo reporte financiero…</div>;
  }
  if (!reporte) return null;

  const ingresos = [
    { id: 'ventas_totales', label: 'Ventas netas', valor: reporte.ingresos.ventas_totales },
    { id: 'ventas_web', label: 'Ventas Web', valor: reporte.ingresos.ventas_web },
    { id: 'ventas_whatsapp', label: 'Ventas WhatsApp', valor: reporte.ingresos.ventas_whatsapp },
    { id: 'ventas_organicas', label: 'Ventas orgánicas', valor: reporte.ingresos.ventas_organicas },
    { id: 'otros_ingresos', label: 'Otros ingresos registrados', valor: reporte.ingresos.otros_ingresos },
    { id: 'devoluciones', label: 'Reembolsos/devoluciones (-)', valor: reporte.ingresos.devoluciones },
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <KpiReporte label="Ingresos netos" value={reporte.indicadores.ventas} icon={<TrendingUp size={14} />} tone="primary" />
        <KpiReporte label="Utilidad neta" value={reporte.indicadores.utilidad_neta} icon={<PiggyBank size={14} />} tone={Number(reporte.indicadores.utilidad_neta) >= 0 ? 'success' : 'danger'} />
        <KpiReporte label="Margen neto" value={reporte.indicadores.margen_neto} type="percent" icon={<Percent size={14} />} tone={Number(reporte.indicadores.margen_neto) >= 0 ? 'success' : 'danger'} />
        <KpiReporte label="Flujo de caja neto" value={reporte.indicadores.flujo_caja_neto} icon={<Wallet size={14} />} tone={Number(reporte.indicadores.flujo_caja_neto) >= 0 ? 'success' : 'danger'} />
        <KpiReporte label="ROI" value={reporte.indicadores.roi} type="percent" icon={<TrendingUp size={14} />} tone={Number(reporte.indicadores.roi) >= 0 ? 'success' : 'danger'} />
        <KpiReporte label="Caja disponible" value={reporte.indicadores.caja_disponible} icon={<PiggyBank size={14} />} tone={Number(reporte.indicadores.caja_disponible) >= 0 ? 'success' : 'danger'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReporteBloque titulo="Ingresos" filas={ingresos} totalLabel="Ingresos netos" total={reporte.ingresos.ingresos_netos} tone="success" />
        <ReporteBloque titulo="Gastos" filas={[...reporte.gastos.costos_variables, ...reporte.gastos.gastos_fijos]} totalLabel="Gastos totales" total={reporte.gastos.gastos_totales} tone="danger" />
      </div>

      <ResultadoOperativo resultado={reporte.resultado_operativo} />
      <FlujoCaja flujo={reporte.flujo_caja} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReporteBloque titulo="Activos" filas={reporte.activos.items} totalLabel="Total activos" total={reporte.activos.total} tone="success" />
        <ReporteBloque titulo="Pasivos" filas={reporte.pasivos.items} totalLabel="Total pasivos" total={reporte.pasivos.total} tone="danger" />
      </div>

      <ComparacionPeriodo comparacion={reporte.comparacion} />
    </div>
  );
}

export default function CostosGastos() {
  const [preset, setPreset] = useState('mes');
  const [personalizado, setPersonalizado] = useState({ fecha_desde: '', fecha_hasta: '' });
  const rango = useMemo(() => calcularRangoPeriodo(preset, personalizado), [preset, personalizado]);

  const [tabMovimientos, setTabMovimientos] = useState('egresos');
  const [filtros, setFiltros] = useState({ tipo: '', categoria_id: '', estado: '', proveedor_id: '', frecuencia: '', metodo_pago_id: '', clasificacion: '' });
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 350);

  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [resumen, setResumen] = useState(null);
  const [reporteFlujoCaja, setReporteFlujoCaja] = useState(null);
  const [loadingReporte, setLoadingReporte] = useState(true);
  const [compararAnterior, setCompararAnterior] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total_paginas: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const cargaRegistrosId = useRef(0);

  const [seleccionado, setSeleccionado] = useState(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const tabActual = useMemo(
    () => TABS_MOVIMIENTOS.find(tab => tab.id === tabMovimientos) || TABS_MOVIMIENTOS[0],
    [tabMovimientos]
  );
  const filtrosConsulta = useMemo(() => {
    const consulta = { ...filtros };
    if (tabMovimientos === 'egresos') consulta.tipo = 'egreso';
    if (tabMovimientos === 'ingresos') {
      consulta.tipo = 'ingreso';
      consulta.proveedor_id = '';
      consulta.clasificacion = '';
    }
    return consulta;
  }, [filtros, tabMovimientos]);
  const registrosMostrados = useMemo(() => {
    if (tabMovimientos === 'ingresos') return registros.filter(r => r.tipo === 'ingreso');
    if (tabMovimientos === 'egresos') return registros.filter(r => r.tipo === 'costo' || r.tipo === 'gasto');
    return registros;
  }, [registros, tabMovimientos]);

  useEffect(() => {
    categoriasCostosGastosService.listar().then(d => setCategorias(d.categorias || [])).catch(console.error);
    proveedoresService.buscar({ limit: 200 }).then(d => setProveedores(d.proveedores || [])).catch(console.error);
  }, []);

  const cargarResumen = useCallback(() => {
    if (!rango.fecha_desde) return;
    costosGastosService.resumen(rango).then(setResumen).catch(console.error);
  }, [rango]);

  const cargarReporteFlujoCaja = useCallback(() => {
    if (!rango.fecha_desde) return;
    setLoadingReporte(true);
    costosGastosService.reporteFlujoCaja({
      ...rango,
      comparar_anterior: compararAnterior ? 'true' : 'false',
    })
      .then(setReporteFlujoCaja)
      .catch(console.error)
      .finally(() => setLoadingReporte(false));
  }, [rango, compararAnterior]);

  const cargarRegistros = useCallback((pagina = 1) => {
    const cargaId = cargaRegistrosId.current + 1;
    cargaRegistrosId.current = cargaId;
    setLoading(true);
    costosGastosService.buscar({ ...rango, ...filtrosConsulta, busqueda: busquedaDebounced, page: pagina, limit: 20 })
      .then(d => {
        if (cargaId !== cargaRegistrosId.current) return;
        setRegistros(d.registros || []);
        setPaginacion({ pagina: d.pagina, total_paginas: d.total_paginas, total: d.total });
      })
      .catch(console.error)
      .finally(() => {
        if (cargaId === cargaRegistrosId.current) setLoading(false);
      });
  }, [rango, filtrosConsulta, busquedaDebounced]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);
  useEffect(() => { cargarReporteFlujoCaja(); }, [cargarReporteFlujoCaja]);
  useEffect(() => { cargarRegistros(1); }, [cargarRegistros]);

  const recargarTodo = () => { cargarResumen(); cargarReporteFlujoCaja(); cargarRegistros(paginacion.pagina); };

  const chipsActivos = useMemo(() => {
    const chips = [];
    if (tabMovimientos === 'todos' && filtros.tipo) chips.push({ key: 'tipo', label: `Tipo: ${labelTipo(filtros.tipo)}` });
    if (filtros.categoria_id) {
      const c = categorias.find(c => String(c.id) === String(filtros.categoria_id));
      chips.push({ key: 'categoria_id', label: `Categoría: ${c?.nombre || filtros.categoria_id}` });
    }
    if (filtros.estado) chips.push({ key: 'estado', label: `Estado: ${ESTADO_LABEL[filtros.estado]}` });
    if (tabMovimientos !== 'ingresos' && filtros.proveedor_id) {
      const p = proveedores.find(p => String(p.id) === String(filtros.proveedor_id));
      chips.push({ key: 'proveedor_id', label: `Proveedor: ${p?.nombre || filtros.proveedor_id}` });
    }
    if (filtros.frecuencia) chips.push({ key: 'frecuencia', label: `Frecuencia: ${FRECUENCIA_LABELS[filtros.frecuencia]}` });
    if (tabMovimientos !== 'ingresos' && filtros.clasificacion) chips.push({ key: 'clasificacion', label: filtros.clasificacion === 'fijo' ? 'Fijo' : 'Variable' });
    return chips;
  }, [filtros, categorias, proveedores, tabMovimientos]);

  const quitarChip = (key) => setFiltros(f => ({ ...f, [key]: '' }));
  const cambiarTabMovimientos = (tabId) => {
    setTabMovimientos(tabId);
    setRegistros([]);
    setPaginacion({ pagina: 1, total_paginas: 1, total: 0 });
    setSeleccionado(null);
  };

  const abrirNuevo = () => { setRegistroEditar(null); setFormAbierto(true); };
  const abrirEditar = (registro) => { setRegistroEditar(registro); setFormAbierto(true); setSeleccionado(null); };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await costosGastosService.eliminar(aEliminar.id);
      setAEliminar(null);
      setSeleccionado(null);
      recargarTodo();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al eliminar el registro.');
    } finally {
      setEliminando(false);
    }
  };

  const marcarPagado = async (registro) => {
    try {
      await costosGastosService.marcarPagado(registro.id, {});
      recargarTodo();
      if (seleccionado?.id === registro.id) {
        const actualizado = await costosGastosService.detalle(registro.id);
        setSeleccionado(actualizado);
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado.');
    }
  };

  const duplicar = async (registro) => {
    try {
      await costosGastosService.duplicar(registro.id);
      recargarTodo();
    } catch (err) {
      console.error(err);
      alert('Error al duplicar el registro.');
    }
  };

  const [exportando, setExportando] = useState(null);
  const [menuExportarAbierto, setMenuExportarAbierto] = useState(false);

  const descargarBlob = (blob, nombreArchivo) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarCSV = () => {
    const encabezado = ['Concepto', 'Tipo', 'Categoría', 'Frecuencia', 'Fecha', 'Importe', 'Estado'];
    const filas = registrosMostrados.map(r => [
      r.concepto, labelTipo(r.tipo), r.categoria?.nombre || '',
      r.es_recurrente ? (FRECUENCIA_LABELS[r.frecuencia] || '') : 'Único',
      formatFecha(r.fecha), r.importe, labelEstado(r.estado, r.tipo),
    ]);
    const csv = [encabezado, ...filas].map(fila => fila.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    descargarBlob(blob, `control-financiero_${tabMovimientos}_${rango.fecha_desde}_${rango.fecha_hasta}.csv`);
    setMenuExportarAbierto(false);
  };

  const exportarReporte = async (formato) => {
    setMenuExportarAbierto(false);
    setExportando(formato);
    try {
      const paramsReporte = { ...rango, comparar_anterior: compararAnterior ? 'true' : 'false' };
      const blob = formato === 'excel'
        ? await costosGastosService.exportarExcel(paramsReporte)
        : await costosGastosService.exportarPdf(paramsReporte);
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      descargarBlob(blob, `reporte-financiero_${rango.fecha_desde}_${rango.fecha_hasta}.${ext}`);
    } catch (err) {
      console.error(err);
      alert(`Error al generar el reporte en ${formato === 'excel' ? 'Excel' : 'PDF'}.`);
    } finally {
      setExportando(null);
    }
  };

  const hayFiltrosOFecha = chipsActivos.length > 0 || busqueda;
  const sinDatosEnAbsoluto = !loading && registrosMostrados.length === 0 && !hayFiltrosOFecha && paginacion.total === 0;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-fg">
            <Receipt className="text-primary-text" size={24} /> Control financiero
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Administra ingresos, costos y gastos para ver cuánto entra, cuánto sale y qué caja queda disponible.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuExportarAbierto(o => !o)}
              disabled={!!exportando}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-60"
            >
              <Download size={14} /> {exportando ? 'Generando…' : 'Exportar'}
            </button>
            {menuExportarAbierto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuExportarAbierto(false)} />
                <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
                  <button type="button" onClick={exportarCSV} className="block w-full px-3 py-2.5 text-left text-sm text-fg hover:bg-surface-2">
                    <div className="font-medium">CSV — registros visibles</div>
                    <div className="text-xs text-fg-subtle">Solo la tabla con los filtros actuales</div>
                  </button>
                  <button type="button" onClick={() => exportarReporte('excel')} className="block w-full border-t border-border px-3 py-2.5 text-left text-sm text-fg hover:bg-surface-2">
                    <div className="font-medium">Excel — reporte financiero completo</div>
                    <div className="text-xs text-fg-subtle">Resumen + todos los gastos e ingresos del período</div>
                  </button>
                  <button type="button" onClick={() => exportarReporte('pdf')} className="block w-full border-t border-border px-3 py-2.5 text-left text-sm text-fg hover:bg-surface-2">
                    <div className="font-medium">PDF — reporte financiero completo</div>
                    <div className="text-xs text-fg-subtle">Resumen + todos los gastos e ingresos del período</div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setConfigAbierta(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Settings size={14} /> Configuración
          </button>
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus size={16} /> Registrar movimiento
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${preset === p.id ? 'border-primary bg-primary/10 text-primary-text' : 'border-border text-fg-muted hover:bg-surface-2 hover:text-fg'}`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'personalizado' && (
            <div className="flex items-center gap-2 pl-2">
              <input type="date" value={personalizado.fecha_desde}
                onChange={e => setPersonalizado(v => ({ ...v, fecha_desde: e.target.value }))}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-fg" />
              <span className="text-xs text-fg-subtle">a</span>
              <input type="date" value={personalizado.fecha_hasta}
                onChange={e => setPersonalizado(v => ({ ...v, fecha_hasta: e.target.value }))}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-fg" />
            </div>
          )}
        </div>
        <label className="flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium text-fg-muted">
          <input
            type="checkbox"
            checked={compararAnterior}
            onChange={e => setCompararAnterior(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Comparar con período anterior
        </label>
      </div>

      <ReporteFlujoCajaVisual reporte={reporteFlujoCaja} loading={loadingReporte} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex rounded-lg border border-border bg-surface p-1">
            {TABS_MOVIMIENTOS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => cambiarTabMovimientos(tab.id)}
                className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${tabMovimientos === tab.id ? 'bg-primary text-white shadow-sm' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <h2 className="m-0 text-base font-bold text-fg">{tabActual.titulo}</h2>
          <p className="m-0 text-sm text-fg-subtle">{tabActual.descripcion}</p>
        </div>
      </div>

      {/* Panel de filtros — siempre visible, sin necesidad de abrirlo */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-4 lg:grid-cols-7">
          <input
            type="text" placeholder="Buscar concepto…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="col-span-2 h-9 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle lg:col-span-1"
          />
          {tabMovimientos === 'todos' && (
            <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
              <option value="">Tipo (todos)</option>
              <option value="ingreso">Ingreso</option>
              <option value="costo">Costo</option>
              <option value="gasto">Gasto</option>
            </select>
          )}
          <select value={filtros.categoria_id} onChange={e => setFiltros(f => ({ ...f, categoria_id: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Categoría (todas)</option>
            {Object.entries(GRUPO_LABELS).map(([grupo, label]) => {
              const opciones = categorias.filter(c => c.grupo === grupo);
              if (opciones.length === 0) return null;
              return (
                <optgroup key={grupo} label={label}>
                  {opciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </optgroup>
              );
            })}
          </select>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Estado (todos)</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {tabMovimientos !== 'ingresos' && (
            <select value={filtros.proveedor_id} onChange={e => setFiltros(f => ({ ...f, proveedor_id: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
              <option value="">Proveedor (todos)</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          )}
          <select value={filtros.frecuencia} onChange={e => setFiltros(f => ({ ...f, frecuencia: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Frecuencia (todas)</option>
            {Object.entries(FRECUENCIA_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {tabMovimientos !== 'ingresos' && (
            <select value={filtros.clasificacion} onChange={e => setFiltros(f => ({ ...f, clasificacion: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
              <option value="">Fijo / Variable</option>
              <option value="fijo">Fijo</option>
              <option value="variable">Variable</option>
            </select>
          )}
      </div>

      {/* Chips de filtros activos */}
      {chipsActivos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chipsActivos.map(chip => (
            <span key={chip.key} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary-text">
              {chip.label}
              <button type="button" onClick={() => quitarChip(chip.key)} className="rounded-full p-0.5 hover:bg-primary/20">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {sinDatosEnAbsoluto ? (
        <EmptyState onRegistrar={abrirNuevo} />
      ) : (
        <div className="flex overflow-hidden rounded-xl border border-border bg-surface">
          {/* Tabla — desktop */}
          <div className={`hidden min-w-0 flex-1 md:block ${seleccionado ? 'border-r border-border' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="p-3 font-medium text-fg-subtle">Concepto</th>
                    <th className="p-3 font-medium text-fg-subtle">Tipo</th>
                    <th className="p-3 font-medium text-fg-subtle">Categoría</th>
                    <th className="p-3 font-medium text-fg-subtle">Frecuencia</th>
                    <th className="p-3 font-medium text-fg-subtle">Fecha</th>
                    <th className="p-3 text-right font-medium text-fg-subtle">Importe</th>
                    <th className="p-3 font-medium text-fg-subtle">Estado</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-fg-muted">Cargando…</td></tr>
                  ) : registrosMostrados.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-fg-muted">No hay registros para estos filtros.</td></tr>
                  ) : registrosMostrados.map(r => (
                    <FilaTabla key={r.id} registro={r} activo={seleccionado?.id === r.id}
                      onClick={() => setSeleccionado(r)}
                      onEditar={() => abrirEditar(r)} onDuplicar={() => duplicar(r)}
                      onMarcarPagado={() => marcarPagado(r)} onEliminar={() => setAEliminar(r)} />
                  ))}
                </tbody>
              </table>
            </div>
            {paginacion.total_paginas > 1 && (
              <div className="flex items-center justify-between border-t border-border p-3">
                <span className="text-xs text-fg-subtle">Página {paginacion.pagina} de {paginacion.total_paginas} ({paginacion.total} registros)</span>
                <div className="flex gap-2">
                  <button disabled={paginacion.pagina === 1} onClick={() => cargarRegistros(paginacion.pagina - 1)} className="rounded border border-border p-1.5 disabled:opacity-40">
                    <ChevronLeft size={14} />
                  </button>
                  <button disabled={paginacion.pagina === paginacion.total_paginas} onClick={() => cargarRegistros(paginacion.pagina + 1)} className="rounded border border-border p-1.5 disabled:opacity-40">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista — mobile */}
          <div className="flex w-full flex-col divide-y divide-border md:hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-fg-muted">Cargando…</div>
            ) : registrosMostrados.length === 0 ? (
              <div className="p-8 text-center text-sm text-fg-muted">No hay registros para estos filtros.</div>
            ) : registrosMostrados.map(r => (
              <button key={r.id} type="button" onClick={() => setSeleccionado(r)} className="flex flex-col gap-1 p-3.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{r.concepto}</span>
                  <span className={`shrink-0 text-sm font-bold ${r.tipo === 'ingreso' ? 'text-success' : 'text-fg'}`}>{formatMoneda(r.importe)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
                  <span>{r.categoria?.nombre || '—'}</span>
                  <span>{formatFecha(r.fecha)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Drawer de detalle */}
          {seleccionado && (
            <DetalleDrawer
              registro={seleccionado}
              onClose={() => setSeleccionado(null)}
              onEditar={() => abrirEditar(seleccionado)}
              onDuplicar={() => duplicar(seleccionado)}
              onMarcarPagado={() => marcarPagado(seleccionado)}
              onEliminar={() => setAEliminar(seleccionado)}
            />
          )}
        </div>
      )}

      {formAbierto && (
        <CostoGastoForm
          registro={registroEditar}
          categorias={categorias}
          proveedores={proveedores}
          onCrearProveedor={async (nombre) => {
            const nuevo = await proveedoresService.crear({ nombre });
            setProveedores(p => [...p, nuevo]);
            return nuevo;
          }}
          onClose={() => setFormAbierto(false)}
          onGuardado={() => { setFormAbierto(false); recargarTodo(); }}
        />
      )}

      {configAbierta && (
        <CategoriasConfig
          categorias={categorias}
          onClose={() => setConfigAbierta(false)}
          onCambio={(cats) => setCategorias(cats)}
        />
      )}

      <ConfirmDialog
        open={!!aEliminar}
        title="¿Eliminar este registro?"
        description={aEliminar ? `"${aEliminar.concepto}" se quitará del listado y de los reportes financieros. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}

function FilaTabla({ registro: r, activo, onClick, onEditar, onDuplicar, onMarcarPagado, onEliminar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuPosicion, setMenuPosicion] = useState({ top: 0, right: 0 });
  const botonMenuRef = useRef(null);

  const alternarMenu = () => {
    const rect = botonMenuRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosicion({
        top: Math.min(rect.bottom + 8, window.innerHeight - 180),
        right: Math.max(window.innerWidth - rect.right, 12),
      });
    }
    setMenuAbierto(o => !o);
  };

  return (
    <tr onClick={onClick} className={`cursor-pointer border-t border-border transition-colors hover:bg-surface-2 ${activo ? 'bg-surface-2' : ''}`}>
      <td className="p-3">
        <div className="font-medium text-fg">{r.concepto}</div>
        {r.proveedor?.nombre && <div className="text-xs text-fg-subtle">{r.proveedor.nombre}</div>}
      </td>
      <td className="p-3">
        <Badge className={claseTipo(r.tipo)}>{labelTipo(r.tipo)}</Badge>
      </td>
      <td className="p-3 text-fg-muted">{r.categoria?.nombre || '—'}</td>
      <td className="p-3 text-fg-muted">
        {r.es_recurrente ? <span className="flex items-center gap-1"><Repeat size={12} /> {FRECUENCIA_LABELS[r.frecuencia]}</span> : 'Único'}
      </td>
      <td className="p-3 text-fg-muted">{formatFecha(r.fecha)}</td>
      <td className={`p-3 text-right font-semibold ${r.tipo === 'ingreso' ? 'text-success' : 'text-fg'}`}>{formatMoneda(r.importe)}</td>
      <td className="p-3"><Badge className={ESTADO_BADGE[r.estado]}>{labelEstado(r.estado, r.tipo)}</Badge></td>
      <td className="relative p-3 text-right" onClick={e => e.stopPropagation()}>
        <button ref={botonMenuRef} type="button" onClick={alternarMenu} className="rounded p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg">
          <MoreVertical size={16} />
        </button>
        {menuAbierto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
            <div
              className="fixed z-20 w-44 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
              style={{ top: menuPosicion.top, right: menuPosicion.right }}
            >
              <MenuItem onClick={() => { setMenuAbierto(false); onEditar(); }}>Editar</MenuItem>
              <MenuItem onClick={() => { setMenuAbierto(false); onDuplicar(); }}>Duplicar</MenuItem>
              {r.estado !== 'pagado' && <MenuItem onClick={() => { setMenuAbierto(false); onMarcarPagado(); }}>{r.tipo === 'ingreso' ? 'Marcar como cobrado' : 'Marcar como pagado'}</MenuItem>}
              <MenuItem danger onClick={() => { setMenuAbierto(false); onEliminar(); }}>Eliminar</MenuItem>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button type="button" onClick={onClick} className={`block w-full px-3 py-2 text-left text-sm ${danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-2'}`}>
      {children}
    </button>
  );
}

function DetalleDrawer({ registro: r, onClose, onEditar, onDuplicar, onMarcarPagado, onEliminar }) {
  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden bg-surface md:w-[400px]">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-2 p-4">
        <div>
          <h3 className="m-0 text-base font-bold text-fg">{r.concepto}</h3>
          <p className="m-0 text-sm text-fg-muted">{formatMoneda(r.importe)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-2 text-fg-muted hover:bg-surface-3 hover:text-fg">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge className={claseTipo(r.tipo)}>{labelTipo(r.tipo)}</Badge>
          <Badge className={ESTADO_BADGE[r.estado]}>{labelEstado(r.estado, r.tipo)}</Badge>
          {r.clasificacion && <Badge className="border-border bg-surface-2 text-fg-muted">{r.clasificacion === 'fijo' ? 'Fijo' : 'Variable'}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoChip icon={<Calendar size={13} />} label="Fecha" value={formatFecha(r.fecha)} />
          <InfoChip icon={<CheckCircle size={13} />} label="Categoría" value={r.categoria?.nombre || '—'} />
          <InfoChip icon={<CreditCard size={13} />} label="Método de pago" value={r.metodo_pago?.nombre || '—'} />
          {r.tipo !== 'ingreso' && <InfoChip icon={<Truck size={13} />} label="Proveedor" value={r.proveedor?.nombre || '—'} />}
        </div>

        {r.producto?.nombre && (
          <div className="mt-3">
            <InfoChip icon={<Package size={13} />} label="Producto asociado" value={r.producto.nombre} />
          </div>
        )}

        {r.descripcion && (
          <div className="mt-4">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Descripción</h4>
            <p className="text-sm text-fg-muted">{r.descripcion}</p>
          </div>
        )}

        {r.es_recurrente && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-text">
              <Repeat size={14} /> Recurrente · {FRECUENCIA_LABELS[r.frecuencia]}
            </div>
            {r.proxima_fecha && <p className="mt-1 text-xs text-fg-muted">Próximo registro: {formatFecha(r.proxima_fecha)}</p>}
          </div>
        )}

        {r.ocurrencias?.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Historial de ocurrencias</h4>
            <div className="flex flex-col gap-1.5">
              {r.ocurrencias.map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
                  <span className="text-fg-muted">{formatFecha(o.fecha)}</span>
                  <span className="font-medium text-fg">{formatMoneda(o.importe)}</span>
                  <Badge className={ESTADO_BADGE[o.estado]}>{labelEstado(o.estado, r.tipo)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {r.comprobante_url && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Comprobante</h4>
            <a href={getMediaUrl(r.comprobante_url)} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg hover:bg-surface-3">
              <FileText size={16} className="text-primary-text" /> {r.comprobante_nombre || 'Ver comprobante'}
            </a>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border p-3">
        {r.estado !== 'pagado' && (
          <button type="button" onClick={onMarcarPagado} className="flex-1 rounded-md bg-success/10 px-3 py-2 text-sm font-semibold text-success hover:bg-success/20">
            {r.tipo === 'ingreso' ? 'Marcar cobrado' : 'Marcar pagado'}
          </button>
        )}
        <button type="button" onClick={onDuplicar} className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
          Duplicar
        </button>
        <button type="button" onClick={onEditar} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
          Editar
        </button>
        <button type="button" onClick={onEliminar} className="rounded-md border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onRegistrar }) {
  const ejemplos = ['Otros ingresos', 'Alquiler', 'Electricidad', 'Salarios', 'Publicidad', 'Software', 'Transporte'];
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-text">
        <Receipt size={26} />
      </div>
      <h3 className="m-0 text-lg font-bold text-fg">Todavía no registraste movimientos financieros</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        Registra otros ingresos, costos y gastos para entender cuánto entra, cuánto sale y cuánto queda disponible.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {ejemplos.map(e => (
          <span key={e} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg-subtle">{e}</span>
        ))}
      </div>
      <button type="button" onClick={onRegistrar} className="mt-6 flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
        <Plus size={16} /> Registrar primer movimiento
      </button>
    </div>
  );
}
