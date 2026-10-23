import { numeroPedidoVisible } from '../../../pedidoNumero';
import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Search } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';

export function VistaFacturacion({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_sujeto_iva: 0, total_iva: 0, en_curso_monto: 0, en_curso_iva: 0, pedidos_entregados: 0, pedidos_en_curso: 0 });
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState({ buscador: '' });
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

      const response = await reportesService.obtenerReporteFacturacion(payload);
      
      setData(response.data || []);
      setKpis(prev => ({ ...prev, ...(response.kpis || {}) }));
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
      
      {/* KPIs: lo entregado es lo que ya corresponde facturar; lo que sigue
          en curso se muestra aparte para que no parezca que no hay nada. */}
      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>Entregados con factura</span><FileText size={16} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{formatMoney(kpis.total_sujeto_iva)}</div>
          <div className="cic-kpi-sub">{kpis.pedidos_entregados === 1 ? '1 pedido' : `${kpis.pedidos_entregados} pedidos`} · IVA (10%): <strong>{formatMoney(kpis.total_iva)}</strong></div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>En curso con factura</span><Calculator size={16} /></div>
          <div className="cic-kpi-val">{formatMoney(kpis.en_curso_monto)}</div>
          <div className="cic-kpi-sub">{kpis.pedidos_en_curso === 1 ? '1 pedido todavía sin entregar' : `${kpis.pedidos_en_curso} pedidos todavía sin entregar`} · IVA (10%): <strong>{formatMoney(kpis.en_curso_iva)}</strong></div>
        </div>
      </div>

      <div className="cic-busqueda">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          className="cic-select"
          aria-label="Buscar pedido con factura"
          placeholder="Buscar por número, cliente, teléfono, RUC o razón social"
          value={localSearch.buscador}
          onChange={(e) => setLocalSearch({ buscador: e.target.value })}
        />
      </div>

      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Confirmador</th>
                <th>Estado</th>
                <th>RUC</th>
                <th>Razón Social</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
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
                  <td colSpan="8" className="text-center py-4 text-muted">Ningún pedido de este período pidió factura (los cancelados, rechazados y devueltos no cuentan).</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td>{numeroPedidoVisible(row)}</td>
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
