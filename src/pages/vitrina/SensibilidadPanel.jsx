import React, { useState, useEffect } from 'react';
import { X, Loader, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import './vitrina.css';

const RENTABILIDAD_LABELS = {
  saludable: 'Saludable',
  'margen-bajo': 'Margen bajo',
  'no-rentable': 'No rentable',
};

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 }) + ' Gs';
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return (Number(n) * 100).toFixed(2) + '%';
}

function parseMonto(value) {
  const limpio = String(value || '').replace(/[^\d.-]/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function roundMargin(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}

function estadoRentabilidad(margin, minimumMargin = 0.1) {
  if (margin <= 0) return { severity: 'no-rentable', label: RENTABILIDAD_LABELS['no-rentable'] };
  if (margin < minimumMargin) return { severity: 'margen-bajo', label: RENTABILIDAD_LABELS['margen-bajo'] };
  return { severity: 'saludable', label: RENTABILIDAD_LABELS.saludable };
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoriaCheckoutPagopar(metodo = {}) {
  const nombre = normalizarTexto(metodo.nombre);
  if (nombre.includes('transferencia')) return { id: 'transferencia-bancaria', nombre: 'Transferencia bancaria PagoPar' };
  if (nombre.includes('qr') || nombre.includes('pix')) return { id: 'qr', nombre: 'Pago con QR' };
  if (/(tarjeta|mastercard|visa|american express|cabal|panal|discover|diners)/.test(nombre)) return { id: 'tarjetas', nombre: 'Tarjetas de crédito/débito' };
  if (/(zimple|tigo money|personal pay|pago movil|wally|billetera claro|billetera|fondos)/.test(nombre)) return { id: 'billeteras', nombre: 'Billeteras' };
  if (/(boca|acercandose|pagos habilitadas)/.test(nombre)) return { id: 'bocas-de-pago', nombre: 'Bocas de pago' };
  return null;
}

function agruparOpcionesCheckoutPagopar(metodos = []) {
  const orden = ['transferencia-bancaria', 'qr', 'tarjetas', 'billeteras', 'bocas-de-pago'];
  const grupos = new Map();
  metodos.forEach((metodo) => {
    const categoria = categoriaCheckoutPagopar(metodo);
    if (!categoria) return;
    const actual = grupos.get(categoria.id) || { ...categoria, comision_porcentaje: 0 };
    grupos.set(categoria.id, {
      ...actual,
      comision_porcentaje: Math.max(actual.comision_porcentaje, Number(metodo.comision_porcentaje) || 0),
    });
  });
  return orden.map(id => grupos.get(id)).filter(Boolean);
}

function calcularAnalisisLocal(analisis, precio, comisionPagoPct) {
  const costos = analisis?.costos || {};
  const parametros = analisis?.parametros || {};
  const precioSimulado = Number(precio) || 0;
  const cpaPct = Number(costos.marketing_cpa_porcentaje) || 0;
  const costoCompra = Number(costos.costo_compra) || 0;
  const costoEnvio = Number(costos.costo_envio_promedio) || 0;
  const costoConfirmacion = Number(costos.costo_confirmacion_promedio) || 0;
  const costoEmpaque = Number(costos.costo_empaque_promedio) || 0;
  const paymentPct = Number(comisionPagoPct) || 0;
  const marketingCpa = roundMoney(precioSimulado * (cpaPct / 100));
  const costoPago = roundMoney(precioSimulado * (paymentPct / 100));
  const costoTotal = roundMoney(costoCompra + marketingCpa + costoPago + costoEnvio + costoConfirmacion + costoEmpaque);
  const profit = roundMoney(precioSimulado - costoTotal);
  const margin = precioSimulado > 0 ? roundMargin(profit / precioSimulado) : 0;
  const minimumMargin = Number(parametros.margen_minimo) || 0.1;
  const escenarios = Array.isArray(parametros.escenarios_descuento) && parametros.escenarios_descuento.length
    ? parametros.escenarios_descuento
    : (analisis?.sensitivity || []).map(s => s.discountPercentage);

  return {
    profit,
    margin,
    estado: estadoRentabilidad(margin, minimumMargin),
    sensitivity: escenarios.map((pct) => {
      const price = roundMoney(precioSimulado * (1 - (Number(pct) || 0) / 100));
      const rowProfit = roundMoney(price - costoTotal);
      const rowMargin = price > 0 ? roundMargin(rowProfit / price) : 0;
      const estado = estadoRentabilidad(rowMargin, minimumMargin);
      return {
        discountPercentage: pct,
        price,
        profit: rowProfit,
        margin: rowMargin,
        severity: estado.severity,
        label: estado.label,
      };
    }),
    costos: {
      ...costos,
      precio_venta_actual: precioSimulado,
      marketing_cpa: marketingCpa,
      costo_pago_contra_entrega_porcentaje: paymentPct,
      costo_pago_contra_entrega: costoPago,
      costo_total: costoTotal,
    },
  };
}

export default function SensibilidadPanel({ item, onClose, onAplicarPrecio }) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoPrecio, setGuardandoPrecio] = useState(null);
  const [operacionActiva, setOperacionActiva] = useState('propios');
  const [precioSimulado, setPrecioSimulado] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');

  useEffect(() => {
    let activo = true;
    setOperacionActiva('propios');
    setCargando(true);
    setError(null);
    const promesa = item.tipo === 'combo'
      ? vitrinaService.sensibilidadCombo(item.id)
      : vitrinaService.sensibilidadProducto(item.id);

    promesa
      .then((res) => {
        if (activo) {
          const entidadRes = res.producto || res.combo;
          setData(res);
          setPrecioSimulado(String(Math.round(Number(entidadRes?.precio_efectivo) || 0)));
          setMetodoPagoId('');
        }
      })
      .catch((err) => { if (activo) setError(err.response?.data?.message || err.message || 'No se pudo calcular el análisis.'); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [item]);

  const entidad = data ? (data.producto || data.combo) : null;
  const operaciones = data?.operaciones || (data ? {
    propios: {
      profit: data.profit,
      margin: data.margin,
      estado: data.estado,
      sensitivity: data.sensitivity,
      costos: data.costos || {},
    },
  } : {});
  const analisis = operaciones[operacionActiva] || operaciones.propios || data;
  const opcionesCheckoutPagopar = data?.pagopar?.opciones_checkout?.length
    ? data.pagopar.opciones_checkout
    : agruparOpcionesCheckoutPagopar(data?.pagopar?.metodos || []);
  const opcionesPagoAnticipado = opcionesCheckoutPagopar.map((metodo) => ({
    id: `pagopar-${metodo.id}`,
    nombre: metodo.nombre,
    comision_porcentaje: Number(metodo.comision_porcentaje) || 0,
  }));
  const metodoOptions = [
    ...(operacionActiva === 'raha' ? [{ id: 'raha-cod', nombre: 'Pago contra entrega RAHA', comision_porcentaje: 2 }] : []),
    ...(operacionActiva === 'raha' ? [] : [{ id: 'contra-entrega', nombre: 'Pago contra entrega', comision_porcentaje: 0 }]),
    { id: 'transferencia-propia', nombre: 'Transferencia bancaria propia', comision_porcentaje: 0 },
    ...opcionesPagoAnticipado,
  ];
  const metodoDefault = metodoOptions.find(m => String(m.id) === metodoPagoId) || metodoOptions[0] || {
      id: 'sin-comision',
      nombre: 'Sin método PagoPar conectado',
      comision_porcentaje: 0,
    };
  const metodoSeleccionado = metodoOptions.find(m => String(m.id) === metodoPagoId) || metodoDefault;
  const analisisSimulado = analisis
    ? calcularAnalisisLocal(analisis, parseMonto(precioSimulado), metodoSeleccionado?.comision_porcentaje)
    : null;
  const costos = analisisSimulado?.costos || {};

  async function aplicarPrecio(precio) {
    if (!onAplicarPrecio) return;
    try {
      setError(null);
      setGuardandoPrecio(precio);
      await onAplicarPrecio(item, precio);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo aplicar el precio.');
    } finally {
      setGuardandoPrecio(null);
    }
  }

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
              <div className="vit-operation-tabs" role="tablist" aria-label="Tipo de operación">
                <button
                  type="button"
                  role="tab"
                  aria-selected={operacionActiva === 'propios'}
                  className={`vit-operation-tab ${operacionActiva === 'propios' ? 'active' : ''}`}
                  onClick={() => setOperacionActiva('propios')}
                >
                  Operación propia
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={operacionActiva === 'raha'}
                  className={`vit-operation-tab ${operacionActiva === 'raha' ? 'active' : ''}`}
                  onClick={() => setOperacionActiva('raha')}
                >
                  Operación Gesicom RAHA
                </button>
              </div>

              <div className="vit-simulator-controls">
                <label className="vit-simulator-field">
                  <span>Precio de venta simulado</span>
                  <div className="vit-simulator-input-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={precioSimulado}
                      onChange={(e) => setPrecioSimulado(e.target.value)}
                    />
                    <small>Gs</small>
                  </div>
                </label>
                <label className="vit-simulator-field">
                  <span>Método de pago</span>
                  <select
                    value={metodoSeleccionado?.id || ''}
                    onChange={(e) => setMetodoPagoId(e.target.value)}
                  >
                    {metodoOptions.length === 0 ? (
                      <option value="sin-comision">Sin método PagoPar conectado</option>
                    ) : (
                      metodoOptions.map((metodo) => (
                        <option key={metodo.id} value={metodo.id}>
                          {metodo.nombre} ({Number(metodo.comision_porcentaje || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })}%)
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>

              <div className="vit-sensib-summary">
                <div className="vit-sensib-metric">
                  <span className="label">Precio de venta simulado actual</span>
                  <span className="value">{formatGs(costos.precio_venta_actual)}</span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Utilidad estimada</span>
                  <span className="value" style={{ color: analisisSimulado.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {analisisSimulado.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {formatGs(analisisSimulado.profit)}
                  </span>
                </div>
                <div className="vit-sensib-metric">
                  <span className="label">Margen</span>
                  <span className="value">{formatPct(analisisSimulado.margin)}</span>
                  {analisisSimulado.estado && (
                    <span className={`vit-badge ${analisisSimulado.estado.severity}`} style={{ alignSelf: 'flex-start' }}>{analisisSimulado.estado.label}</span>
                  )}
                </div>
                {entidad.precio_minimo ? (
                  <div className="vit-sensib-metric">
                    <span className="label">Precio mínimo</span>
                    <span className="value">{formatGs(entidad.precio_minimo)}</span>
                  </div>
                ) : null}
              </div>

              <div className="vit-sensib-costs">
                <div className="vit-sensib-cost">
                  <span>Costo de compra del producto</span>
                  <strong>{formatGs(costos.costo_compra)}</strong>
                </div>
                <div className="vit-sensib-cost">
                  <span>Marketing (CPA)</span>
                  <strong>{formatGs(costos.marketing_cpa)}</strong>
                  <small>{Number(costos.marketing_cpa_porcentaje || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })}% del precio de venta</small>
                </div>
                <div className="vit-sensib-cost">
                  <span>Costo de envío promedio</span>
                  <strong>{formatGs(costos.costo_envio_promedio)}</strong>
                </div>
                {operacionActiva === 'raha' && (
                  <div className="vit-sensib-cost">
                    <span>{metodoSeleccionado?.id === 'raha-cod' ? 'Costo pago contra entrega' : 'Costo método de pago'}</span>
                    <strong>{formatGs(costos.costo_pago_contra_entrega)}</strong>
                    <small>{Number(costos.costo_pago_contra_entrega_porcentaje || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })}% del precio de venta</small>
                  </div>
                )}
                {operacionActiva !== 'raha' && (
                  <div className="vit-sensib-cost">
                    <span>Costo método de pago</span>
                    <strong>{formatGs(costos.costo_pago_contra_entrega)}</strong>
                    <small>{Number(costos.costo_pago_contra_entrega_porcentaje || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })}% del precio de venta</small>
                  </div>
                )}
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisisSimulado.sensitivity.map((s) => (
                      <tr key={s.discountPercentage} className={s.severity}>
                        <td>{s.discountPercentage}%</td>
                        <td style={{ textAlign: 'right' }}>{formatGs(s.price)}</td>
                        <td style={{ textAlign: 'right' }}>{formatGs(s.profit)}</td>
                        <td style={{ textAlign: 'right' }}>{formatPct(s.margin)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`vit-badge ${s.severity}`}>{s.label}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="vit-use-price-btn"
                            disabled={guardandoPrecio === s.price}
                            onClick={() => aplicarPrecio(s.price)}
                          >
                            {guardandoPrecio === s.price ? 'Aplicando...' : 'Usar este precio'}
                          </button>
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
