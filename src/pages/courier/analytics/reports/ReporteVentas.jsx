import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ShoppingBag, ShoppingCart, TrendingUp, Search, Calendar,
  Package, DollarSign, List, Table2, LayoutList, Layers
} from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { formatPrecio } from '../../../../lib/mensajeWhatsapp';
import VistaPedidos from '../../../reportes/VistaPedidos';
import VistaItems from '../../../reportes/VistaItems';

export function ReporteVentas({ filters }) {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [kpis, setKpis] = useState({
    ventas_totales: 0, pedidos: 0, ticket_promedio: 0, 
    order_bumps: 0, upsells: 0, bundles: 0
  });
  
  const [localSearch, setLocalSearch] = useState('');
  
  // Transformamos los filtros globales de Analytics al formato que espera VistaPedidos
  // VistaPedidos espera: { buscador, fecha_desde, fecha_hasta }
  // Analytics provee: { periodo, mes, anio, confirmador, courierId, origen }
  // Para simplificar y no romper el API de reportes, le pasaremos el buscador y el confirmador/courier si es posible
  const [filtrosActivos, setFiltrosActivos] = useState({
    buscador: '',
    fecha_desde: '', // Dejamos que el backend asuma el periodo actual si está vacío, o mapeamos
    fecha_hasta: '',
    confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
    courier_id: filters.courierId !== 'TODOS' ? filters.courierId : ''
  });

  useEffect(() => {
    // Al cambiar los filtros globales, actualizamos
    setFiltrosActivos(prev => ({
      ...prev,
      confirmador: filters.confirmador !== 'TODOS' ? filters.confirmador : '',
      courier_id: filters.courierId !== 'TODOS' ? filters.courierId : ''
    }));
  }, [filters]);

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

  const aplicarFiltrosLocales = (e) => {
    e.preventDefault();
    setFiltrosActivos(prev => ({ ...prev, buscador: localSearch }));
  };

  return (
    <div className="flex flex-col gap-6 mt-4 h-[calc(100vh-250px)]">
      
      {/* HEADER LOCAL & BUSCADOR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[#f1f5f9] flex items-center gap-2">
            <ShoppingCart className="text-[#3b82f6]" size={20} />
            Desglose de Ventas y Pedidos
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Análisis estructurado de ítems vendidos y operaciones.
          </p>
        </div>

        <form onSubmit={aplicarFiltrosLocales} className="flex flex-wrap items-center gap-2 bg-[rgba(255,255,255,0.02)] p-2 rounded-xl border border-[rgba(255,255,255,0.08)] shadow-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input 
              type="text" 
              placeholder="Buscar cliente, tel, #pedido..." 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#12131a] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm w-[250px] focus:outline-none focus:border-[#6366f1] text-[#f1f5f9]"
            />
          </div>
          
          <button type="submit" className="px-4 py-2 bg-[#6366f1] text-white font-semibold rounded-lg text-sm hover:bg-[#4f46e5] transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* KPIS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 shrink-0">
        <KpiCard icon={<DollarSign size={20} />} title="Ventas Totales" value={formatPrecio(kpis.ventas_totales)} color="text-green-400" />
        <KpiCard icon={<ShoppingBag size={20} />} title="Pedidos" value={kpis.pedidos} color="text-blue-400" />
        <KpiCard icon={<TrendingUp size={20} />} title="Ticket Promedio" value={formatPrecio(kpis.ticket_promedio)} color="text-purple-400" />
        <KpiCard icon={<Package size={20} />} title="Order Bumps" value={kpis.order_bumps} color="text-orange-400" />
        <KpiCard icon={<TrendingUp size={20} />} title="Upsells" value={kpis.upsells} color="text-pink-400" />
        <KpiCard icon={<Layers size={20} />} title="Bundles" value={kpis.bundles} color="text-indigo-400" />
      </div>

      {/* TABS & VIEWS */}
      <div className="flex-1 flex flex-col min-h-0 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.08)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] shrink-0">
          <button 
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'pedidos' ? 'text-[#818cf8] border-b-2 border-[#6366f1] bg-[rgba(99,102,241,0.05)]' : 'text-[#94a3b8] hover:text-[#f1f5f9]'}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <LayoutList size={16} /> Vista Pedidos
          </button>
          <button 
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'items' ? 'text-[#818cf8] border-b-2 border-[#6366f1] bg-[rgba(99,102,241,0.05)]' : 'text-[#94a3b8] hover:text-[#f1f5f9]'}`}
            onClick={() => setActiveTab('items')}
          >
            <Table2 size={16} /> Vista Ítems Vendidos
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative p-4">
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
    <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)] shadow-sm flex flex-col gap-2 transition-all hover:bg-[rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 text-[#94a3b8]">
        <span className={color}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-xl font-bold text-[#f1f5f9]">
        {value}
      </div>
    </div>
  );
}
