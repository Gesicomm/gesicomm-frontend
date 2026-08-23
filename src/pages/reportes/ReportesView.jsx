import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, TrendingUp, Filter, Search, Calendar,
  Package, DollarSign, List, Table2, X, ChevronRight, LayoutList, Layers
} from 'lucide-react';
import { reportesService } from '../../services/reportesApi';
import { formatPrecio } from '../../lib/mensajeWhatsapp';
import VistaPedidos from './VistaPedidos';
import VistaItems from './VistaItems';

export default function ReportesView() {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [kpis, setKpis] = useState({
    ventas_totales: 0, pedidos: 0, ticket_promedio: 0, 
    order_bumps: 0, upsells: 0, bundles: 0
  });
  
  const [filtros, setFiltros] = useState({
    buscador: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  const [filtrosActivos, setFiltrosActivos] = useState(filtros);

  useEffect(() => {
    cargarKPIs();
  }, [filtrosActivos]);

  const cargarKPIs = async () => {
    try {
      const data = await reportesService.obtenerKPIs(filtrosActivos);
      setKpis(data);
    } catch (err) {
      console.error('Error cargando KPIs:', err);
    }
  };

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setFiltrosActivos(filtros);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vit-text)] flex items-center gap-2">
            <BarChart3 className="text-[var(--vit-primary)]" />
            Reportes de Ventas
          </h1>
          <p className="text-sm text-[var(--vit-muted-2)]">
            Analítica avanzada de pedidos entregados y roles comerciales.
          </p>
        </div>

        <form onSubmit={aplicarFiltros} className="flex flex-wrap items-center gap-2 bg-[var(--vit-surface)] p-2 rounded-xl border border-[var(--vit-border)] shadow-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vit-muted)]" />
            <input 
              type="text" 
              placeholder="Buscar cliente, tel, #pedido..." 
              value={filtros.buscador}
              onChange={e => setFiltros(f => ({ ...f, buscador: e.target.value }))}
              className="pl-9 pr-3 py-2 bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg text-sm w-[200px] focus:outline-none focus:border-[var(--vit-primary)] text-[var(--vit-text)]"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-[var(--vit-bg)] border border-[var(--vit-border)] rounded-lg px-2 py-1.5">
            <Calendar size={14} className="text-[var(--vit-muted)]" />
            <input 
              type="date" 
              value={filtros.fecha_desde}
              onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
              className="bg-transparent text-sm text-[var(--vit-text)] focus:outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[var(--vit-invert-icons,0)]"
            />
            <span className="text-[var(--vit-muted)]">-</span>
            <input 
              type="date" 
              value={filtros.fecha_hasta}
              onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
              className="bg-transparent text-sm text-[var(--vit-text)] focus:outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[var(--vit-invert-icons,0)]"
            />
          </div>
          
          <button type="submit" className="px-4 py-2 bg-[var(--vit-primary)] text-[var(--vit-bg)] font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity">
            Filtrar
          </button>
        </form>
      </div>

      {/* KPIS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 shrink-0">
        <KpiCard icon={<DollarSign size={20} />} title="Ventas Totales" value={formatPrecio(kpis.ventas_totales)} color="text-green-400" />
        <KpiCard icon={<ShoppingBag size={20} />} title="Pedidos" value={kpis.pedidos} color="text-blue-400" />
        <KpiCard icon={<TrendingUp size={20} />} title="Ticket Promedio" value={formatPrecio(kpis.ticket_promedio)} color="text-[#d4a537]" />
        <KpiCard icon={<Package size={20} />} title="Order Bumps" value={kpis.order_bumps} color="text-orange-400" />
        <KpiCard icon={<TrendingUp size={20} />} title="Upsells" value={kpis.upsells} color="text-pink-400" />
        <KpiCard icon={<Layers size={20} />} title="Bundles / Packs" value={kpis.bundles} color="text-[#7d9bd6]" />
      </div>

      {/* TABS & VIEWS */}
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--vit-surface)] rounded-xl border border-[var(--vit-border)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--vit-border)] bg-[var(--vit-card-bg)] shrink-0">
          <button 
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'pedidos' ? 'text-[var(--vit-primary)] border-b-2 border-[var(--vit-primary)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <LayoutList size={16} /> Vista Pedidos (Estructurada)
          </button>
          <button 
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'items' ? 'text-[var(--vit-primary)] border-b-2 border-[var(--vit-primary)]' : 'text-[var(--vit-muted)] hover:text-[var(--vit-text)]'}`}
            onClick={() => setActiveTab('items')}
          >
            <Table2 size={16} /> Vista Ítems Vendidos (Análisis puro)
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {activeTab === 'pedidos' ? (
            <VistaPedidos filtros={filtrosActivos} />
          ) : (
            <VistaItems filtros={filtrosActivos} />
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, title, value, color }) {
  return (
    <div className="bg-[var(--vit-surface)] p-4 rounded-xl border border-[var(--vit-border)] shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[var(--vit-muted-2)]">
        <span className={color}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-xl font-bold text-[var(--vit-text)]">
        {value}
      </div>
    </div>
  );
}
