import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';

export function VistaFacturacion({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_sujeto_iva: 0, total_iva: 0 });
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

      const response = await reportesService.obtenerReporteFacturacion(payload);
      
      setData(response.data || []);
      setKpis(response.kpis || { total_sujeto_iva: 0, total_iva: 0 });
      setPagination({
        ...pagination,
        page: response.actual || 1,
        total: response.total || 0,
        totalPages: response.paginas || 1
      });
    } catch (error) {
      console.error("Error al obtener facturación:", error);
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
      <div className="cic-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TOTAL SUJETO A IVA
            <FileText size={16} color="var(--color-primary-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{formatMoney(kpis.total_sujeto_iva)}</div>
          <div className="cic-kpi-sub">Base de cálculo (Factura solicitada)</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TOTAL IVA (10%)
            <Calculator size={16} color="var(--color-accent-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-accent-text)' }}>{formatMoney(kpis.total_iva)}</div>
          <div className="cic-kpi-sub">IVA generado en este período</div>
        </div>
      </div>

      {/* Data Table */}
      
      {/* Barra de Filtros Locales */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[color-mix(in srgb, var(--color-fg) 8%, transparent)] items-end">
        <div className="flex-1 w-full">
          <span className="text-[10px] text-[var(--color-fg-muted)] uppercase font-bold mb-1 ml-1 block">Buscar</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, Cliente, Teléfono, RUC o Razón Social..." 
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
                <th>ID Pedido</th>
                <th>Fecha</th>
                <th>Confirmador</th>
                <th>Estado</th>
                <th>RUC</th>
                <th>Razón Social</th>
                <th style={{ textAlign: 'right' }}>Monto Facturable</th>
                <th style={{ textAlign: 'right', color: 'var(--color-accent-text)' }}>IVA (10%)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">Cargando reporte de facturación...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No se encontraron pedidos con solicitud de factura en este período.</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.id}</td>
                    <td>{row.fecha}</td>
                    <td>{row.confirmador || 'N/A'}</td>
                    <td>
                      <span className={`badge ${row.estado === 'Entregado' ? 'bg-success' : 'bg-primary'}`}>
                        {row.estado}
                      </span>
                    </td>
                    <td>{row.ruc || '-'}</td>
                    <td>{row.razon_social || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(row.monto)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-accent-text)', fontWeight: 'bold' }}>{formatMoney(row.iva)}</td>
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
