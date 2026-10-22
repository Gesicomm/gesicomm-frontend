import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, Layers, BarChart3, Loader, ImageOff, Check, AlertCircle,
  Search, ArrowUpDown, TrendingUp, Tag, Archive, Flame, Sparkles,
  ChevronRight, Box, Plus, Edit2, UserCheck, Ticket, SlidersHorizontal, Grid,
  Store, Trash2, FileSpreadsheet, EyeOff, Clock, Tags, X, Download
} from 'lucide-react';
import { productService } from '../../services/productService';
import { vitrinaService } from '../../services/vitrinaService';
import { landingSimpleService } from '../../services/landingSimpleService';
import { compactarItemsLanding } from '../../lib/landingItems';
import { exportarProductosCsv } from './exportarProductos';
import CuponesModal from './CuponesModal';
import ExportarFeedMeta from '../landing-simple/ExportarFeedMeta';
import CargaMasivaProductosModal from '../productos/CargaMasivaProductosModal';
import CurrencyInput from '../../components/CurrencyInput';
import SensibilidadPanel from './SensibilidadPanel';
import { verificarSesion } from '../../utils/auth';
import { ImagenProductoHover } from '../landing-simple/templates/sections.jsx';
import { ModalColeccion, ModalOfertaMasiva } from '../landing-simple/OrganizadorProductos';
import './vitrina.css';

/* ─── Constantes ─────────────────────────────────────────────────────── */
const FILTROS = [
  { valor: 'producto', label: 'Productos Gesicom' },
  { valor: 'combo',    label: 'Combos Gesicom' },
  { valor: 'mios',     label: 'Productos propios' },
  { valor: 'mis-combos', label: 'Combos propios' },
  { valor: 'landing', label: 'Productos en mi landing' },
  { valor: 'todos',    label: 'Todos' },
];

const ORDEN_OPTIONS = [
  { valor: 'nombre',    label: 'Nombre A–Z' },
  { valor: 'precio-asc',label: 'Precio ↑' },
  { valor: 'precio-desc',label: 'Precio ↓' },
  { valor: 'recientes', label: 'Más recientes' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

// Sin emojis: el color del badge ya codifica el tipo, y el 🟢 de "Producto"
// metía un verde que no es de la paleta justo al lado de un badge azul.
function getBadgeConfig(item, mostrarStock) {
  if (item.tipo === 'combo') return { cls: 'combo',     label: 'Combo' };
  if (mostrarStock && item.stock === 0) return { cls: 'sin-stock', label: 'Sin stock' };
  return                           { cls: 'producto',  label: 'Producto' };
}

function getItemKey(item) {
  return `${item.tipo}:${item.id}`;
}

/* ─── Componente: editor de precio ───────────────────────────────────── */
function PrecioEditable({ item, onGuardar }) {
  const [valor, setValor]       = useState(item.precio_efectivo ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState(null);
  const [ok, setOk]             = useState(false);

  useEffect(() => {
    setValor(item.precio_efectivo ?? '');
    setError(null);
    setOk(false);
  }, [item.precio_efectivo]);

  const huboCambio = Number(valor) !== Number(item.precio_efectivo);

  async function guardar() {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) { setError('Ingresá un precio válido.'); return; }
    if (item.precio_minimo && num < item.precio_minimo) {
      setError(`No puede ser menor al mínimo (${formatGs(item.precio_minimo)} Gs).`);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onGuardar(item, num);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const numValor = parseFloat(valor) || 0;
  const ganancia = numValor - (item.precio_base || 0);
  // Margen sobre el precio de venta (mismo criterio que los reportes de
  // rentabilidad), no markup sobre el costo: es el que se compara contra
  // el margen objetivo del negocio.
  const margenPct = numValor > 0 ? (ganancia / numValor) * 100 : 0;

  // Ganancia cero no es un éxito: significa que estás vendiendo al costo.
  // Verde solo cuando de verdad ganás; ámbar cuando empatás.
  const estado = ganancia > 0 ? 'ok' : ganancia < 0 ? 'perdida' : 'empate';

  return (
    <div className="vit-price-editor" onClick={(e) => e.stopPropagation()}>
      <label className="vit-price-label">Tu precio de venta</label>

      <div className="vit-price-input-wrap">
        <CurrencyInput
          className={`vit-price-input ${error ? 'error' : ''}`}
          value={valor}
          prefix=""
          onChange={(num) => { setValor(num === '' ? '' : num); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') guardar(); }}
        />
        <span className="vit-price-suffix">Gs</span>
        {guardando && <Loader size={14} className="spin-icon" />}
        {ok && <Check size={16} className="vit-price-ok" />}
      </div>

      <div className={`vit-margen vit-margen--${estado}`}>
        <span className="vit-margen-label">
          {estado === 'perdida' ? 'Pérdida' : estado === 'empate' ? 'Sin ganancia' : 'Ganancia'}
        </span>
        <span className="vit-margen-valor">
          Gs {formatGs(ganancia)}
          {ganancia !== 0 && (
            <span className="vit-margen-pct">{margenPct.toFixed(0)}%</span>
          )}
        </span>
      </div>

      {huboCambio && !guardando && (
        <button className="vit-price-save-btn" onClick={guardar} title="Guardar precio">
          Guardar cambio
        </button>
      )}

      {error && (
        <div className="vit-price-error"><AlertCircle size={12} /> {error}</div>
      )}
    </div>
  );
}

function CategoriaSeleccionModal({ abierto, productos, categorias, onClose, onGuardar }) {
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    setCategoria('');
    setSubcategoria('');
    setError(null);
    setGuardando(false);
  }, [abierto]);

  if (!abierto) return null;

  async function guardar() {
    if (!categoria.trim()) {
      setError('Ingresá una categoría.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        categoria_nombre: categoria.trim(),
        subcategoria_nombre: subcategoria.trim() || null,
        producto_ids: productos.map(p => p.id),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo agrupar la selección.');
      setGuardando(false);
    }
  }

  return (
    <div className="vit-modal-overlay" role="dialog" aria-modal="true" aria-label="Agrupar en categoría">
      <div className="vit-modal vit-category-modal">
        <div className="vit-modal-header">
          <div>
            <h2>Agrupar en categoría</h2>
            <p>{productos.length} producto{productos.length === 1 ? '' : 's'} seleccionado{productos.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className="vit-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="vit-modal-body">
          <label className="vit-category-field">
            <span>Categoría</span>
            <input
              type="text"
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setError(null); }}
              placeholder="Ej: Suplementos A del fit"
              list="vit-categorias-existentes"
              autoFocus
            />
          </label>
          <datalist id="vit-categorias-existentes">
            {(categorias || []).map(cat => <option key={cat} value={cat} />)}
          </datalist>

          <label className="vit-category-field">
            <span>Subcategoría opcional</span>
            <input
              type="text"
              value={subcategoria}
              onChange={(e) => { setSubcategoria(e.target.value); setError(null); }}
              placeholder="Ej: Baja de peso, energía, proteína"
            />
          </label>

          {error && <div className="vit-inline-error" role="alert"><AlertCircle size={16} /> {error}</div>}

          <div className="vit-category-preview">
            {(productos || []).slice(0, 4).map(p => <span key={p.id}>{p.nombre}</span>)}
            {productos.length > 4 && <span>+{productos.length - 4} más</span>}
          </div>
        </div>
        <div className="vit-category-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="button" className="vit-seleccion-cta" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader size={15} className="spin-icon" /> : <Tag size={15} />}
            Guardar categoría
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente: card ────────────────────────────────────────────────── */
// Cómo está el producto en la landing: descuento, contador, badge y
// colecciones (lo arma organizacionDeLanding en el backend). La × del
// descuento y la de cada colección lo quitan sin seleccionar nada.
function MarcasLanding({ item, onQuitar }) {
  const m = item.en_landing;
  if (!m) return null;
  const precio = Number(item.precio_efectivo) || 0;
  const ancla = Number(m.precio_ancla ?? item.precio_tachado) || 0;
  const descuento = ancla > precio && precio > 0 ? Math.round((1 - precio / ancla) * 100) : 0;
  if (!descuento && !m.contador && !m.badge && !m.colecciones?.length) return null;
  const quitar = (e, accion, extra = {}) => { e.stopPropagation(); onQuitar(item, accion, extra); };
  return (
    <div className="vit-card-marcas" onClick={e => e.stopPropagation()}>
      {descuento > 0 && (
        <span className="vit-marca vit-marca--oferta">
          -{descuento}%
          <button type="button" aria-label={`Quitar oferta de ${item.nombre}`} title="Quitar oferta" onClick={e => quitar(e, 'quitar_oferta')}><X size={10} /></button>
        </span>
      )}
      {m.contador && <span className="vit-marca vit-marca--contador"><Clock size={10} /> Contador</span>}
      {m.badge && <span className="vit-marca vit-marca--badge"><Tag size={10} /> {m.badge}</span>}
      {(m.colecciones || []).map(c => (
        <span key={c} className="vit-marca">
          {c}
          <button type="button" aria-label={`Quitar ${item.nombre} de ${c}`} title={`Quitar de ${c}`} onClick={e => quitar(e, 'quitar_coleccion', { coleccion: c })}><X size={10} /></button>
        </span>
      ))}
    </div>
  );
}

function VitrinaCard({ item, onGuardarPrecio, onVerSensibilidad, seleccionado, onToggleSeleccion, usuarioActual, onEditarProducto, filtro, seleccionable = true, onQuitarMarca = null }) {
  const esCombo = item.tipo === 'combo';
  const esAdmin = usuarioActual?.rol === 'administrador';
  const esCreadorDirecto = usuarioActual?.id != null && item.creado_por != null && Number(item.creado_por) === Number(usuarioActual.id);
  const mostrarStock = esCreadorDirecto && !esCombo && item.stock != null;
  const badge = getBadgeConfig(item, mostrarStock);
  const sinStock = mostrarStock && item.stock === 0;
  const esEditable = item.tipo === 'producto' && (esAdmin || esCreadorDirecto);

  return (
    <div
      className={`vit-card ${seleccionable && seleccionado ? 'is-selected' : ''}`}
      onClick={seleccionable ? () => onToggleSeleccion(item) : undefined}
      role={seleccionable ? 'checkbox' : 'article'}
      aria-checked={seleccionable ? seleccionado : undefined}
      aria-label={seleccionable ? `Seleccionar ${item.nombre}` : item.nombre}
    >
      {/* ── Media ── */}
      <div className="vit-card-media">

        {/* Badge tipo (arriba izquierda) */}
        <span className={`vit-card-badge ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Imagen o placeholder — con más de una foto, rota la galería al pasar el mouse */}
        <ImagenProductoHover
          imagenes={item.imagenes}
          imagen={item.imagen}
          alt={item.nombre}
          fallback={
            <div className={`vit-card-media-placeholder ${esCombo ? 'combo' : ''}`}>
              {esCombo ? <Layers size={32} /> : <ImageOff size={28} />}
              <span>{esCombo ? 'Combo' : 'Sin imagen'}</span>
            </div>
          }
        />

        {/* Checkbox de selección */}
        {seleccionable && (
          <button
            type="button"
            className="vit-card-check"
            aria-label={seleccionado ? `Quitar selección ${item.nombre}` : `Seleccionar ${item.nombre}`}
            onClick={(e) => { e.stopPropagation(); onToggleSeleccion(item); }}
          >
            <Check size={14} strokeWidth={3} />
            <span>{seleccionado ? 'Seleccionado' : 'Seleccionar'}</span>
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="vit-card-body">
        <h3 className="vit-card-name">{item.nombre}</h3>

        {esCombo && item.productos_incluidos?.length > 0 && (
          <p className="vit-card-includes">
            Incluye: {item.productos_incluidos.join(', ')}
          </p>
        )}

        {item.descripcion && (
          <p className="vit-card-desc">{item.descripcion}</p>
        )}

        {/* Meta: categoría, stock */}
        <div className="vit-card-meta">
          {item.categoria && (
            <span className="vit-card-meta-item">
              <Tag size={11} /> {item.categoria}
            </span>
          )}
          {item.categoria && mostrarStock && (
            <span className="vit-card-meta-sep" />
          )}
          {mostrarStock && (
            <span className="vit-card-meta-item" style={{ color: sinStock ? "var(--color-danger)" : undefined }}>
              <Archive size={11} /> Stock: {item.stock}
            </span>
          )}
        </div>

        {onQuitarMarca && <MarcasLanding item={item} onQuitar={onQuitarMarca} />}

        {/* Costo y piso: datos de referencia, no lo accionable — van
            compactos en una fila y no compiten con el input de venta. */}
        <dl className="vit-costos">
          <div className="vit-costo-fila">
            <dt>Te cuesta</dt>
            <dd>Gs {formatGs(item.precio_base)}</dd>
          </div>
          {item.precio_minimo ? (
            <div className="vit-costo-fila">
              <dt>Mínimo permitido</dt>
              <dd>Gs {formatGs(item.precio_minimo)}</dd>
            </div>
          ) : null}
        </dl>

        {/* Editor de precio — el foco de la tarjeta */}
        <PrecioEditable item={item} onGuardar={onGuardarPrecio} />

        <div className="vit-card-divider" />

        {/* Acciones principales de la tarjeta */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="vit-card-action"
            onClick={(e) => { e.stopPropagation(); onVerSensibilidad(item); }}
          >
            <BarChart3 size={13} />
            Analizar margen
            <ChevronRight size={13} className="vit-card-action-arrow" />
          </button>

          {esEditable && (
            <button
              type="button"
              className="vit-card-action"
              style={{ flexShrink: 0, color: "var(--color-primary-text)", fontWeight: 600 }}
              onClick={(e) => { e.stopPropagation(); onEditarProducto(item.id); }}
              title="Editar producto"
            >
              <Edit2 size={13} />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────────────── */
export default function VitrinaGrid() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [busqueda, setBusqueda]   = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [orden, setOrden]         = useState('nombre');
  const [seleccionSensibilidad, setSeleccionSensibilidad] = useState(null);
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [generandoLanding, setGenerandoLanding] = useState(false);
  const [errorGenerarLanding, setErrorGenerarLanding] = useState(null);
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [mensajeCategoria, setMensajeCategoria] = useState(null);
  // Organizar productos de la landing (vista "Productos en mi landing").
  const [coleccionesLanding, setColeccionesLanding] = useState([]);
  const [modalOrganizar, setModalOrganizar] = useState(null); // 'oferta' | 'coleccion' | 'quitar_coleccion'
  const [organizando, setOrganizando] = useState(false);

  const [searchParams] = useSearchParams();
  const enOnboarding = searchParams.get('onboarding') === 'productos';
  // El filtro inicial llega por router state (ej. al guardar un producto),
  // nunca por la URL: el estado de la pantalla no va en query params.
  const location = useLocation();
  const [filtro, setFiltro] = useState(() => location.state?.filtro === 'mios' ? 'mios' : 'todos');
  const esVistaLanding = filtro === 'landing';
  const [exportandoMeta, setExportandoMeta] = useState(false);
  const exportacionMetaRef = useRef(null);
  const botonMetaRef = useRef(null);
  const cerrarExportacionMeta = useCallback(() => { setExportandoMeta(false); botonMetaRef.current?.focus(); }, []);
  useEffect(() => {
    if (!exportandoMeta) return;
    const fuera = e => { if (!exportacionMetaRef.current?.contains(e.target)) setExportandoMeta(false); };
    const tecla = e => { if (e.key === 'Escape') cerrarExportacionMeta(); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [exportandoMeta, cerrarExportacionMeta]);
  useEffect(() => { if (!esVistaLanding) setExportandoMeta(false); }, [esVistaLanding]);
  
  const [exportando, setExportando] = useState(false);
  const [progresoExport, setProgresoExport] = useState(null);
  const [errorExport, setErrorExport] = useState(null);

  const [page, setPage] = useState(1);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [seleccionadosData, setSeleccionadosData] = useState(new Map());
  const [seleccionTotalKeys, setSeleccionTotalKeys] = useState(new Set());
  const [seleccionandoTodos, setSeleccionandoTodos] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    verificarSesion().then(u => setUsuarioActual(u));
  }, []);

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino === busquedaAplicada) return;
    const timer = setTimeout(() => {
      setBusquedaAplicada(termino);
      setPage(1);
    }, termino ? 200 : 0);
    return () => clearTimeout(timer);
  }, [busqueda, busquedaAplicada]);
  const buscando = cargando || busqueda.trim() !== busquedaAplicada;
  
  const toggleSeleccion = (item) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      const key = getItemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSeleccionadosData(prev => {
      const next = new Map(prev);
      const key = getItemKey(item);
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
  };

  const limpiarSeleccion = useCallback(() => {
    setSeleccionados(new Set());
    setSeleccionadosData(new Map());
    setSeleccionTotalKeys(new Set());
  }, []);

  const getFiltrosCatalogo = useCallback((overrides = {}) => {
    const solamenteMios = filtro === 'mios' || filtro === 'mis-combos';
    let tipoQuery = filtro;
    if (filtro === 'mios') tipoQuery = 'producto';
    if (filtro === 'mis-combos') tipoQuery = 'combo';
    if (filtro === 'landing') tipoQuery = 'landing';

    return {
      page,
      limit: 10,
      busqueda: busquedaAplicada,
      filtroCategoria,
      filtroProveedor,
      orden,
      tipo: tipoQuery,
      solamenteMios,
      origenCatalogo: filtro === 'producto' || filtro === 'combo' ? 'GESICOMM' : null,
      ...overrides,
    };
  }, [page, busquedaAplicada, filtroCategoria, filtroProveedor, orden, filtro]);

  /* Items ya filtrados por el backend */
  const itemsFiltrados = items;

  function agregarItemsASeleccion(itemsASeleccionar = []) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      itemsASeleccionar.forEach(item => next.add(getItemKey(item)));
      return next;
    });
    setSeleccionadosData(prev => {
      const next = new Map(prev);
      itemsASeleccionar.forEach(item => next.set(getItemKey(item), item));
      return next;
    });
  }

  function quitarKeysDeSeleccion(keysAQuitar = []) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      keysAQuitar.forEach(key => next.delete(key));
      return next;
    });
    setSeleccionadosData(prev => {
      const next = new Map(prev);
      keysAQuitar.forEach(key => next.delete(key));
      return next;
    });
  }

  const keysPagina = useMemo(() => itemsFiltrados.map(getItemKey), [itemsFiltrados]);
  const paginaSeleccionada = keysPagina.length > 0 && keysPagina.every(key => seleccionados.has(key));
  const totalFiltradoSeleccionado = seleccionTotalKeys.size > 0 && Array.from(seleccionTotalKeys).every(key => seleccionados.has(key));

  function seleccionarPagina() {
    if (paginaSeleccionada) {
      quitarKeysDeSeleccion(keysPagina);
      return;
    }
    agregarItemsASeleccion(itemsFiltrados);
  }

  async function seleccionarTodoFiltrado() {
    if (!totalItems || seleccionandoTodos) return;
    if (totalFiltradoSeleccionado) {
      quitarKeysDeSeleccion(Array.from(seleccionTotalKeys));
      setSeleccionTotalKeys(new Set());
      return;
    }
    setSeleccionandoTodos(true);
    setErrorGenerarLanding(null);
    try {
      // liviano: true — "seleccionar todo" puede traer miles de filas; nada
      // de lo que hace esta barra (generar landing, cambiar precios,
      // categorizar, armar combo, eliminar) necesita más que id/tipo/nombre,
      // y el enriquecimiento completo (imágenes, ofertas, combos anidados)
      // con un catálogo grande tumbó el backend por OOM (ver
      // precioUsuario.service.js, listarCatalogoPaginado).
      const data = await vitrinaService.catalogoPaginado(getFiltrosCatalogo({
        page: 1,
        limit: Math.max(totalItems, itemsFiltrados.length, 1),
        liviano: true,
      }));
      const itemsSeleccionTotal = data.items || [];
      agregarItemsASeleccion(itemsSeleccionTotal);
      setSeleccionTotalKeys(new Set(itemsSeleccionTotal.map(getItemKey)));
    } catch (err) {
      setErrorGenerarLanding(err.response?.data?.message || err.message || 'No se pudo seleccionar todo el catálogo filtrado.');
    } finally {
      setSeleccionandoTodos(false);
    }
  }
  
  const generarLanding = async () => {
    if (seleccionados.size === 0) return;
    setErrorGenerarLanding(null);
    const arrayItems = Array.from(seleccionados).map(k => {
      const [tipo, id] = k.split(':');
      return {
        tipo,
        referencia_id: parseInt(id),
      };
    });

    if (enOnboarding) {
      setGenerandoLanding(true);
      try {
        const templateSlug = sessionStorage.getItem('gesicomm:onboardingTemplateSlug') || 'basico';
        const landing = await landingSimpleService.crearDesdeOnboarding(templateSlug, arrayItems);
        sessionStorage.removeItem('gesicomm:onboardingTemplateSlug');
        sessionStorage.removeItem('gesicomm:prefilledLandingItems');
        navigate(`/landing/${landing.id}`, { replace: true });
      } catch (err) {
        setErrorGenerarLanding(err.response?.data?.message || err.message || 'No se pudo generar la landing.');
      } finally {
        setGenerandoLanding(false);
      }
      return;
    }

    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify(compactarItemsLanding(arrayItems)));
    navigate('/landing');
  };

  const itemsSeleccionados = useMemo(() => Array.from(seleccionados).map(k => seleccionadosData.get(k)).filter(Boolean), [seleccionados, seleccionadosData]);

  const productosSeleccionados = useMemo(
    () => itemsSeleccionados.filter(item => item.tipo === 'producto'),
    [itemsSeleccionados]
  );

  const todosSonPropios = productosSeleccionados.length > 0
    && productosSeleccionados.length === itemsSeleccionados.length
    && productosSeleccionados.every(
      item => usuarioActual?.id != null && Number(item.creado_por) === Number(usuarioActual.id)
    );

  // Con filas marcadas, Cambiar precios abre solo con esas (router state).
  function irACambiarPrecios() {
    const seleccion = Array.from(seleccionados).map(key => {
      const [tipo, id] = key.split(':');
      return { tipo, id: Number(id) };
    });
    navigate('/mi-catalogo/precios', seleccion.length ? { state: { seleccion } } : undefined);
  }

  // Exporta a CSV lo seleccionado (si hay algo marcado) o todo el catálogo
  // filtrado como está la grilla ahora (búsqueda, categoría, proveedor, tipo).
  async function exportarProductos() {
    if (exportando) return;
    setExportando(true);
    setErrorExport(null);
    setProgresoExport({ cargado: 0, total: seleccionados.size || totalItems });
    try {
      const seleccionadosLista = Array.from(seleccionados).map(key => {
        const [tipo, id] = key.split(':');
        return { tipo, id: Number(id) };
      });
      await exportarProductosCsv(
        { filtro, busqueda: busquedaAplicada, categoria: filtroCategoria, proveedor: filtroProveedor, orden },
        seleccionadosLista,
        (cargado, total) => setProgresoExport({ cargado, total })
      );
    } catch (err) {
      setErrorExport(err.response?.data?.message || err.message || 'No se pudo exportar el catálogo.');
    } finally {
      setExportando(false);
      setProgresoExport(null);
    }
  }

  const [borrando, setBorrando] = useState(false);
  const [despublicandoLanding, setDespublicandoLanding] = useState(false);
  const borrarSeleccionados = async () => {
    const cantidad = productosSeleccionados.length;
    if (!window.confirm(
      `¿Estás seguro de eliminar ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}? Esta acción no se puede deshacer.`
    )) return;
    setBorrando(true);
    try {
      const resultados = await Promise.allSettled(productosSeleccionados.map(p => productService.eliminar(p.id)));
      limpiarSeleccion();
      await cargar();
      const fallidos = resultados.filter(resultado => resultado.status === 'rejected');
      if (fallidos.length) {
        const motivo = fallidos[0].reason?.response?.data?.message || 'Revisá sus registros asociados.';
        alert(`Se eliminaron ${resultados.length - fallidos.length} productos. No se pudieron eliminar ${fallidos.length}. ${motivo}`);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Ocurrió un error al eliminar. Intentá de nuevo.');
    } finally {
      setBorrando(false);
    }
  };

  async function despublicarSeleccionadosLanding() {
    const itemsADespublicar = itemsSeleccionados
      .map(item => ({
        tipo: item?.tipo,
        id: Number(item?.id ?? item?.referencia_id),
      }))
      .filter(item => ['producto', 'combo'].includes(item.tipo) && Number.isInteger(item.id) && item.id > 0);

    if (!itemsADespublicar.length || despublicandoLanding) return;

    setDespublicandoLanding(true);
    setErrorGenerarLanding(null);
    try {
      const keysADespublicar = new Set(itemsSeleccionados.map(getItemKey));
      const resultado = await vitrinaService.despublicarLanding(itemsADespublicar);
      setItems(prev => prev.filter(item => !keysADespublicar.has(getItemKey(item))));
      setTotalItems(prev => Math.max(0, prev - keysADespublicar.size));
      limpiarSeleccion();
      setMensajeCategoria(
        `Se despublicaron ${resultado?.despublicados ?? itemsADespublicar.length} producto${itemsADespublicar.length === 1 ? '' : 's'} de tu landing.`
      );
      await cargar();
    } catch (err) {
      setErrorGenerarLanding(err.response?.data?.message || err.message || 'No se pudieron despublicar los productos seleccionados.');
    } finally {
      setDespublicandoLanding(false);
    }
  }

  // Descuento REAL con vigencia (Organizar productos → "Descuento real"):
  // a diferencia de organizarLanding (precio_ancla, solo tachado), esto
  // pega directo al producto — es lo que de verdad se cobra, por eso se
  // guarda al toque en vez de esperar ninguna confirmación aparte.
  async function aplicarDescuentoReal(items, { pct, finAt }) {
    const ids = items.filter(i => i.tipo !== 'combo').map(i => Number(i.id ?? i.referencia_id)).filter(Number.isInteger);
    if (!ids.length) return;
    await productService.descuentoMasivo(ids, { pct, finAt });
    await cargar();
  }

  async function organizarLanding(accion, extra = {}, objetivo = itemsSeleccionados) {
    const itemsAOrganizar = objetivo
      .map(item => ({ tipo: item?.tipo, id: Number(item?.id ?? item?.referencia_id) }))
      .filter(item => ['producto', 'combo'].includes(item.tipo) && Number.isInteger(item.id) && item.id > 0);
    if (!itemsAOrganizar.length || organizando) return;
    setOrganizando(true);
    setErrorGenerarLanding(null);
    try {
      const r = await vitrinaService.organizarLanding({ accion, items: itemsAOrganizar, ...extra });
      const n = r?.actualizados ?? itemsAOrganizar.length;
      const qué = {
        oferta: 'en oferta',
        quitar_oferta: 'sin oferta',
        coleccion: `en “${extra.coleccion}”`,
        quitar_coleccion: `fuera de “${extra.coleccion}”`,
        quitar_todo: 'sin oferta, badge ni colecciones',
      }[accion];
      const avisos = [
        r?.sin_lugar ? `${r.sin_lugar} ya tiene${r.sin_lugar === 1 ? '' : 'n'} demasiadas colecciones (máx. 50 letras en total) y quedó igual.` : '',
        r?.contador_lleno ? `El contador admite hasta 12 productos: ${r.contador_lleno} quedó con descuento pero sin cuenta regresiva.` : '',
      ].filter(Boolean).join(' ');
      setMensajeCategoria(`${n} producto${n === 1 ? '' : 's'} ${qué}.${avisos ? ` ${avisos}` : ''}`);
      setModalOrganizar(null);
      if (objetivo === itemsSeleccionados) limpiarSeleccion();
      await cargar();
    } catch (err) {
      setErrorGenerarLanding(err.response?.data?.message || err.message || 'No se pudieron organizar los productos.');
    } finally {
      setOrganizando(false);
    }
  }

  // Filas con la forma que esperan los modales de Organizar productos.
  const filasOrganizar = useMemo(() => itemsSeleccionados.map((item) => {
    const precio = Number(item.precio_efectivo) || 0;
    const ancla = Number(item.en_landing?.precio_ancla ?? item.precio_tachado) || 0;
    return { item, contentId: getItemKey(item), precio, ancla, etiquetas: item.en_landing?.colecciones || [] };
  }), [itemsSeleccionados]);

  async function guardarCategoriaSeleccion(payload) {
    const resultado = await vitrinaService.categorizarProductos(payload);
    setModalCategoriaAbierto(false);
    setMensajeCategoria(
      resultado.subcategoria
        ? `Se agruparon ${resultado.actualizados} producto${resultado.actualizados === 1 ? '' : 's'} en ${resultado.categoria.nombre} / ${resultado.subcategoria.nombre}.`
        : `Se agruparon ${resultado.actualizados} producto${resultado.actualizados === 1 ? '' : 's'} en ${resultado.categoria.nombre}.`
    );
    limpiarSeleccion();
    await cargar();
  }

  function armarCombo(itemsBase = productosSeleccionados) {
    const productos = (itemsBase || []).filter(item => item?.tipo === 'producto');
    if (productos.length < 2) {
      sessionStorage.removeItem('gesicomm:comboPrefillItems');
      navigate('/combos/nuevo');
      return;
    }

    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos.map(item => ({
      id: item.id,
      nombre: item.nombre,
      imagen: item.imagen || null,
      imagenes: item.imagenes || [],
      beneficios: item.beneficios || [],
      // Para armar combos desde la tienda, `precio_base` es el costo de
      // compra de la tienda frente al admin/mayorista. `precio_costo` puede
      // existir en el DTO por compatibilidad, pero representa el costo interno
      // del admin y NO debe usarse como costo de la tienda.
      costo_tienda: item.precio_base ?? item.precio_efectivo ?? item.precio_usuario ?? 0,
      precio_base: item.precio_base ?? item.precio_efectivo ?? item.precio_usuario ?? 0,
      precio_venta: item.precio_efectivo ?? item.precio_usuario ?? item.precio_base ?? 0,
      sku: item.sku || null,
      creado_por: item.creado_por ?? null,
    }))));
    sessionStorage.setItem('gesicomm:usarComboPrefillCatalogo', '1');
    navigate('/combos/nuevo', { state: { usarPrefillCatalogo: true } });
  }

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // El selector de productos del cupón necesita el catálogo COMPLETO, no la
  // página de 10 que muestra la grilla. Se pide recién al abrir el modal
  // para no cargarlo en cada visita a la vitrina.
  const [cuponesAbierto, setCuponesAbierto] = useState(false);
  const [cargaMasivaAbierta, setCargaMasivaAbierta] = useState(false);
  const [catalogoCompleto, setCatalogoCompleto] = useState({ productos: [], combos: [] });

  async function abrirCupones() {
    setCuponesAbierto(true);
    try {
      setCatalogoCompleto(await vitrinaService.catalogo());
    } catch {
      setCatalogoCompleto({ productos: [], combos: [] });
    }
  }

  // Cada carga lleva un número: si el usuario cambia de filtro mientras la
  // anterior sigue en vuelo, la respuesta vieja se descarta. Sin esto, tocar
  // "Productos propios" apenas entrar dejaba la pestaña marcada con los 354
  // productos de Gesicom en la grilla (llegaba última la carga inicial).
  const ultimaCarga = useRef(0);
  const peticionCatalogo = useRef(null);
  const cargar = useCallback(async () => {
    const numero = ++ultimaCarga.current;
    peticionCatalogo.current?.abort();
    const controller = new AbortController();
    peticionCatalogo.current = controller;
    const vigente = () => numero === ultimaCarga.current;
    setCargando(true);
    setError(null);
    try {
      const data = await vitrinaService.catalogoPaginado(getFiltrosCatalogo(), { signal: controller.signal });
      if (!vigente()) return;
      setItems(data.items || []);
      setColeccionesLanding(data.colecciones_landing || []);
      setCategoriasUnicas(data.categorias || []);
      setProveedoresUnicos(data.proveedores || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch {
      if (vigente()) setError('No se pudo cargar el catálogo.');
    } finally {
      if (vigente()) setCargando(false);
    }
  }, [getFiltrosCatalogo]);

  // Si cambia un filtro (excepto la pagina), volver a pagina 1
  useEffect(() => {
    setPage(1);
    setSeleccionTotalKeys(new Set());
  }, [busquedaAplicada, filtroCategoria, filtroProveedor, orden, filtro]);

  useEffect(() => {
    // Deja que el reset a página 1 se aplique antes de iniciar la petición.
    let cancelada = false;
    Promise.resolve().then(() => { if (!cancelada) cargar(); });
    return () => {
      cancelada = true;
      ++ultimaCarga.current;
      peticionCatalogo.current?.abort();
    };
  }, [cargar]);

  async function handleGuardarPrecio(item, precio) {
    if (item.tipo === 'combo') {
      await vitrinaService.guardarPrecioCombo(item.id, precio);
      setItems(prev => prev.map(c =>
        c.id === item.id && c.tipo === 'combo' ? { ...c, precio_usuario: precio, precio_efectivo: precio } : c
      ));
      setSeleccionadosData(prev => {
        const key = getItemKey(item);
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.set(key, { ...prev.get(key), precio_usuario: precio, precio_efectivo: precio });
        return next;
      });
    } else {
      await vitrinaService.guardarPrecioProducto(item.id, precio);
      setItems(prev => prev.map(p =>
        p.id === item.id && p.tipo === 'producto' ? { ...p, precio_usuario: precio, precio_efectivo: precio } : p
      ));
      setSeleccionadosData(prev => {
        const key = getItemKey(item);
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.set(key, { ...prev.get(key), precio_usuario: precio, precio_efectivo: precio });
        return next;
      });
    }
  }

  return (
    <div className="vit-page">
      {/* ── Encabezado ── */}
      <div className="vit-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="vit-header-text">
          <div className="vit-title-row">
            <h1 className="vit-title">Catálogo de Productos</h1>
            {!enOnboarding && (
              <button
                type="button"
                className="vit-export-button"
                onClick={exportarProductos}
                disabled={exportando}
                title={seleccionados.size > 0 ? `Exportar ${seleccionados.size} producto${seleccionados.size === 1 ? '' : 's'} seleccionado${seleccionados.size === 1 ? '' : 's'} a CSV` : 'Exportar todo el catálogo filtrado a CSV'}
              >
                {exportando ? <Loader size={15} className="spin-icon" /> : <Download size={15} />}
                {exportando
                  ? (progresoExport ? `Exportando ${progresoExport.cargado}/${progresoExport.total}…` : 'Exportando…')
                  : `Exportar productos${seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}`}
              </button>
            )}
            {esVistaLanding && !enOnboarding && <div className="vit-meta-export-anchor" ref={exportacionMetaRef}>
              <button ref={botonMetaRef} type="button" className="vit-meta-export-button" onClick={() => setExportandoMeta(v => !v)} aria-expanded={exportandoMeta} aria-haspopup="dialog" aria-controls="vitrina-meta-export"><FileSpreadsheet size={15} />Exportar a Meta</button>
              {exportandoMeta && <ExportarFeedMeta onCerrar={cerrarExportacionMeta} />}
            </div>}
          </div>
          <p className="vit-subtitle">
            {enOnboarding
              ? 'Seleccioná los productos que querés vender. Con esa selección armamos tu landing inicial.'
              : 'Gestioná los precios personalizados de venta.'}
          </p>
          <div className="vit-header-stats">
            <span className="vit-header-stat">
              <Package size={11} /> {totalItems} resultados
            </span>
          </div>
        </div>

        <div className="vit-header-actions" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
          {!enOnboarding && (
            <button type="button" className="btn-secondary" onClick={irACambiarPrecios}
              title={seleccionados.size > 0 ? 'Cambiar el precio de los seleccionados' : 'Cambiar precios de todo el catálogo'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
              <SlidersHorizontal size={16} /> Cambiar precios{seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={abrirCupones}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <Ticket size={16} /> Generar cupón
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/products/nuevo')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <Plus size={16} /> Agregar Mis Productos
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => armarCombo([])}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <Layers size={16} /> Armar mi combo
          </button>
        </div>
      </div>

      {/* ── Barra de selección ── */}
      {seleccionados.size > 0 && (
        <div className="vit-seleccion-bar" role="region" aria-label="Productos seleccionados">
          <p className="vit-seleccion-conteo">
            <span className="vit-seleccion-num">{seleccionados.size}</span>
            {seleccionados.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
          </p>
          <div className="vit-seleccion-acciones">
            <button type="button" className="vit-seleccion-cancelar" onClick={limpiarSeleccion}>
              Quitar selección
            </button>
            {esVistaLanding && (
              <>
                <button type="button" className="vit-seleccion-cancelar vit-seleccion-combo" onClick={() => setModalOrganizar('oferta')} disabled={organizando}>
                  <Clock size={15} /> Marcar como oferta
                </button>
                <button type="button" className="vit-seleccion-cancelar vit-seleccion-combo" onClick={() => setModalOrganizar('coleccion')} disabled={organizando}>
                  <Tags size={15} /> Agregar a colección
                </button>
                <button
                  type="button"
                  className="vit-seleccion-cancelar vit-seleccion-combo"
                  onClick={() => setModalOrganizar('quitar_coleccion')}
                  disabled={organizando || !filasOrganizar.some(f => f.etiquetas.length)}
                >
                  Quitar de colección
                </button>
                <button
                  type="button"
                  className="vit-seleccion-cancelar vit-seleccion-combo"
                  onClick={() => { aplicarDescuentoReal(itemsSeleccionados, { pct: null, finAt: null }).catch(() => {}); organizarLanding('quitar_oferta'); }}
                  disabled={organizando}
                >
                  Quitar oferta
                </button>
                <button
                  type="button"
                  className="vit-seleccion-cancelar vit-seleccion-combo"
                  onClick={() => { aplicarDescuentoReal(itemsSeleccionados, { pct: null, finAt: null }).catch(() => {}); organizarLanding('quitar_todo'); }}
                  disabled={organizando}
                  title="Saca descuento real, descuento, contador, badge y colecciones. Siguen publicados."
                >
                  {organizando ? <Loader size={15} className="spin-icon" /> : <X size={15} />} Quitar todo
                </button>
              </>
            )}
            {esVistaLanding && (
              <button
                type="button"
                className="vit-seleccion-cancelar vit-seleccion-combo vit-seleccion-despublicar"
                onClick={despublicarSeleccionadosLanding}
                disabled={despublicandoLanding}
                title="Despublicar los productos seleccionados de la landing"
              >
                {despublicandoLanding ? <Loader size={15} className="spin-icon" /> : <EyeOff size={15} />}
                Despublicar seleccionados
              </button>
            )}
            {!enOnboarding && !esVistaLanding && (
              <button
                type="button"
                className="vit-seleccion-cancelar vit-seleccion-combo"
                onClick={irACambiarPrecios}
                title="Cambiar el precio de los seleccionados"
              >
                <SlidersHorizontal size={15} />
                Cambiar precios
              </button>
            )}
            {!esVistaLanding && (
              <button
                type="button"
                className="vit-seleccion-cancelar vit-seleccion-combo"
                onClick={() => armarCombo()}
                disabled={productosSeleccionados.length < 2}
                title={productosSeleccionados.length < 2 ? 'Seleccioná al menos 2 productos para armar un combo.' : 'Armar combo con los productos seleccionados'}
              >
                <Layers size={15} />
                Armar combo
              </button>
            )}
            {!esVistaLanding && (
              <button
                type="button"
                className="vit-seleccion-cancelar vit-seleccion-combo"
                onClick={() => setModalCategoriaAbierto(true)}
                disabled={productosSeleccionados.length === 0}
                title={productosSeleccionados.length === 0 ? 'Seleccioná al menos un producto para agruparlo.' : 'Agrupar productos seleccionados en una categoría interna'}
              >
                <Tag size={15} />
                Categorizar
              </button>
            )}
            {!esVistaLanding && todosSonPropios && (
              <button
                type="button"
                className="vit-seleccion-cancelar vit-seleccion-combo"
                onClick={borrarSeleccionados}
                disabled={borrando}
                title="Eliminar productos seleccionados"
                style={{ color: "var(--color-danger, var(--color-danger))", borderColor: "color-mix(in srgb, var(--color-danger) 20%, transparent)" }}
              >
                {borrando ? <Loader size={15} className="spin-icon" /> : <Trash2 size={15} />}
                Eliminar
              </button>
            )}
            {!esVistaLanding && (
              <button type="button" className="vit-seleccion-cta" onClick={generarLanding} disabled={generandoLanding}>
                {generandoLanding ? <Loader size={15} className="spin-icon" /> : null}
                {enOnboarding ? 'Publicar productos en la web' : 'Publicar productos en la web'} <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {errorGenerarLanding && (
        <div className="vit-inline-error" role="alert">
          <AlertCircle size={16} /> {errorGenerarLanding}
        </div>
      )}

      {errorExport && (
        <div className="vit-inline-error" role="alert">
          <AlertCircle size={16} /> {errorExport}
        </div>
      )}

      {mensajeCategoria && (
        <div className="vit-inline-success" role="status">
          <Check size={16} /> {mensajeCategoria}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="vit-toolbar">
        {/* Buscador */}
        <div className="vit-search-wrap">
          <Search size={14} className="vit-search-icon" />
          <input
            type="text"
            className="vit-search-input"
            placeholder="Buscar producto o combo..."
            aria-label="Buscar productos o combos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
              e.preventDefault();
              setBusquedaAplicada(busqueda.trim());
              setPage(1);
            }}
          />
          {buscando && <span role="status" aria-label="Buscando productos" className="vit-search-loading"><Loader size={14} className="spin-icon" /></span>}
        </div>

        {/* Filtros de tipo y filtro de Mis Productos */}
        <div className="vit-filters">
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`vit-filter-btn ${filtro === f.valor ? 'active' : ''}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.valor === 'producto' && <Package size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.valor === 'mios' && <UserCheck size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.valor === 'combo' && <Box size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.valor === 'mis-combos' && <Layers size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.valor === 'landing' && <Store size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.valor === 'todos' && <Grid size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="vit-bulk-select">
          <button
            type="button"
            className={`vit-bulk-select-btn ${paginaSeleccionada ? 'active' : ''}`}
            onClick={seleccionarPagina}
            disabled={itemsFiltrados.length === 0}
            aria-pressed={paginaSeleccionada}
          >
            <Check size={14} />
            {paginaSeleccionada ? 'Quitar página' : 'Seleccionar página'}
            <span>{itemsFiltrados.length}</span>
          </button>
          <button
            type="button"
            className={`vit-bulk-select-btn ${totalFiltradoSeleccionado ? 'active' : ''}`}
            onClick={seleccionarTodoFiltrado}
            disabled={!totalItems || seleccionandoTodos}
            aria-pressed={totalFiltradoSeleccionado}
          >
            {seleccionandoTodos ? <Loader size={14} className="spin-icon" /> : <Check size={14} />}
            {totalFiltradoSeleccionado ? 'Quitar todo' : 'Seleccionar todo'}
            <span>{totalItems}</span>
          </button>
        </div>

        {/* Filtro de categoría */}
        {categoriasUnicas.length > 0 && (
          <select
            className="vit-sort-select"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            title="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categoriasUnicas.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        {/* Filtro de proveedor */}
        {proveedoresUnicos.length > 0 && (
          <select
            className="vit-sort-select"
            value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
            title="Filtrar por proveedor"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresUnicos.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        )}

        {/* Selector de orden */}
        <select
          className="vit-sort-select"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          title="Ordenar por"
        >
          {ORDEN_OPTIONS.map(o => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
        {filtro === 'mios' && (
          <button
            type="button"
            className="btn-secondary vit-import-own-btn"
            onClick={() => setCargaMasivaAbierta(true)}
          >
            <FileSpreadsheet size={16} /> Importar mis productos
          </button>
        )}
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="vit-empty">
          <Loader size={28} className="spin-icon" />
          <p>Cargando catálogo...</p>
        </div>
      ) : error ? (
        <div className="vit-empty">
          <AlertCircle size={32} color="var(--color-danger)" />
          <p>{error}</p>
          <button className="btn-secondary" onClick={cargar}>Reintentar</button>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="vit-empty">
          <Box size={40} opacity={0.25} />
          <p>
            {busqueda
              ? `Sin resultados para "${busqueda}"`
              : filtro === 'mios'
                ? 'No tenés productos cargados por tu cuenta.'
              : filtro === 'landing'
                ? 'Todavía no tenés productos seleccionados para vender en tu landing.'
              : filtro === 'mis-combos'
                ? 'Todavía no armaste ningún combo.'
                : filtro === 'combo'
                  ? 'Todavía no hay combos disponibles.'
                  : filtro === 'producto'
                    ? 'Todavía no hay productos disponibles.'
                    : 'Todavía no hay productos ni combos disponibles.'}
          </p>
        </div>
      ) : (
        <div className="vit-grid">
          {itemsFiltrados.map(item => (
            <VitrinaCard
              key={`${item.tipo}-${item.id}`}
              seleccionado={seleccionados.has(getItemKey(item))}
              onToggleSeleccion={toggleSeleccion}
              item={item}
              onGuardarPrecio={handleGuardarPrecio}
              onVerSensibilidad={setSeleccionSensibilidad}
              usuarioActual={usuarioActual}
              onEditarProducto={(id) => navigate(`/products/${id}/editar`)}
              filtro={filtro}
              seleccionable
              onQuitarMarca={esVistaLanding ? (it, accion, extra) => organizarLanding(accion, extra, [it]) : null}
            />
          ))}
        </div>
      )}

      {/* ── Paginación ── */}
      {totalPages > 1 && !cargando && !error && (
        <div className="vit-pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', paddingBottom: '2rem' }}>
          <button className="btn-secondary" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}>
            Anterior
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: 'var(--color-fg-subtle)' }}>
            Página {page} de {totalPages}
          </span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}>
            Siguiente
          </button>
        </div>
      )}

      {/* ── Panel de sensibilidad ── */}
      {seleccionSensibilidad && (
        <SensibilidadPanel
          item={seleccionSensibilidad}
          onClose={() => setSeleccionSensibilidad(null)}
          onAplicarPrecio={handleGuardarPrecio}
        />
      )}

      {cargaMasivaAbierta && (
        <CargaMasivaProductosModal onCerrar={() => setCargaMasivaAbierta(false)} onImportado={cargar} />
      )}

      <CuponesModal
        abierto={cuponesAbierto}
        onCerrar={() => setCuponesAbierto(false)}
        catalogo={catalogoCompleto}
      />

      <CategoriaSeleccionModal
        abierto={modalCategoriaAbierto}
        productos={productosSeleccionados}
        categorias={categoriasUnicas}
        onClose={() => setModalCategoriaAbierto(false)}
        onGuardar={guardarCategoriaSeleccion}
      />
      {modalOrganizar === 'oferta' && (
        <ModalOfertaMasiva
          filas={filasOrganizar}
          enContador={new Set(filasOrganizar.filter(f => f.item.en_landing?.contador).map(f => f.contentId))}
          contadorFinAt=""
          contadorTitulo=""
          permiteDescuentoReal
          onCerrar={() => setModalOrganizar(null)}
          onAplicar={async ({ pct, pctReal, badge, finAt, titulo }) => {
            // El modal da hora local (datetime-local): el backend guarda ISO.
            const finAtIso = finAt ? new Date(finAt).toISOString() : null;
            if (pctReal) await aplicarDescuentoReal(filasOrganizar.map(f => f.item), { pct: pctReal, finAt: finAtIso });
            await organizarLanding('oferta', { pct, badge, fin_at: finAtIso, titulo });
          }}
        />
      )}
      {(modalOrganizar === 'coleccion' || modalOrganizar === 'quitar_coleccion') && (
        <ModalColeccion
          quitar={modalOrganizar === 'quitar_coleccion'}
          filas={filasOrganizar}
          colecciones={coleccionesLanding}
          onCerrar={() => setModalOrganizar(null)}
          onAplicar={nombre => organizarLanding(modalOrganizar, { coleccion: nombre })}
        />
      )}
    </div>
  );
}
