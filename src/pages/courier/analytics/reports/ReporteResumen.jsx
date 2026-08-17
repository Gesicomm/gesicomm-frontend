import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, CheckCircle2, Truck, RotateCcw,
  AlertTriangle, DollarSign, Trophy
} from 'lucide-react';
import { getMetricasDashboardPedidos } from '../../../../services/courierApi';
import { formatGs } from '../../../../lib/courier';
import '../../CentroInteligenciaComercial.css';

export function ReporteResumen({ filters, setConfirmadoresDisponibles }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [metricaTendencia, setMetricaTendencia] = useState('pedidos'); // pedidos, confirmados, entregados, devueltos

  useEffect(() => {
    cargarMetricas();
  }, [filters]);

  const cargarMetricas = async () => {
    try {
      setLoading(true);
      const payload = {
        periodo: filters.periodo,
        mes: filters.periodo === 'personalizado_mes' ? filters.mes : undefined,
        anio: filters.anio,
        confirmador: filters.confirmador,
        courier_id: filters.courierId,
        origen: filters.origen,
      };
      const res = await getMetricasDashboardPedidos(payload);
      setData(res);
      if (res.confirmadores_disponibles && setConfirmadoresDisponibles) {
        setConfirmadoresDisponibles(res.confirmadores_disponibles);
      }
    } catch (err) {
      console.error('Error cargando métricas analíticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="animate-spin" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%' }} />
        Calculando métricas comerciales y ejecutivas...
      </div>
    );
  }

  if (!data) return null;

  const funnel = data.funnel;
  const kpis = data.kpis;

  return (
    <div className="cic-wrapper" style={{ marginTop: '1rem' }}>
      
      {/* KPIs PRINCIPALES (5-7 métricas ejecutivas) */}
      <div className="cic-kpis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="cic-kpi-header"><span>Pedidos Creados</span><Package size={16} style={{ color: '#60a5fa' }} /></div>
          <div className="cic-kpi-val">{funnel.total_creados}</div>
          <div className="cic-kpi-sub">Volumen base del período</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="cic-kpi-header"><span>Confirmados</span><CheckCircle2 size={16} style={{ color: '#34d399' }} /></div>
          <div className="cic-kpi-val">{funnel.confirmados}</div>
          <div className="cic-kpi-sub">{funnel.tasa_confirmacion}% Tasa de Confirmación</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="cic-kpi-header"><span>Entregados</span><Trophy size={16} style={{ color: '#22d3ee' }} /></div>
          <div className="cic-kpi-val">{funnel.entregados}</div>
          <div className="cic-kpi-sub">{funnel.tasa_entrega}% Tasa de Entrega</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="cic-kpi-header"><span>Facturación Entregada</span><DollarSign size={16} style={{ color: '#c084fc' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#c084fc' }}>{formatGs(kpis.facturacion_entregada)}</div>
          <div className="cic-kpi-sub">Ingreso real bruto</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="cic-kpi-header"><span>Margen Bruto Est.</span><TrendingUp size={16} style={{ color: '#fbbf24' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#fbbf24' }}>{formatGs(kpis.margen_bruto_estimado)}</div>
          <div className="cic-kpi-sub">{kpis.pct_margen_bruto}% sobre ventas</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* FUNNEL SIMPLIFICADO */}
        <div className="cic-funnel-card" style={{ margin: 0 }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title">Embudo Comercial</h3>
              <p className="cic-card-subtitle">Conversión end-to-end de los pedidos</p>
            </div>
          </div>
          <div className="cic-funnel-track">
            {/* Creados */}
            <div className="cic-funnel-step step-created">
              <div className="cic-step-head"><span>1. Creados</span></div>
              <div className="cic-step-val">{funnel.total_creados}</div>
              <div className="cic-step-progress-bar"><div className="cic-step-progress-fill" style={{ width: '100%', background: '#3b82f6' }} /></div>
            </div>
            {/* Confirmados */}
            <div className="cic-funnel-step step-confirmed">
              <div className="cic-step-head"><span>2. Confirmados</span></div>
              <div className="cic-step-val">{funnel.confirmados}</div>
              <div className="cic-step-rate-badge rate-green">{funnel.tasa_confirmacion}% de creados</div>
              <div className="cic-step-progress-bar"><div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_confirmacion)}%`, background: '#10b981' }} /></div>
            </div>
            {/* Despachados */}
            <div className="cic-funnel-step step-dispatched">
              <div className="cic-step-head"><span>3. Despachados</span></div>
              <div className="cic-step-val">{funnel.despachados}</div>
              <div className="cic-step-rate-badge rate-purple">{funnel.tasa_despacho}% de confirmados</div>
              <div className="cic-step-progress-bar"><div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_despacho)}%`, background: '#8b5cf6' }} /></div>
            </div>
            {/* Entregados */}
            <div className="cic-funnel-step step-delivered">
              <div className="cic-step-head"><span>4. Entregados</span></div>
              <div className="cic-step-val">{funnel.entregados}</div>
              <div className="cic-step-rate-badge rate-green">{funnel.tasa_entrega}% de despachados</div>
              <div className="cic-step-progress-bar"><div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_entrega)}%`, background: '#06b6d4' }} /></div>
            </div>
            {/* Devueltos */}
            <div className="cic-funnel-step step-returned">
              <div className="cic-step-head"><span>5. Devueltos</span></div>
              <div className="cic-step-val">{funnel.devueltos}</div>
              <div className="cic-step-rate-badge rate-red">{funnel.tasa_devolucion}% de despachados</div>
              <div className="cic-step-progress-bar"><div className="cic-step-progress-fill" style={{ width: `${Math.min(100, funnel.tasa_devolucion)}%`, background: '#f43f5e' }} /></div>
            </div>
          </div>
        </div>

        {/* INSIGHTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#fff' }}>Insights Importantes</h3>
          {data.insights && data.insights.slice(0, 4).map((ins, i) => {
            let iconClass = 'icon-info';
            if (ins.tipo === 'positivo') iconClass = 'icon-positivo';
            if (ins.tipo === 'alerta') iconClass = 'icon-alerta';
            if (ins.tipo === 'critico') iconClass = 'icon-critico';
            return (
              <div key={i} className="cic-insight-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '1rem' }}>
                <div className={`cic-insight-icon ${iconClass}`} style={{ marginTop: '0.2rem' }}>
                  {ins.tipo === 'positivo' ? <Trophy size={18} /> : ins.tipo === 'critico' ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.3rem 0', color: '#fff' }}>{ins.titulo}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{ins.mensaje}</p>
                </div>
              </div>
            );
          })}
          {(!data.insights || data.insights.length === 0) && (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
              No se detectaron alertas o insights relevantes en este período.
            </div>
          )}
        </div>
      </div>

      {/* TENDENCIA PRINCIPAL */}
      {data.tendencias && data.tendencias.length > 0 && (
        <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title"><TrendingUp size={18} style={{ color: '#3b82f6' }}/> Evolución Temporal</h3>
            </div>
            <select 
              className="cic-select" 
              style={{ width: 'auto' }}
              value={metricaTendencia}
              onChange={(e) => setMetricaTendencia(e.target.value)}
            >
              <option value="pedidos">Pedidos Creados</option>
              <option value="confirmados">Confirmados</option>
              <option value="entregados">Entregados</option>
              <option value="devueltos">Devueltos</option>
            </select>
          </div>
          <div className="cic-sparkline-box" style={{ height: '200px', padding: '1.5rem 1rem 1rem 1rem' }}>
            {data.tendencias.map((t, idx) => {
              const maxV = Math.max(...data.tendencias.map(x => x[metricaTendencia]), 1);
              const h = Math.max(5, (t[metricaTendencia] / maxV) * 100);
              let color = '#3b82f6';
              if (metricaTendencia === 'confirmados') color = '#10b981';
              if (metricaTendencia === 'entregados') color = '#06b6d4';
              if (metricaTendencia === 'devueltos') color = '#f43f5e';
              
              return (
                <div key={idx} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: `${h}%`, background: color, borderRadius: '4px', transition: 'height 0.4s ease' }} title={`${t.fecha}: ${t[metricaTendencia]}`} />
                  <div style={{ fontSize: '0.6rem', color: '#64748b', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '5px' }}>
                    {t.fecha.split('-').slice(1).join('/')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
