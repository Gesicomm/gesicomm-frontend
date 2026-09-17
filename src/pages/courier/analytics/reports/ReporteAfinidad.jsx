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
          <h2 className="cic-report-title">Afinidad de Productos</h2>
          <p className="cic-report-desc">
            Descubrí qué productos suelen comprarse juntos. Las tasas A→B y B→A indican qué porcentaje
            de compradores de cada producto también adquirió el otro.
          </p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pares Detectados <Shuffle size={14}/></div>
          <div className="cic-kpi-val">{kpis.pares_detectados}</div>
          <div className="cic-kpi-sub">Combinaciones únicas encontradas</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Pedidos Analizados <BarChart2 size={14}/></div>
          <div className="cic-kpi-val">{kpis.pedidos_exitosos_analizados}</div>
          <div className="cic-kpi-sub">Con productos identificables</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Par Más Frecuente <DollarSign size={14}/></div>
          <div className="cic-kpi-val" style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{kpis.par_top}</div>
          <div className="cic-kpi-sub">Por cantidad de pedidos conjuntos</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-fg)', margin: 0 }}>Tabla de Afinidad</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)' }}>
            A→B: % de compradores de A que también compraron B
          </span>
        </div>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Analizando pedidos...</div>
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
                  <th style={{ textAlign: 'center' }}>Pedidos Juntos</th>
                  <th style={{ textAlign: 'center' }}>Total A</th>
                  <th style={{ textAlign: 'center' }}>Total B</th>
                  <th style={{ textAlign: 'center' }}>A → B</th>
                  <th style={{ textAlign: 'center' }}>B → A</th>
                  <th style={{ textAlign: 'right' }}>Ventas Combinadas</th>
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
          <p style={{ fontSize: '0.72rem', color: 'var(--color-fg-subtle)', marginTop: '0.75rem' }}>
            * Analizamos qué productos se compran juntos en un mismo pedido, sin importar las cantidades (ej. llevar 3 unidades del Producto A y 2 del B cuenta como una sola compra conjunta).
          </p>
        )}
      </div>
    </div>
  );
}
