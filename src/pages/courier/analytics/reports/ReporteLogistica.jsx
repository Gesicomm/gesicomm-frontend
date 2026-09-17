import React, { useEffect, useState } from 'react';
import { Truck, CheckCircle, RotateCcw, DollarSign } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';

export function ReporteLogistica({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ total_entregados: 0, couriers_activos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const res = await reportesService.obtenerReporteLogistica(filters);
        setData(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      } catch (err) {
        console.error('Error fetching logística:', err);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = v => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(v || 0);

  const renderTasaBarra = (tasa) => {
    if (tasa === null) return <span style={{ color: 'var(--color-fg-subtle)', fontSize: '0.8rem' }}>—</span>;
    const color = tasa >= 80 ? 'var(--color-success)' : tasa >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, background: 'color-mix(in srgb, var(--color-fg) 8%, transparent)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${tasa}%`, background: color, height: '100%', transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.8rem', minWidth: '38px', textAlign: 'right', color }}>{tasa.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Desempeño Logístico por Courier</h2>
          <p className="cic-report-desc">Análisis de tasa de entrega, costos y volumen operativo por operador logístico.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos Entregados <CheckCircle size={14}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{kpis.total_entregados}</div>
          <div className="cic-kpi-sub">Total exitosos en el período</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Couriers Activos <Truck size={14}/></div>
          <div className="cic-kpi-val">{kpis.couriers_activos}</div>
          <div className="cic-kpi-sub">Con pedidos asignados en período</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-fg)' }}>Comparativa de Couriers</h3>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando datos...</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Courier</th>
                  <th>Tasa de Entrega</th>
                  <th style={{ textAlign: 'center' }}>Asignados</th>
                  <th style={{ textAlign: 'center', color: 'var(--color-success)' }}>Entregados</th>
                  <th style={{ textAlign: 'center', color: 'var(--color-danger)' }}>Devueltos</th>
                  <th style={{ textAlign: 'center' }}>En Tránsito</th>
                  <th style={{ textAlign: 'right' }}>Costo Total</th>
                  <th style={{ textAlign: 'right' }}>Costo Promedio</th>
                  <th style={{ textAlign: 'right' }}>Costo por Entrega</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                    <td style={{ width: '180px' }}>{renderTasaBarra(row.tasa_entrega)}</td>
                    <td style={{ textAlign: 'center' }}>{row.pedidos_asignados}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>{row.pedidos_entregados}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{row.pedidos_devueltos}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>{row.pedidos_en_transito}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.costo_total_envio)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.costo_promedio_envio)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {row.costo_por_entrega_exitosa !== null ? formatMoney(row.costo_por_entrega_exitosa) : '—'}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Sin pedidos logísticos en este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-fg-subtle)', marginTop: '0.75rem' }}>
          * Tasa de entrega calculada sobre pedidos cerrados (entregados + devueltos). Excluye pedidos en tránsito y cancelados.
          <br/>
          * Costo por entrega exitosa = costo logístico total ÷ pedidos entregados (incluye el costo de devoluciones).
        </p>
      </div>
    </div>
  );
}
