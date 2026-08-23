import React, { useState, useEffect, useMemo } from 'react';
import { PiggyBank, TrendingDown, Wallet, Percent, Repeat, Package } from 'lucide-react';
import { getMetricasDashboardPedidos } from '../../../../services/courierApi';
import { costosGastosService } from '../../../../services/costosGastosService';
import { formatGs } from '../../../../lib/courier';
import '../../CentroInteligenciaComercial.css';

const GRUPO_LABELS = {
  operacion: 'Operación', administracion: 'Administración', marketing: 'Marketing',
  tecnologia: 'Tecnología', financiero: 'Financiero', otros: 'Otros',
};

function mesLabel(mes) {
  if (!mes) return '—';
  const [y, m] = mes.split('-');
  const NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${NOMBRES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export function ReporteRentabilidad({ filters }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [desglose, setDesglose] = useState(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line
  }, [filters]);

  const cargar = async () => {
    setLoading(true);
    try {
      const payload = {
        periodo: filters.periodo,
        mes: filters.periodo === 'personalizado_mes' ? filters.mes : undefined,
        anio: filters.anio,
        confirmador: filters.confirmador,
        courier_id: filters.courierId,
        origen: filters.origen,
      };
      const [resKpis, resDesglose] = await Promise.all([
        getMetricasDashboardPedidos(payload),
        costosGastosService.reporteDesglose({}),
      ]);
      setKpis(resKpis.kpis);
      setDesglose(resDesglose);
    } catch (err) {
      console.error('Error cargando reporte de rentabilidad:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxEvolucion = useMemo(() => {
    if (!desglose?.evolucion_mensual?.length) return 1;
    return Math.max(1, ...desglose.evolucion_mensual.flatMap(m => [m.ingresos, m.costos + m.gastos]));
  }, [desglose]);

  if (loading && !kpis) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="animate-spin" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px', border: '3px solid #3d5fa3', borderTopColor: 'transparent', borderRadius: '50%' }} />
        Calculando rentabilidad real del negocio...
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="cic-wrapper" style={{ marginTop: '1rem' }}>
      {/* KPIs de rentabilidad */}
      <div className="cic-kpis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #2e4a85' }}>
          <div className="cic-kpi-header"><span>Margen Bruto</span><Wallet size={16} style={{ color: '#d4a537' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#d4a537' }}>{formatGs(kpis.margen_bruto_estimado)}</div>
          <div className="cic-kpi-sub">{kpis.pct_margen_bruto}% — ya neto de COGS, comisión, logística e IVA</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #f43f5e' }}>
          <div className="cic-kpi-header"><span>Costos y Gastos</span><TrendingDown size={16} style={{ color: '#fb7185' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#fb7185' }}>{formatGs(kpis.gastos_operativos + kpis.costos_operativos_adicionales)}</div>
          <div className="cic-kpi-sub">Registrados en Finanzas → Costos y Gastos</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="cic-kpi-header"><span>Ganancia Neta</span><PiggyBank size={16} style={{ color: '#34d399' }} /></div>
          <div className="cic-kpi-val" style={{ color: kpis.ganancia_neta_estimada >= 0 ? '#34d399' : '#fb7185' }}>{formatGs(kpis.ganancia_neta_estimada)}</div>
          <div className="cic-kpi-sub">Ingresos − costos de venta − costos y gastos</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="cic-kpi-header"><span>Margen Neto</span><Percent size={16} style={{ color: '#5b8fd6' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#5b8fd6' }}>{kpis.pct_margen_neto}%</div>
          <div className="cic-kpi-sub">Ganancia neta sobre ventas</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="cic-kpi-header"><span>Comprometido / mes</span><Repeat size={16} style={{ color: '#fbbf24' }} /></div>
          <div className="cic-kpi-val" style={{ color: '#fbbf24' }}>{formatGs(desglose?.gastos_recurrentes_mensuales || 0)}</div>
          <div className="cic-kpi-sub">Gastos recurrentes activos, mensualizados</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Evolución mensual */}
        <div className="cic-table-card" style={{ margin: 0 }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title">Evolución Mensual</h3>
              <p className="cic-card-subtitle">Ingresos vs. costos y gastos registrados, últimos meses</p>
            </div>
          </div>
          {desglose?.evolucion_mensual?.length > 0 ? (
            <div className="cic-sparkline-box" style={{ height: '220px', padding: '1.5rem 1rem 1rem 1rem', gap: '1.5rem' }}>
              {desglose.evolucion_mensual.map((m, idx) => {
                const hIngresos = Math.max(2, (m.ingresos / maxEvolucion) * 100);
                const hEgresos = Math.max(2, ((m.costos + m.gastos) / maxEvolucion) * 100);
                return (
                  <div key={idx} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%' }}>
                      <div style={{ width: '8px', height: `${hIngresos}%`, background: '#10b981', borderRadius: '4px' }} title={`Ingresos: ${formatGs(m.ingresos)}`} />
                      <div style={{ width: '8px', height: `${hEgresos}%`, background: '#f43f5e', borderRadius: '4px' }} title={`Costos y gastos: ${formatGs(m.costos + m.gastos)}`} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{mesLabel(m.mes)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Todavía no hay suficientes datos para mostrar la evolución mensual.
            </div>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', padding: '0 1rem 1rem 1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981', display: 'inline-block' }} /> Ingresos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#f43f5e', display: 'inline-block' }} /> Costos y gastos</span>
          </div>
        </div>

        {/* Gastos por categoría */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#fff' }}>Gastos por Categoría</h3>
          {desglose?.gastos_por_categoria?.length > 0 ? desglose.gastos_por_categoria.slice(0, 8).map(c => (
            <div key={c.categoria_id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{c.nombre}</span>
                <span style={{ color: '#94a3b8' }}>{formatGs(c.total)}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.pct}%`, background: '#2e4a85', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>{GRUPO_LABELS[c.grupo] || c.grupo} · {c.pct}%</div>
            </div>
          )) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
              Todavía no registraste costos o gastos en este período.
            </div>
          )}
        </div>
      </div>

      {/* Top gastos */}
      {desglose?.top_gastos?.length > 0 && (
        <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
          <div className="cic-card-header">
            <div>
              <h3 className="cic-card-title"><Package size={18} style={{ color: '#2e4a85' }} /> Principales Costos y Gastos</h3>
              <p className="cic-card-subtitle">Los montos más altos registrados en el período</p>
            </div>
          </div>
          <div className="cic-table-wrapper">
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {desglose.top_gastos.map(g => (
                  <tr key={g.id}>
                    <td>{g.concepto}</td>
                    <td>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', ...(g.tipo === 'costo' ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { background: 'rgba(46, 74, 133,0.15)', color: '#3d5fa3' }) }}>
                        {g.tipo === 'costo' ? 'Costo' : 'Gasto'}
                      </span>
                    </td>
                    <td>{g.categoria?.nombre || '—'}</td>
                    <td>{g.fecha}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatGs(g.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
