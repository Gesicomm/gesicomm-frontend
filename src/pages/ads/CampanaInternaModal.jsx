import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Copy, Check, Loader2, ArrowLeft, ArrowRight, Search, MessageCircle, Globe, Package } from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { productService } from '../../services/productService';
import { landingService } from '../../services/landingService';
import { categoriaService } from '../../services/catalogoService';
import { getMediaUrl } from '../../services/api';
import FunnelStrategyStep from './FunnelStrategyStep';

const PASOS = [
  { id: 1, label: 'Nombre' },
  { id: 2, label: 'Productos' },
  { id: 3, label: 'Tipo' },
  { id: 4, label: 'Funnel' },
];

/**
 * Modal "Nueva Campaña" del módulo de Reportes de Meta Ads — wizard de 4
 * pasos: nombre -> productos (grilla visual) -> tipo de campaña (WhatsApp
 * / Web) -> funnel. Al final genera un nombre interno único (con un
 * código embebido) para copiar tal cual como nombre de la campaña real en
 * Meta Ads Manager. Cuando después se sube el reporte CSV, ese código es
 * lo que permite mapear automáticamente cada fila al producto correcto.
 */
export default function CampanaInternaModal({ open, onClose, onCreated, tiendas = [], campanaEditar = null }) {
  const [step, setStep] = useState(1);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [nombreDisplay, setNombreDisplay] = useState('');
  const [metaIntegrationId, setMetaIntegrationId] = useState(null);
  const [productoIds, setProductoIds] = useState([]);
  const [tipo, setTipo] = useState(null);
  const [landingId, setLandingId] = useState(null);

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('ALL');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const esEdicion = !!campanaEditar;

  // Con WhatsApp no hay landing/checkout propio — es "conversaciones /
  // mensajes" (ver Paso 3 más abajo), así que el Paso 4 (Funnel) no aplica
  // y se saca de la lista en vez de mostrarse vacío.
  const pasosActivos = useMemo(() => (tipo === 'whatsapp' ? PASOS.filter(p => p.id !== 4) : PASOS), [tipo]);
  const maxStep = pasosActivos[pasosActivos.length - 1]?.id || 1;

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setError(null);
    setResultado(null);
    setCopiado(false);
    setBusquedaProducto('');
    setFiltroCategoria('ALL');
    setCargandoOpciones(true);

    if (campanaEditar) {
      setNombreDisplay(campanaEditar.nombre_display || '');
      setProductoIds(campanaEditar.producto_ids || []);
      setTipo(campanaEditar.tipo || 'web');
      setLandingId(campanaEditar.landing_id || null);
      setMetaIntegrationId(campanaEditar.meta_integration_id || null);
    } else {
      setNombreDisplay('');
      setProductoIds([]);
      setTipo(null);
      setLandingId(null);
      setMetaIntegrationId(tiendas.length === 1 ? tiendas[0].id : null);
    }

    Promise.all([
      productService.buscar({ activo: true, limit: 200 }),
      categoriaService.buscar({}).catch(() => ({ categorias: [] })),
      landingService.listar().catch(() => []),
    ]).then(([productosRes, categoriasRes, landingsRes]) => {
      setProductos(productosRes.productos || []);
      setCategorias(categoriasRes.categorias || []);
      setFunnels((landingsRes || []).filter(l => l.tipo_pagina === 'funnel' && l.producto_id));
    }).catch((err) => {
      setError(err.message || 'No se pudieron cargar los datos.');
    }).finally(() => setCargandoOpciones(false));
  }, [open, campanaEditar]);

  const mapaCategorias = useMemo(() => new Map(categorias.map(c => [c.id, c.nombre])), [categorias]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (filtroCategoria !== 'ALL' && String(p.categoria_id) !== String(filtroCategoria)) return false;
      if (busquedaProducto.trim()) {
        const q = busquedaProducto.trim().toLowerCase();
        return p.nombre.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [productos, filtroCategoria, busquedaProducto]);

  // Si el canal cambia a WhatsApp mientras se estaba en el Paso 4, ese paso
  // deja de existir — no dejar al wizard "parado" en un paso que ya no está.
  // (Tiene que ir antes del "if (!open) return null" de abajo — los hooks
  // no pueden ser condicionales.)
  useEffect(() => { setStep(s => Math.min(s, maxStep)); }, [maxStep]);

  if (!open) return null;

  const toggleProducto = (id) => {
    setProductoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const puedeAvanzar = () => {
    if (step === 1) return nombreDisplay.trim().length > 0;
    if (step === 2) return productoIds.length > 0;
    if (step === 3) return !!tipo;
    return true;
  };

  const irSiguiente = () => { if (puedeAvanzar()) setStep(s => Math.min(maxStep, s + 1)); };
  const irAtras = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        nombre_display: nombreDisplay.trim(),
        producto_ids: productoIds,
        tipo,
        landing_id: landingId || null,
        meta_integration_id: metaIntegrationId || null,
      };

      if (esEdicion) {
        const actualizada = await metaReportesService.actualizarCampana(campanaEditar.id, payload);
        onCreated?.(actualizada);
        onClose();
      } else {
        const creada = await metaReportesService.crearCampana(payload);
        setResultado(creada);
        onCreated?.(creada);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar la campaña.');
    } finally {
      setGuardando(false);
    }
  };

  const copiarNombre = () => {
    if (!resultado?.nombre_interno) return;
    navigator.clipboard.writeText(resultado.nombre_interno).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div
        style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#a78bfa" /> {esEdicion ? 'Editar campaña' : 'Nueva campaña interna'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {resultado ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#c4c4c8' }}>
              Campaña creada. Copiá este nombre <strong>tal cual</strong> como nombre de la campaña real en Meta Ads Manager —
              es lo que va a permitir mapear automáticamente el reporte que subas después.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#141416', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
              <code style={{ flex: 1, fontSize: '0.85rem', color: '#34d399', wordBreak: 'break-all' }}>{resultado.nombre_interno}</code>
              <button type="button" className="btn-icon" onClick={copiarNombre} title="Copiar">
                {copiado ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              </button>
            </div>
            <button type="button" className="btn-primary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Listo</button>
          </div>
        ) : (
          <>
            {/* Indicador de pasos */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.25rem 0' }}>
              {pasosActivos.map((p) => (
                <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ height: '3px', borderRadius: '2px', background: p.id <= step ? 'var(--bg-primary, #a78bfa)' : 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: '0.7rem', color: p.id === step ? '#fff' : '#777', fontWeight: p.id === step ? 600 : 400 }}>{p.id}. {p.label}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, minHeight: '320px' }}>
              {error && (
                <div style={{ marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}

              {/* Paso 1: Nombre */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', color: '#aaa' }}>Nombre de la campaña <span style={{ color: '#f87171' }}>*</span></label>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Ej: Cejas - Escala Agosto"
                      value={nombreDisplay}
                      onChange={(e) => setNombreDisplay(e.target.value)}
                      autoFocus
                    />
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>Es solo para identificarla acá — el nombre final para Meta se genera al terminar.</span>
                  </div>

                  {tiendas.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.82rem', color: '#aaa' }}>Cuenta de Meta (opcional)</label>
                      <select className="filter-input" value={metaIntegrationId || ''} onChange={(e) => setMetaIntegrationId(e.target.value || null)}>
                        <option value="">Sin especificar</option>
                        {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre || t.business_name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Paso 2: Productos */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                      <input
                        type="text"
                        className="filter-input"
                        style={{ paddingLeft: '1.9rem' }}
                        placeholder="Buscar producto..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                      />
                    </div>
                    <select className="filter-input" style={{ maxWidth: '200px' }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                      <option value="ALL">Todas las categorías</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>

                  <span style={{ fontSize: '0.78rem', color: '#777' }}>{productoIds.length} producto(s) elegido(s)</span>

                  {cargandoOpciones ? (
                    <div className="skeleton-row" style={{ height: '120px' }} />
                  ) : productosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: '0.85rem' }}>No se encontraron productos.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                      {productosFiltrados.map((p) => {
                        const seleccionado = productoIds.includes(p.id);
                        const img = p.imagenes?.[0]?.url;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => toggleProducto(p.id)}
                            style={{
                              display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
                              border: seleccionado ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px', overflow: 'hidden', background: '#141416', padding: 0,
                            }}
                          >
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#1a1a1c' }}>
                              {img ? (
                                <img src={getMediaUrl(img)} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Package size={24} color="#444" />
                                </div>
                              )}
                              {seleccionado && (
                                <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#a78bfa', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Check size={12} color="#0a0a0b" />
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '0.5rem' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', lineHeight: 1.2, marginBottom: '2px' }}>{p.nombre}</div>
                              {p.categoria_id && mapaCategorias.get(p.categoria_id) && (
                                <span style={{ fontSize: '0.68rem', color: '#a78bfa' }}>{mapaCategorias.get(p.categoria_id)}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: Tipo */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#aaa' }}>¿A qué canal apunta esta campaña?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'web', label: 'Web', desc: 'Landing / checkout propio', icon: <Globe size={22} color="#3b82f6" />, color: '#3b82f6' },
                      { value: 'whatsapp', label: 'WhatsApp', desc: 'Conversaciones / mensajes', icon: <MessageCircle size={22} color="#10b981" />, color: '#10b981' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setTipo(opt.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '1.25rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: tipo === opt.value ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.12)',
                          background: tipo === opt.value ? `${opt.color}1a` : '#141416',
                        }}
                      >
                        {opt.icon}
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 4: Funnel — solo existe con tipo='web' (ver pasosActivos) */}
              {step === 4 && (
                <FunnelStrategyStep
                  productos={productos}
                  productoIds={productoIds}
                  setLandingId={setLandingId}
                  onError={setError}
                />
              )}
            </div>

            {/* Footer navegación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button type="button" className="btn-secondary" onClick={irAtras} disabled={step === 1 || guardando} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                <ArrowLeft size={15} style={{ marginRight: '0.3rem' }} /> Atrás
              </button>

              {step < maxStep ? (
                <button type="button" className="btn-primary" onClick={irSiguiente} disabled={!puedeAvanzar()}>
                  Siguiente <ArrowRight size={15} style={{ marginLeft: '0.3rem' }} />
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={guardando}>
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : (esEdicion ? 'Guardar cambios' : 'Generar nombre y crear')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
