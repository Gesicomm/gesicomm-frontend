import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, Layers, BarChart3, Loader, ImageOff, Check, AlertCircle,
  Search, ArrowUpDown, TrendingUp, Tag, Archive, Flame, Sparkles,
  ChevronRight, Box, Plus, Edit2, UserCheck, Ticket,
} from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import { landingSimpleService } from '../../services/landingSimpleService';
import CuponesModal from './CuponesModal';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import SensibilidadPanel from './SensibilidadPanel';
import { verificarSesion } from '../../utils/auth';
import './vitrina.css';

/* ─── Constantes ─────────────────────────────────────────────────────── */
const FILTROS = [
  { valor: 'todos',    label: 'Todos' },
  { valor: 'producto', label: 'Productos' },
  { valor: 'combo',    label: 'Combos' },
  { valor: 'mios',     label: 'Mis productos' },
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
function getBadgeConfig(item) {
  if (item.tipo === 'combo') return { cls: 'combo',     label: 'Combo' };
  if (item.stock === 0)      return { cls: 'sin-stock', label: 'Sin stock' };
  return                           { cls: 'producto',  label: 'Producto' };
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

/* ─── Componente: card ────────────────────────────────────────────────── */
function VitrinaCard({ item, onGuardarPrecio, onVerSensibilidad, seleccionado, onToggleSeleccion, usuarioActual, onEditarProducto, filtro }) {
  const esCombo = item.tipo === 'combo';
  const badge   = getBadgeConfig(item);
  const sinStock = item.stock === 0 && !esCombo;
  const esAdmin = usuarioActual?.rol === 'administrador';
  const esMio = filtro === 'mios' || item.creado_por == null || (usuarioActual?.id != null && Number(item.creado_por) === Number(usuarioActual.id));
  const esEditable = item.tipo === 'producto' && (esAdmin || esMio);

  return (
    <div
      className={`vit-card ${seleccionado ? 'is-selected' : ''}`}
      onClick={() => onToggleSeleccion(item)}
      role="checkbox"
      aria-checked={seleccionado}
      aria-label={`Seleccionar ${item.nombre}`}
    >
      {/* ── Media ── */}
      <div className="vit-card-media">

        {/* Badge tipo (arriba izquierda) */}
        <span className={`vit-card-badge ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Imagen o placeholder */}
        {item.imagen ? (
          <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
        ) : (
          <div className={`vit-card-media-placeholder ${esCombo ? 'combo' : ''}`}>
            {esCombo ? <Layers size={32} /> : <ImageOff size={28} />}
            <span>{esCombo ? 'Combo' : 'Sin imagen'}</span>
          </div>
        )}

        {/* Checkbox de selección */}
        <span
          className="vit-card-check"
          onClick={(e) => { e.stopPropagation(); onToggleSeleccion(item); }}
          aria-hidden="true"
        >
          <Check size={14} strokeWidth={3} />
        </span>
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
          {item.categoria && item.stock !== undefined && (
            <span className="vit-card-meta-sep" />
          )}
          {item.stock !== undefined && !esCombo && (
            <span className="vit-card-meta-item" style={{ color: sinStock ? '#ef4444' : undefined }}>
              <Archive size={11} /> Stock: {item.stock}
            </span>
          )}
        </div>

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
              style={{ flexShrink: 0, color: 'var(--color-primary, #2563eb)', fontWeight: 600 }}
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
  const [orden, setOrden]         = useState('nombre');
  const [seleccionSensibilidad, setSeleccionSensibilidad] = useState(null);
  const [categoriasUnicas, setCategoriasUnicas] = useState([]);
  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [generandoLanding, setGenerandoLanding] = useState(false);
  const [errorGenerarLanding, setErrorGenerarLanding] = useState(null);

  const [searchParams] = useSearchParams();
  const enOnboarding = searchParams.get('onboarding') === 'productos';
  const [filtro, setFiltro] = useState(() => searchParams.get('filtro') === 'mios' ? 'mios' : 'todos');
  
  const [page, setPage] = useState(1);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    verificarSesion().then(u => setUsuarioActual(u));
  }, []);
  
  const toggleSeleccion = (item) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      const key = `${item.tipo}:${item.id}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  
  const generarLanding = async () => {
    if (seleccionados.size === 0) return;
    setErrorGenerarLanding(null);
    const arrayItems = Array.from(seleccionados).map(k => {
      const [tipo, id] = k.split(':');
      const item = items.find(i => i.tipo === tipo && Number(i.id) === Number(id));
      return {
        tipo,
        referencia_id: parseInt(id),
        nombre: item?.nombre || '',
        descripcion: item?.descripcion || '',
        categoria: item?.categoria || '',
        imagen: item?.imagen || null,
        precio_efectivo: item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_total ?? item?.precio_base ?? item?.precio ?? null,
        precio_base: item?.precio_base ?? null,
        productos_incluidos: item?.productos_incluidos || [],
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

    sessionStorage.setItem('gesicomm:prefilledLandingItems', JSON.stringify(arrayItems));
    navigate('/landing');
  };

  const itemsSeleccionados = useMemo(() => Array.from(seleccionados).map(k => {
    const [tipo, id] = k.split(':');
    return items.find(i => i.tipo === tipo && Number(i.id) === Number(id));
  }).filter(Boolean), [seleccionados, items]);

  const productosSeleccionados = useMemo(
    () => itemsSeleccionados.filter(item => item.tipo === 'producto'),
    [itemsSeleccionados]
  );

  function armarCombo(itemsBase = productosSeleccionados) {
    const productos = (itemsBase || []).filter(item => item?.tipo === 'producto');
    if (productos.length < 2) {
      navigate('/combos/nuevo');
      return;
    }

    sessionStorage.setItem('gesicomm:comboPrefillItems', JSON.stringify(productos.map(item => ({
      id: item.id,
      nombre: item.nombre,
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
    navigate('/combos/nuevo');
  }

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // El selector de productos del cupón necesita el catálogo COMPLETO, no la
  // página de 10 que muestra la grilla. Se pide recién al abrir el modal
  // para no cargarlo en cada visita a la vitrina.
  const [cuponesAbierto, setCuponesAbierto] = useState(false);
  const [catalogoCompleto, setCatalogoCompleto] = useState({ productos: [], combos: [] });

  async function abrirCupones() {
    setCuponesAbierto(true);
    try {
      setCatalogoCompleto(await vitrinaService.catalogo());
    } catch {
      setCatalogoCompleto({ productos: [], combos: [] });
    }
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const solamenteMios = filtro === 'mios';
      const tipoQuery = filtro === 'mios' ? 'todos' : filtro;

      const data = await vitrinaService.catalogoPaginado({
        page, limit: 10, busqueda, filtroCategoria, filtroProveedor, orden, tipo: tipoQuery, solamenteMios
      });
      setItems(data.items || []);
      setCategoriasUnicas(data.categorias || []);
      setProveedoresUnicos(data.proveedores || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, [page, busqueda, filtroCategoria, filtroProveedor, orden, filtro]);

  // Si cambia un filtro (excepto la pagina), volver a pagina 1
  useEffect(() => {
    setPage(1);
  }, [busqueda, filtroCategoria, filtroProveedor, orden, filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleGuardarPrecio(item, precio) {
    if (item.tipo === 'combo') {
      await vitrinaService.guardarPrecioCombo(item.id, precio);
      setItems(prev => prev.map(c =>
        c.id === item.id && c.tipo === 'combo' ? { ...c, precio_usuario: precio, precio_efectivo: precio } : c
      ));
    } else {
      await vitrinaService.guardarPrecioProducto(item.id, precio);
      setItems(prev => prev.map(p =>
        p.id === item.id && p.tipo === 'producto' ? { ...p, precio_usuario: precio, precio_efectivo: precio } : p
      ));
    }
  }

  /* Items ya filtrados por el backend */
  const itemsFiltrados = items;

  return (
    <div className="vit-page">
      {/* ── Encabezado ── */}
      <div className="vit-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="vit-header-text">
          <h1 className="vit-title">Mi catálogo</h1>
          <p className="vit-subtitle">
            {enOnboarding
              ? 'Seleccioná los productos que querés vender. Con esa selección armamos tu landing inicial.'
              : 'Gestioná los precios personalizados de venta. El precio nunca puede ser menor al mínimo configurado.'}
          </p>
          <div className="vit-header-stats">
            <span className="vit-header-stat">
              <Package size={11} /> {totalItems} resultados
            </span>
          </div>
        </div>

        <div className="vit-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/combos')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <Layers size={16} /> Mis combos
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => armarCombo([])}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
          >
            <Layers size={16} /> Armar combo
          </button>
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
            <button type="button" className="vit-seleccion-cancelar" onClick={() => setSeleccionados(new Set())}>
              Quitar selección
            </button>
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
            <button type="button" className="vit-seleccion-cta" onClick={generarLanding} disabled={generandoLanding}>
              {generandoLanding ? <Loader size={15} className="spin-icon" /> : null}
              {enOnboarding ? 'Generar landing' : 'Generar mi landing'} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {errorGenerarLanding && (
        <div className="vit-inline-error" role="alert">
          <AlertCircle size={16} /> {errorGenerarLanding}
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
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtros de tipo y filtro de Mis Productos */}
        <div className="vit-filters">
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`vit-filter-btn ${filtro === f.valor ? 'active' : ''}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.valor === 'mios' && <UserCheck size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {f.label}
            </button>
          ))}
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
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="vit-empty">
          <Loader size={28} className="spin-icon" />
          <p>Cargando catálogo...</p>
        </div>
      ) : error ? (
        <div className="vit-empty">
          <AlertCircle size={32} color="#ef4444" />
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
              seleccionado={seleccionados.has(`${item.tipo}:${item.id}`)}
              onToggleSeleccion={toggleSeleccion}
              item={item}
              onGuardarPrecio={handleGuardarPrecio}
              onVerSensibilidad={setSeleccionSensibilidad}
              usuarioActual={usuarioActual}
              onEditarProducto={(id) => navigate(`/products/${id}/editar`)}
              filtro={filtro}
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
        />
      )}

      <CuponesModal
        abierto={cuponesAbierto}
        onCerrar={() => setCuponesAbierto(false)}
        catalogo={catalogoCompleto}
      />
    </div>
  );
}
