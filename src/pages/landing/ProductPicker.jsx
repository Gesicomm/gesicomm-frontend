import React, { useMemo, useState } from 'react';
import {
  Search, Check, Layers, ImageOff, Tag, Archive, GripVertical, X,
  Package, Sparkles, Box,
} from 'lucide-react';
import { getMediaUrl } from '../../services/api';

/**
 * Selección visual de productos/combos para una landing.
 *
 * Dos vistas: "Catálogo" (grid de tarjetas para elegir) y "Orden"
 * (lista arrastrable + etiqueta por item). El orden de aparición en la
 * tienda es el orden del Map de selección que mantiene el editor: acá
 * solo se emiten los índices de origen y destino.
 */

const TIPOS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'producto', label: 'Productos' },
  { valor: 'combo', label: 'Combos' },
];

const ORDENES = [
  { valor: 'nombre', label: 'Nombre A–Z' },
  { valor: 'precio-desc', label: 'Precio: mayor primero' },
  { valor: 'precio-asc', label: 'Precio: menor primero' },
  { valor: 'recientes', label: 'Más recientes' },
];

function formatGs(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-PY', { maximumFractionDigits: 0 });
}

function claveItem(item) {
  return `${item.tipo}:${item.id}`;
}

/* ─── Tarjeta seleccionable ───────────────────────────────────────────── */
function TarjetaProducto({ item, seleccionado, deshabilitado, onToggle }) {
  const esCombo = item.tipo === 'combo';
  const sinStock = item.stock === 0;

  return (
    <button
      type="button"
      className={`lb-card ${seleccionado ? 'selected' : ''} ${deshabilitado ? 'disabled' : ''}`}
      onClick={() => onToggle(item)}
      disabled={deshabilitado}
      title={deshabilitado ? 'Alcanzaste el máximo de productos' : undefined}
    >
      <div className="lb-card-media">
        {item.imagen ? (
          <img src={getMediaUrl(item.imagen)} alt={item.nombre} loading="lazy" />
        ) : (
          <div className={`lb-card-media-placeholder ${esCombo ? 'combo' : ''}`}>
            {esCombo ? <Layers size={26} /> : <ImageOff size={24} />}
          </div>
        )}

        <span className={`lb-card-badge ${esCombo ? 'combo' : 'producto'}`}>
          {esCombo ? <><Layers size={10} /> Combo</> : <><Package size={10} /> Producto</>}
        </span>

        {sinStock && <span className="lb-card-badge sin-stock right">Sin stock</span>}
        {!sinStock && item.destacado && (
          <span className="lb-card-badge destacado right"><Sparkles size={10} /> Destacado</span>
        )}

        <span className="lb-card-check">{seleccionado && <Check size={13} strokeWidth={3} />}</span>
      </div>

      <div className="lb-card-body">
        <h4 className="lb-card-name">{item.nombre}</h4>
        <div className="lb-card-meta">
          {item.categoria && <span><Tag size={10} /> {item.categoria}</span>}
          {item.stock !== null && item.stock !== undefined && (
            <span className={sinStock ? 'danger' : ''}><Archive size={10} /> {item.stock}</span>
          )}
        </div>
        <div className="lb-card-price">
          <span className="cur">Gs</span> {formatGs(item.precio_efectivo)}
        </div>
      </div>
    </button>
  );
}

/* ─── Lista ordenable de seleccionados ────────────────────────────────── */
function ListaOrden({ items, onEtiqueta, onPrecioAncla, onQuitar, onReordenar }) {
  const [arrastrando, setArrastrando] = useState(null);
  const [encima, setEncima] = useState(null);
  // Una fila con inputs no puede ser draggable siempre: el navegador
  // arrastra la fila en vez de dejar seleccionar texto. Se habilita solo
  // mientras el puntero está sobre la manija.
  const [habilitada, setHabilitada] = useState(null);

  function soltar(destino) {
    if (arrastrando !== null && arrastrando !== destino) onReordenar(arrastrando, destino);
    setArrastrando(null);
    setEncima(null);
    setHabilitada(null);
  }

  if (items.length === 0) {
    return (
      <div className="lb-empty">
        <Box size={30} opacity={0.25} />
        <p>Todavía no elegiste productos. Volvé a <strong>Catálogo</strong> para agregarlos.</p>
      </div>
    );
  }

  return (
    <div className="lb-orden-lista">
      {items.map((item, idx) => (
        <div
          key={claveItem(item)}
          className={`lb-orden-fila ${arrastrando === idx ? 'dragging' : ''} ${encima === idx && arrastrando !== idx ? 'over' : ''}`}
          draggable={habilitada === idx}
          onDragStart={() => setArrastrando(idx)}
          onDragOver={(e) => { e.preventDefault(); setEncima(idx); }}
          onDrop={() => soltar(idx)}
          onDragEnd={() => { setArrastrando(null); setEncima(null); setHabilitada(null); }}
        >
          <span
            className="lb-orden-handle"
            onMouseDown={() => setHabilitada(idx)}
            onMouseUp={() => setHabilitada(null)}
            title="Arrastrar para reordenar"
          >
            <GripVertical size={14} />
          </span>

          <span className="lb-orden-pos">{idx + 1}</span>

          <div className="lb-orden-thumb">
            {item.imagen ? (
              <img src={getMediaUrl(item.imagen)} alt="" />
            ) : (
              item.tipo === 'combo' ? <Layers size={14} /> : <ImageOff size={14} />
            )}
          </div>

          <div className="lb-orden-info">
            <span className="lb-orden-nombre">{item.nombre}</span>
            <span className="lb-orden-precio">Gs {formatGs(item.precio_efectivo)}</span>
          </div>

          <div className="lb-orden-inputs" style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input
              className="lb-orden-etiqueta"
              placeholder="Etiqueta (ej: Ofertas)"
              maxLength={50}
              value={item.etiqueta || ''}
              onChange={(e) => onEtiqueta(item, e.target.value)}
            />
            <input
              className="lb-orden-etiqueta"
              type="number"
              placeholder="Precio ancla (tachado)"
              value={item.precio_ancla || ''}
              onChange={(e) => onPrecioAncla(item, e.target.value)}
              style={{ width: '120px' }}
            />
          </div>

          <button type="button" className="lb-orden-quitar" onClick={() => onQuitar(item)} title="Quitar">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────────────── */
export default function ProductPicker({
  catalogo, seleccion, itemsOrdenados, onToggle, onEtiqueta, onPrecioAncla, onReordenar, max,
}) {
  const [vista, setVista] = useState('catalogo');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [stock, setStock] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);

  const todos = useMemo(() => [
    ...(catalogo?.productos || []).map(p => ({ ...p, tipo: 'producto' })),
    ...(catalogo?.combos || []).map(c => ({ ...c, tipo: 'combo' })),
  ], [catalogo]);

  const categorias = useMemo(() => [...new Set(todos.map(i => i.categoria).filter(Boolean))].sort(), [todos]);
  const marcas = useMemo(() => [...new Set(todos.map(i => i.marca).filter(Boolean))].sort(), [todos]);

  const visibles = useMemo(() => {
    let lista = todos;

    if (tipo !== 'todos') lista = lista.filter(i => i.tipo === tipo);
    if (categoria) lista = lista.filter(i => i.categoria === categoria);
    if (marca) lista = lista.filter(i => i.marca === marca);
    if (stock === 'con') lista = lista.filter(i => (i.stock ?? 0) > 0);
    if (stock === 'sin') lista = lista.filter(i => (i.stock ?? 0) === 0);
    if (soloSeleccionados) lista = lista.filter(i => seleccion.has(claveItem(i)));

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(i =>
        i.nombre?.toLowerCase().includes(q) ||
        i.descripcion?.toLowerCase().includes(q) ||
        i.categoria?.toLowerCase().includes(q) ||
        i.marca?.toLowerCase().includes(q)
      );
    }

    switch (orden) {
      case 'precio-asc':
        return [...lista].sort((a, b) => (a.precio_efectivo ?? 0) - (b.precio_efectivo ?? 0));
      case 'precio-desc':
        return [...lista].sort((a, b) => (b.precio_efectivo ?? 0) - (a.precio_efectivo ?? 0));
      case 'recientes':
        return [...lista].sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0));
      default:
        return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  }, [todos, tipo, categoria, marca, stock, soloSeleccionados, busqueda, orden, seleccion]);

  const cantidad = seleccion.size;
  const lleno = cantidad >= max;
  const hayFiltroActivo = !!(busqueda || categoria || marca || tipo !== 'todos' || stock !== 'todos' || soloSeleccionados);

  function limpiarFiltros() {
    setBusqueda(''); setTipo('todos'); setCategoria(''); setMarca(''); setStock('todos'); setSoloSeleccionados(false);
  }

  return (
    <div className="lb-picker">
      <div className="lb-subtabs">
        <button
          type="button"
          className={vista === 'catalogo' ? 'active' : ''}
          onClick={() => setVista('catalogo')}
        >
          Catálogo
        </button>
        <button
          type="button"
          className={vista === 'orden' ? 'active' : ''}
          onClick={() => setVista('orden')}
        >
          Orden y etiquetas
          <span className="lb-subtab-count">{cantidad}</span>
        </button>
        <span className={`lb-contador ${lleno ? 'lleno' : ''}`}>{cantidad} / {max}</span>
      </div>

      {vista === 'catalogo' ? (
        <>
          <div className="lb-toolbar">
            <div className="lb-search">
              <Search size={14} />
              <input
                placeholder="Buscar por nombre, categoría o marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="lb-segmented">
              {TIPOS.map(t => (
                <button
                  key={t.valor}
                  type="button"
                  className={tipo === t.valor ? 'active' : ''}
                  onClick={() => setTipo(t.valor)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {categorias.length > 0 && (
              <select className="lb-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="">Categoría</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {marcas.length > 0 && (
              <select className="lb-select" value={marca} onChange={e => setMarca(e.target.value)}>
                <option value="">Marca</option>
                {marcas.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}

            <select className="lb-select" value={stock} onChange={e => setStock(e.target.value)}>
              <option value="todos">Stock: todos</option>
              <option value="con">Con stock</option>
              <option value="sin">Sin stock</option>
            </select>

            <select className="lb-select" value={orden} onChange={e => setOrden(e.target.value)}>
              {ORDENES.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
            </select>

            <button
              type="button"
              className={`lb-chip ${soloSeleccionados ? 'active' : ''}`}
              onClick={() => setSoloSeleccionados(v => !v)}
            >
              <Check size={12} /> Seleccionados
            </button>

            {hayFiltroActivo && (
              <button type="button" className="lb-chip ghost" onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>

          {visibles.length === 0 ? (
            <div className="lb-empty">
              <Box size={30} opacity={0.25} />
              <p>Ningún producto coincide con los filtros.</p>
            </div>
          ) : (
            <div className="lb-grid">
              {visibles.map(item => {
                const seleccionado = seleccion.has(claveItem(item));
                return (
                  <TarjetaProducto
                    key={claveItem(item)}
                    item={item}
                    seleccionado={seleccionado}
                    deshabilitado={!seleccionado && lleno}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="lb-hint">
            Arrastrá desde la manija para definir en qué orden aparecen en tu tienda.
            La etiqueta agrupa productos dentro de esta landing (ej: “Ofertas”) y funciona como filtro para el visitante.
          </p>
          <ListaOrden
            items={itemsOrdenados}
            onEtiqueta={onEtiqueta}
            onPrecioAncla={onPrecioAncla}
            onQuitar={onToggle}
            onReordenar={onReordenar}
          />
        </>
      )}
    </div>
  );
}
