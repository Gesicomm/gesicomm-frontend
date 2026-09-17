import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, ShoppingCart, TrendingUp, Search,
  Package, DollarSign, LayoutList, Table2, Layers, Users, XCircle, ArrowUp, ArrowDown
} from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import VistaPedidos from '../../../reportes/VistaPedidos';
import VistaItems from '../../../reportes/VistaItems';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

function resolverRango(filters) {
  const hoy = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (filters.periodo === 'personalizado_rango') {
    return { fecha_desde: filters.fecha_desde || '', fecha_hasta: filters.fecha_hasta || '' };
  }

  if (filters.periodo === 'personalizado_mes' && filters.mes) {
    const anio = filters.anio || hoy.getFullYear();
    const m = parseInt(filters.mes, 10);
    const desde = new Date(anio, m - 1, 1);
    const hasta = new Date(anio, m, 0);
    return { fecha_desde: fmt(desde), fecha_hasta: fmt(hasta) };
  }

  const anio = filters.anio || hoy.getFullYear();

  switch (filters.periodo) {
    case 'hoy': {
      const s = fmt(hoy); return { fecha_desde: s, fecha_hasta: s };
    }
    case 'ayer': {
      const a = new Date(hoy); a.setDate(a.getDate() - 1);
      const s = fmt(a); return { fecha_desde: s, fecha_hasta: s };
    }
    case '7d': {
      const d = new Date(hoy); d.setDate(d.getDate() - 6);
      return { fecha_desde: fmt(d), fecha_hasta: fmt(hoy) };
    }
    case '30d': {
      const d = new Date(hoy); d.setDate(d.getDate() - 29);
      return { fecha_desde: fmt(d), fecha_hasta: fmt(hoy) };
    }
    case 'mes_anterior': {
      const prevM = hoy.getMonth() === 0 ? 12 : hoy.getMonth();
      const prevY = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
      return { fecha_desde: fmt(new Date(prevY, prevM - 1, 1)), fecha_hasta: fmt(new Date(prevY, prevM, 0)) };
    }
    case 'este_anio':
      return { fecha_desde: `${anio}-01-01`, fecha_hasta: `${anio}-12-31` };
    case 'este_mes':
    default: {
      return { fecha_desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fecha_hasta: fmt(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
    }
  }
}

export function ReporteVentas({ filters }) {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [kpisData, setKpisData] = useState(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [evolucionData, setEvolucionData] = useState([]);
  const [localSearch, setLocalSearch] = useState('');
  const [buscadorActivo, setBuscadorActivo] = useState('');

  const rango = useMemo(() => resolverRango(filters), [
    filters.periodo, filters.mes, filters.anio, filters.fecha_desde, filters.fecha_hasta,
  ]);

  const filtrosVista = useMemo(() => ({
    fecha_desde: rango.fecha_desde,
    fecha_hasta: rango.fecha_hasta,
    buscador: buscadorActivo,
    confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
    courier_id: filters.courierId !== 'TODOS' ? filters.courierId : '',
    canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : '',
    estado: filters.estado !== 'TODOS' ? filters.estado : '',
    producto_id: filters.producto_id !== 'TODOS' ? filters.producto_id : '',
    metodo_pago: filters.metodo_pago !== 'TODOS' ? filters.metodo_pago : '',
    ciudad: filters.ciudad || '',
  }), [rango, buscadorActivo, filters.confirmador, filters.courierId, filters.canal_venta_id, filters.estado, filters.producto_id, filters.metodo_pago, filters.ciudad]);

  const filtrosKpis = useMemo(() => ({
    fecha_desde: rango.fecha_desde,
    fecha_hasta: rango.fecha_hasta,
    confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
    courier_id: filters.courierId !== 'TODOS' ? filters.courierId : '',
    canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : '',
    estado: filters.estado !== 'TODOS' ? filters.estado : '',
    producto_id: filters.producto_id !== 'TODOS' ? filters.producto_id : '',
    metodo_pago: filters.metodo_pago !== 'TODOS' ? filters.metodo_pago : '',
    ciudad: filters.ciudad || '',
  }), [rango, filters.confirmador, filters.courierId, filters.canal_venta_id, filters.estado, filters.producto_id, filters.metodo_pago, filters.ciudad]);

  useEffect(() => {
    cargarDatos();
  }, [filtrosKpis]);

  const cargarDatos = async () => {
    try {
      setLoadingKpis(true);
      const [kpiRes, evoRes] = await Promise.all([
        reportesService.obtenerKPIs(filtrosKpis),
        reportesService.obtenerEvolucionVentas(filtrosKpis)
      ]);
      setKpisData(kpiRes);
      setEvolucionData(evoRes);
    } catch (err) {
      console.error('Error cargando KPIs o evolución:', err);
    } finally {
      setLoadingKpis(false);
    }
  };

  const aplicarBusqueda = e => {
    e.preventDefault();
    setBuscadorActivo(localSearch);
  };

  const actual = kpisData?.actual || {};
  const varis = kpisData?.variaciones || {};

  return (
    <div className="flex flex-col gap-6 mt-4 pb-8" style={{ minHeight: 'calc(100vh - 200px)' }}>

      {/* HEADER LOCAL & BUSCADOR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-fg flex items-center gap-2">
            <ShoppingCart className="text-[var(--color-primary-text)]" size={20} />
            Overview de Ventas
          </h2>
          <p className="text-sm text-fg-muted">
            {rango.fecha_desde && rango.fecha_hasta
              ? `${rango.fecha_desde.split('-').reverse().join('/')} — ${rango.fecha_hasta.split('-').reverse().join('/')}`
              : 'Período actual'}
          </p>
        </div>

        <form onSubmit={aplicarBusqueda} className="flex flex-wrap items-center gap-2 bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] p-2 rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] shadow-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              placeholder="Buscar cliente, tel, #pedido..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-canvas border border-[color-mix(in_srgb,_var(--color-fg)_10%,_transparent)] rounded-lg text-sm w-[250px] focus:outline-none focus:border-[var(--color-primary)] text-fg"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-fg font-semibold rounded-lg text-sm hover:bg-primary-hover transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* KPIS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 shrink-0">
        <KpiCard 
          icon={<DollarSign size={20} />} 
          title="Ventas Netas" 
          value={loadingKpis ? '…' : formatPrecio(actual.ventas_netas)} 
          color="text-green-400" 
          variacion={varis.ventas_netas} 
        />
        <KpiCard 
          icon={<ShoppingBag size={20} />} 
          title="Pedidos" 
          value={loadingKpis ? '…' : actual.pedidos} 
          color="text-[var(--color-primary-text)]" 
          variacion={varis.pedidos}
          subtext={loadingKpis ? null : `${actual.desglose_pedidos?.entregados} entregados · ${actual.desglose_pedidos?.pendientes} pendientes`}
        />
        <KpiCard 
          icon={<TrendingUp size={20} />} 
          title="Ticket Promedio" 
          value={loadingKpis ? '…' : formatPrecio(actual.ticket_promedio)} 
          color="text-[var(--color-accent-text)]" 
          variacion={varis.ticket_promedio} 
        />
        <KpiCard 
          icon={<Package size={20} />} 
          title="Unidades Vendidas" 
          value={loadingKpis ? '…' : actual.unidades_vendidas} 
          color="text-orange-400" 
          variacion={varis.unidades_vendidas} 
        />
        <KpiCard 
          icon={<Users size={20} />} 
          title="Clientes" 
          value={loadingKpis ? '…' : actual.clientes} 
          color="text-purple-400" 
          variacion={varis.clientes} 
        />
        <KpiCard 
          icon={<XCircle size={20} />} 
          title="Cancelados" 
          value={loadingKpis ? '…' : `${actual.cancelados_devueltos}`} 
          color="text-red-400" 
          variacion={varis.tasa_cancelacion} 
          subtext={loadingKpis ? null : `Tasa: ${parseFloat(actual.tasa_cancelacion || 0).toFixed(1)}%`}
          reverseColors={true}
        />
      </div>

      {/* CHART SECTION */}
      <div className="bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] p-6 rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] shadow-sm">
        <h3 className="text-sm font-bold text-fg uppercase tracking-wider mb-6">Evolución de Ventas y Pedidos</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={evolucionData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--color-fg) 10%, transparent)" vertical={false} />
              <XAxis 
                dataKey="fecha" 
                tick={{ fill: 'var(--color-fg-subtle)', fontSize: 12 }}
                tickFormatter={str => {
                  if (!str) return '';
                  const [y,m,d] = str.split('-');
                  return `${d}/${m}`;
                }}
                axisLine={false} tickLine={false} dy={10}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: 'var(--color-fg-subtle)', fontSize: 12 }} 
                tickFormatter={val => `Gs ${(val/1000000).toFixed(1)}M`}
                axisLine={false} tickLine={false} dx={-10}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: 'var(--color-fg-subtle)', fontSize: 12 }}
                axisLine={false} tickLine={false} dx={10}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-fg)' }}
                itemStyle={{ color: 'var(--color-fg)' }}
                formatter={(value, name) => {
                  if (name === 'Ventas Netas') return [formatPrecio(value), name];
                  return [value, name];
                }}
                labelFormatter={label => `Fecha: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="right" dataKey="pedidos_totales" name="Total Pedidos" fill="color-mix(in srgb, var(--color-fg) 15%, transparent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar yAxisId="right" dataKey="pedidos_concretados" name="Pedidos Concretados" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="left" type="monotone" dataKey="ventas" name="Ventas Netas" stroke="var(--color-accent-text)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-accent-text)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABS & VIEWS */}
      <div className="flex-1 flex flex-col min-h-[500px] bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] bg-[color-mix(in_srgb,_var(--color-fg)_3%,_transparent)] shrink-0">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'pedidos' ? 'text-[var(--color-primary-text)] border-b-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,_var(--color-primary)_8%,_transparent)]' : 'text-fg-muted hover:text-fg'}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <LayoutList size={16} /> Tabla de Pedidos
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'items' ? 'text-[var(--color-primary-text)] border-b-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,_var(--color-primary)_8%,_transparent)]' : 'text-fg-muted hover:text-fg'}`}
            onClick={() => setActiveTab('items')}
          >
            <Table2 size={16} /> Ítems Vendidos
          </button>
        </div>

        <div className="flex-1 overflow-auto flex flex-col relative p-4">
          {activeTab === 'pedidos' ? (
            <VistaPedidos filtros={filtrosVista} />
          ) : (
            <VistaItems filtros={filtrosVista} />
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, title, value, color, variacion, subtext, reverseColors = false }) {
  let varColor = 'text-fg-subtle';
  let VarIcon = null;
  let varLabel = '';
  
  if (variacion && !variacion.sin_base_comparacion && variacion.variacion !== null && variacion.variacion !== undefined) {
    const isPositive = variacion.variacion > 0;
    const isNegative = variacion.variacion < 0;
    
    // Si reverseColors es true, positivo es rojo (malo), negativo es verde (bueno). Ejemplo: Tasa de cancelacion
    const goodColor = reverseColors ? 'text-red-400' : 'text-green-400';
    const badColor = reverseColors ? 'text-green-400' : 'text-red-400';
    
    if (isPositive) {
      varColor = goodColor;
      VarIcon = ArrowUp;
    } else if (isNegative) {
      varColor = badColor;
      VarIcon = ArrowDown;
    }
    
    const absVal = Math.abs(variacion.variacion);
    varLabel = variacion.es_pp ? `${absVal.toFixed(1)} pp` : `${absVal.toFixed(1)}%`;
  } else if (variacion && variacion.sin_base_comparacion) {
    varLabel = 'Sin comp.';
  }

  return (
    <div className="bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] p-4 rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_5%,_transparent)] shadow-sm flex flex-col gap-2 transition-all hover:bg-[color-mix(in_srgb,_var(--color-fg)_4%,_transparent)]">
      <div className="flex items-center gap-2 text-fg-muted">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-xl md:text-2xl font-bold text-fg truncate">
        {value}
      </div>
      {(variacion || subtext) && (
        <div className="flex flex-col gap-1 mt-1">
          {variacion && (
            <div className={`flex items-center gap-1 text-[11px] font-semibold ${varColor}`}>
              {VarIcon && <VarIcon size={12} />}
              <span>{varLabel} {varLabel !== 'Sin comp.' && 'vs anterior'}</span>
            </div>
          )}
          {subtext && (
            <div className="text-[11px] text-fg-subtle">{subtext}</div>
          )}
        </div>
      )}
    </div>
  );
}
