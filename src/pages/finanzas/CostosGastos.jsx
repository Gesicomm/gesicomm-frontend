import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Filter, Download, Settings, X, Receipt, TrendingDown,
  Wallet, PiggyBank, Percent, MoreVertical, Calendar, CreditCard, Truck,
  FileText, CheckCircle, Repeat, Package, ChevronLeft, ChevronRight,
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

function iso(d) { return d.toISOString().slice(0, 10); }

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

function InfoChip({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-fg-subtle">{icon} {label}</div>
      <div className="text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function CardResumen({ icon, label, valor, tono = 'default', sufijo }) {
  const tonoClases = {
    default: 'text-fg',
    success: 'text-success',
    danger: 'text-danger',
    primary: 'text-primary-text',
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-fg-subtle">
        {icon}{label}
      </div>
      <div className={`text-xl font-bold ${tonoClases[tono]}`}>
        {valor}{sufijo}
      </div>
    </div>
  );
}

export default function CostosGastos() {
  const [preset, setPreset] = useState('mes');
  const [personalizado, setPersonalizado] = useState({ fecha_desde: '', fecha_hasta: '' });
  const rango = useMemo(() => calcularRangoPeriodo(preset, personalizado), [preset, personalizado]);

  const [filtros, setFiltros] = useState({ tipo: '', categoria_id: '', estado: '', proveedor_id: '', frecuencia: '', metodo_pago_id: '', clasificacion: '' });
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 350);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [resumen, setResumen] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total_paginas: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [seleccionado, setSeleccionado] = useState(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    categoriasCostosGastosService.listar().then(d => setCategorias(d.categorias || [])).catch(console.error);
    proveedoresService.buscar({ limit: 200 }).then(d => setProveedores(d.proveedores || [])).catch(console.error);
  }, []);

  const cargarResumen = useCallback(() => {
    if (!rango.fecha_desde) return;
    costosGastosService.resumen(rango).then(setResumen).catch(console.error);
  }, [rango]);

  const cargarRegistros = useCallback((pagina = 1) => {
    setLoading(true);
    costosGastosService.buscar({ ...rango, ...filtros, busqueda: busquedaDebounced, page: pagina, limit: 20 })
      .then(d => {
        setRegistros(d.registros || []);
        setPaginacion({ pagina: d.pagina, total_paginas: d.total_paginas, total: d.total });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rango, filtros, busquedaDebounced]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);
  useEffect(() => { cargarRegistros(1); }, [cargarRegistros]);

  const recargarTodo = () => { cargarResumen(); cargarRegistros(paginacion.pagina); };

  const chipsActivos = useMemo(() => {
    const chips = [];
    if (filtros.tipo) chips.push({ key: 'tipo', label: filtros.tipo === 'costo' ? 'Tipo: Costo' : 'Tipo: Gasto' });
    if (filtros.categoria_id) {
      const c = categorias.find(c => String(c.id) === String(filtros.categoria_id));
      chips.push({ key: 'categoria_id', label: `Categoría: ${c?.nombre || filtros.categoria_id}` });
    }
    if (filtros.estado) chips.push({ key: 'estado', label: `Estado: ${ESTADO_LABEL[filtros.estado]}` });
    if (filtros.proveedor_id) {
      const p = proveedores.find(p => String(p.id) === String(filtros.proveedor_id));
      chips.push({ key: 'proveedor_id', label: `Proveedor: ${p?.nombre || filtros.proveedor_id}` });
    }
    if (filtros.frecuencia) chips.push({ key: 'frecuencia', label: `Frecuencia: ${FRECUENCIA_LABELS[filtros.frecuencia]}` });
    if (filtros.clasificacion) chips.push({ key: 'clasificacion', label: filtros.clasificacion === 'fijo' ? 'Fijo' : 'Variable' });
    return chips;
  }, [filtros, categorias, proveedores]);

  const quitarChip = (key) => setFiltros(f => ({ ...f, [key]: '' }));

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
      alert('Error al marcar como pagado.');
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

  const exportarCSV = () => {
    const encabezado = ['Concepto', 'Tipo', 'Categoría', 'Frecuencia', 'Fecha', 'Importe', 'Estado'];
    const filas = registros.map(r => [
      r.concepto, r.tipo === 'costo' ? 'Costo' : 'Gasto', r.categoria?.nombre || '',
      r.es_recurrente ? (FRECUENCIA_LABELS[r.frecuencia] || '') : 'Único',
      formatFecha(r.fecha), r.importe, ESTADO_LABEL[r.estado],
    ]);
    const csv = [encabezado, ...filas].map(fila => fila.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `costos-gastos_${rango.fecha_desde}_${rango.fecha_hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hayFiltrosOFecha = chipsActivos.length > 0 || busqueda;
  const sinDatosEnAbsoluto = !loading && registros.length === 0 && !hayFiltrosOFecha && paginacion.total === 0;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-fg">
            <Receipt className="text-primary-text" size={24} /> Costos y Gastos
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            Administra los costos y gastos de tu negocio y conoce cuánto realmente cuesta operar y cuánto estás ganando.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(o => !o)}
            className={`flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors ${filtrosAbiertos ? 'bg-primary/10 text-primary-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'}`}
          >
            <Filter size={14} /> Filtros {chipsActivos.length > 0 && `(${chipsActivos.length})`}
          </button>
          <button
            type="button"
            onClick={exportarCSV}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Download size={14} /> Exportar
          </button>
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
            <Plus size={16} /> Registrar costo o gasto
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
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

      {/* Dashboard de resumen */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CardResumen icon={<TrendingDown size={14} />} label="Gastos del período" valor={formatMoneda(resumen?.gastos_periodo)} />
        <CardResumen icon={<Package size={14} />} label="Costos del período" valor={formatMoneda(resumen?.costos_periodo)} />
        <CardResumen icon={<Wallet size={14} />} label="Total egresos" valor={formatMoneda(resumen?.total_egresos)} tono="danger" />
        <CardResumen icon={<PiggyBank size={14} />} label="Resultado" valor={formatMoneda(resumen?.resultado)} tono={Number(resumen?.resultado) >= 0 ? 'success' : 'danger'} />
        <CardResumen icon={<Percent size={14} />} label="Margen" valor={resumen ? resumen.margen : '—'} sufijo={resumen ? '%' : ''} tono={Number(resumen?.margen) >= 0 ? 'success' : 'danger'} />
      </div>

      {/* Panel de filtros */}
      {filtrosAbiertos && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-4 lg:grid-cols-7">
          <input
            type="text" placeholder="Buscar concepto…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="col-span-2 h-9 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle lg:col-span-1"
          />
          <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Tipo (todos)</option>
            <option value="costo">Costo</option>
            <option value="gasto">Gasto</option>
          </select>
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
          <select value={filtros.proveedor_id} onChange={e => setFiltros(f => ({ ...f, proveedor_id: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Proveedor (todos)</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select value={filtros.frecuencia} onChange={e => setFiltros(f => ({ ...f, frecuencia: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Frecuencia (todas)</option>
            {Object.entries(FRECUENCIA_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select value={filtros.clasificacion} onChange={e => setFiltros(f => ({ ...f, clasificacion: e.target.value }))} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg">
            <option value="">Fijo / Variable</option>
            <option value="fijo">Fijo</option>
            <option value="variable">Variable</option>
          </select>
        </div>
      )}

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
                  ) : registros.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-fg-muted">No hay registros para estos filtros.</td></tr>
                  ) : registros.map(r => (
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
            ) : registros.length === 0 ? (
              <div className="p-8 text-center text-sm text-fg-muted">No hay registros para estos filtros.</div>
            ) : registros.map(r => (
              <button key={r.id} type="button" onClick={() => setSeleccionado(r)} className="flex flex-col gap-1 p-3.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{r.concepto}</span>
                  <span className="shrink-0 text-sm font-bold text-fg">{formatMoneda(r.importe)}</span>
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
  return (
    <tr onClick={onClick} className={`cursor-pointer border-t border-border transition-colors hover:bg-surface-2 ${activo ? 'bg-surface-2' : ''}`}>
      <td className="p-3">
        <div className="font-medium text-fg">{r.concepto}</div>
        {r.proveedor?.nombre && <div className="text-xs text-fg-subtle">{r.proveedor.nombre}</div>}
      </td>
      <td className="p-3">
        <Badge className={r.tipo === 'costo' ? 'bg-info/10 text-info border-info/20' : 'bg-primary/10 text-primary-text border-primary/20'}>
          {r.tipo === 'costo' ? 'Costo' : 'Gasto'}
        </Badge>
      </td>
      <td className="p-3 text-fg-muted">{r.categoria?.nombre || '—'}</td>
      <td className="p-3 text-fg-muted">
        {r.es_recurrente ? <span className="flex items-center gap-1"><Repeat size={12} /> {FRECUENCIA_LABELS[r.frecuencia]}</span> : 'Único'}
      </td>
      <td className="p-3 text-fg-muted">{formatFecha(r.fecha)}</td>
      <td className="p-3 text-right font-semibold text-fg">{formatMoneda(r.importe)}</td>
      <td className="p-3"><Badge className={ESTADO_BADGE[r.estado]}>{ESTADO_LABEL[r.estado]}</Badge></td>
      <td className="relative p-3 text-right" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => setMenuAbierto(o => !o)} className="rounded p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg">
          <MoreVertical size={16} />
        </button>
        {menuAbierto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
            <div className="absolute right-3 top-9 z-20 w-44 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
              <MenuItem onClick={() => { setMenuAbierto(false); onEditar(); }}>Editar</MenuItem>
              <MenuItem onClick={() => { setMenuAbierto(false); onDuplicar(); }}>Duplicar</MenuItem>
              {r.estado !== 'pagado' && <MenuItem onClick={() => { setMenuAbierto(false); onMarcarPagado(); }}>Marcar como pagado</MenuItem>}
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
          <Badge className={r.tipo === 'costo' ? 'bg-info/10 text-info border-info/20' : 'bg-primary/10 text-primary-text border-primary/20'}>{r.tipo === 'costo' ? 'Costo' : 'Gasto'}</Badge>
          <Badge className={ESTADO_BADGE[r.estado]}>{ESTADO_LABEL[r.estado]}</Badge>
          {r.clasificacion && <Badge className="border-border bg-surface-2 text-fg-muted">{r.clasificacion === 'fijo' ? 'Fijo' : 'Variable'}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoChip icon={<Calendar size={13} />} label="Fecha" value={formatFecha(r.fecha)} />
          <InfoChip icon={<CheckCircle size={13} />} label="Categoría" value={r.categoria?.nombre || '—'} />
          <InfoChip icon={<CreditCard size={13} />} label="Método de pago" value={r.metodo_pago?.nombre || '—'} />
          <InfoChip icon={<Truck size={13} />} label="Proveedor" value={r.proveedor?.nombre || '—'} />
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
                  <Badge className={ESTADO_BADGE[o.estado]}>{ESTADO_LABEL[o.estado]}</Badge>
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
            Marcar pagado
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
  const ejemplos = ['Alquiler', 'Electricidad', 'Internet', 'Salarios', 'Publicidad', 'Software', 'Transporte'];
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-text">
        <Receipt size={26} />
      </div>
      <h3 className="m-0 text-lg font-bold text-fg">Todavía no registraste ningún costo o gasto</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        Registra servicios, salarios, alquiler, publicidad y otros costos de tu negocio para conocer cuánto realmente estás gastando y ganando.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {ejemplos.map(e => (
          <span key={e} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg-subtle">{e}</span>
        ))}
      </div>
      <button type="button" onClick={onRegistrar} className="mt-6 flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
        <Plus size={16} /> Registrar primer gasto
      </button>
    </div>
  );
}
