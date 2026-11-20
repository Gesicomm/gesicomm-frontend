import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { X, Sparkles, Copy, Check, Loader2, ArrowLeft, ArrowRight, Search, MessageCircle, Globe, Package, ChevronLeft, ChevronRight, TrendingUp, Target, RefreshCw, Zap, Plus, Trash2, Upload } from 'lucide-react';
import { metaReportesService } from '../../services/metaReportesService';
import { productService } from '../../services/productService';
import { categoriaService } from '../../services/catalogoService';
import { useAdsDialog } from './useAdsDialog';
import { getMediaUrl } from '../../services/api';
import { NumericFormat } from 'react-number-format';
import ConjuntoVentasMeta from './ConjuntoVentasMeta';

const PASOS = [
  { id: 1, label: 'Producto' },
  { id: 2, label: 'Canal' },
  { id: 3, label: 'Fase de venta' },
  { id: 4, label: 'Objetivo Meta' },
  { id: 5, label: 'Presupuesto' },
  { id: 6, label: 'Conjuntos' },
  { id: 7, label: 'Creativos' },
];

const OBJETIVOS_META = [
  ['OUTCOME_AWARENESS', 'Reconocimiento'],
  ['OUTCOME_TRAFFIC', 'Tráfico'],
  ['OUTCOME_ENGAGEMENT', 'Interacción'],
  ['OUTCOME_LEADS', 'Clientes potenciales'],
  ['OUTCOME_APP_PROMOTION', 'Promoción de aplicación'],
  ['OUTCOME_SALES', 'Ventas'],
];
const nuevoConjunto = (id) => ({ id, nombre: '', descripcion: '', estado: 'PAUSED', presupuesto_diario: '' });

/**
 * Modal "Nueva Campaña" del módulo de Reportes de Meta Ads — producto,
 * canal, fase, objetivo Meta, presupuesto, conjuntos y creativos. Genera un nombre
 * automáticamente para copiar tal cual como nombre de la campaña real en Meta Ads Manager.
 * El gasto no se carga acá: va por rango de fechas en GastoCampanaModal.
 */
export default function CampanaInternaModal({ open, onClose, onCreated, onCargarGasto = null, tiendas = [], campanaEditar = null }) {
  const [step, setStep] = useState(1);
  const [editado, setEditado] = useState(false);
  const wizardBodyRef = useRef(null);
  const conjuntoNuevoRef = useRef(null);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [metaIntegrationId, setMetaIntegrationId] = useState(null);
  
  // New State variables for the wizard
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [embudo, setEmbudo] = useState(null); // 'WEB' or 'WHATSAPP'
  const [fase, setFase] = useState(null); // 'PRESENTACION', 'EVALUACION', 'CONVERSION', 'ASCENSION'
  const [presupuesto, setPresupuesto] = useState(null); // 'ABO' or 'CBO'
  const [objetivoMeta, setObjetivoMeta] = useState(null);
  const [presupuestoDiario, setPresupuestoDiario] = useState('');
  const [conjuntos, setConjuntos] = useState([nuevoConjunto(1)]);
  const [archivos, setArchivos] = useState({});
  const [creativosGuardados, setCreativosGuardados] = useState([]);
  const [campanaPersistida, setCampanaPersistida] = useState(null);
  const [metaCampaignId, setMetaCampaignId] = useState('');
  const [ventasConjuntos, setVentasConjuntos] = useState([]);

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
    setCampanaPersistida(null);
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
      const config = campanaEditar.configuracion_anuncios;
      setObjetivoMeta(config?.objetivo || null);
      setPresupuesto(config?.tipo_presupuesto || (['ABO', 'CBO'].includes(partes.at(-1)) ? partes.at(-1) : null));
      setPresupuestoDiario(config?.presupuesto_diario || '');
      setConjuntos(config?.conjuntos?.length ? config.conjuntos : [nuevoConjunto(1)]);
      setCreativosGuardados(campanaEditar.creativos || []);
      setMetaCampaignId(campanaEditar.meta_campaign_id || '');
      setVentasConjuntos(campanaEditar.ventas_conjuntos || []);
    } else {
      setProductoSeleccionado(null);
      setEmbudo(null);
      setFase(null);
      setPresupuesto(null);
      setObjetivoMeta(null);
      setPresupuestoDiario('');
      setConjuntos([nuevoConjunto(1)]);
      setCreativosGuardados([]);
      setMetaCampaignId('');
      setVentasConjuntos([]);
      setMetaIntegrationId(tiendas.length === 1 ? tiendas[0].id : null);
    }
    setArchivos({});

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

  useLayoutEffect(() => {
    const id = conjuntoNuevoRef.current;
    if (step !== 6 || id == null) return;
    const cuerpo = wizardBodyRef.current;
    const campo = [...(cuerpo?.querySelectorAll('[data-conjunto-id] input') || [])]
      .find(input => Number(input.closest('[data-conjunto-id]')?.dataset.conjuntoId) === id);
    if (!campo) return;
    cuerpo.scrollTop = 0;
    campo.focus({ preventScroll: true });
    conjuntoNuevoRef.current = null;
  }, [conjuntos, step]);

  if (!open) return null;

  const toggleProducto = (producto) => {
    setProductoSeleccionado(producto);
    setEditado(true);
  };

  const puedeAvanzar = () => {
    if (step === 1) return !!productoSeleccionado;
    if (step === 2) return !!embudo;
    if (step === 3) return !!fase;
    if (step === 4) return !!objetivoMeta;
    if (step === 5) return !!presupuesto && (presupuesto === 'ABO' || Number(presupuestoDiario) > 0);
    if (step === 6 || step === 7) return conjuntos.length > 0 && conjuntos.every(c => c.nombre.trim() && (presupuesto === 'CBO' || Number(c.presupuesto_diario) > 0));
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

  const cambiarConjunto = (id, cambios) => { setConjuntos(actuales => actuales.map(c => c.id === id ? { ...c, ...cambios } : c)); setEditado(true); };
  const agregarConjunto = () => {
    const id = Math.max(0, ...conjuntos.map(c => c.id)) + 1;
    conjuntoNuevoRef.current = id;
    setConjuntos(actuales => [nuevoConjunto(id), ...actuales]);
    setEditado(true);
  };

  const handleSubmit = async () => {
    if (!productoSeleccionado || !embudo || !fase || !presupuesto || !objetivoMeta || !conjuntos.length || !conjuntos.every(c => c.nombre.trim() && (presupuesto === 'CBO' || Number(c.presupuesto_diario) > 0)) || (presupuesto === 'CBO' && Number(presupuestoDiario) <= 0)) { setError('Completá el objetivo, el presupuesto y cada conjunto antes de guardar.'); return; }
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
        ...(esEdicion ? { meta_campaign_id: metaCampaignId } : {}),
        configuracion_anuncios: { objetivo: objetivoMeta, tipo_presupuesto: presupuesto, presupuesto_diario: presupuesto === 'CBO' ? Number(presupuestoDiario) : null, conjuntos: conjuntos.map(c => ({ ...c, presupuesto_diario: presupuesto === 'ABO' ? Number(c.presupuesto_diario) : null })) },
      };

      const guardada = campanaPersistida ? await metaReportesService.actualizarCampana(campanaPersistida.id, payload) : (esEdicion
        ? await metaReportesService.actualizarCampana(campanaEditar.id, payload)
        : await metaReportesService.crearCampana(payload));
      setCampanaPersistida(guardada);
      if (!campanaPersistida) onCreated?.(guardada);
      for (const creativo of creativosGuardados.filter(x => !conjuntos.some(c => c.id === x.conjunto_id))) {
        await metaReportesService.eliminarCreativo(guardada.id, creativo.id);
        setCreativosGuardados(actuales => actuales.filter(x => x.id !== creativo.id));
      }
      const pendientes = Object.entries(archivos).flatMap(([id, lista]) => lista.map(archivo => ({ id: Number(id), archivo })));
      for (const { id, archivo } of pendientes) {
        await metaReportesService.subirCreativo(guardada.id, id, archivo);
        setArchivos(actuales => ({ ...actuales, [id]: (actuales[id] || []).filter(f => f !== archivo) }));
      }
      if (pendientes.length) onCreated?.(guardada);
      if (esEdicion) {
        onClose();
      } else {
        setResultado(guardada);
      }
    } catch (err) {
      setError((campanaPersistida ? 'La campaña se guardó, pero faltan creativos por subir. Reintentá. ' : '') + (err.response?.data?.message || err.message || 'Error al guardar la campaña.'));
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

  const descargarCreativo = async (creativo) => {
    try {
      const blob = await metaReportesService.descargarCreativo(campanaEditar.id, creativo.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = creativo.nombre;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.response?.data?.message || 'No pudimos descargar el creativo.'); }
  };

  return (
    <div
      className="ads-modal-overlay"
      onClick={requestClose}
      style={{ position: 'fixed', inset: 0, background: "var(--color-overlay)", display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={esEdicion ? 'Editar campaña' : 'Nueva campaña interna'} className="ads-wizard"
        style={{ width: '100%', maxWidth: '780px', maxHeight: '96dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-canvas)', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)', borderRadius: '10px', color: 'var(--color-fg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 8%, transparent)' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--color-primary-text)" /> {esEdicion ? 'Editar campaña' : 'Nueva campaña interna'}
          </h2>
          <button type="button" className="btn-icon" onClick={requestClose} disabled={guardando} aria-label="Cerrar campaña"><X size={18} /></button>
        </div>

        {aviso}
        {step !== 6 && <p className="ads-dialog-intro">Este registro organiza tu publicidad en Gesicom. No publica anuncios ni compromete un presupuesto en Meta.</p>}
        {esEdicion && step === 1 && campanaEditar.configuracion_anuncios?.conjuntos?.length > 0 && <button type="button" className="btn-secondary ads-jump-conjuntos" onClick={() => setStep(6)}>Ir a conjuntos y ventas de Meta</button>}
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
              <a className="btn-secondary" href="/skills/gesicom-meta-ads.md" download="gesicom-meta-ads.md">Descargar guía de ChatGPT</a>
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
            <p className="ads-mobile-step">Paso {step} de {maxStep}: {PASOS[step - 1]?.label}</p>

            <div ref={wizardBodyRef} className="ads-wizard-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, minHeight: '320px' }}>
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
                <div className="ads-wizard-section">
                  <h3>Tipo de campaña en Meta</h3>
                  <p>Elegí el objetivo que vas a configurar en el Administrador de anuncios.</p>
                  <div className="ads-objective-grid">
                    {OBJETIVOS_META.map(([value, label]) => <button key={value} type="button" className="ads-choice" aria-pressed={objetivoMeta === value} onClick={() => { setObjetivoMeta(value); setEditado(true); }}><span>{label}</span>{objetivoMeta === value && <Check size={18} aria-hidden="true" />}</button>)}
                  </div>
                  {esEdicion && <label className="ads-form-field">ID de campaña en Meta (después de crearla)
                    <input inputMode="numeric" value={metaCampaignId} onChange={e => { setMetaCampaignId(e.target.value); setEditado(true); }} placeholder="ID numérico de Meta Ads Manager" />
                  </label>}
                </div>
              )}

              {step === 5 && (
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
                  {presupuesto === 'CBO' && <label className="ads-form-field">Presupuesto diario de la campaña
                    <NumericFormat value={presupuestoDiario} valueIsNumericString thousandSeparator="." decimalSeparator="," decimalScale={2} allowNegative={false} inputMode="decimal" onValueChange={({ value }) => { setPresupuestoDiario(value); setEditado(true); }} placeholder="Monto en la moneda de tu cuenta de Meta" />
                  </label>}
                  {presupuesto === 'ABO' && <p className="ads-budget-help">En ABO indicarás el presupuesto diario de cada conjunto en el paso siguiente.</p>}
                  
                  {presupuesto && (
                    <div style={{ marginTop: '1.5rem', background: 'var(--color-canvas)', border: '1px dashed color-mix(in srgb, var(--color-fg) 20%, transparent)', borderRadius: '8px', padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista previa del nombre</p>
                      <code style={{ fontSize: '0.9rem', color: 'var(--color-fg)', fontWeight: 600 }}>{generarNombreNomenclatura()}</code>
                    </div>
                  )}
                </div>
              )}

              {step === 6 && <div className="ads-wizard-section">
                <h3>Conjuntos de anuncios</h3>
                <p>Creá al menos uno. El estado que elijas se usará al configurarlo en Meta.</p>
                <div className="ads-adset-toolbar"><button type="button" className="btn-secondary ads-add-adset" onClick={agregarConjunto}><Plus size={17} /> Agregar conjunto</button></div>
                {conjuntos.map((c, index) => <div className="ads-adset-card" data-conjunto-id={c.id} key={c.id}>
                  <div className="ads-adset-heading"><h4>Conjunto {index + 1}</h4>{conjuntos.length > 1 && <button type="button" className="btn-icon" aria-label={`Eliminar conjunto ${index + 1}`} onClick={() => { setConjuntos(actuales => actuales.filter(x => x.id !== c.id)); setEditado(true); }}><Trash2 size={18} /></button>}</div>
                  <label className="ads-form-field ads-adset-name">Nombre<input value={c.nombre} maxLength={150} onChange={e => cambiarConjunto(c.id, { nombre: e.target.value })} placeholder="Ej.: Público nuevo · Paraguay" /></label>
                  <label className="ads-form-field ads-adset-description">Descripción<textarea value={c.descripcion} maxLength={1000} rows={2} onChange={e => cambiarConjunto(c.id, { descripcion: e.target.value })} placeholder="Público, ubicación y enfoque del conjunto" /></label>
                  <label className="ads-form-field ads-adset-status">Estado en Meta<select value={c.estado} onChange={e => cambiarConjunto(c.id, { estado: e.target.value })}><option value="PAUSED">Pausado</option><option value="ACTIVE">Activo</option></select></label>
                  {presupuesto === 'ABO' && <label className="ads-form-field ads-adset-budget">Presupuesto diario de este conjunto<NumericFormat value={c.presupuesto_diario || ''} valueIsNumericString thousandSeparator="." decimalSeparator="," decimalScale={2} allowNegative={false} inputMode="decimal" onValueChange={({ value }) => cambiarConjunto(c.id, { presupuesto_diario: value })} placeholder="Monto en la moneda de tu cuenta de Meta" /></label>}
                  {esEdicion && <label className="ads-form-field ads-adset-meta-id">ID de este conjunto en Meta<input inputMode="numeric" value={c.meta_adset_id || ''} onChange={e => cambiarConjunto(c.id, { meta_adset_id: e.target.value })} placeholder="ID numérico de Meta Ads Manager" /></label>}
                  {esEdicion && campanaEditar.configuracion_anuncios?.conjuntos?.some(actual => actual.id === c.id) && <ConjuntoVentasMeta campanaId={campanaEditar.id} conjunto={c} registros={ventasConjuntos.filter(v => v.conjunto_id === c.id)} pedidosWeb={campanaEditar.pedidos_web_trazados?.find(p => p.conjunto_id === c.id)?.total || 0} onCambio={(registro, eliminadoId) => { setVentasConjuntos(actuales => eliminadoId ? actuales.filter(v => v.id !== eliminadoId) : [...actuales.filter(v => v.id !== registro.id), registro]); onCreated?.(); }} />}
                </div>)}
              </div>}

              {step === 7 && <div className="ads-wizard-section">
                <h3>Creativos</h3>
                <p>Adjuntá imágenes o videos a cada conjunto. Se guardarán en Gesicom al crear la campaña; luego podrás usarlos como referencia al armar los anuncios en Meta.</p>
                {conjuntos.map(c => <div className="ads-adset-card" key={c.id}>
                  <h4>{c.nombre}</h4>
                  <label className="ads-upload-field"><Upload size={18} /> Subir creativos
                    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={e => { const nuevos = [...e.target.files].filter(f => f.size <= 25 * 1024 * 1024); setArchivos(actuales => ({ ...actuales, [c.id]: [...(actuales[c.id] || []), ...nuevos] })); setEditado(true); e.target.value = ''; }} />
                  </label>
                  <p className="ads-file-help">JPG, PNG, WebP, MP4 o WebM. Hasta 25 MB por archivo.</p>
                  {(archivos[c.id] || []).map((file, index) => <div className="ads-creative-row" key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="btn-icon" aria-label={`Quitar ${file.name}`} onClick={() => setArchivos(actuales => ({ ...actuales, [c.id]: actuales[c.id].filter((_, i) => i !== index) }))}><X size={16} /></button></div>)}
                  {creativosGuardados.filter(x => x.conjunto_id === c.id).map(creativo => <div className="ads-creative-row" key={creativo.id}><span>{creativo.nombre}</span><div><button type="button" className="btn-secondary" onClick={() => descargarCreativo(creativo)}>Descargar</button><button type="button" className="btn-icon" aria-label={`Eliminar ${creativo.nombre}`} onClick={async () => { try { await metaReportesService.eliminarCreativo(campanaEditar.id, creativo.id); setCreativosGuardados(actuales => actuales.filter(x => x.id !== creativo.id)); } catch (err) { setError(err.response?.data?.message || 'No pudimos eliminar el creativo.'); } }}><Trash2 size={16} /></button></div></div>)}
                </div>)}
                <a className="btn-secondary ads-skill-download" href="/skills/gesicom-meta-ads.md" download="gesicom-meta-ads.md">Descargar guía para ChatGPT</a>
              </div>}

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
