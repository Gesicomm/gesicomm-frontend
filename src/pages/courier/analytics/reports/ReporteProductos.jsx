import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Award } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { METRIC_TERMS } from '../../../../utils/metricGlossary';

export default function ReporteProductos({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ unidades_vendidas: 0, ventas_netas: 0, producto_estrella: 'Ninguno' });
  const [top5, setTop5] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await reportesService.obtenerReporteProductos({
        ...filters,
        pagina: page,
        limite: pagination.limit
      });
      
      setData(response.data || []);
      setKpis(response.kpis || { unidades_vendidas: 0, ventas_netas: 0, producto_estrella: 'Ninguno' });
      setTop5(response.top5 || null);
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
        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            TOTAL UNIDADES
            <Package size={16} color="var(--color-primary-text)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{kpis.unidades_vendidas}</div>
          <div className="cic-kpi-sub">Unidades de catálogo entregadas</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            {METRIC_TERMS.ventasNetas}
            <TrendingUp size={16} color="var(--color-success)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.ventas_netas)}</div>
          <div className="cic-kpi-sub">Venta de productos entregados, sin delivery/flete</div>
        </div>

        <div className="cic-kpi-card" style={{ borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)' }}>
          <div className="cic-kpi-header">
            PRODUCTO ESTRELLA
            <Award size={16} color="var(--color-warning)" />
          </div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-warning)', fontSize: '1.1rem', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
            {kpis.producto_estrella}
          </div>
          <div className="cic-kpi-sub">Mayor cantidad de unidades vendidas</div>
        </div>
      </div>
      
      {/* Gráficos Top 5 */}
      {top5 && (top5.vendidos?.length > 0 || top5.devoluciones?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Top 5 Más Vendidos */}
          {top5.vendidos?.length > 0 && (
            <div className="cic-card" style={{ padding: '1.5rem', background: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-fg)' }}>Top 5: Más Vendidos (Unidades)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {top5.vendidos.map((p, idx) => {
                  const maxV = top5.vendidos[0].vendidos;
                  const pct = Math.max(5, (p.vendidos / maxV) * 100);
                  return (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{idx + 1}. {p.nombre}</span>
                        <span style={{ color: 'var(--color-primary-text)', fontWeight: 700 }}>{p.vendidos}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top 5 Mayor Tasa Devolución */}
          {top5.devoluciones?.length > 0 && (
            <div className="cic-card" style={{ padding: '1.5rem', background: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-fg)' }}>Top 5: Mayor Tasa de Devolución</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {top5.devoluciones.map((p, idx) => {
                  const maxV = top5.devoluciones[0].tasa_devolucion;
                  const pct = Math.max(5, (p.tasa_devolucion / maxV) * 100);
                  return (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{idx + 1}. {p.nombre}</span>
                        <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{p.tasa_devolucion.toFixed(1)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'color-mix(in srgb, var(--color-danger) 15%, transparent)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-danger)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>Producto / Variante</th>
                <th style={{ textAlign: 'center' }}>Unidades Vendidas</th>
                <th style={{ textAlign: 'center' }}>Pedidos Únicos</th>
                <th style={{ textAlign: 'right' }}>% de {METRIC_TERMS.ventasNetas.toLowerCase()}</th>
                <th style={{ textAlign: 'right' }}>Precio promedio</th>
                <th style={{ textAlign: 'right', color: 'var(--color-success)' }}>{METRIC_TERMS.ventasNetas}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>Cargando reporte de productos...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>No se encontraron productos vendidos en este período.</td>
                </tr>
              ) : (
                data.flatMap((row) => {
                  const hasVariants = row.variantes && row.variantes.length > 0;
                  const isExpanded = expandedRows.has(row.id);
                  const rows = [];
                  
                  // Fila Principal (Producto)
                  rows.push(
                    <tr key={row.id} style={{ cursor: hasVariants ? 'pointer' : 'default', background: isExpanded ? 'var(--color-bg-subtle)' : 'transparent' }} onClick={() => hasVariants && toggleRow(row.id)}>
                      <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {hasVariants && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-fg-subtle)', width: '12px' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                        {!hasVariants && <span style={{ width: '12px' }} />}
                        {row.nombre} <span style={{ fontSize: '0.7rem', color: 'var(--color-fg-muted)' }}>{row.sku !== '-' ? `(${row.sku})` : ''}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.unidades_vendidas}</td>
                      <td style={{ textAlign: 'center' }}>{row.pedidos_unicos}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-subtle)' }}>{row.participacion.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.precio_promedio)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{formatMoney(row.ventas_netas)}</td>
                    </tr>
                  );

                  // Filas Secundarias (Variantes)
                  if (hasVariants && isExpanded) {
                    row.variantes.forEach((v) => {
                      rows.push(
                        <tr key={`v-${row.id}-${v.id}`} style={{ background: 'color-mix(in srgb, var(--color-bg-subtle) 50%, transparent)' }}>
                          <td style={{ paddingLeft: '2.5rem', color: 'var(--color-fg-muted)', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--color-border)', marginRight: '0.5rem' }}>├─</span>
                            {v.nombre} {v.sku !== '-' ? `(${v.sku})` : ''}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{v.unidades_vendidas}</td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{v.pedidos_unicos}</td>
                          <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-fg-subtle)' }}>{v.participacion.toFixed(1)}%</td>
                          <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>{formatMoney(v.precio_promedio)}</td>
                          <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-fg)' }}>{formatMoney(v.ventas_netas)}</td>
                        </tr>
                      );
                    });
                  }
                  
                  return rows;
                })
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
