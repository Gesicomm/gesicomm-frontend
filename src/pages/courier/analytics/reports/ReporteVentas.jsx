import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, LayoutList, Table2 } from 'lucide-react';
import VistaPedidos from '../../../reportes/VistaPedidos';
import VistaItems from '../../../reportes/VistaItems';
import { resolverRango } from '../periodo';

export function ReporteVentas({ filters }) {
  const [activeTab, setActiveTab] = useState('pedidos');
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

  const aplicarBusqueda = e => {
    e.preventDefault();
    setBuscadorActivo(localSearch);
  };

  return (
    <div className="flex flex-col gap-6 mt-4 pb-8" style={{ minHeight: 'calc(100vh - 200px)' }}>

      {/* HEADER LOCAL & BUSCADOR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-fg flex items-center gap-2">
            <ShoppingCart className="text-[var(--color-primary-text)]" size={20} />
            Pedidos del período
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

      {/* Sin tarjetas de ventas ni gráfico de evolución: Ventas netas, ticket
          promedio y la evolución ya están en el Dashboard General, y los conteos
          de pedidos en el Resumen operativo. Acá queda el detalle pedido por
          pedido, que no está en otro lado. */}
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
