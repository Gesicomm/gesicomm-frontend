import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, AlertTriangle, Info } from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import CurrencyInput from '../../components/CurrencyInput';
import { verificarSesion } from '../../utils/auth';
import './combos.css';

function fmtNumber(n) {
  if (n === null || n === undefined) return '';
  return String(Number(n));
}

export default function ComboConfiguracion({ asTab = false }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Campos editables
  const [cpa, setCpa] = useState('');
  const [envio, setEnvio] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [empaque, setEmpaque] = useState('');
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
      margen_minimo: parseFloat(margenMinimo) || 10,
      umbral_excelente: parseFloat(umbralExcelente) || 50,
      margenes_objetivo: margenesArr,
      escenarios_descuento: escenariosArr,
    };

    try {
      setGuardando(true);
      await comboAdminService.actualizarConfiguracion(payload);
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

        <div className="combo-editor-grid">
          <div>
            <div className="combo-section-label">CPA (%)</div>
            <input style={inputStyle} type="number" min="0" max="100" step="0.01" value={cpa} onChange={e => setCpa(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fg-muted)', marginTop: '0.3rem' }}>
              Costo por Adquisición como porcentaje del precio de venta. Ej: 20 = 20%.
            </div>
          </div>
          <div>
            <div className="combo-section-label">Costo de envío</div>
            <CurrencyInput style={inputStyle} value={envio} onChange={setEnvio} />
          </div>
          <div>
            <div className="combo-section-label">Costo de confirmación</div>
            <CurrencyInput style={inputStyle} value={confirmacion} onChange={setConfirmacion} />
          </div>
          <div>
            <div className="combo-section-label">Costo de empaque</div>
            <CurrencyInput style={inputStyle} value={empaque} onChange={setEmpaque} />
          </div>
        </div>
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
