import React, { useEffect, useState } from 'react';
import { Map, TrendingDown, DollarSign, Target } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';

const SEMAFORO = {
  sin_datos: { label: '⚪ Sin datos', color: 'var(--color-fg-subtle)' },
  bajo:      { label: '🟢 Bajo',      color: 'var(--color-success)' },
  medio:     { label: '🟡 Medio',     color: 'var(--color-warning)' },
  alto:      { label: '🔴 Alto',      color: 'var(--color-danger)' }
};

export function ReporteGeografia({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ ventas_netas_globales: 0, ciudades_activas: 0, ciudad_top: '-' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const res = await reportesService.obtenerReporteGeografia(filters);
        setData(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      } catch (err) {
        console.error('Error fetching geografía:', err);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = v => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(v || 0);

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Análisis por Geografía</h2>
          <p className="cic-report-desc">Rendimiento de ventas y tasas de fallo por ciudad y departamento.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Ventas Netas Globales <DollarSign size={14}/></div>
          <div className="cic-kpi-val">{formatMoney(kpis.ventas_netas_globales)}</div>
          <div className="cic-kpi-sub">Total entregados en el período</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Ciudades Activas <Map size={14}/></div>
          <div className="cic-kpi-val">{kpis.ciudades_activas}</div>
          <div className="cic-kpi-sub">Con al menos 1 venta entregada</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Ciudad Top <Target size={14}/></div>
          <div className="cic-kpi-val" style={{ fontSize: '1.1rem' }}>{kpis.ciudad_top}</div>
          <div className="cic-kpi-sub">Mayor volumen de ventas</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-fg)', margin: 0 }}>Detalle Departamento → Ciudad</h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--color-fg-muted)' }}>
            <span>⚪ &lt;10 pedidos cerrados</span>
            <span>🟢 Fallo &lt;15%</span>
            <span>🟡 15–30%</span>
            <span>🔴 &gt;30%</span>
          </div>
        </div>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando datos...</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Ciudad</th>
                  <th style={{ textAlign: 'center' }}>Exitosos</th>
                  <th style={{ textAlign: 'center' }}>Fallidos</th>
                  <th style={{ textAlign: 'center' }}>Tasa de Fallo</th>
                  <th style={{ textAlign: 'right' }}>Ventas Netas</th>
                  <th style={{ textAlign: 'right' }}>% de Ventas</th>
                  <th style={{ textAlign: 'right' }}>Ticket Prom.</th>
                  <th>Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const sem = SEMAFORO[row.semaforo] || SEMAFORO.sin_datos;
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--color-fg-muted)', fontSize: '0.8rem' }}>{row.departamento || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{row.ciudad}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>{row.pedidos_exitosos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{row.pedidos_fallidos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>
                        {row.tasa_fallo !== null ? `${row.tasa_fallo.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(row.ventas_netas)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-subtle)' }}>{row.participacion_ventas.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.ticket_promedio)}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: sem.color, fontWeight: 600 }}>{sem.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Sin pedidos cerrados en este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
