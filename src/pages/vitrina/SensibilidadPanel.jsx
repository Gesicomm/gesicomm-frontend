import React, { useState, useEffect } from 'react';
import { X, Loader, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import './vitrina.css';

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return (Number(n) * 100).toFixed(2) + '%';
}

export default function SensibilidadPanel({ item, onClose }) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    const promesa = item.tipo === 'combo'
      ? vitrinaService.sensibilidadCombo(item.id)
      : vitrinaService.sensibilidadProducto(item.id);

    promesa
      .then((res) => { if (activo) setData(res); })
      .catch((err) => { if (activo) setError(err.response?.data?.message || err.message || 'No se pudo calcular el análisis.'); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [item]);

  const entidad = data ? (data.producto || data.combo) : null;

  return (
    <div className="vit-modal-overlay" onClick={onClose}>
      <div className="vit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vit-modal-header">
          <div>
            <h2>Análisis de sensibilidad</h2>
            <p>{item.nombre}</p>
          </div>
          <button className="vit-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="vit-modal-body">
          {cargando ? (
            <div className="vit-empty"><Loader size={22} className="spin-icon" /><p>Calculando...</p></div>
          ) : error ? (
            <div className="vit-empty">
              <AlertTriangle size={26} color="#ef4444" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="vit-sensib-summary">
                <div className="vit-sensib-metric">
                  <span className="label">Precio actual</span>
                  <span className="value">{formatGs(entidad.precio_efectivo)}</span>
                  {entidad.precio_usuario !== null && (
                    <span className="hint">Tu precio (base admin: {formatGs(entidad.precio_base)})</span>
                  )}
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Utilidad estimada</span>
                  <span className="value" style={{ color: data.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {data.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {formatGs(data.profit)}
                  </span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Margen</span>
                  <span className="value">{formatPct(data.margin)}</span>
                  {data.estado && (
                    <span className={`vit-badge ${data.estado.severity}`} style={{ alignSelf: 'flex-start' }}>{data.estado.label}</span>
                  )}
                </div>
                {entidad.precio_minimo ? (
                  <div className="vit-sensib-metric">
                    <span className="label">Precio mínimo</span>
                    <span className="value">{formatGs(entidad.precio_minimo)}</span>
                  </div>
                ) : null}
              </div>

              {data.warnings?.length > 0 && (
                <div className="vit-sensib-warnings">
                  {data.warnings.map((w, i) => (
                    <div key={i} className="vit-warning-item"><AlertTriangle size={13} /> {w}</div>
                  ))}
                </div>
              )}

              <p className="vit-sensib-table-title">Simulación de descuentos sobre tu precio actual</p>
              <div style={{ overflowX: 'auto' }}>
                <table className="vit-sensitivity-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Descuento</th>
                      <th>Precio final</th>
                      <th>Utilidad</th>
                      <th>Margen</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sensitivity.map((s) => (
                      <tr key={s.discountPercentage} className={s.severity}>
                        <td>{s.discountPercentage}%</td>
                        <td style={{ textAlign: 'right' }}>{formatGs(s.price)}</td>
                        <td style={{ textAlign: 'right' }}>{formatGs(s.profit)}</td>
                        <td style={{ textAlign: 'right' }}>{formatPct(s.margin)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`vit-badge ${s.severity}`}>{s.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
