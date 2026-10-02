import React, { useEffect, useState } from 'react';
import { DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { reportesService } from '../../../../services/reportesApi';
import { METRIC_TERMS } from '../../../../utils/metricGlossary';

export function ReporteMetodosPago({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    total_pedidos: 0,
    total_exitosos: 0,
    total_fallidos: 0,
    total_abiertos: 0,
    pedidos_cerrados: 0,
    total_ventas_netas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const response = await reportesService.obtenerReporteMetodosPago(filters);
        setData(response.data || []);
        if (response.kpis) {
          setKpis(response.kpis);
        }
      } catch (error) {
        console.error('Error fetching metodos pago:', error);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

  const renderSuccessBar = (exito) => {
    if (exito === null) return '-';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, background: 'var(--color-fg-subtle)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${exito}%`, background: 'var(--color-success)', height: '100%' }}></div>
        </div>
        <span style={{ fontSize: '0.8rem', minWidth: '35px', textAlign: 'right' }}>{exito.toFixed(1)}%</span>
      </div>
    );
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  const chartData = data.filter(d => d.ventas_netas > 0).map(d => ({
    name: d.nombre,
    value: d.ventas_netas
  }));

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Rendimiento por Métodos de Pago</h2>
          <p className="cic-report-desc">Análisis de participación en ventas netas y tasas de éxito de cada método.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">{METRIC_TERMS.ventasNetas} <DollarSign size={14}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.total_ventas_netas)}</div>
          <div className="cic-kpi-sub">Total en todos los métodos</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos Cerrados <CheckCircle size={14}/></div>
          <div className="cic-kpi-val">{kpis.pedidos_cerrados}</div>
          <div className="cic-kpi-sub">Resolución final alcanzada</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos Abiertos <AlertCircle size={14}/></div>
          <div className="cic-kpi-val">{kpis.total_abiertos}</div>
          <div className="cic-kpi-sub">En tránsito o pendientes</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos Fallidos <XCircle size={14}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{kpis.total_fallidos}</div>
          <div className="cic-kpi-sub">Cancelados / Devueltos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="cic-table-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.85rem', alignSelf: 'flex-start', color: 'var(--color-fg)' }}>Distribución de {METRIC_TERMS.ventasNetas.toLowerCase()}</h3>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 250, marginTop: '1rem' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--color-fg-muted)' }}>Sin {METRIC_TERMS.ventasNetas.toLowerCase()}</div>
          )}
        </div>
        
        <div className="cic-table-card">
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-fg)' }}>Detalle por Método</h3>
          <div className="cic-table-wrapper">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando datos...</div>
            ) : (
              <table className="cic-table">
                <thead>
                  <tr>
                    <th>Método de Pago</th>
                    <th style={{ width: '150px' }}>Tasa de Éxito</th>
                    <th style={{ textAlign: 'center' }}>Exitosos</th>
                    <th style={{ textAlign: 'center' }}>Fallidos</th>
                    <th style={{ textAlign: 'center' }}>Abiertos</th>
                    <th style={{ textAlign: 'right' }}>{METRIC_TERMS.ventasNetas}</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                      <td>{renderSuccessBar(row.tasa_exito)}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>{row.pedidos_exitosos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{row.pedidos_fallidos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>{row.pedidos_abiertos}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(row.ventas_netas)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-fg-subtle)' }}>{row.participacion.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay transacciones.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
