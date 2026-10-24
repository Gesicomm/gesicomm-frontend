import React, { useEffect, useState } from 'react';
import { Map, TrendingDown, Target } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { METRIC_TERMS } from '../../../../utils/metricGlossary';

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
          <h2 className="cic-report-title">Ciudades</h2>
          <p className="cic-report-desc">Dónde vendés más y dónde se te devuelven más pedidos.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        {/* El total de ventas netas ya está en el Dashboard General. */}
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Ciudades con ventas <Map size={14}/></div>
          <div className="cic-kpi-val">{kpis.ciudades_activas}</div>
          <div className="cic-kpi-sub">Con al menos 1 venta entregada</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">La que más compra <Target size={14}/></div>
          <div className="cic-kpi-val" style={{ fontSize: '1.1rem' }}>{kpis.ciudad_top}</div>
          <div className="cic-kpi-sub">Por monto vendido</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="cic-card-title" style={{ margin: 0 }}>Por ciudad</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--color-fg-muted)' }}>
            <span>⚪ &lt;10 pedidos cerrados</span>
            <span>🟢 Se cae menos del 15%</span>
            <span>🟡 15–30%</span>
            <span>🔴 &gt;30%</span>
          </div>
        </div>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando…</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Ciudad</th>
                  <th style={{ textAlign: 'center' }}>Entregados</th>
                  <th style={{ textAlign: 'center' }}>No entregados</th>
                  <th style={{ textAlign: 'center' }}>% que se cae</th>
                  <th style={{ textAlign: 'right' }}>{METRIC_TERMS.ventasNetas}</th>
                  <th style={{ textAlign: 'right' }}>% de {METRIC_TERMS.ventasNetas.toLowerCase()}</th>
                  <th style={{ textAlign: 'right' }}>{METRIC_TERMS.ticketPromedio}</th>
                  <th>Riesgo de envío</th>
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
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Todavía no hay pedidos entregados ni devueltos en este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
