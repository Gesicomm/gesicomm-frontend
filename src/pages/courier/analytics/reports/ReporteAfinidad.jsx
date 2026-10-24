import React, { useEffect, useState } from 'react';
import { Shuffle, BarChart2, DollarSign } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';

export function ReporteAfinidad({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({ pares_detectados: 0, pedidos_exitosos_analizados: 0, par_top: '-' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const res = await reportesService.obtenerReporteCrossSelling(filters);
        setData(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      } catch (err) {
        console.error('Error fetching afinidad:', err);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = v => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(v || 0);

  const renderPct = (pct) => {
    const color = pct >= 50 ? 'var(--color-success)' : pct >= 20 ? 'var(--color-warning)' : 'var(--color-fg-muted)';
    return <span style={{ color, fontWeight: pct >= 20 ? 700 : 400 }}>{pct.toFixed(1)}%</span>;
  };

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Productos que se compran juntos</h2>
          <p className="cic-report-desc">
            Qué productos tus clientes llevan en el mismo pedido. Sirve para armar combos y elegir la oferta
            del checkout.
          </p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Combinaciones <Shuffle size={14}/></div>
          <div className="cic-kpi-val">{kpis.pares_detectados}</div>
          <div className="cic-kpi-sub">Pares de productos que salieron juntos</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos revisados <BarChart2 size={14}/></div>
          <div className="cic-kpi-val">{kpis.pedidos_exitosos_analizados}</div>
          <div className="cic-kpi-sub">Entregados en el período</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">La pareja más vendida <DollarSign size={14}/></div>
          <div className="cic-kpi-val" style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{kpis.par_top}</div>
          <div className="cic-kpi-sub">Buena candidata para un combo</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="cic-card-title" style={{ margin: 0 }}>Qué se lleva con qué</h3>
        </div>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando…</div>
          ) : data.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>
              No hay pedidos con 2 o más productos distintos en este período.
              <br/>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-subtle)' }}>
                La afinidad requiere pedidos con múltiples productos identificables.
              </span>
            </div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Producto A</th>
                  <th>Producto B</th>
                  <th style={{ textAlign: 'center' }}>Pedidos juntos</th>
                  <th style={{ textAlign: 'center' }}>Pedidos con A</th>
                  <th style={{ textAlign: 'center' }}>Pedidos con B</th>
                  <th style={{ textAlign: 'center' }}>Quien compra A, suma B</th>
                  <th style={{ textAlign: 'center' }}>Quien compra B, suma A</th>
                  <th style={{ textAlign: 'right' }}>Vendido en esos pedidos</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.producto_a}</td>
                    <td style={{ fontWeight: 600 }}>{row.producto_b}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.pedidos_juntos}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>{row.pedidos_producto_a}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>{row.pedidos_producto_b}</td>
                    <td style={{ textAlign: 'center' }}>{renderPct(row.tasa_a_con_b)}</td>
                    <td style={{ textAlign: 'center' }}>{renderPct(row.tasa_b_con_a)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>
                      {formatMoney(row.ventas_pedidos_combinados)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data.length > 0 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-fg-subtle)', marginTop: '0.75rem' }}>
            Ejemplo: si en «Quien compra A, suma B» dice 30%, de cada 10 pedidos con el producto A, 3 también llevaron el B. No importa cuántas unidades de cada uno.
          </p>
        )}
      </div>
    </div>
  );
}
