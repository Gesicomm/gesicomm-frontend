import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers, Search, X, Save, Power, PowerOff, ChevronRight,
  BarChart2, AlertTriangle, Package, Star, Zap, Info
} from 'lucide-react';
import { comboAdminService } from '../../services/comboAdminService';
import { productService } from '../../services/productService';
import CurrencyInput from '../../components/CurrencyInput';
import { calcular as calcularLocal } from '../../utils/comboPricingLocal';
import './combos.css';

// ─── Utilidades de formato ────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtGs(n)  { return n !== null && n !== undefined ? fmt(n) + ' Gs' : '—'; }
function fmtPct(n) { return n !== null && n !== undefined ? (Number(n) * 100).toFixed(2) + '%' : '—'; }
function fmtPctDirect(n) { return n !== null && n !== undefined ? Number(n).toFixed(2) + '%' : '—'; }

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }) {
  return (
    <div className="combo-section-header">
      <div className="combo-section-icon">{icon}</div>
      <h3 className="combo-section-title">{title}</h3>
    </div>
  );
}

function MetricCard({ label, value, valueClass = '', title }) {
  return (
    <div className="combo-metric-card" title={title}>
      <span className="combo-metric-label">{label}</span>
      <span className={`combo-metric-value ${valueClass}`}>{value}</span>
    </div>
  );
}

function BadgeOferta({ status }) {
  if (!status) return null;
  const map = { EXCELENTE: 'excelente', BUENA: 'buena', REVISAR: 'revisar' };
  const labels = { EXCELENTE: '★ Excelente', BUENA: '✓ Buena oferta', REVISAR: '⚠ Revisar' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

function BadgeRentabilidad({ status }) {
  if (!status) return null;
  const map = { SALUDABLE: 'saludable', MARGEN_BAJO: 'margen-bajo', NO_RENTABLE: 'no-rentable' };
  const labels = { SALUDABLE: '✓ Saludable', MARGEN_BAJO: '⚠ Margen bajo', NO_RENTABLE: '✗ No rentable' };
  return <span className={`combo-badge ${map[status]}`}>{labels[status]}</span>;
}

function WarningList({ warnings = [] }) {
  if (!warnings.length) return null;
  return (
    <div className="combo-warnings">
      {warnings.map((w, i) => (
        <div key={i} className="combo-warning-item">
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {w}
        </div>
      ))}
    </div>
  );
}

// ─── Buscador de productos ────────────────────────────────────────────────────

function ProductSearch({ placeholder, onSelect, exclude = [], label }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  const fetchProducts = async (q) => {
    setLoading(true);
    try {
      const res = await productService.buscar({ texto: q, activo: true, limit: 15 });
      setResults((res.productos || []).filter(p => !exclude.includes(p.id)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    if (query.trim().length === 1) { setResults([]); return; }
    
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchProducts(query), 280);
    return () => clearTimeout(timerRef.current);
  }, [query, isFocused, JSON.stringify(exclude)]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { 
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsFocused(false);
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (p) => { 
    onSelect(p); 
    setQuery(''); 
    setIsFocused(false);
    setResults([]); 
  };

  return (
    <div ref={wrapRef} className="combo-search-wrap">
      {label && <div className="combo-section-label">{label}</div>}
      <div className="combo-search-input-wrap">
        <Search size={15} color="#475569" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
        />
      </div>
      {(isFocused && (results.length > 0 || loading)) && (
        <div className="combo-search-dropdown">
          {loading ? (
            <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.83rem', textAlign: 'center' }}>Buscando...</div>
          ) : (
            results.map(p => (
              <div key={p.id} className="combo-search-item" onClick={() => handleSelect(p)}>
                <div>
                  <div className="combo-search-item-name">{p.nombre}</div>
                  <div className="combo-search-item-sub">{fmtGs(p.precio_base)}</div>
                </div>
                <ChevronRight size={14} color="#475569" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComboEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // ─── Estado del formulario ───────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [principal, setPrincipal] = useState(null);     // { id, nombre, precio_base, precio_costo, sku }
  const [upsells, setUpsells] = useState([]);           // [{ id, nombre, precio_base, precio_costo, sku, descuento_porcentaje }]
  const [precioTotal, setPrecioTotal] = useState('');   // string para el input
  const [precioMinimo, setPrecioMinimo] = useState(''); // piso de venta, opcional
  const [config, setConfig] = useState(null);           // ComboConfiguracion del tenant
  const [estadoActual, setEstadoActual] = useState('BORRADOR');

  // ─── Estado de UI ────────────────────────────────────────────────────────
  const [resultado, setResultado] = useState(null);     // Resultado local del motor
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // ─── Cargar configuración + combo existente ───────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const cfg = await comboAdminService.obtenerConfiguracion();
        setConfig(cfg);

        if (isEditing) {
          const combo = await comboAdminService.obtener(id);
          setNombre(combo.nombre || '');
          setDescripcion(combo.descripcion || '');
          setPrecioTotal(String(combo.precio_total || ''));
          setPrecioMinimo(combo.precio_minimo ? String(combo.precio_minimo) : '');
          setEstadoActual(combo.estado || 'BORRADOR');

          if (combo.producto_padre) {
            setPrincipal({
              id: combo.producto_padre.id,
              nombre: combo.producto_padre.nombre,
              precio_base: Number(combo.producto_padre.precio_base),
              precio_costo: Number(combo.producto_padre.precio_costo),
              sku: combo.producto_padre.sku,
            });
          }

          if (combo.items?.length) {
            setUpsells(combo.items.map(it => ({
              id: it.producto_incluido?.id,
              nombre: it.producto_incluido?.nombre,
              precio_base: Number(it.producto_incluido?.precio_base),
              precio_costo: Number(it.producto_incluido?.precio_costo),
              sku: it.producto_incluido?.sku,
              descuento_porcentaje: Number(it.descuento_porcentaje),
            })));
          }
        }
      } catch (err) {
        setError('Error al cargar datos iniciales.');
        console.error(err);
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, [id]);

  // ─── Cálculo local reactivo ───────────────────────────────────────────────
  useEffect(() => {
    if (!principal || !config) { setResultado(null); return; }

    const input = {
      principal: {
        id: principal.id,
        name: principal.nombre,
        cost: principal.precio_costo || 0,
        salePrice: principal.precio_base || 0,
      },
      upsells: upsells.map(u => ({
        id: u.id,
        name: u.nombre,
        cost: u.precio_costo || 0,
        salePrice: u.precio_base || 0,
        discountPercentage: u.descuento_porcentaje || 0,
      })),
      costs: {
        cpaPercentage: Number(config.cpa_porcentaje),
        shipping: Number(config.costo_envio),
        confirmation: Number(config.costo_confirmacion),
        packaging: Number(config.costo_empaque),
      },
      targetMargins: config.margenes_objetivo || [15, 30, 45],
      minimumMargin: Number(config.margen_minimo),
      excellentThreshold: Number(config.umbral_excelente),
      discountScenarios: config.escenarios_descuento || [0, 5, 10, 15, 20, 25, 30, 35],
    };

    setResultado(calcularLocal(input));
  }, [principal, upsells, config]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAgregarUpsell = (prod) => {
    if (principal && prod.id === principal.id) return; // No puede ser el mismo que el principal
    if (upsells.find(u => u.id === prod.id)) return;   // No duplicados
    setUpsells(prev => [...prev, {
      id: prod.id,
      nombre: prod.nombre,
      precio_base: Number(prod.precio_base),
      precio_costo: Number(prod.precio_costo) || 0,
      sku: prod.sku,
      descuento_porcentaje: 0,
    }]);
  };

  const handleQuitarUpsell = (id) => setUpsells(prev => prev.filter(u => u.id !== id));

  const handleDescuentoUpsell = (id, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setUpsells(prev => prev.map(u => u.id === id ? { ...u, descuento_porcentaje: num } : u));
  };

  // Marcar cualquier producto de la lista como "principal" — es una acción
  // opcional sobre una fila, no un paso separado. El principal anterior
  // (si había) vuelve a la lista como un producto más, con 0% descuento.
  const handleMarcarPrincipal = (prodId) => {
    const candidato = upsells.find(u => u.id === prodId);
    if (!candidato) return;
    setUpsells(prev => {
      const sinCandidato = prev.filter(u => u.id !== prodId);
      return principal ? [...sinCandidato, { ...principal, descuento_porcentaje: 0 }] : sinCandidato;
    });
    setPrincipal({
      id: candidato.id,
      nombre: candidato.nombre,
      precio_base: candidato.precio_base,
      precio_costo: candidato.precio_costo,
      sku: candidato.sku,
    });
  };

  const handleAplicarPrecioRecomendado = (precio) => {
    setPrecioTotal(String(Math.round(precio)));
  };

  // ─── Calcular margen real del precio configurado por el admin ─────────────
  const margenReal = resultado && precioTotal
    ? (() => {
        const p = parseFloat(precioTotal);
        const c = resultado.combo.totalCost;
        if (!p || p === 0) return null;
        return (p - c) / p;
      })()
    : null;

  const margenRealClass = margenReal === null ? '' :
    margenReal <= 0 ? 'no-rentable' :
    margenReal < (config ? Number(config.margen_minimo) / 100 : 0.10) ? 'below-target' : 'healthy';

  // ─── Guardar ──────────────────────────────────────────────────────────────
  async function handleGuardar(activar = false) {
    if (!nombre.trim()) return alert('El nombre del combo es obligatorio.');
    if (!principal) return alert('Marcá un producto de la lista como principal (⭐) antes de guardar.');

    const precioTotalNum = parseFloat(precioTotal) || 0;
    const precioMinimoNum = precioMinimo ? parseFloat(precioMinimo) : null;
    if (precioMinimoNum && precioTotalNum < precioMinimoNum) {
      return alert(`El precio del combo (${fmtGs(precioTotalNum)}) no puede ser menor al precio mínimo configurado (${fmtGs(precioMinimoNum)}).`);
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio_total: precioTotalNum,
      precio_minimo: precioMinimoNum,
      principalProductId: principal.id,
      upsells: upsells.map(u => ({ productId: u.id, discountPercentage: u.descuento_porcentaje })),
    };

    try {
      setGuardando(true);
      setError(null);
      let saved;
      if (isEditing) {
        saved = await comboAdminService.actualizar(id, payload);
      } else {
        saved = await comboAdminService.crear(payload);
      }
      if (activar) {
        await comboAdminService.cambiarEstado(saved.id, 'ACTIVO');
      }
      setSaved(true);
      setTimeout(() => navigate(`/combos/${saved.id}/editar`), 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el combo.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstado(nuevoEstado) {
    if (!id) return;
    const msgs = { ACTIVO: '¿Activar el combo?', INACTIVO: '¿Desactivar el combo?', BORRADOR: '¿Pasar el combo a borrador?' };
    if (!window.confirm(msgs[nuevoEstado])) return;
    try {
      setCambiandoEstado(true);
      await comboAdminService.cambiarEstado(id, nuevoEstado);
      setEstadoActual(nuevoEstado);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setCambiandoEstado(false);
    }
  }

  const excludeIds = [principal?.id, ...upsells.map(u => u.id)].filter(Boolean);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <div className="combo-page">
        <div className="combo-empty"><Layers size={28} /><p>Cargando...</p></div>
      </div>
    );
  }

  const r = resultado;
  // Umbral configurado (Configuración económica > Margen mínimo), como fracción.
  // Antes estas 3 tarjetas usaban un 10% fijo sin importar lo que se configure.
  const margenMinimoDecimal = config?.margen_minimo !== undefined ? Number(config.margen_minimo) / 100 : 0.10;

  return (
    <div className="combo-page">
      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <div className="combo-header">
        <div className="combo-header-left">
          <button className="btn-back" onClick={() => navigate('/combos')} style={{ marginRight: '0.25rem' }}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div className="combo-icon-wrap"><Layers size={20} /></div>
          <div>
            <h1 className="combo-title">{isEditing ? 'Editar combo' : 'Nuevo combo'}</h1>
            <p className="combo-subtitle">
              {estadoActual === 'BORRADOR' && 'Borrador — no publicado'}
              {estadoActual === 'ACTIVO'   && '● Activo'}
              {estadoActual === 'INACTIVO' && '○ Inactivo'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="combo-warning-item" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ══ Sección A — Información básica ══════════════════════════════════ */}
      <div className="combo-section">
        <SectionHeader icon={<Info size={15} />} title="A — Información del combo" />
        <div className="combo-editor-grid">
          <div>
            <div className="combo-section-label">Nombre del combo *</div>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Pack Running Verano"
              style={{ width: '100%', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.55rem 0.9rem', color: '#e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div className="combo-section-label">Descripción (opcional)</div>
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción breve del combo"
              style={{ width: '100%', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.55rem 0.9rem', color: '#e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* ══ Sección B — Productos del combo ═════════════════════════════════ */}
      <div className="combo-section">
        <SectionHeader icon={<Package size={15} />} title="B — Productos del combo" />

        <ProductSearch
          placeholder="Buscar producto para agregar al combo..."
          onSelect={handleAgregarUpsell}
          exclude={excludeIds}
        />

        {(principal || upsells.length > 0) ? (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table className="combo-upsells-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Costo</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'center' }}>Descuento</th>
                  <th style={{ textAlign: 'right' }}>Precio final</th>
                  <th style={{ textAlign: 'right' }}>Utilidad</th>
                  <th style={{ textAlign: 'right' }}>Margen</th>
                  <th style={{ textAlign: 'center' }}>Principal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {principal && (() => {
                  const costo = principal.precio_costo || 0;
                  const precio = principal.precio_base || 0;
                  const utilidad = precio - costo;
                  const margen = precio > 0 ? utilidad / precio : 0;
                  return (
                    <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <td><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{principal.nombre}</div></td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(costo)}</td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(precio)}</td>
                      <td style={{ textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>Sin descuento</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtGs(precio)}</td>
                      <td style={{ textAlign: 'right', color: utilidad >= 0 ? '#10b981' : '#ef4444' }}>{fmtGs(utilidad)}</td>
                      <td style={{ textAlign: 'right', color: margen >= margenMinimoDecimal ? '#10b981' : margen > 0 ? '#f59e0b' : '#ef4444' }}>{fmtPct(margen)}</td>
                      <td style={{ textAlign: 'center' }} title="Producto principal del combo">
                        <Star size={15} fill="#facc15" color="#facc15" />
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => setPrincipal(null)} title="Quitar del combo">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })()}

                {upsells.map((u, idx) => {
                  const ur = r?.upsells?.[idx];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.nombre}</div>
                      </td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(u.precio_costo)}</td>
                      <td className="readonly" style={{ textAlign: 'right' }}>{fmtGs(u.precio_base)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="combo-discount-input" style={{ margin: '0 auto' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={u.descuento_porcentaje}
                            onChange={e => handleDescuentoUpsell(u.id, e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {ur ? fmtGs(ur.finalPrice) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: ur ? (ur.profit >= 0 ? '#10b981' : '#ef4444') : undefined }}>
                        {ur ? fmtGs(ur.profit) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: ur ? (ur.margin >= margenMinimoDecimal ? '#10b981' : ur.margin > 0 ? '#f59e0b' : '#ef4444') : undefined }}>
                        {ur ? fmtPct(ur.margin) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-icon" onClick={() => handleMarcarPrincipal(u.id)} title="Marcar como producto principal">
                          <Star size={15} />
                        </button>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleQuitarUpsell(u.id)} title="Quitar del combo">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.83rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
            Buscá productos para agregarlos al combo. Marcá uno como principal con la estrella ⭐ — es opcional, pero hace falta para calcular la rentabilidad del combo.
          </div>
        )}

        {!principal && upsells.length > 0 && (
          <div className="combo-warning-item" style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={14} /> Todavía no marcaste ningún producto como principal — los cálculos de rentabilidad del combo van a aparecer cuando marques uno.
          </div>
        )}
      </div>

      {/* ══ Sección C — Resultado del combo ═════════════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<BarChart2 size={15} />} title="C — Resultado del combo" />

          <div className="combo-metrics-grid">
            <MetricCard label="Precio original" value={fmtGs(r.combo.originalPrice)} />
            <MetricCard label="Precio con upsells" value={fmtGs(r.combo.finalPrice)} />
            <MetricCard label="Descuento $" value={fmtGs(r.combo.discountAmount)} />
            <MetricCard label="Descuento %" value={fmtPctDirect((r.combo.discountPercentage * 100).toFixed(2))} />
            <MetricCard label="Costo total" value={fmtGs(r.combo.totalCost)} />
            <MetricCard label="Utilidad" value={fmtGs(r.combo.profit)} valueClass={r.combo.profit >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Margen" value={fmtPct(r.combo.margin)} valueClass={r.combo.margin >= margenMinimoDecimal ? 'positive' : r.combo.margin > 0 ? 'warning' : 'negative'} />
          </div>

          {/* Precio del combo — editable por el admin */}
          <div className="combo-price-editor">
            <div className="combo-section-label">Precio del combo (editado por el administrador)</div>
            <div className="combo-price-input-wrap">
              <label>Precio:</label>
              <CurrencyInput
                value={precioTotal}
                onChange={val => setPrecioTotal(val === '' ? '' : String(val))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.55rem 0.9rem', color: '#e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', maxWidth: 220 }}
              />
              {margenReal !== null && (
                <div className={`combo-price-real-margin ${margenRealClass}`}>
                  Margen real: <strong>{(margenReal * 100).toFixed(2)}%</strong>
                  {margenRealClass === 'below-target' && <span>⚠ Por debajo del objetivo</span>}
                  {margenRealClass === 'no-rentable' && <span>✗ No rentable</span>}
                </div>
              )}
            </div>

            <div className="combo-price-input-wrap" style={{ marginTop: '0.5rem' }}>
              <label>Precio mínimo de venta (opcional):</label>
              <CurrencyInput
                value={precioMinimo}
                onChange={val => setPrecioMinimo(val === '' ? '' : String(val))}
                placeholder="Sin piso configurado"
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.55rem 0.9rem', color: '#e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', maxWidth: 220 }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Si lo configurás, el sistema no va a permitir guardar el combo con un precio por debajo de este valor.
            </p>
            {precioMinimo && parseFloat(precioTotal) > 0 && parseFloat(precioTotal) < parseFloat(precioMinimo) && (
              <div className="combo-warning-item" style={{ marginTop: '0.5rem' }}>
                <AlertTriangle size={14} /> El precio actual ({fmtGs(parseFloat(precioTotal))}) está por debajo del mínimo configurado ({fmtGs(parseFloat(precioMinimo))}). No se va a poder guardar así.
              </div>
            )}

            {/* Botones de precio recomendado */}
            <div className="combo-section-label">Aplicar precio sugerido:</div>
            <div className="combo-recs-grid">
              {r.recommendations.map(rec => rec.suggestedPrice && (
                <button
                  key={rec.targetMargin}
                  className="combo-rec-btn"
                  onClick={() => handleAplicarPrecioRecomendado(rec.suggestedPrice)}
                  title={`Precio para margen ${rec.targetMargin}%`}
                >
                  <div className="combo-rec-btn-margin">Margen {rec.targetMargin}%</div>
                  <div className="combo-rec-btn-price">{fmtGs(rec.suggestedPrice)}</div>
                  <div className="combo-rec-btn-profit">+{fmtGs(rec.estimatedProfit)} utilidad</div>
                </button>
              ))}
            </div>
          </div>

          <WarningList warnings={r.warnings} />
        </div>
      )}

      {/* ══ Sección D — Comparativa Solo vs Combo ═══════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<Zap size={15} />} title="D — Comparativa: venta individual vs combo" />
          <div className="combo-comparison-grid">
            <div className="combo-compare-card">
              <span className="combo-compare-label">Utilidad individual</span>
              <span className="combo-compare-value" style={{ color: r.comparison.standaloneProfit >= 0 ? '#e2e8f0' : '#ef4444' }}>
                {fmtGs(r.comparison.standaloneProfit)}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Solo producto principal</span>
            </div>
            <div className={`combo-compare-card ${r.comparison.comboProfit > r.comparison.standaloneProfit ? 'highlight' : r.comparison.comboProfit < 0 ? 'alert' : ''}`}>
              <span className="combo-compare-label">Utilidad en combo</span>
              <span className="combo-compare-value" style={{ color: r.comparison.comboProfit >= 0 ? '#10b981' : '#ef4444' }}>
                {fmtGs(r.comparison.comboProfit)}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>Con todos los upsells</span>
            </div>
            <div className="combo-compare-card">
              <span className="combo-compare-label">Incremento</span>
              <span className="combo-compare-value" style={{ color: r.comparison.profitDifference > 0 ? '#10b981' : '#ef4444' }}>
                {fmtGs(r.comparison.profitDifference)}
              </span>
              <span style={{ fontSize: '0.75rem', color: r.comparison.profitDifferencePercentage > 0 ? '#10b981' : '#ef4444' }}>
                {r.comparison.profitDifferencePercentage !== null ? `${r.comparison.profitDifferencePercentage.toFixed(2)}% más` : 'N/A'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <div>
              <span className="combo-section-label" style={{ display: 'block', marginBottom: '0.3rem' }}>Calidad de oferta</span>
              <BadgeOferta status={r.comparison.offerStatus} />
            </div>
            <div>
              <span className="combo-section-label" style={{ display: 'block', marginBottom: '0.3rem' }}>Rentabilidad</span>
              <BadgeRentabilidad status={r.comparison.profitabilityStatus} />
            </div>
          </div>
        </div>
      )}

      {/* ══ Sección E — Precios recomendados ════════════════════════════════ */}
      {r && (
        <div className="combo-section">
          <SectionHeader icon={<Star size={15} />} title="E — Precios recomendados" />
          <div style={{ overflowX: 'auto' }}>
            <table className="combo-sensitivity-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Margen objetivo</th>
                  <th>Precio sugerido</th>
                  <th>Utilidad estimada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.recommendations.map(rec => (
                  <tr key={rec.targetMargin}>
                    <td>{rec.targetMargin}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtGs(rec.suggestedPrice)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>+{fmtGs(rec.estimatedProfit)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {rec.suggestedPrice && (
                        <button
                          className="combo-rec-btn"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleAplicarPrecioRecomendado(rec.suggestedPrice)}
                        >
                          Aplicar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Footer de acciones ══════════════════════════════════════════════ */}
      <div className="combo-footer">
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
          {isEditing ? `Estado actual: ${estadoActual}` : 'Se guardará como BORRADOR'}
        </div>
        <div className="combo-footer-actions">
          <button className="btn-secondary" onClick={() => navigate('/combos')}>
            Cancelar
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleGuardar(false)}
            disabled={guardando}
          >
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar borrador'}
          </button>

          {estadoActual !== 'ACTIVO' && (
            <button
              className="btn-activate"
              onClick={isEditing ? () => handleCambiarEstado('ACTIVO') : () => handleGuardar(true)}
              disabled={guardando || cambiandoEstado || !principal}
            >
              <Power size={15} /> {cambiandoEstado || guardando ? '...' : 'Activar combo'}
            </button>
          )}

          {estadoActual === 'ACTIVO' && isEditing && (
            <button
              className="btn-deactivate"
              onClick={() => handleCambiarEstado('INACTIVO')}
              disabled={cambiandoEstado}
            >
              <PowerOff size={15} /> {cambiandoEstado ? '...' : 'Desactivar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
