import React, { useState, useEffect } from 'react';
import { FileText, Calculator } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';

export function VistaFacturacion({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_sujeto_iva: 0, total_iva: 0 });
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
      const response = await reportesService.obtenerReporteFacturacion({
        ...filters,
        pagina: page,
        limite: pagination.limit
      });
      
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
    fetchData(1);
  }, [filters]);

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPIs */}
      <div className="cic-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="cic-kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL SUJETO A IVA
            <FileText size={16} color="#3b82f6" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#3b82f6' }}>{formatMoney(kpis.total_sujeto_iva)}</div>
          <div className="cic-kpi-sub">Base de cálculo (Factura solicitada)</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL IVA (10%)
            <Calculator size={16} color="#eab308" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#eab308' }}>{formatMoney(kpis.total_iva)}</div>
          <div className="cic-kpi-sub">IVA generado en este período</div>
        </div>
      </div>

      {/* Data Table */}
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
                <th style={{ textAlign: 'right', color: '#eab308' }}>IVA (10%)</th>
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
                    <td style={{ textAlign: 'right', color: '#eab308', fontWeight: 'bold' }}>{formatMoney(row.iva)}</td>
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
