import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, TrendingDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportesService } from '../../../../../services/reportesApi';
import { numeroPedidoVisible } from '../../../pedidoNumero';
import { fechaCorta } from '../../periodo';

export function VistaComisiones({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_facturado: 0, total_comisiones: 0, total_neto: 0 });
  const [distribucionMetodos, setDistribucionMetodos] = useState(null);
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
            COBRADO A CLIENTES
            <DollarSign size={16} color="var(--color-success)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.total_facturado)}</div>
          <div className="cic-kpi-sub">Pedidos entregados, delivery incluido</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            SE LLEVARON LAS PASARELAS
            <Percent size={16} color="var(--color-danger)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{formatMoney(kpis.total_comisiones)}</div>
          <div className="cic-kpi-sub">Comisión de tarjetas, POS y pagos online</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TE QUEDA
            <TrendingDown size={16} color="var(--color-primary-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{formatMoney(kpis.total_neto)}</div>
          <div className="cic-kpi-sub">Lo cobrado menos las comisiones</div>
        </div>
      </div>

      {/* Distribución por Métodos de Pago */}
      {distribucionMetodos && Object.keys(distribucionMetodos).length > 0 && (
        <div className="cic-card" style={{ padding: '1.5rem', background: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-fg)' }}>
            Comisión por forma de pago
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(distribucionMetodos)
              .sort(([,a], [,b]) => b.monto - a.monto)
              .map(([metodo, stats]) => (
                <div key={metodo} style={{ padding: '1rem', background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-fg)', marginBottom: '0.5rem' }}>
                    {metodo}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-fg-muted)' }}>Cobrado</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-fg)' }}>{formatMoney(stats.monto)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-fg-muted)' }}>Comisión</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-danger)' }}>{formatMoney(stats.comision)}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-fg-subtle)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
                    {stats.count} pedido{stats.count !== 1 ? 's' : ''}
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      
      {/* Las fechas las define el período de arriba; acá solo se busca. */}
      <div className="cic-busqueda">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          className="cic-select"
          aria-label="Buscar pedido"
          placeholder="Buscar por número, cliente o teléfono"
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
                <th>Forma de pago</th>
                <th style={{ textAlign: 'right' }}>Comisión %</th>
                <th style={{ textAlign: 'right' }}>Cobrado al cliente</th>
                <th style={{ textAlign: 'right', color: 'var(--color-danger)' }}>Comisión</th>
                <th style={{ textAlign: 'right', color: 'var(--color-success)' }}>Te queda</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">Cargando…</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">No hubo pedidos entregados con comisión en este período.</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{numeroPedidoVisible(row)}</td>
                    <td>{fechaCorta(row.fecha)}<br/><small className="text-muted">{row.hora}</small></td>
                    <td>{row.confirmador || 'N/A'}</td>
                    <td>
                      <span className={`badge ${row.estado === 'Entregado' ? 'bg-success' : 'bg-primary'}`}>
                        {row.estado}
                      </span>
                    </td>
                    <td>{row.metodo_pago || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>{Number(row.comision_pct_aplicada || 0).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(row.monto_cobrado ?? row.monto)}</td>
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
