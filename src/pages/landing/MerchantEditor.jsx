import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, Loader, ArrowLeft, Eye, EyeOff, Monitor, Smartphone, AlertCircle, Check, Pencil, X, Settings,
  Copy, ExternalLink, Lock,
} from 'lucide-react';
import { landingService } from '../../services/landingService';
import { productService } from '../../services/productService';
import { tiendaService } from '../../services/tiendaService';
import { ofertaService } from '../../services/ofertaService';
import { getMediaUrl } from '../../services/api';
import LandingPreview from './LandingPreview';
import DisenoFunnelPicker from './DisenoFunnelPicker';
import InspectorSeccion from './InspectorSeccion';
import ProductCheckoutOfertas from './ProductCheckoutOfertas';
import { BLOQUES_SCHEMA } from './BloquesSchema';

/**
 * Onboarding rígido: de todo el funnel, el comercio solo toca estas dos
 * cosas. El resto (hero, beneficios, opiniones, FAQ, orden de bloques) lo
 * define el diseño elegido y se muestra bloqueado — así armar un funnel es
 * cuestión de minutos y no de aprender un page-builder.
 *
 * La descripción y las fotos salen de la ficha del producto; acá solo se
 * eligen/ajustan, no se inventan aparte.
 */
const SECCIONES_EDITABLES = new Map([
  ['product_detail', 'Fotos y descripción'],
  ['footer', 'Datos de contacto y redes'],
]);

export default function MerchantEditor() {
  const { productoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState('');
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [slugBorrador, setSlugBorrador] = useState('');
  const [guardandoSlug, setGuardandoSlug] = useState(false);
  const [errorSlug, setErrorSlug] = useState('');
  
  const [landing, setLanding] = useState(null);
  const [producto, setProducto] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [variantes, setVariantes] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const [content, setContent] = useState({});
  const [seccionSeleccionadaId, setSeccionSeleccionadaId] = useState(null);
  const [dispositivo, setDispositivo] = useState('mobile'); // 'desktop' | 'mobile'
  const [previewCheckoutAbierto, setPreviewCheckoutAbierto] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Variantes y ofertas van también: el bloque product_detail ya
        // sabe renderizar selector de variante, precio tachado, % OFF y
        // packs — sin estos dos el preview mostraba una versión pobre que
        // no se parecía a la página real.
        const [land, prod, tda, vars, ofs] = await Promise.all([
          landingService.obtenerLandingProducto(productoId),
          productService.detalle(productoId),
          tiendaService.obtener().catch(() => null),
          productService.variantes(productoId).catch(() => []),
          ofertaService.listarPorProducto(productoId).catch(() => []),
        ]);

        setLanding(land);
        setProducto(prod);
        setTienda(tda);
        setVariantes(Array.isArray(vars) ? vars : []);
        setOfertas(Array.isArray(ofs) ? ofs : []);
        setContent(land.content || {});
      } catch (err) {
        console.error(err);
        setError('Error al cargar la información del embudo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productoId]);

  // El slug cuelga directo de la raíz del hostname de la tienda. El viejo
  // prefijo "/l/" sigue funcionando para links ya compartidos (ver
  // App.jsx y deploy/nginx/tiendas.gesicomm.com), pero no es la ruta
  // canónica: la que se muestra y se comparte es esta.
  const urlPublica = useMemo(() => {
    if (!tienda?.subdominio || !landing?.slug) return null;
    return `https://${tienda.subdominio}.gesicomm.com/${landing.slug}`;
  }, [tienda?.subdominio, landing?.slug]);

  // El producto real del funnel, con la forma que espera LandingPreview.
  // Sin esto el bloque product_detail caía en el mock interno ("Producto
  // de prueba / 9.990 Gs") y el comercio no veía su propio producto.
  // Va acá arriba junto al resto de los hooks: más abajo hay returns
  // tempranos (loading / sin landing) y un hook después de ellos rompe
  // el orden de hooks entre renders.
  const itemsPreview = useMemo(() => {
    if (!producto) return [];
    const precioBase = Number(producto.precio_base) || 0;
    const tachado = producto.precio_tachado ? Number(producto.precio_tachado) : null;
    return [{
      id: producto.id,
      content_id: producto.slug || `producto-${producto.id}`,
      tipo: 'producto',
      nombre: producto.nombre,
      precio: precioBase,
      precio_antes: tachado,
      descuento_pct: tachado && tachado > precioBase
        ? Math.round((1 - precioBase / tachado) * 100)
        : 0,
      descripcion: producto.descripcion_corta || producto.descripcion_larga || '',
      descripcion_larga: producto.descripcion_larga || '',
      imagenes: (producto.imagenes || []).map(i => i.url),
      stock: producto.cantidad_disponible,
      slug: producto.slug,
      variantes: (variantes || []).filter(v => v.activo !== false).map(v => ({
        id: v.id,
        nombre: v.nombre,
        stock: v.stock,
        precio_efectivo: precioBase + (Number(v.precio_diferencial) || 0),
        imagenes: [],
      })),
      ofertas: (ofertas || []).filter(o => o.activo !== false).map(o => ({
        id: o.id,
        nombre: o.nombre,
        tipo_contenido: o.tipo_contenido,
        estrategia: o.estrategia,
        precio: Number(o.precio) || 0,
        descripcion: o.descripcion || null,
      })),
    }];
  }, [producto, variantes, ofertas]);

  function copiarUrlPublica() {
    if (!urlPublica) return;
    navigator.clipboard.writeText(urlPublica).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await landingService.guardarLandingProducto(productoId, content);
      // Podriamos mostrar un toast de exito aqui
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublicado = async () => {
    try {
      setPublicando(true);
      setError('');
      const actualizada = await landingService.cambiarEstado(landing.id, !landing.activo);
      setLanding(prev => ({ ...prev, activo: actualizada.activo }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setPublicando(false);
    }
  };

  const abrirEdicionSlug = () => {
    setSlugBorrador(landing.slug);
    setErrorSlug('');
    setEditandoSlug(true);
  };

  const handleGuardarSlug = async () => {
    const limpio = slugBorrador.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin tildes
      .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!limpio) { setErrorSlug('Escribí al menos una palabra.'); return; }
    try {
      setGuardandoSlug(true);
      setErrorSlug('');
      const actualizada = await landingService.actualizar(landing.id, { slug: limpio });
      setLanding(prev => ({ ...prev, slug: actualizada.slug }));
      setEditandoSlug(false);
    } catch (err) {
      setErrorSlug(err.response?.data?.message || 'Ese link ya está en uso — probá con otro.');
    } finally {
      setGuardandoSlug(false);
    }
  };

  const handleUpdateSeccion = useCallback((id, updates) => {
    setContent(prev => {
      const prevSectionData = prev[id] || {};
      
      // updates es un objeto que viene de InspectorSeccion (ej: { config: {...} } o { contenido: {...} })
      // Hacemos merge superficial. Como InspectorSeccion ya nos manda el sub-objeto completo 
      // (ej: { config: { ...prev.config, nuevoColor } }), no perdemos datos.
      return {
        ...prev,
        [id]: {
          ...prevSectionData,
          ...updates
        }
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--vit-bg)]">
        <Loader className="h-8 w-8 animate-spin text-[var(--vit-primary)]" />
      </div>
    );
  }

  if (!landing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--vit-bg)]">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-red-100 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-gray-800">Embudo no encontrado</h2>
          <p className="text-gray-600 mb-6">No pudimos cargar la configuración. Asegurate de haber seleccionado una estrategia primero.</p>
          <Link to={`/mi-landing/producto/${productoId}/funnel-selector`} className="lb-btn-primary">
            Elegir Embudo
          </Link>
        </div>
      </div>
    );
  }

  const schema = landing.template?.schema || [];
  
  // Transform schema and content into the shape LandingPreview expects
  const previewSections = schema.map((sSchema, idx) => {
    const sContent = content[sSchema.id] || {};
    // El schema de LandingTemplate guarda el tipo de bloque como "type",
    // pero LandingPreview y BLOQUES_SCHEMA lo leen como "tipo" — sin este
    // mapeo el preview quedaba en blanco (ningún bloque matcheaba) y la
    // lista de secciones mostraba todos los iconos genéricos.
    const tipo = sSchema.tipo || sSchema.type;
    return {
      ...sSchema,
      tipo,
      id: sSchema.id,
      orden: idx,
      activo: true,
      nombre_interno: sSchema.nombre_interno || BLOQUES_SCHEMA[tipo]?.label || tipo,
      // Hacemos merge del contenido del schema default y lo que llenó el usuario
      contenido: { ...(sSchema.contenido || {}), ...(sContent.contenido || {}) },
      config: { ...(sSchema.config || {}), ...(sContent.config || {}) },
      ancho_mitad: sContent.ancho_mitad !== undefined ? sContent.ancho_mitad : sSchema.ancho_mitad
    };
  });

  const seccionActiva = previewSections.find(s => s.id === seccionSeleccionadaId);
  const activeTabClass = "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors";

  return (
    <div className="flex h-screen flex-col bg-[var(--vit-bg)] font-inter text-[var(--vit-text)]">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-1.5 text-[var(--vit-muted)] hover:text-[var(--vit-text)] hover:bg-[var(--vit-surface)] rounded-md transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="h-6 w-[1px] bg-[var(--vit-border)] mx-1"></div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--vit-primary)] mr-2">Editor</span>
            <span className="text-sm font-medium text-[var(--vit-text)] truncate max-w-[200px] inline-block align-bottom">{producto?.nombre}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && <span className="text-sm text-red-500 font-medium flex items-center gap-1"><AlertCircle size={14}/> {error}</span>}
          
          <div className="flex bg-[var(--vit-surface)] rounded-md p-1 border border-[var(--vit-border)]">
            <button
              onClick={() => setDispositivo('desktop')}
              className={`p-1.5 rounded-sm transition-colors ${dispositivo === 'desktop' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de Computadora"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setDispositivo('mobile')}
              className={`p-1.5 rounded-sm transition-colors ${dispositivo === 'mobile' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista de Celular"
            >
              <Smartphone size={16} />
            </button>
          </div>

          <button
            className="lb-btn-primary h-8 px-4 text-sm gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>

          <button
            className={landing.activo ? 'lb-btn-secondary h-8 px-4 text-sm gap-2' : 'lb-btn-primary h-8 px-4 text-sm gap-2'}
            onClick={handleTogglePublicado}
            disabled={publicando}
            title={landing.activo ? 'Los visitantes dejan de ver esta página' : 'La página queda visible públicamente en su URL'}
          >
            {publicando ? <Loader size={14} className="animate-spin" /> : (landing.activo ? <EyeOff size={14} /> : <Eye size={14} />)}
            {publicando ? 'Guardando...' : (landing.activo ? 'Despublicar' : 'Publicar')}
          </button>

          {landing.activo && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check size={13} /> Publicado
            </span>
          )}
        </div>
      </header>

      {/* Barra de link público — el slug es lo único editable de la URL; el
          prefijo "/l/" y el dominio de la tienda son fijos por diseño del
          sistema de landings públicas. */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--vit-border)] bg-[var(--vit-surface)] px-4 text-xs">
        <span className="text-[var(--vit-muted)]">Link:</span>
        {editandoSlug ? (
          <>
            <span className="text-[var(--vit-muted)]">
              {tienda?.subdominio ? `${tienda.subdominio}.gesicomm.com/` : '/'}
            </span>
            <input
              type="text"
              value={slugBorrador}
              onChange={(e) => setSlugBorrador(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGuardarSlug()}
              autoFocus
              className="rounded border border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-2 py-0.5 text-xs text-[var(--vit-text)]"
              style={{ width: '220px' }}
            />
            <button onClick={handleGuardarSlug} disabled={guardandoSlug} className="text-emerald-600 hover:text-emerald-500" title="Guardar">
              {guardandoSlug ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button onClick={() => setEditandoSlug(false)} disabled={guardandoSlug} className="text-[var(--vit-muted)] hover:text-[var(--vit-text)]" title="Cancelar">
              <X size={13} />
            </button>
            {errorSlug && <span className="text-red-500">{errorSlug}</span>}
          </>
        ) : (
          <>
            {urlPublica ? (
              <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="text-[var(--vit-text)] hover:text-[var(--vit-primary)] underline decoration-dotted">
                {urlPublica.replace('https://', '')}
              </a>
            ) : (
              <code className="text-[var(--vit-text)]">/{landing.slug}</code>
            )}
            <button onClick={abrirEdicionSlug} className="text-[var(--vit-muted)] hover:text-[var(--vit-primary)]" title="Editar el link">
              <Pencil size={12} />
            </button>
            {urlPublica && (
              <>
                <button onClick={copiarUrlPublica} className="text-[var(--vit-muted)] hover:text-[var(--vit-primary)]" title="Copiar link">
                  {copiado ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
                <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="text-[var(--vit-muted)] hover:text-[var(--vit-primary)]" title="Ver la página">
                  <ExternalLink size={12} />
                </a>
              </>
            )}
            {!landing.activo && (
              <span className="text-amber-500">— publicá para que este link funcione para tus visitantes</span>
            )}
          </>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Form */}
        <div className="w-[340px] shrink-0 border-r border-[var(--vit-border)] bg-[var(--vit-card-bg)] flex flex-col z-10 shadow-sm relative overflow-hidden">
          {seccionSeleccionadaId ? (
            <InspectorSeccion
              seccion={seccionActiva}
              onUpdate={handleUpdateSeccion}
              onBack={() => setSeccionSeleccionadaId(null)}
              catalogo={{ productos: [], combos: [] }} // Pasamos mock vacio por ahora si no hay gestion de combos compleja aca
              productoId={productoId}
              previewCheckoutAbierto={previewCheckoutAbierto}
              onTogglePreviewCheckout={() => setPreviewCheckoutAbierto(!previewCheckoutAbierto)}
            />
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="p-5 border-b border-[var(--vit-border)] bg-[var(--vit-surface)]">
                <h2 className="text-lg font-bold text-[var(--vit-text)] mb-1">Estructura del Embudo</h2>
                <p className="text-xs text-[var(--vit-muted)] leading-relaxed">
                  Basado en: <span className="font-semibold text-gray-700">{landing.template?.name}</span>
                  <br/>Seleccioná cada sección para configurar su contenido.
                </p>
              </div>

              {/* Diseño — mismo componente que usa el paso "Funnel" del
                  wizard de campañas, para que no se dupliquen dos
                  selectores que tienen que decir lo mismo. */}
              <div className="p-4 border-b border-[var(--vit-border)]">
                <DisenoFunnelPicker
                  landing={landing}
                  onAplicado={(parcial) => setLanding(prev => ({ ...prev, ...parcial }))}
                  onError={setError}
                />
              </div>

              <div className="p-3 flex flex-col gap-2">
                {previewSections.map((s, idx) => {
                  const bsSchema = BLOQUES_SCHEMA[s.tipo];
                  const Icono = bsSchema?.icon || Settings;
                  const configurado = content[s.id] && Object.keys(content[s.id]).length > 0;
                  const editable = SECCIONES_EDITABLES.has(s.tipo);

                  if (!editable) {
                    return (
                      <div
                        key={s.id}
                        title="Lo define el diseño del funnel — no se edita"
                        className="flex items-center gap-3 w-full p-3 text-left bg-[var(--vit-surface)] border border-dashed border-[var(--vit-border)] rounded-xl opacity-60"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--vit-surface)] text-[var(--vit-muted)]">
                          <Icono size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--vit-text)] truncate">
                            {s.nombre_interno || bsSchema?.name || s.tipo}
                          </p>
                          <p className="text-xs text-[var(--vit-muted)] mt-0.5">Lo define el diseño</p>
                        </div>
                        <Lock size={13} className="text-[var(--vit-muted)]" />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSeccionSeleccionadaId(s.id)}
                      className="group flex items-center gap-3 w-full p-3 text-left bg-white border border-[var(--vit-border)] rounded-xl hover:border-[var(--vit-primary)] hover:shadow-sm transition-all"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${configurado ? 'bg-[var(--vit-primary)] text-white' : 'bg-[var(--vit-surface)] text-[var(--vit-muted)] group-hover:text-[var(--vit-primary)]'}`}>
                        <Icono size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--vit-text)] truncate">
                          {s.nombre_interno || bsSchema?.name || s.tipo}
                        </p>
                        <p className="text-xs text-[var(--vit-muted)] flex items-center gap-1 mt-0.5">
                          {SECCIONES_EDITABLES.get(s.tipo)}
                        </p>
                      </div>
                      <div className="text-[var(--vit-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                        &rarr;
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 pb-3">
                <ProductCheckoutOfertas producto={producto} config={content} onChange={(k, v) => setContent(v)} catalogo={{ productos: items.filter(i => i.tipo === 'producto').map(i => ({ id: i.referencia_id, nombre: i.nombre || i.etiqueta })) }} />
              </div>
            </div>
          )}
        </div>

        {/* Center Preview */}
        <div className="flex-1 flex flex-col bg-[#F3F4F6] relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center">
             <div className={`transition-all duration-300 ease-in-out bg-white shadow-xl ${dispositivo === 'mobile' ? 'w-[414px] rounded-[2rem] border-[12px] border-gray-900 overflow-hidden relative min-h-[800px]' : 'w-full max-w-6xl rounded-lg'}`}>
                {/* Mobile notch mockup */}
                {dispositivo === 'mobile' && (
                  <div className="absolute top-0 inset-x-0 h-6 bg-transparent z-50 flex justify-center">
                    <div className="w-32 h-6 bg-gray-900 rounded-b-xl"></div>
                  </div>
                )}
                
                <div className={`h-full w-full overflow-y-auto custom-scrollbar bg-[var(--vit-bg)] ${dispositivo === 'mobile' ? 'pt-6' : ''}`}>
                   <LandingPreview
                      titulo={producto?.nombre}
                      descripcion={producto?.descripcion}
                      filtros={{}}
                      items={itemsPreview}
                      catalogo={{}}
                      contacto={{
                        whatsapp: tienda?.whatsapp || '',
                        nombre: tienda?.nombre || '',
                      }}
                      /* El tema propio de la landing manda; los design_tokens
                         del template son solo el default de arranque. */
                      tema={{
                        modo: landing?.tema_modo || 'claro',
                        primario: landing?.color_primario || landing?.template?.design_tokens?.primary_color || '#3B82F6',
                        secundario: '#1E293B',
                        fondo: landing?.color_fondo || (landing?.tema_modo === 'oscuro' ? '#0a0a0a' : '#FFFFFF'),
                        texto: landing?.color_texto || undefined,
                        tarjeta: landing?.color_tarjeta || undefined
                      }}
                      diseno={{
                        radio_bordes: 'xl',
                        fuente: landing?.fuente || landing?.template?.design_tokens?.font || 'inter'
                      }}
                      secciones={previewSections}
                      seccionSeleccionadaId={seccionSeleccionadaId}
                      onSelectSeccion={setSeccionSeleccionadaId}
                      viewportMode={dispositivo}
                      previewCheckoutAbierto={previewCheckoutAbierto}
                      onTogglePreviewCheckout={setPreviewCheckoutAbierto}
                   />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
