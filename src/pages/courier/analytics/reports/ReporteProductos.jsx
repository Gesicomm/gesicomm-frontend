import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Award } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';

export default function ReporteProductos({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_unidades: 0, total_ingresos: 0, producto_estrella: 'Ninguno' });
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
      const response = await reportesService.obtenerReporteProductos({
        ...filters,
        pagina: page,
        limite: pagination.limit
      });
      
      setData(response.data || []);
      setKpis(response.kpis || { total_unidades: 0, total_ingresos: 0, producto_estrella: 'Ninguno' });
      setPagination({
        ...pagination,
        page: response.actual || 1,
        total: response.total || 0,
        totalPages: response.paginas || 1
      });
    } catch (error) {
      console.error("Error al obtener reporte de productos:", error);
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
        <div className="cic-kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL UNIDADES
            <Package size={16} color="#3b82f6" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#3b82f6' }}>{kpis.total_unidades}</div>
          <div className="cic-kpi-sub">Unidades de catálogo entregadas</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="cic-kpi-header">
            TOTAL INGRESOS
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#10b981' }}>{formatMoney(kpis.total_ingresos)}</div>
          <div className="cic-kpi-sub">Ingreso bruto generado por catálogo</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div className="cic-kpi-header">
            PRODUCTO ESTRELLA
            <Award size={16} color="#f59e0b" />
          </div>
          <div className="cic-kpi-val" style={{ color: '#f59e0b', fontSize: '1.1rem', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
            {kpis.producto_estrella}
          </div>
          <div className="cic-kpi-sub">Mayor cantidad de unidades vendidas</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>Nombre del Producto</th>
                <th style={{ textAlign: 'center' }}>Total Procesados</th>
                <th style={{ textAlign: 'center', color: '#10b981' }}>Vendidos (Entregado)</th>
                <th style={{ textAlign: 'center', color: '#f43f5e' }}>Devueltos/Rechazados</th>
                <th style={{ textAlign: 'center', color: '#64748b' }}>Cancelados</th>
                <th style={{ textAlign: 'right' }}>P. Costo Unid.</th>
                <th style={{ textAlign: 'right' }}>P. Venta Base</th>
                <th style={{ textAlign: 'right' }}>Costo Total</th>
                <th style={{ textAlign: 'right', color: '#10b981' }}>Ingresos Generados</th>
                <th style={{ textAlign: 'right', color: '#3b82f6' }}>Tasa Devolución</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Cargando reporte de productos...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No se encontraron productos vendidos en este período.</td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const returnRate = row.total_procesados > 0 
                    ? ((row.devoluciones / row.total_procesados) * 100).toFixed(1) 
                    : 0;
                  
                  return (
                    <tr key={row.id || idx}>
                      <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ textAlign: 'center' }}>{row.total_procesados}</td>
                      <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{row.vendidos}</td>
                      <td style={{ textAlign: 'center', color: '#f43f5e' }}>{row.devoluciones}</td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{row.cancelados}</td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{formatMoney(row.precio_costo_unitario)}</td>
                      <td style={{ textAlign: 'right', color: '#cbd5e1' }}>{formatMoney(row.precio_venta_unitario)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(row.costo_total)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{formatMoney(row.ingresos)}</td>
                      <td style={{ textAlign: 'right', color: returnRate > 15 ? '#f43f5e' : '#3b82f6' }}>{returnRate}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && pagination.totalPages > 1 && (
          <div className="cic-table-pagination" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
