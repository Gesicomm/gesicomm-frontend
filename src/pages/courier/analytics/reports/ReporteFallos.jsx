import React, { useEffect, useState } from 'react';
import { XOctagon, TrendingDown, ShieldAlert, ArchiveX } from 'lucide-react';
import { reportesService } from '../../../../services/reportesApi';

export function ReporteFallos({ filters }) {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    pedidos_fallidos: 0,
    tasa_fallo: 0,
    venta_potencial_no_realizada: 0,
    costo_operativo_asociado: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      try {
        const response = await reportesService.obtenerReporteFallos(filters);
        setData(response.data || []);
        if (response.kpis) {
          setKpis(response.kpis);
        }
      } catch (error) {
        console.error('Error fetching fallos:', error);
      }
      setLoading(false);
    };
    fetchDatos();
  }, [filters]);

  const formatMoney = (val) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

  return (
    <div className="cic-report-container animate-fade-in">
      <div className="cic-report-header">
        <div>
          <h2 className="cic-report-title">Pedidos que no se entregaron</h2>
          <p className="cic-report-desc">Por qué se cayeron, cuánto dejaste de vender y cuánto te costó igual.</p>
        </div>
      </div>

      <div className="cic-kpi-grid">
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">No entregados <XOctagon size={14}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-danger)' }}>{kpis.pedidos_fallidos}</div>
          <div className="cic-kpi-sub">Cancelados, rechazados, devueltos o perdidos</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Cuántos se caen <TrendingDown size={14}/></div>
          <div className="cic-kpi-val">{Number(kpis.tasa_fallo).toFixed(1)}%</div>
          <div className="cic-kpi-sub">De los pedidos que ya terminaron</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Dejaste de vender <ArchiveX size={14}/></div>
          <div className="cic-kpi-val">{formatMoney(kpis.venta_potencial_no_realizada)}</div>
          <div className="cic-kpi-sub">Lo que hubieras cobrado si se entregaban</div>
        </div>
        <div className="cic-kpi-card">
          <div className="cic-kpi-header">Te costó igual <ShieldAlert size={14}/></div>
          <div className="cic-kpi-val" style={{ color: 'var(--color-warning)' }}>{formatMoney(kpis.costo_operativo_asociado)}</div>
          <div className="cic-kpi-sub">Envíos que le pagaste al courier</div>
        </div>
      </div>

      <div className="cic-table-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="cic-card-title" style={{ marginBottom: '1rem' }}>Por qué no se entregaron</h3>
        <div className="cic-table-wrapper">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-fg-muted)' }}>Cargando…</div>
          ) : (
            <table className="cic-table">
              <thead>
                <tr>
                  <th>Motivo</th>
                  <th style={{ textAlign: 'center' }}>Pedidos</th>
                  <th style={{ textAlign: 'right' }}>% del total</th>
                  <th style={{ textAlign: 'right' }}>Dejaste de vender</th>
                  <th style={{ textAlign: 'right' }}>Costo de envío</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.motivo}</td>
                    <td style={{ textAlign: 'center' }}>{row.pedidos}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-fg-subtle)' }}>{row.participacion.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-fg-muted)' }}>{formatMoney(row.venta_potencial)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-warning)', fontWeight: 'bold' }}>{formatMoney(row.costo_operativo)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Todos los pedidos de este período se entregaron o siguen en curso.</td>
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
