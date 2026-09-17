import React, { useState, useEffect } from 'react';
import { reportesService } from '../../../../services/reportesApi';

export function ReporteComposicion({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ rendimiento_carrito: 0, ventas_estrategicas: 0, ventas_netas: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await reportesService.obtenerReporteComposicion({
        ...filters,
        pagina: 1,
        limite: 100
      });
      setData(response.data || []);
      setKpis(response.kpis || { rendimiento_carrito: 0, ventas_estrategicas: 0, ventas_netas: 0 });
    } catch (error) {
      console.error("Error al obtener reporte de composicion:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [filters]);

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val || 0);

  return (
    <div className="cic-report-container">
      {/* Sub-Header */}
      <div className="cic-card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="cic-card-title">Composición de Pedidos (Ventas Estratégicas)</h2>
          <p className="cic-card-subtitle" style={{ marginTop: '0.25rem' }}>
            Desglose de facturación por rol comercial (Base, Order Bump, Upsell).
          </p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="cic-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="cic-kpi-card">
          <div className="cic-kpi-val" style={{ color: 'var(--color-primary-text)' }}>
            {kpis.rendimiento_carrito.toFixed(1)}%
          </div>
          <div className="cic-kpi-sub">Rendimiento del Carrito (Pedidos con Bump/Upsell)</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-val" style={{ color: 'var(--color-success)' }}>
            {formatMoney(kpis.ventas_estrategicas)}
          </div>
          <div className="cic-kpi-sub">Ventas Estratégicas (Ingreso por Bumps/Upsells)</div>
        </div>
      </div>

      <div className="cic-table-wrapper" style={{ minHeight: '300px' }}>
        <table className="cic-table">
          <thead>
            <tr>
              <th>Rol Comercial</th>
              <th style={{ textAlign: 'center' }}>Unidades Vendidas</th>
              <th style={{ textAlign: 'center' }}>Pedidos Únicos</th>
              <th style={{ textAlign: 'right' }}>% Participación</th>
              <th style={{ textAlign: 'right' }}>Precio Promedio</th>
              <th style={{ textAlign: 'right', color: 'var(--color-success)' }}>Ventas Netas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>Cargando reporte...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)' }}>No hay datos para este período.</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                  <td style={{ textAlign: 'center' }}>{row.unidades_vendidas}</td>
                  <td style={{ textAlign: 'center' }}>{row.pedidos_unicos}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-fg-subtle)' }}>{row.participacion.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.precio_promedio)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{formatMoney(row.ventas_netas)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}