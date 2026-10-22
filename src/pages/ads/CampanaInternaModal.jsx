import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Copy, Check, Loader2, ArrowLeft, ArrowRight, Search, MessageCircle, Globe, Package, ChevronLeft, ChevronRight, TrendingUp, Target, RefreshCw, Zap } from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { useAdsDialog } from './useAdsDialog';
import { getMediaUrl } from '../../services/api';

const PASOS = [
  { id: 1, label: 'Producto' },
  { id: 2, label: 'Canal' },
  { id: 3, label: 'Objetivo' },
  { id: 4, label: 'Distribución' },
];

/**
 * Modal "Nueva Campaña" del módulo de Reportes de Meta Ads — wizard de 4
 * pasos: producto -> embudo -> fase -> presupuesto. Al final genera un nombre 
 * automáticamente para copiar tal cual como nombre de la campaña real en Meta Ads Manager.
 * El gasto no se carga acá: va por rango de fechas en GastoCampanaModal.
 */
export default function CampanaInternaModal({ open, onClose, onCreated, onCargarGasto = null, tiendas = [], campanaEditar = null }) {
  const [step, setStep] = useState(1);
  const [editado, setEditado] = useState(false);

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
  const { dialogRef, requestClose, aviso } = useAdsDialog(open, onClose, guardando, !resultado && editado);
  const maxStep = PASOS[PASOS.length - 1]?.id || 1;

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setEditado(false);
    setError(null);
    setResultado(null);
    setCopiado(false);
    setBusquedaProducto('');
    setFiltroCategoria('ALL');
    setPaginaProducto(1);
    setCargandoOpciones(true);

    if (campanaEditar) {
      setMetaIntegrationId(campanaEditar.meta_integration_id || null);
      const partes = String(campanaEditar.nombre_interno || campanaEditar.nombre_display || '').split('|').map(p => p.trim());
      setProductoSeleccionado(campanaEditar.productos?.[0] || null);
      setEmbudo(campanaEditar.tipo === 'whatsapp' ? 'WHATSAPP' : 'WEB');
      setFase(['PRESENTACION', 'EVALUACION', 'CONVERSION', 'ASCENSION'].includes(partes.at(-2)) ? partes.at(-2) : null);
      setPresupuesto(['ABO', 'CBO'].includes(partes.at(-1)) ? partes.at(-1) : null);
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
    setEditado(true);
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
    if (!productoSeleccionado || !embudo || !fase || !presupuesto) { setError('Completá los cuatro pasos antes de guardar.'); return; }
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
    }).catch(() => setError('No pudimos copiar el nombre. Seleccioná el texto y copialo manualmente.'));
  };

  return (
    <div
      className="ads-modal-overlay"
      onClick={requestClose}
      style={{ position: 'fixed', inset: 0, background: "var(--color-overlay)", display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={esEdicion ? 'Editar campaña' : 'Nueva campaña interna'} className="ads-wizard"
        style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)', borderRadius: '10px', color: 'var(--color-fg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--color-primary-text)" /> {esEdicion ? 'Editar campaña' : 'Nueva campaña interna'}
          </h2>
          <button type="button" className="btn-icon" onClick={requestClose} disabled={guardando} aria-label="Cerrar campaña"><X size={18} /></button>
        </div>

        {aviso}
        <p className="ads-dialog-intro">Este registro organiza tu publicidad en Gesicom. No publica anuncios ni compromete un presupuesto en Meta.</p>
        {resultado ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div role="alert" className="ads-error">{error}</div>}
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-fg)' }}>
              Campaña creada. Copiá este nombre <strong>tal cual</strong> como nombre de la campaña real en Meta Ads Manager.
              Después cargá acá cuánto gastaste en cada rango de fechas.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
              <code style={{ flex: 1, fontSize: '0.85rem', color: "var(--color-success)", wordBreak: 'break-all' }}>{resultado.nombre_interno}</code>
              <button type="button" className="btn-icon" onClick={copiarNombre} title="Copiar">
                {copiado ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {onCargarGasto && (
                <button type="button" className="btn-secondary" onClick={() => onCargarGasto(resultado)}>Cargar gasto</button>
              )}
              <button type="button" className="btn-primary" onClick={onClose}>Listo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="ads-wizard-steps" aria-label="Pasos de la campaña" style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.25rem 0' }}>
              {PASOS.map((p) => (
                <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ height: '3px', borderRadius: '2px', background: p.id <= step ? "var(--bg-primary, var(--color-primary))" : 'color-mix(in srgb, var(--color-fg) 10%, transparent)' }} />
                  <span style={{ fontSize: '0.7rem', color: p.id === step ? 'var(--color-fg)' : 'var(--color-fg-muted)', fontWeight: p.id === step ? 600 : 400 }}>{p.id}. {p.label}</span>
                </div>
              ))}
            </div>

            <div className="ads-wizard-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, minHeight: '320px' }}>
              {error && (
                <div role="alert" style={{ marginBottom: '1rem', background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)", color: "var(--color-danger)", borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>Seleccioná el producto de la campaña</p>
                  
                  {tiendas.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <select aria-label="Cuenta de Meta (opcional)" className="filter-input" value={metaIntegrationId || ''} onChange={(e) => { setMetaIntegrationId(e.target.value || null); setEditado(true); }}>
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
                              aria-pressed={seleccionado}
                              onClick={() => toggleProducto(p)}
                              style={{
                                display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
                                border: seleccionado ? "2px solid var(--color-primary)" : '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
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
                                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: "var(--color-primary)", borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} color="var(--color-fg)" />
                                  </div>
                                )}
                              </div>
                              <div style={{ padding: '0.5rem' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-fg)', lineHeight: 1.5, marginBottom: '2px' }}>{p.nombre}</div>
                                {p.categoria_id && mapaCategorias.get(p.categoria_id) && (
                                  <span style={{ fontSize: '0.875rem', color: "var(--color-primary-text)" }}>{mapaCategorias.get(p.categoria_id)}</span>
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
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>¿Dónde querés recibir las consultas?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'WEB', label: 'Venta Web', desc: 'Tráfico a página de destino', icon: <Globe size={22} color="var(--color-primary-text)" />, color: '#3b82f6' },
                      { value: 'WHATSAPP', label: 'WhatsApp', desc: 'Mensajes directos', icon: <MessageCircle size={22} color="var(--color-success)" />, color: '#10b981' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        aria-pressed={embudo === opt.value}
                        onClick={() => { setEmbudo(opt.value); setEditado(true); }}
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
                      { value: 'PRESENTACION', label: 'Presentación', desc: 'Público frío que no te conoce', icon: <Sparkles size={20} color="var(--color-primary-text)" /> },
                      { value: 'EVALUACION', label: 'Evaluación', desc: 'Ya interactuaron con tu marca', icon: <Search size={20} color="var(--color-warning)" /> },
                      { value: 'CONVERSION', label: 'Conversión', desc: 'Intención alta de compra', icon: <Target size={20} color="var(--color-danger)" /> },
                      { value: 'ASCENSION', label: 'Ascensión', desc: 'Recompra o venta cruzada', icon: <TrendingUp size={20} color="var(--color-primary-text)" /> },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        aria-pressed={fase === opt.value}
                        onClick={() => { setFase(opt.value); setEditado(true); }}
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
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>¿Cómo distribuirás el presupuesto en Meta?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { value: 'ABO', label: 'ABO', desc: 'Presupuesto por conjunto de anuncios', icon: <RefreshCw size={20} /> },
                      { value: 'CBO', label: 'CBO', desc: 'Presupuesto a nivel de campaña', icon: <Zap size={20} /> },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        aria-pressed={presupuesto === opt.value}
                        onClick={() => { setPresupuesto(opt.value); setEditado(true); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem',
                          padding: '1rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          border: presupuesto === opt.value ? `2px solid #3d5fa3` : '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                          background: presupuesto === opt.value ? 'color-mix(in srgb, var(--bg-primary) 10%, transparent)' : 'var(--color-canvas)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', color: presupuesto === opt.value ? "var(--color-primary-text)" : 'var(--color-fg-muted)' }}>
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
