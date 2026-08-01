import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Layers, BarChart3, Loader, ImageOff, Check, AlertCircle,
  Search, ArrowUpDown, TrendingUp, Tag, Archive, Flame, Sparkles,
  ChevronRight, Box,
} from 'lucide-react';
import { vitrinaService } from '../../services/vitrinaService';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';
import SensibilidadPanel from './SensibilidadPanel';
import './vitrina.css';

/* ─── Constantes ─────────────────────────────────────────────────────── */
const FILTROS = [
  { valor: 'todos',    label: 'Todos' },
  { valor: 'producto', label: 'Productos' },
  { valor: 'combo',    label: 'Combos' },
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

function getBadgeConfig(item) {
  if (item.tipo === 'combo') return { cls: 'combo',    icon: '📦', label: 'Combo' };
  if (item.stock === 0)      return { cls: 'sin-stock', icon: '⛔', label: 'Sin stock' };
  return                           { cls: 'producto',  icon: '🟢', label: 'Producto' };
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

  return (
    <div className="vit-price-editor" onClick={(e) => e.stopPropagation()}>
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
        {ok && <Check size={16} color="#10b981" />}
      </div>

      {huboCambio && !guardando && (
        <button className="vit-price-save-btn" onClick={guardar} title="Guardar precio">
          Guardar
        </button>
      )}

      {error && (
        <div className="vit-price-error"><AlertCircle size={12} /> {error}</div>
      )}
    </div>
  );
}

/* ─── Componente: card ────────────────────────────────────────────────── */
function VitrinaCard({ item, onGuardarPrecio, onVerSensibilidad }) {
  const esCombo = item.tipo === 'combo';
  const badge   = getBadgeConfig(item);
  const sinStock = item.stock === 0 && !esCombo;

  return (
    <div
      className="vit-card"
      onClick={() => onVerSensibilidad(item)}
    >
      {/* ── Media ── */}
      <div className="vit-card-media">

        {/* Badge tipo (arriba izquierda) */}
        <span className={`vit-card-badge ${badge.cls}`}>
          {badge.icon} {badge.label}
        </span>

        {/* Imagen o placeholder */}
        {esCombo ? (
          <div className="vit-card-media-placeholder combo">
            <Layers size={32} />
            <span>Combo</span>
          </div>
        ) : item.imagen ? (
          <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
        ) : (
          <div className="vit-card-media-placeholder">
            <ImageOff size={28} />
            <span>Sin imagen</span>
          </div>
        )}

        {/* Overlay gradiente con precio superpuesto (solo si hay imagen) */}
        {(item.imagen || esCombo) && (
          <div className="vit-card-overlay">
            <div>
              <div className="vit-card-overlay-label">Precio</div>
              <div className="vit-card-overlay-price">
                Gs {formatGs(item.precio_efectivo)}
              </div>
            </div>
          </div>
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
          {item.categoria && item.stock !== undefined && (
            <span className="vit-card-meta-sep" />
          )}
          {item.stock !== undefined && !esCombo && (
            <span className="vit-card-meta-item" style={{ color: sinStock ? '#ef4444' : undefined }}>
              <Archive size={11} /> Stock: {item.stock}
            </span>
          )}
        </div>

        {/* Bloque precio principal */}
        <div className="vit-price-block">
          <div className="vit-price-main">
            <span className="vit-price-currency">Gs</span>
            {formatGs(item.precio_efectivo)}
          </div>
          {item.precio_minimo ? (
            <div className="vit-price-min">
              Mínimo permitido: Gs {formatGs(item.precio_minimo)}
            </div>
          ) : null}
        </div>

        {/* Editor de precio */}
        <PrecioEditable item={item} onGuardar={onGuardarPrecio} />

        <div className="vit-card-divider" />

        {/* Acción ghost: Analizar margen */}
        <button
          className="vit-card-action"
          onClick={(e) => { e.stopPropagation(); onVerSensibilidad(item); }}
        >
          <BarChart3 size={13} />
          Analizar margen
          <ChevronRight size={13} className="vit-card-action-arrow" />
        </button>
      </div>
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────────────── */
export default function VitrinaGrid() {
  const [productos, setProductos] = useState([]);
  const [combos, setCombos]       = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [filtro, setFiltro]       = useState('todos');
  const [busqueda, setBusqueda]   = useState('');
  const [orden, setOrden]         = useState('nombre');
  const [seleccionSensibilidad, setSeleccionSensibilidad] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await vitrinaService.catalogo();
      setProductos(data.productos || []);
      setCombos(data.combos || []);
    } catch {
      setError('No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleGuardarPrecio(item, precio) {
    if (item.tipo === 'combo') {
      await vitrinaService.guardarPrecioCombo(item.id, precio);
      setCombos(prev => prev.map(c =>
        c.id === item.id ? { ...c, precio_usuario: precio, precio_efectivo: precio } : c
      ));
    } else {
      await vitrinaService.guardarPrecioProducto(item.id, precio);
      setProductos(prev => prev.map(p =>
        p.id === item.id ? { ...p, precio_usuario: precio, precio_efectivo: precio } : p
      ));
    }
  }

  /* Combinar, filtrar, buscar y ordenar */
  const items = useMemo(() => [
    ...productos.map(p => ({ ...p, tipo: 'producto' })),
    ...combos.map(c => ({ ...c, tipo: 'combo' })),
  ], [productos, combos]);

  const itemsFiltrados = useMemo(() => {
    let lista = filtro === 'todos' ? items : items.filter(i => i.tipo === filtro);

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(i =>
        i.nombre?.toLowerCase().includes(q) ||
        i.descripcion?.toLowerCase().includes(q) ||
        i.categoria?.toLowerCase().includes(q)
      );
    }

    switch (orden) {
      case 'precio-asc':
        return [...lista].sort((a, b) => (a.precio_efectivo ?? 0) - (b.precio_efectivo ?? 0));
      case 'precio-desc':
        return [...lista].sort((a, b) => (b.precio_efectivo ?? 0) - (a.precio_efectivo ?? 0));
      case 'recientes':
        return [...lista].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      case 'nombre':
      default:
        return [...lista].sort((a, b) => a.nombre?.localeCompare(b.nombre ?? '') ?? 0);
    }
  }, [items, filtro, busqueda, orden]);

  const totalProductos = productos.length;
  const totalCombos    = combos.length;

  return (
    <div className="vit-page">
      {/* ── Encabezado ── */}
      <div className="vit-header">
        <div className="vit-header-text">
          <h1 className="vit-title">Mi catálogo</h1>
          <p className="vit-subtitle">
            Gestioná los precios personalizados de venta. El precio nunca puede ser menor al mínimo configurado.
          </p>
          <div className="vit-header-stats">
            <span className="vit-header-stat">
              <Package size={11} /> {totalProductos} {totalProductos === 1 ? 'producto' : 'productos'}
            </span>
            <span className="vit-header-stat dot-sep">·</span>
            <span className="vit-header-stat">
              <Layers size={11} /> {totalCombos} {totalCombos === 1 ? 'combo' : 'combos'}
            </span>
          </div>
        </div>
      </div>

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

        {/* Filtros de tipo */}
        <div className="vit-filters">
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`vit-filter-btn ${filtro === f.valor ? 'active' : ''}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.label}
            </button>
          ))}
        </div>

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
              item={item}
              onGuardarPrecio={handleGuardarPrecio}
              onVerSensibilidad={setSeleccionSensibilidad}
            />
          ))}
        </div>
      )}

      {/* ── Panel de sensibilidad ── */}
      {seleccionSensibilidad && (
        <SensibilidadPanel
          item={seleccionSensibilidad}
          onClose={() => setSeleccionSensibilidad(null)}
        />
      )}
    </div>
  );
}
