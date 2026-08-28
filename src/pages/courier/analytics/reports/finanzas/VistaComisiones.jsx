import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, TrendingDown } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';

export function VistaComisiones({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_facturado: 0, total_comisiones: 0, total_neto: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await reportesService.obtenerReporteComisiones({
        ...filters,
        pagina: page,
        limite: pagination.limit
      });
      
      setData(response.data || []);
      setKpis(response.kpis || { total_facturado: 0, total_comisiones: 0, total_neto: 0 });
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
    fetchData(1);
  }, [filters]);

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPIs */}
      <div className="cic-kpis-grid">
        <div className="cic-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL FACTURADO
            <DollarSign size={16} color="#10b981" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#10b981' }}>{formatMoney(kpis.total_facturado)}</div>
          <div className="cic-kpi-sub">Base de cálculo (Entregados/Confirmados)</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL COMISIONES
            <Percent size={16} color="#f43f5e" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#f43f5e' }}>{formatMoney(kpis.total_comisiones)}</div>
          <div className="cic-kpi-sub">Descuento de pasarelas de pago</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="cic-kpi-header">
            RECAUDACIÓN NETA
            <TrendingDown size={16} color="#3b82f6" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#3b82f6' }}>{formatMoney(kpis.total_neto)}</div>
          <div className="cic-kpi-sub">Dinero libre de comisiones</div>
        </div>
      </div>

      {/* Data Table */}
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
                <th style={{ textAlign: 'right', color: '#f43f5e' }}>Costo Comisión</th>
                <th style={{ textAlign: 'right', color: '#10b981' }}>Precio Neto</th>
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
                    <td>#{row.id}</td>
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
                    <td style={{ textAlign: 'right', color: '#f43f5e' }}>-{formatMoney(row.costo_comision)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{formatMoney(row.precio_neto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && pagination.totalPages > 1 && (
          <div className="cic-table-pagination" style={{ padding: '1rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 6%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
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
