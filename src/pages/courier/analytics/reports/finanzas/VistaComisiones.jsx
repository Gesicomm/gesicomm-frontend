import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, TrendingDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';
import { numeroPedidoVisible } from '../../../pedidoNumero';

export function VistaComisiones({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_facturado: 0, total_comisiones: 0, total_neto: 0 });
  const [distribucionMetodos, setDistribucionMetodos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState({ buscador: '', fecha_desde: '', fecha_hasta: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const payload = {
        ...filters,
        pagina: page,
        limite: pagination.limit
      };
      
      if (localSearch.buscador) payload.buscador = localSearch.buscador;
      if (localSearch.fecha_desde) payload.fecha_desde = localSearch.fecha_desde;
      if (localSearch.fecha_hasta) payload.fecha_hasta = localSearch.fecha_hasta;

      const response = await reportesService.obtenerReporteComisiones(payload);
      
      setData(response.data || []);
      setKpis(response.kpis || { total_facturado: 0, total_comisiones: 0, total_neto: 0 });
      setDistribucionMetodos(response.distribucion_metodos || null);
      setPagination({
        ...pagination,
        page: response.actual || 1,
        total: response.total || 0,
        totalPages: response.paginas || 1
      });
    } catch (error) {
      console.error("Error al obtener comisiones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [filters, localSearch]);

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPIs */}
      <div className="cic-kpis-grid">
        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TOTAL FACTURADO
            <DollarSign size={16} color="var(--color-success)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.total_facturado)}</div>
          <div className="cic-kpi-sub">Base de cálculo (Entregados/Confirmados)</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TOTAL COMISIONES
            <Percent size={16} color="var(--color-danger)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{formatMoney(kpis.total_comisiones)}</div>
          <div className="cic-kpi-sub">Descuento de pasarelas de pago</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            RECAUDACIÓN NETA
            <TrendingDown size={16} color="var(--color-primary-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{formatMoney(kpis.total_neto)}</div>
          <div className="cic-kpi-sub">Dinero libre de comisiones</div>
        </div>
      </div>

      {/* Distribución por Métodos de Pago */}
      {distribucionMetodos && Object.keys(distribucionMetodos).length > 0 && (
        <div className="cic-card" style={{ padding: '1.5rem', background: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-fg)' }}>
            Distribución por Método de Pago
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(distribucionMetodos)
              .sort(([,a], [,b]) => b.monto - a.monto)
              .map(([metodo, stats]) => (
                <div key={metodo} style={{ padding: '1rem', background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {metodo}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>Facturado</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-fg)' }}>{formatMoney(stats.monto)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>Comisión</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-danger)' }}>{formatMoney(stats.comision)}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-subtle)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
                    {stats.count} pedido{stats.count !== 1 ? 's' : ''}
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      
      {/* Barra de Filtros Locales */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[color-mix(in srgb, var(--color-fg) 8%, transparent)] items-end">
        <div className="flex-1 w-full">
          <span className="text-[10px] text-[var(--color-fg-muted)] uppercase font-bold mb-1 ml-1 block">Buscar</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, Cliente o Teléfono..." 
              className="w-full bg-[var(--color-surface)] border border-[color-mix(in srgb, var(--color-fg) 12%, transparent)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              value={localSearch.buscador}
              onChange={(e) => setLocalSearch(prev => ({ ...prev, buscador: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[10px] text-[var(--color-fg-muted)] uppercase font-bold mb-1 ml-1">Desde</span>
            <input 
              type="date" 
              className="w-full bg-[var(--color-surface)] border border-[color-mix(in srgb, var(--color-fg) 12%, transparent)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              value={localSearch.fecha_desde}
              onChange={(e) => setLocalSearch(prev => ({ ...prev, fecha_desde: e.target.value }))}
            />
          </div>
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[10px] text-[var(--color-fg-muted)] uppercase font-bold mb-1 ml-1">Hasta</span>
            <input 
              type="date" 
              className="w-full bg-[var(--color-surface)] border border-[color-mix(in srgb, var(--color-fg) 12%, transparent)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              value={localSearch.fecha_hasta}
              onChange={(e) => setLocalSearch(prev => ({ ...prev, fecha_hasta: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha/Hora</th>
                <th>Confirmador</th>
                <th>Estado</th>
                <th>Método de Pago</th>
                <th style={{ textAlign: 'right' }}>Comisión (%)</th>
                <th style={{ textAlign: 'right' }}>Precio (Total)</th>
                <th style={{ textAlign: 'right', color: 'var(--color-danger)' }}>Costo Comisión</th>
                <th style={{ textAlign: 'right', color: 'var(--color-success)' }}>Precio Neto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">Cargando reporte de comisiones...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">No se encontraron registros en este período.</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{numeroPedidoVisible(row)}</td>
                    <td>{row.fecha}<br/><small className="text-muted">{row.hora}</small></td>
                    <td>{row.confirmador || 'N/A'}</td>
                    <td>
                      <span className={`badge ${row.estado === 'Entregado' ? 'bg-success' : 'bg-primary'}`}>
                        {row.estado}
                      </span>
                    </td>
                    <td>{row.metodo_pago || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>{Number(row.comision_pct_aplicada || 0).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(row.monto)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>-{formatMoney(row.costo_comision)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{formatMoney(row.precio_neto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && pagination.totalPages > 1 && (
          <div className="cic-table-pagination" style={{ padding: '1rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
              Página {pagination.page} de {pagination.totalPages} <span style={{ opacity: 0.5 }}>• {pagination.total} registros</span>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="cic-btn" 
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Anterior
              </button>
              <button 
                className="cic-btn" 
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
