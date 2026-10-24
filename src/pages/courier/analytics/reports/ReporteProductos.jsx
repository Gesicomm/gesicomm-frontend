import React, { useState, useEffect } from 'react';
import { reportesService } from '../../../../services/reportesApi';

export default function ReporteProductos({ filters }) {
  const [data, setData] = useState([]);
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
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Productos</h2>
          <p className="cic-report-desc">Cuáles se devuelven más y cómo se reparte la venta entre sus variantes. Ganancia por producto: Dashboard General.</p>
        </div>
      </div>

      {/* Sin tarjetas de unidades/ventas ni "Top 5 más vendidos": eso ya está
          en Más Vendidos del Dashboard General, con costo y ganancia. Acá queda
          lo que no está allá: qué productos se devuelven y el detalle por
          variante. */}
      {/* Top 5 con más devoluciones */}
      {top5?.devoluciones?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="cic-card" style={{ padding: '1.5rem', background: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-fg)' }}>Productos que más se devuelven</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {top5.devoluciones.map((p, idx) => {
                  const maxV = top5.devoluciones[0].tasa_devolucion;
                  const pct = Math.max(5, (p.tasa_devolucion / maxV) * 100);
                  return (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
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
        </div>
      )}

      {/* Data Table */}
      <div className="cic-table-card">
        <div className="cic-table-wrapper">
          <table className="cic-table">
            <thead>
              <tr>
                <th>Producto / Variante</th>
                <th style={{ textAlign: 'center' }}>Unidades</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'right' }}>Precio promedio</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>Cargando…</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>No se entregó ningún producto en este período.</td>
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
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-fg-subtle)', width: '14px' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                        {!hasVariants && <span style={{ width: '14px' }} />}
                        <span>
                          {row.nombre}
                          {row.sku !== '-' && <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 400, color: 'var(--color-fg-muted)' }}>SKU {row.sku}</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.unidades_vendidas}</td>
                      <td style={{ textAlign: 'center' }}>{row.pedidos_unicos}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.precio_promedio)}</td>
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
                          <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>{formatMoney(v.precio_promedio)}</td>
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
