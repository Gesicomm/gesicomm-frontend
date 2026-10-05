import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, AlertTriangle, Info, PackageCheck, Truck, CreditCard, Lock } from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import CurrencyInput from '../../components/CurrencyInput';
import { verificarSesion } from '../../utils/auth';
import './combos.css';

function fmtNumber(n) {
  if (n === null || n === undefined) return '';
  return String(Number(n));
}

function fmtPct(n) {
  return `${(Number(n) || 0).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
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

const RAHA_COSTO_ENVIO_FIJO = 30000;

export default function ComboConfiguracion({ asTab = false }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [costosTab, setCostosTab] = useState('propios');

  // Campos editables
  const [cpa, setCpa] = useState('');
  const [envio, setEnvio] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [empaque, setEmpaque] = useState('');
  const [rahaCpa, setRahaCpa] = useState('');
  const [rahaEnvio, setRahaEnvio] = useState('');
  const [rahaConfirmacion, setRahaConfirmacion] = useState('');
  const [rahaEmpaque, setRahaEmpaque] = useState('');
  const [margenMinimo, setMargenMinimo] = useState('');
  const [umbralExcelente, setUmbralExcelente] = useState('');
  const [margenes, setMargenes] = useState('');             // CSV string
  const [escenarios, setEscenarios] = useState('');         // CSV string

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setLoading(true);
      const user = await verificarSesion();
      if (user && user.rol === 'admin') {
        setIsAdmin(true);
      }
      
      const cfg = await comboAdminService.obtenerConfiguracion();
      setConfig(cfg);
      setCpa(fmtNumber(cfg.cpa_porcentaje));
      setEnvio(fmtNumber(cfg.costo_envio));
      setConfirmacion(fmtNumber(cfg.costo_confirmacion));
      setEmpaque(fmtNumber(cfg.costo_empaque));
      setRahaCpa(fmtNumber(cfg.raha_cpa_porcentaje ?? cfg.cpa_porcentaje));
      setRahaEnvio(fmtNumber(RAHA_COSTO_ENVIO_FIJO));
      setRahaConfirmacion(fmtNumber(cfg.raha_costo_confirmacion ?? cfg.costo_confirmacion));
      setRahaEmpaque(fmtNumber(0));
      setMargenMinimo(fmtNumber(cfg.margen_minimo));
      setUmbralExcelente(fmtNumber(cfg.umbral_excelente));
      setMargenes((cfg.margenes_objetivo || [15, 30, 45]).join(', '));
      setEscenarios((cfg.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30, 35]).join(', '));
    } catch (err) {
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  function parseCSV(str) {
    return str.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const margenesArr = parseCSV(margenes);
    const escenariosArr = parseCSV(escenarios);

    if (!margenesArr.length) return setError('Los márgenes objetivo deben ser una lista de números separados por coma.');
    if (!escenariosArr.length) return setError('Los escenarios de descuento deben ser una lista de números separados por coma.');

    const payload = {
      cpa_porcentaje: parseFloat(cpa) || 0,
      costo_envio: parseFloat(envio) || 0,
      costo_confirmacion: parseFloat(confirmacion) || 0,
      costo_empaque: parseFloat(empaque) || 0,
      raha_cpa_porcentaje: parseFloat(rahaCpa) || 0,
      raha_costo_envio: RAHA_COSTO_ENVIO_FIJO,
      raha_costo_confirmacion: parseFloat(rahaConfirmacion) || 0,
      raha_costo_empaque: 0,
      margen_minimo: parseFloat(margenMinimo) || 10,
      umbral_excelente: parseFloat(umbralExcelente) || 50,
      margenes_objetivo: margenesArr,
      escenarios_descuento: escenariosArr,
    };

    try {
      setGuardando(true);
      const cfg = await comboAdminService.actualizarConfiguracion(payload);
      setConfig(cfg);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '0.55rem 0.9rem',
    color: 'var(--color-fg)',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const costoSets = {
    propios: {
      titulo: 'Operacion propia ',
      descripcion: 'Usalos para productos y pedidos que operás con tu propia estructura.',
      icono: PackageCheck,
      cpa,
      envio,
      confirmacion,
      empaque,
      setCpa,
      setEnvio,
      setConfirmacion,
      setEmpaque,
    },
    raha: {
      titulo: 'Operacion Gesicom-RAHA',
      descripcion: 'Usalos para medir rentabilidad cuando la operación logística/fulfillment pasa por Raha.',
      icono: Truck,
      cpa: rahaCpa,
      envio: rahaEnvio,
      confirmacion: rahaConfirmacion,
      empaque: rahaEmpaque,
      setCpa: setRahaCpa,
      setEnvio: setRahaEnvio,
      setConfirmacion: setRahaConfirmacion,
      setEmpaque: setRahaEmpaque,
    },
  };

  const costoActual = costoSets[costosTab];
  const CostoIcono = costoActual.icono;
  const opcionesCheckoutPagopar = config?.pagopar?.opciones_checkout?.length
    ? config.pagopar.opciones_checkout
    : agruparOpcionesCheckoutPagopar(config?.pagopar?.metodos || []);
  const comisionPagopar = Number(config?.pagopar_comision_porcentaje || config?.pagopar?.comision_maxima || 0);
  const esRaha = costosTab === 'raha';

  if (loading) {
    return (
      <div className="combo-page">
        <div className="combo-empty"><Settings size={28} /><p>Cargando configuración...</p></div>
      </div>
    );
  }

  const Wrapper = asTab ? 'div' : 'form';
  const wrapperProps = asTab ? { className: 'combo-page' } : { className: 'combo-page', onSubmit: handleGuardar, noValidate: true };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      {!asTab && (
      <div className="combo-header">
        <div className="combo-header-left">
          <div className="combo-icon-wrap" style={{ background: 'linear-gradient(135deg, #3d5fa3, #2e4a85)' }}>
            <Settings size={20} />
          </div>
          <div>
            <h1 className="combo-title">Configuración económica</h1>
            <p className="combo-subtitle">Parámetros utilizados en el motor de cálculo de rentabilidad</p>
          </div>
        </div>
        <button type="button" onClick={handleGuardar} className="btn-primary" disabled={guardando}>
          <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
      )}

      {error && (
        <div className="combo-warning-item" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="combo-warning-item" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }}>
          ✓ Configuración guardada correctamente.
        </div>
      )}

      {/* ── Costos y porcentajes ── */}
      <div className="combo-section">
        <div className="combo-section-header">
          <div className="combo-section-icon"><Settings size={15} /></div>
          <h3 className="combo-section-title">Costos operativos</h3>
        </div>

        {/* Selector de tipo */}
        <div className="combo-cost-tabs" role="tablist" aria-label="Tipo de costos operativos">
          {Object.entries(costoSets).map(([id, item]) => {
            const Icono = item.icono;
            const activo = costosTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-tipo={id}
                className={`combo-cost-tab ${activo ? 'active' : ''}`}
                onClick={() => setCostosTab(id)}
              >
                <span className="cct-icon"><Icono size={15} /></span>
                <span className="cct-label">
                  <b>{item.titulo}</b>
                  <small>{item.descripcion}</small>
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel de campos */}
        <div className="combo-cost-panel" data-tipo={costosTab}>
          <div className="combo-cost-panel-header">
            <span className={`combo-cost-panel-dot ${costosTab}`} />
            <CostoIcono size={15} />
            <p>{costoActual.descripcion}</p>
          </div>

          {/* Servicios incluidos — solo visible en tab RAHA */}
          {costosTab === 'raha' && (
            <></>
          )}

          <div className="combo-editor-grid">
            <div className="combo-cost-field editable">
              <div className="combo-section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>CPA proyectado (%)</span>
                <Info
                  size={13}
                  style={{ cursor: 'help', color: 'var(--color-fg-subtle)' }}
                  title="El CPA proyectado se calcula sobre el ticket de venta."
                />
              </div>
              <input className="combo-cost-input editable" style={inputStyle} type="number" min="0" max="100" step="0.01" value={costoActual.cpa} onChange={e => costoActual.setCpa(e.target.value)} />
              <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
                Costo por Adquisición como % del ticket de venta. Ej: 20 = 20%.
              </div>
            </div>
            {esRaha ? (
              <div className="combo-cost-field locked">
                <div className="combo-section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span><b>Costo Logistico por pedido</b> (Stockeo, Packing, Gestión y sistema, Entrega + cobranza COD, Tecnología, Procesamiento de devoluciones, Seguro de mercancía, Trazabilidad total, Catálogo)</span>
                  <span className="combo-cost-badge locked"><Lock size={11} /></span>
                </div>
                <CurrencyInput
                  className="combo-cost-input locked"
                  style={inputStyle}
                  value={RAHA_COSTO_ENVIO_FIJO}
                  onChange={() => {}}
                  disabled
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
                  Costo fijo de envío de la operación Gesicom-RAHA. No se edita desde costos.
                </div>
              </div>
            ) : (
              <div className="combo-cost-field editable">
                <div className="combo-section-label">Costo de envío promedio</div>
                <CurrencyInput className="combo-cost-input editable" style={inputStyle} value={costoActual.envio} onChange={costoActual.setEnvio} />
              </div>
            )}
            <div className="combo-cost-field editable">
              <div className="combo-section-label">Costo de confirmación promedio</div>
              <CurrencyInput className="combo-cost-input editable" style={inputStyle} value={costoActual.confirmacion} onChange={costoActual.setConfirmacion} />
            </div>
            {esRaha ? (
              <div className="raha-cod-field combo-cost-field locked">
                <div className="combo-section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Costo COD — pago contra entrega</span>
                  <span className="raha-cod-badge">Fijo Gesicom‑RAHA</span>
                </div>
                <div className="raha-cod-input-wrap">
                  <input
                    className="combo-cost-input locked"
                    style={{ ...inputStyle, cursor: 'not-allowed', opacity: 0.9 }}
                    type="text"
                    value="2% del ticket total"
                    readOnly
                    disabled
                    aria-label="Costo COD fijo 2%"
                  />
                  <span className="raha-cod-lock">🔒</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
                  Comisión fija por cobro contra entrega. Se calcula automáticamente sobre el ticket de venta y no es editable.
                </div>
              </div>
            ) : (
              <div className="combo-cost-field editable">
                <div className="combo-section-label">Costo de empaque promedio</div>
                <CurrencyInput className="combo-cost-input editable" style={inputStyle} value={costoActual.empaque} onChange={costoActual.setEmpaque} />
              </div>
            )}
          </div>
        </div>
      </div>

            <div className="combo-cost-field locked combo-pagopar-costs">
              <div className="combo-section-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Costos por cobro PagoPar</span>
                <span className="combo-cost-badge locked"><Lock size={11} /> No editable</span>
              </div>
              <div className="combo-pagopar-summary">
                <CreditCard size={16} />
                <div>
                  <strong>Opciones de checkout PagoPar · hasta {fmtPct(comisionPagopar)} usado en pricing</strong>
                  <span>Se muestran solo las opciones que ve el cliente en el checkout. Si PagoPar devuelve varias formas internas para una opción, usamos la comisión más alta de ese grupo.</span>
                </div>
              </div>
              {opcionesCheckoutPagopar.length > 0 ? (
                <div className="combo-pagopar-methods">
                  {opcionesCheckoutPagopar.map((metodo) => (
                    <div className="combo-pagopar-method" key={metodo.id}>
                      <span>{metodo.nombre}</span>
                      <strong>{fmtPct(metodo.comision_porcentaje)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="combo-pagopar-empty">
                  {config?.pagopar?.error
                    ? `No pudimos leer PagoPar: ${config.pagopar.error}`
                    : 'Conectá o probá PagoPar para traer la comisión del pago online.'}
                </div>
              )}
            </div>

            

      {/* ── Parámetros de análisis ── */}
      {isAdmin && (
      <div className="combo-section">
        <div className="combo-section-header">
          <div className="combo-section-icon"><Info size={15} /></div>
          <h3 className="combo-section-title">Parámetros de análisis</h3>
        </div>

        <div className="combo-editor-grid">
          <div>
            <div className="combo-section-label">Margen mínimo (%)</div>
            <input style={inputStyle} type="number" min="0" max="100" step="0.1" value={margenMinimo} onChange={e => setMargenMinimo(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
              Umbral de advertencia. No bloquea — solo avisa cuando el combo queda por debajo.
            </div>
          </div>
          <div>
            <div className="combo-section-label">Umbral de oferta excelente (%)</div>
            <input style={inputStyle} type="number" min="0" max="500" step="1" value={umbralExcelente} onChange={e => setUmbralExcelente(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
              Si la utilidad del combo supera este % respecto a vender el producto solo, la oferta se clasifica como "Excelente".
            </div>
          </div>
          <div>
            <div className="combo-section-label">Márgenes objetivo (lista separada por coma)</div>
            <input style={inputStyle} type="text" value={margenes} onChange={e => setMargenes(e.target.value)} placeholder="15, 30, 45" />
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
              Para cada margen se calcula un precio sugerido. Ej: <code>15, 30, 45</code>
            </div>
          </div>
          <div>
            <div className="combo-section-label">Escenarios de descuento (lista separada por coma)</div>
            <input style={inputStyle} type="text" value={escenarios} onChange={e => setEscenarios(e.target.value)} placeholder="0, 5, 10, 15, 20, 25, 30, 35" />
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
              Porcentajes simulados en el análisis de sensibilidad. Ej: <code>0, 5, 10, 15, 20, 25, 30, 35</code>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Acción de guardado — al pie de las secciones que edita, no antes. */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleGuardar} className="btn-primary" disabled={guardando}>
          <Save size={15} /> {guardando ? 'Guardando...' : (asTab ? 'Guardar configuración económica' : 'Guardar configuración')}
        </button>
      </div>
    </Wrapper>
  );
}
