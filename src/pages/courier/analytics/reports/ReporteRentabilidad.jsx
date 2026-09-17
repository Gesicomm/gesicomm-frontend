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
        periodo:    filters.periodo,
        mes:        filters.periodo === 'personalizado_mes' ? filters.mes : undefined,
        anio:       filters.anio,
        // Rango personalizado: el backend lo prioriza sobre el preset
        fecha_desde: filters.periodo === 'personalizado_rango' ? (filters.fecha_desde || undefined) : undefined,
        fecha_hasta: filters.periodo === 'personalizado_rango' ? (filters.fecha_hasta || undefined) : undefined,
        confirmador:    filters.confirmador !== 'TODOS' ? filters.confirmador : undefined,
        courier_id:     filters.courierId !== 'TODOS' ? filters.courierId : undefined,
        canal_venta_id: filters.canal_venta_id !== 'TODOS' ? filters.canal_venta_id : undefined,
      };
      const [resKpis, resDesglose] = await Promise.all([
        getMetricasDashboardPedidos(payload),
        // Bug corregido: antes siempre pasaba {}, ignorando el período seleccionado.
        // Ahora pasa el mismo payload para que los costos/gastos correspondan al rango visible.
        costosGastosService.reporteDesglose(payload),
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
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
        <div className="animate-spin" style={{ margin: '0 auto 1rem auto', width: '28px', height: '28px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        Calculando rentabilidad real del negocio...
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="cic-wrapper" style={{ marginTop: '1rem' }}>
      {/* KPIs de rentabilidad */}
      <div className="cic-kpis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-primary)' }}>
          <div className="cic-kpi-header"><span>Margen Bruto</span><Wallet size={16} style={{ color: 'var(--color-accent-text)' }} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-accent-text)' }}>{formatGs(kpis.margen_bruto_estimado)}</div>
          <div className="cic-kpi-sub">{kpis.pct_margen_bruto}% — ya neto de mercadería, comisión e IVA (el delivery lo paga el cliente)</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-danger)' }}>
          <div className="cic-kpi-header"><span>Costos y Gastos</span><TrendingDown size={16} style={{ color: 'var(--color-danger)' }} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{formatGs(kpis.gastos_operativos + kpis.costos_operativos_adicionales)}</div>
          <div className="cic-kpi-sub">Registrados en Finanzas → Costos y Gastos</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-success)' }}>
          <div className="cic-kpi-header"><span>Ganancia Neta</span><PiggyBank size={16} style={{ color: 'var(--color-success)' }} /></div>
          <div className="cic-kpi-val" style={{ color: kpis.ganancia_neta_estimada >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatGs(kpis.ganancia_neta_estimada)}</div>
          <div className="cic-kpi-sub">Ingresos − costos de venta − costos y gastos</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-primary)' }}>
          <div className="cic-kpi-header"><span>Margen Neto</span><Percent size={16} style={{ color: 'var(--color-primary-text)' }} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>{kpis.pct_margen_neto}%</div>
          <div className="cic-kpi-sub">Ganancia neta sobre ventas</div>
        </div>
        <div className="cic-kpi-card" style={{ borderTop: '3px solid var(--color-warning)' }}>
          <div className="cic-kpi-header"><span>Comprometido / mes</span><Repeat size={16} style={{ color: 'var(--color-warning)' }} /></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-warning)' }}>{formatGs(desglose?.gastos_recurrentes_mensuales || 0)}</div>
          <div className="cic-kpi-sub">Gastos recurrentes activos, mensualizados</div>
        </div>
      </div>

      <div className="cic-content-grid">
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
                      <div style={{ width: '8px', height: `${hIngresos}%`, background: 'var(--color-success)', borderRadius: '4px' }} title={`Ingresos: ${formatGs(m.ingresos)}`} />
                      <div style={{ width: '8px', height: `${hEgresos}%`, background: 'var(--color-danger)', borderRadius: '4px' }} title={`Costos y gastos: ${formatGs(m.costos + m.gastos)}`} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-fg-subtle)' }}>{mesLabel(m.mes)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-subtle)', fontSize: '0.85rem' }}>
              Todavía no hay suficientes datos para mostrar la evolución mensual.
            </div>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', padding: '0 1rem 1rem 1rem', fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block' }} /> Ingresos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-danger)', display: 'inline-block' }} /> Costos y gastos</span>
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="cic-side-stack">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-fg)' }}>Gastos por Categoría</h3>
          {desglose?.gastos_por_categoria?.length > 0 ? desglose.gastos_por_categoria.slice(0, 8).map(c => (
            <div key={c.categoria_id} style={{ padding: '0.75rem 1rem', background: 'color-mix(in srgb, var(--color-fg) 3%, transparent)', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--color-fg)', fontWeight: 600 }}>{c.nombre}</span>
                <span style={{ color: 'var(--color-fg-muted)' }}>{formatGs(c.total)}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'color-mix(in srgb, var(--color-fg) 6%, transparent)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.pct}%`, background: 'var(--color-primary)', borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-fg-subtle)', marginTop: '0.25rem' }}>{GRUPO_LABELS[c.grupo] || c.grupo} · {c.pct}%</div>
            </div>
          )) : (
            <div style={{ color: 'var(--color-fg-subtle)', fontSize: '0.85rem', padding: '1rem', border: '1px dashed color-mix(in srgb, var(--color-fg) 10%, transparent)', borderRadius: '8px', textAlign: 'center' }}>
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
              <h3 className="cic-card-title"><Package size={18} style={{ color: 'var(--color-primary-text)' }} /> Principales Costos y Gastos</h3>
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
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', ...(g.tipo === 'costo' ? { background: 'color-mix(in srgb, var(--color-info) 15%, transparent)', color: 'var(--color-info)' } : { background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary-text)' }) }}>
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
