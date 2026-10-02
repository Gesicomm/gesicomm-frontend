import React, { useEffect, useState } from 'react';
import { User, Users, Star, ArrowRight } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';
import { METRIC_TERMS } from '../../../../utils/metricGlossary';

export function ReporteClientes({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    clientes_con_pedido: 0,
    clientes_compradores: 0,
    clientes_recurrentes: 0,
    tasa_conversion_pedido: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const response = await reportesService.obtenerReporteClientes(filters);
        setData(response.data || []);
        if (response.kpis) {
          setKpis(response.kpis);
        }
      } catch (error) {
        console.error('Error fetching clientes:', error);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PY');
  };

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Clientes y Conversión</h2>
          <p className="cic-report-desc">Análisis de adquisición, retención y valor histórico del cliente (LTV).</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Clientes con pedido <User size={14}/></div>
          <div className="cic-kpi-val">{kpis.clientes_con_pedido}</div>
          <div className="cic-kpi-sub">Total que inició checkout</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Clientes compradores <Users size={14}/></div>
          <div className="cic-kpi-val">{kpis.clientes_compradores}</div>
          <div className="cic-kpi-sub">Al menos 1 pedido exitoso</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Tasa de Conversión <ArrowRight size={14}/></div>
          <div className="cic-kpi-val">{Number(kpis.tasa_conversion_pedido).toFixed(1)}%</div>
          <div className="cic-kpi-sub">Compradores / Con pedido</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Clientes Recurrentes <Star size={14}/></div>
          <div className="cic-kpi-val">{kpis.clientes_recurrentes}</div>
          <div className="cic-kpi-sub">2 o más compras históricas</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-fg)' }}>Mejores Clientes (Valor Histórico)</h3>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando datos...</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th style={{ textAlign: 'center' }}>Pedidos Exitosos</th>
                  <th style={{ textAlign: 'right' }}>Total Comprado</th>
                  <th style={{ textAlign: 'right' }}>{METRIC_TERMS.ticketPromedio} histórico</th>
                  <th style={{ textAlign: 'center' }}>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                    <td>{row.telefono}</td>
                    <td style={{ textAlign: 'center' }}>{row.pedidos_exitosos}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{formatMoney(row.total_comprado)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.ticket_promedio)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-fg-subtle)' }}>{formatDate(row.ultima_compra)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No hay compradores en este período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
