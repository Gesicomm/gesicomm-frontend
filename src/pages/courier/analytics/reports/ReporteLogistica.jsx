import React, { useEffect, useState } from 'react';
import { reportesService } from '../../../../services/reportesApi';

export function ReporteLogistica({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const res = await reportesService.obtenerReporteLogistica(filters);
        setData(res.data || []);
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
          <h2 className="cic-report-title">Couriers</h2>
          <p className="cic-report-desc">Qué courier entrega mejor y cuánto te cuesta cada entrega.</p>
        </div>
      </div>

      {/* Sin tarjeta de "Pedidos entregados": ese número ya está en el
          Dashboard General y en el Resumen operativo. */}
      <div className="cic-table-card">
                <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando…</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Courier</th>
                  <th>% entregado</th>
                  <th style={{ textAlign: 'center' }}>Asignados</th>
                  <th style={{ textAlign: 'center', color: 'var(--color-success)' }}>Entregados</th>
                  <th style={{ textAlign: 'center', color: 'var(--color-danger)' }}>Devueltos</th>
                  <th style={{ textAlign: 'center' }}>En camino</th>
                  <th style={{ textAlign: 'right' }}>Pagado al courier</th>
                  <th style={{ textAlign: 'right' }}>Promedio por envío</th>
                  <th style={{ textAlign: 'right' }}>Costo real por entrega</th>
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
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Ningún pedido salió con courier en este período.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-fg-subtle)', marginTop: '0.75rem' }}>
          % entregado: de los pedidos que el courier ya cerró (entregados o devueltos), cuántos llegaron. No cuenta los que siguen en camino.
          <br/>
          Costo real por entrega: todo lo que le pagaste, devoluciones incluidas, dividido por los pedidos que sí entregó.
        </p>
      </div>
    </div>
  );
}
