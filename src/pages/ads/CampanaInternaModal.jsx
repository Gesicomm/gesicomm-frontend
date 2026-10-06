import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Copy, Check, Loader2, ArrowLeft, ArrowRight, Search, MessageCircle, Globe, Package, ChevronLeft, ChevronRight, TrendingUp, Target, RefreshCw, Zap } from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { getMediaUrl } from '../../services/api';

const PASOS = [
  { id: 1, label: 'Producto' },
  { id: 2, label: 'Embudo' },
  { id: 3, label: 'Fase' },
  { id: 4, label: 'Presupuesto' },
];

/**
 * Modal "Nueva Campaña" del módulo de Reportes de Meta Ads — wizard de 4
 * pasos: producto -> embudo -> fase -> presupuesto. Al final genera un nombre 
 * automáticamente para copiar tal cual como nombre de la campaña real en Meta Ads Manager.
 */
export default function CampanaInternaModal({ open, onClose, onCreated, tiendas = [], campanaEditar = null }) {
  const [step, setStep] = useState(1);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [metaIntegrationId, setMetaIntegrationId] = useState(null);
  
  // New State variables for the wizard
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [embudo, setEmbudo] = useState(null); // 'WEB' or 'WHATSAPP'
  const [fase, setFase] = useState(null); // 'PRESENTACION', 'EVALUACION', 'CONVERSION', 'ASCENSION'
  const [presupuesto, setPresupuesto] = useState(null); // 'ABO' or 'CBO'

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('ALL');
  const [paginaProducto, setPaginaProducto] = useState(1);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const esEdicion = !!campanaEditar;
  const maxStep = PASOS[PASOS.length - 1]?.id || 1;

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setError(null);
    setResultado(null);
    setCopiado(false);
    setBusquedaProducto('');
    setFiltroCategoria('ALL');
    setPaginaProducto(1);
    setCargandoOpciones(true);

    if (campanaEditar) {
      setMetaIntegrationId(campanaEditar.meta_integration_id || null);
      // If editing, we might not have all the specific fields broken down,
      // but we try to set what we have. (Edition of these new campaigns might be disabled or limited)
    } else {
      setProductoSeleccionado(null);
      setEmbudo(null);
      setFase(null);
      setPresupuesto(null);
      setMetaIntegrationId(tiendas.length === 1 ? tiendas[0].id : null);
    }

    Promise.all([
      productService.buscar({ activo: true, sin_limite: true }),
      categoriaService.buscar({}).catch(() => ({ categorias: [] })),
    ]).then(([productosRes, categoriasRes]) => {
      setProductos(productosRes.productos || []);
      setCategorias(categoriasRes.categorias || []);
    }).catch((err) => {
      setError(err.message || 'No se pudieron cargar los datos.');
    }).finally(() => setCargandoOpciones(false));
  }, [open, campanaEditar]);

  useEffect(() => {
    setPaginaProducto(1);
  }, [busquedaProducto, filtroCategoria]);

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

  const TAMANO_PAGINA = 10;
  const totalPaginasProductos = Math.ceil(productosFiltrados.length / TAMANO_PAGINA) || 1;
  const productosPaginados = useMemo(() => {
    const inicio = (paginaProducto - 1) * TAMANO_PAGINA;
    return productosFiltrados.slice(inicio, inicio + TAMANO_PAGINA);
  }, [productosFiltrados, paginaProducto]);

  useEffect(() => { setStep(s => Math.min(s, maxStep)); }, [maxStep]);

  if (!open) return null;

  const toggleProducto = (producto) => {
    setProductoSeleccionado(producto);
  };

  const puedeAvanzar = () => {
    if (step === 1) return !!productoSeleccionado;
    if (step === 2) return !!embudo;
    if (step === 3) return !!fase;
    if (step === 4) return !!presupuesto;
    return true;
  };

  const irSiguiente = () => { if (puedeAvanzar()) setStep(s => Math.min(maxStep, s + 1)); };
  const irAtras = () => setStep(s => Math.max(1, s - 1));

  const generarNombreNomenclatura = () => {
    if (!productoSeleccionado || !embudo || !fase || !presupuesto) return '';
    const pId = `P${String(productoSeleccionado.id).padStart(4, '0')}`;
    const pNombre = (productoSeleccionado.nombre || '').toUpperCase().trim();
    return `${pId} | ${pNombre} | ${embudo} | ${fase} | ${presupuesto}`;
  };

  const handleSubmit = async () => {
    setGuardando(true);
    setError(null);
    try {
      const nombreFinal = generarNombreNomenclatura();
      const payload = {
        nombre_display: nombreFinal,
        producto_ids: [productoSeleccionado.id],
        tipo: embudo === 'WEB' ? 'web' : 'whatsapp',
        landing_id: null,
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
        style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)', borderRadius: '10px', color: 'var(--color-fg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#3d5fa3" /> {esEdicion ? 'Editar campaña' : 'Nueva campaña interna'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {resultado ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-fg)' }}>
              Campaña creada. Copiá este nombre <strong>tal cual</strong> como nombre de la campaña real en Meta Ads Manager —
              es lo que va a permitir mapear automáticamente el reporte que subas después.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
              <code style={{ flex: 1, fontSize: '0.85rem', color: '#34d399', wordBreak: 'break-all' }}>{resultado.nombre_interno}</code>
              <button type="button" className="btn-icon" onClick={copiarNombre} title="Copiar">
                {copiado ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              </button>
            </div>
            <button type="button" className="btn-primary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Listo</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.25rem 0' }}>
              {PASOS.map((p) => (
                <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ height: '3px', borderRadius: '2px', background: p.id <= step ? 'var(--bg-primary, #3d5fa3)' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)' }} />
                  <span style={{ fontSize: '0.7rem', color: p.id === step ? 'var(--color-fg)' : 'var(--color-fg-muted)', fontWeight: p.id === step ? 600 : 400 }}>{p.id}. {p.label}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, minHeight: '320px' }}>
              {error && (
                <div style={{ marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>Seleccioná el producto de la campaña</p>
                  
                  {tiendas.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <select className="filter-input" value={metaIntegrationId || ''} onChange={(e) => setMetaIntegrationId(e.target.value || null)}>
                        <option value="">Cuenta de Meta (opcional)</option>
                        {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre || t.business_name}</option>)}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fg-subtle)' }} />
                      <input
                        type="text"
                        className="filter-input"
                        style={{ paddingLeft: '1.9rem' }}
                        placeholder="Buscar producto..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                      />
                    </div>
                    
                  </div>

                  {cargandoOpciones ? (
                    <div className="skeleton-row" style={{ height: '120px' }} />
                  ) : productosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-fg-muted)', fontSize: '0.85rem' }}>No se encontraron productos.</div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                        {productosPaginados.map((p) => {
                          const seleccionado = productoSeleccionado?.id === p.id;
                          const img = p.imagenes?.[0]?.url;
                          return (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => toggleProducto(p)}
                              style={{
                                display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
                                border: seleccionado ? '2px solid #3d5fa3' : '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
                                borderRadius: '8px', overflow: 'hidden', background: 'var(--color-canvas)', padding: 0,
                              }}
                            >
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: 'var(--color-canvas)' }}>
                                {img ? (
                                  <img src={getMediaUrl(img)} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={24} color="var(--color-fg-subtle)" />
                                  </div>
                                )}
                                {seleccionado && (
                                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#3d5fa3', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} color="#0a0a0b" />
                                  </div>
                                )}
                              </div>
                              <div style={{ padding: '0.5rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-fg)', lineHeight: 1.2, marginBottom: '2px' }}>{p.nombre}</div>
                                {p.categoria_id && mapaCategorias.get(p.categoria_id) && (
                                  <span style={{ fontSize: '0.68rem', color: '#3d5fa3' }}>{mapaCategorias.get(p.categoria_id)}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {totalPaginasProductos > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--color-fg-muted)' }}>
                          <button
                            type="button"
                            disabled={paginaProducto <= 1}
                            onClick={() => setPaginaProducto(p => Math.max(1, p - 1))}
                            style={{
                              padding: '0.25rem 0.75rem', borderRadius: '6px',
                              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                              background: paginaProducto <= 1 ? 'color-mix(in srgb, var(--color-fg) 3%, transparent)' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                              color: paginaProducto <= 1 ? 'var(--color-fg-subtle)' : 'var(--color-fg)',
                              cursor: paginaProducto <= 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span>{paginaProducto} de {totalPaginasProductos}</span>
                          <button
                            type="button"
                            disabled={paginaProducto >= totalPaginasProductos}
                            onClick={() => setPaginaProducto(p => Math.min(totalPaginasProductos, p + 1))}
                            style={{
                              padding: '0.25rem 0.75rem', borderRadius: '6px',
                              border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                              background: paginaProducto >= totalPaginasProductos ? 'color-mix(in srgb, var(--color-fg) 3%, transparent)' : 'color-mix(in srgb, var(--color-fg) 8%, transparent)',
                              color: paginaProducto >= totalPaginasProductos ? 'var(--color-fg-subtle)' : 'var(--color-fg)',
                              cursor: paginaProducto >= totalPaginasProductos ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>¿Qué tipo de embudo usarás?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'WEB', label: 'Venta Web', desc: 'Tráfico a página de destino', icon: <Globe size={22} color="#3b82f6" />, color: '#3b82f6' },
                      { value: 'WHATSAPP', label: 'WhatsApp', desc: 'Mensajes directos', icon: <MessageCircle size={22} color="#10b981" />, color: '#10b981' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setEmbudo(opt.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '1.25rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: embudo === opt.value ? `2px solid ${opt.color}` : '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                          background: embudo === opt.value ? `${opt.color}1a` : 'var(--color-canvas)',
                        }}
                      >
                        {opt.icon}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-fg)', fontSize: '0.9rem' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>¿En qué fase de venta está tu público?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'PRESENTACION', label: 'Presentación', desc: 'Público frío que no te conoce', icon: <Sparkles size={20} color="#8b5cf6" /> },
                      { value: 'EVALUACION', label: 'Evaluación', desc: 'Ya interactuaron con tu marca', icon: <Search size={20} color="#f59e0b" /> },
                      { value: 'CONVERSION', label: 'Conversión', desc: 'Intención alta de compra', icon: <Target size={20} color="#ef4444" /> },
                      { value: 'ASCENSION', label: 'Ascensión', desc: 'Recompra o venta cruzada', icon: <TrendingUp size={20} color="#3b82f6" /> },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setFase(opt.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem',
                          padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: fase === opt.value ? `2px solid #3d5fa3` : '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                          background: fase === opt.value ? 'color-mix(in srgb, var(--bg-primary) 10%, transparent)' : 'var(--color-canvas)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          {opt.icon}
                          <div style={{ fontWeight: 600, color: 'var(--color-fg)', fontSize: '0.9rem' }}>{opt.label}</div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>¿Qué tipo de presupuesto utilizarás?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'ABO', label: 'ABO', desc: 'Presupuesto por conjunto de anuncios', icon: <RefreshCw size={20} /> },
                      { value: 'CBO', label: 'CBO', desc: 'Presupuesto a nivel de campaña', icon: <Zap size={20} /> },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setPresupuesto(opt.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem',
                          padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: presupuesto === opt.value ? `2px solid #3d5fa3` : '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                          background: presupuesto === opt.value ? 'color-mix(in srgb, var(--bg-primary) 10%, transparent)' : 'var(--color-canvas)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', color: presupuesto === opt.value ? '#3d5fa3' : 'var(--color-fg-muted)' }}>
                          {opt.icon}
                          <div style={{ fontWeight: 600, color: 'var(--color-fg)', fontSize: '0.9rem' }}>{opt.label}</div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  
                  {presupuesto && (
                    <div style={{ marginTop: '1.5rem', background: 'var(--color-canvas)', border: '1px dashed color-mix(in srgb, var(--color-fg) 20%, transparent)', borderRadius: '8px', padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista previa del nombre</p>
                      <code style={{ fontSize: '0.9rem', color: 'var(--color-fg)', fontWeight: 600 }}>{generarNombreNomenclatura()}</code>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', borderTop: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
              <button type="button" className="btn-secondary" onClick={irAtras} disabled={step === 1 || guardando} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                <ArrowLeft size={15} style={{ marginRight: '0.3rem' }} /> Atrás
              </button>

              {step < maxStep ? (
                <button type="button" className="btn-primary" onClick={irSiguiente} disabled={!puedeAvanzar()}>
                  Siguiente <ArrowRight size={15} style={{ marginLeft: '0.3rem' }} />
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={guardando || !puedeAvanzar()}>
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
