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
        <div style={{ flex: 1, background: 'color-mix(in srgb, var(--color-fg) 10%, transparent)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${exito}%`, background: 'var(--color-success)', height: '100%' }}></div>
        </div>
        <span style={{ fontSize: '0.875rem', minWidth: '45px', textAlign: 'right' }}>{exito.toFixed(1)}%</span>
      </div>
    );
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  // Sin entregas todavía, la torta de ventas quedaba vacía: se reparte por
  // cantidad de pedidos, que ya dice qué métodos elige la gente.
  const hayVentas = data.some(d => d.ventas_netas > 0);
  const chartData = data
    .map(d => ({
      name: d.nombre,
      value: hayVentas ? d.ventas_netas : (d.pedidos_exitosos + d.pedidos_fallidos + d.pedidos_abiertos),
    }))
    .filter(d => d.value > 0);

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Métodos de pago</h2>
          <p className="cic-report-desc">Análisis de participación en ventas netas y tasas de éxito de cada método.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>{METRIC_TERMS.ventasNetas}</span><DollarSign size={16}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>{formatMoney(kpis.total_ventas_netas)}</div>
          <div className="cic-kpi-sub">Total en todos los métodos</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>Pedidos cerrados</span><CheckCircle size={16}/></div>
          <div className="cic-kpi-val">{kpis.pedidos_cerrados}</div>
          <div className="cic-kpi-sub">Entregados, cancelados o devueltos</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>Pedidos abiertos</span><AlertCircle size={16}/></div>
          <div className="cic-kpi-val">{kpis.total_abiertos}</div>
          <div className="cic-kpi-sub">En tránsito o pendientes</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header"><span>Pedidos fallidos</span><XCircle size={16}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{kpis.total_fallidos}</div>
          <div className="cic-kpi-sub">Cancelados, devueltos o perdidos</div>
        </div>
      </div>

      <div className="cic-split" style={{ marginTop: '1.5rem' }}>
        <div className="cic-table-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="cic-card-title" style={{ alignSelf: 'flex-start' }}>{hayVentas ? `Distribución de ${METRIC_TERMS.ventasNetas.toLowerCase()}` : 'Pedidos por método'}</h3>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => (hayVentas ? formatMoney(value) : `${value} pedidos`)} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-fg)' }} />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <ul className="cic-leyenda">
                {chartData.map((d, i) => (
                  <li key={d.name}>
                    <span className="cic-leyenda-punto" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name}
                    <strong>{hayVentas ? formatMoney(d.value) : `${d.value} pedidos`}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--color-fg-muted)' }}>Sin pedidos en el período</div>
          )}
        </div>
        
        <div className="cic-table-card">
          <h3 className="cic-card-title" style={{ marginBottom: '1rem' }}>Detalle por método</h3>
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
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay pedidos en este período.</td>
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
