import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, ShoppingCart, TrendingUp, Search,
  Package, DollarSign, LayoutList, Table2, Layers
} from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import VistaPedidos from '../../../reportes/VistaPedidos';
import VistaItems from '../../../reportes/VistaItems';

/**
 * Convierte los filtros globales de Analytics (periodo/mes/anio o rango libre)
 * al formato { fecha_desde, fecha_hasta } que esperan los endpoints de reportes.
 *
 * La misma lógica que resolverRangoFechas.js en el backend, replicada en el
 * cliente para que VistaPedidos no tenga que hacer un round-trip extra solo
 * para saber qué rango corresponde al preset seleccionado.
 */
function resolverRango(filters) {
  const hoy = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Rango libre personalizado: se envía directo
  if (filters.periodo === 'personalizado_rango') {
    return { fecha_desde: filters.fecha_desde || '', fecha_hasta: filters.fecha_hasta || '' };
  }

  // Por Mes: año + mes seleccionados
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
  const [kpis, setKpis] = useState({
    ventas_totales: 0, pedidos: 0, ticket_promedio: 0,
    order_bumps: 0, upsells: 0, bundles: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [buscadorActivo, setBuscadorActivo] = useState('');

  // Rango de fechas derivado de los filtros globales. Cada vez que cambia
  // el período (preset, mes, año o rango libre) se recalcula aquí y se
  // propaga automáticamente tanto a los KPIs como a VistaPedidos/VistaItems.
  const rango = useMemo(() => resolverRango(filters), [
    filters.periodo, filters.mes, filters.anio, filters.fecha_desde, filters.fecha_hasta,
  ]);

  // Filtros que se pasan a VistaPedidos y VistaItems: período + búsqueda local
  // + confirmador/courier del panel global. Antes solo se pasaban confirmador y
  // courier (sin fechas), por eso VistaPedidos mostraba pedidos de todos los tiempos.
  const filtrosVista = useMemo(() => ({
    fecha_desde: rango.fecha_desde,
    fecha_hasta: rango.fecha_hasta,
    buscador: buscadorActivo,
    confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
    courier_id: filters.courierId !== 'TODOS' ? filters.courierId : '',
    canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : '',
  }), [rango, buscadorActivo, filters.confirmador, filters.courierId, filters.canal_venta_id]);

  // Filtros que se pasan al endpoint de KPIs: misma base, sin el buscador
  // (el buscador es local, no afecta los totales del período).
  const filtrosKpis = useMemo(() => ({
    fecha_desde: rango.fecha_desde,
    fecha_hasta: rango.fecha_hasta,
    confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
    courier_id: filters.courierId !== 'TODOS' ? filters.courierId : '',
    canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : '',
  }), [rango, filters.confirmador, filters.courierId, filters.canal_venta_id]);

  useEffect(() => {
    cargarKPIs();
  }, [filtrosKpis]);

  const cargarKPIs = async () => {
    try {
      setLoadingKpis(true);
      const data = await reportesService.obtenerKPIs(filtrosKpis);
      setKpis(data);
    } catch (err) {
      console.error('Error cargando KPIs de ventas:', err);
    } finally {
      setLoadingKpis(false);
    }
  };

  const aplicarBusqueda = e => {
    e.preventDefault();
    setBuscadorActivo(localSearch);
  };

  return (
    <div className="flex flex-col gap-6 mt-4 h-[calc(100vh-250px)]">

      {/* HEADER LOCAL & BUSCADOR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-fg flex items-center gap-2">
            <ShoppingCart className="text-[var(--color-primary-text)]" size={20} />
            Ventas y Pedidos
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
        <KpiCard icon={<DollarSign size={20} />} title="Ventas Totales" value={loadingKpis ? '…' : formatPrecio(kpis.ventas_totales)} color="text-green-400" />
        <KpiCard icon={<ShoppingBag size={20} />} title="Pedidos" value={loadingKpis ? '…' : kpis.pedidos} color="text-[var(--color-primary-text)]" />
        <KpiCard icon={<TrendingUp size={20} />} title="Ticket Promedio" value={loadingKpis ? '…' : formatPrecio(kpis.ticket_promedio)} color="text-[var(--color-accent-text)]" />
        <KpiCard icon={<Package size={20} />} title="Order Bumps" value={loadingKpis ? '…' : kpis.order_bumps} color="text-orange-400" />
        <KpiCard icon={<TrendingUp size={20} />} title="Upsells" value={loadingKpis ? '…' : kpis.upsells} color="text-pink-400" />
        <KpiCard icon={<Layers size={20} />} title="Bundles" value={loadingKpis ? '…' : kpis.bundles} color="text-[var(--color-info)]" />
      </div>

      {/* TABS & VIEWS */}
      <div className="flex-1 flex flex-col min-h-0 bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[color-mix(in_srgb,_var(--color-fg)_8%,_transparent)] bg-[color-mix(in_srgb,_var(--color-fg)_3%,_transparent)] shrink-0">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'pedidos' ? 'text-[var(--color-primary-text)] border-b-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,_var(--color-primary)_8%,_transparent)]' : 'text-fg-muted hover:text-fg'}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <LayoutList size={16} /> Vista Pedidos
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'items' ? 'text-[var(--color-primary-text)] border-b-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,_var(--color-primary)_8%,_transparent)]' : 'text-fg-muted hover:text-fg'}`}
            onClick={() => setActiveTab('items')}
          >
            <Table2 size={16} /> Vista Ítems Vendidos
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative p-4">
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

function KpiCard({ icon, title, value, color }) {
  return (
    <div className="bg-[color-mix(in_srgb,_var(--color-fg)_2%,_transparent)] p-4 rounded-xl border border-[color-mix(in_srgb,_var(--color-fg)_5%,_transparent)] shadow-sm flex flex-col gap-2 transition-all hover:bg-[color-mix(in_srgb,_var(--color-fg)_4%,_transparent)]">
      <div className="flex items-center gap-2 text-fg-muted">
        <span className={color}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-xl font-bold text-fg">
        {value}
      </div>
    </div>
  );
}
