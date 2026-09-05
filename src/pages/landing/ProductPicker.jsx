import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Check, Layers, ImageOff, Tag, Archive, GripVertical, X,
  Package, Sparkles, Box, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import CurrencyInput from '../../components/CurrencyInput';

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
function TarjetaProducto({ item, seleccionado, deshabilitado, onToggle, onEditar }) {
  const esCombo = item.tipo === 'combo';
  const sinStock = item.stock === 0;

  return (
    <div className={`lb-card-wrap ${seleccionado ? 'selected' : ''}`}>
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

    {/* Fuera del <button> de arriba (no puede haber <button> anidado) —
        barra ancha y con texto, no un ícono chico en una esquina: eso se
        notaba muy poco y el comercio no encontraba cómo editar. */}
    {onEditar && (
      <span
        role="button"
        tabIndex={0}
        className="lb-card-edit"
        title="Editar descripción, imágenes y preguntas frecuentes"
        onClick={(e) => { e.stopPropagation(); onEditar(item); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEditar(item); } }}
      >
        <Pencil size={12} /> Editar producto
      </span>
    )}
    </div>
  );
}

/* ─── Lista ordenable de seleccionados ────────────────────────────────── */
function ListaOrden({ items, onEtiqueta, onPrecioAncla, onMostrarInicio, onQuitar, onReordenar, mostrarInputs = true }) {
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
          <div className="lb-orden-cabecera">
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

            <button type="button" className="lb-orden-quitar" onClick={() => onQuitar(item)} title="Quitar">
              <X size={14} />
            </button>
          </div>

          {/* Debajo, apilado (no en la misma fila que arriba) — en un
              sidebar angosto (320px), etiqueta + precio ancla + checkbox no
              entran junto al nombre/miniatura sin cortarse. */}
          {mostrarInputs && (
            <div className="lb-orden-inputs">
              <input
                className="lb-orden-etiqueta"
                placeholder="Etiquetas (separadas por coma)"
                maxLength={50}
                value={item.etiqueta || ''}
                onChange={(e) => onEtiqueta(item, e.target.value)}
              />
              <CurrencyInput
                className="lb-orden-etiqueta"
                placeholder="Precio ancla (tachado)"
                value={item.precio_ancla || ''}
                onChange={(val) => onPrecioAncla(item, val)}
              />
              {onMostrarInicio && (
                <label className="lb-orden-inicio" title="Si está destildado, el producto solo aparece en la página de Catálogo completo, no en el inicio">
                  <input
                    type="checkbox"
                    checked={item.mostrar_en_inicio !== false}
                    onChange={(e) => onMostrarInicio(item, e.target.checked)}
                  />
                  <span>Mostrar en el inicio</span>
                </label>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────────────────── */
/**
 * @param {boolean} [mostrarLista=true] - false oculta la lista de orden de
 *   abajo y deja solo el botón + el modal de selección. Lo usa
 *   ProductCheckoutOfertas, que necesita el mismo popup de catálogo pero
 *   muestra lo elegido con su propia lista (con cantidad por producto, que
 *   esta no tiene).
 */
export default function ProductPicker({
  catalogo, seleccion, itemsOrdenados, onToggle, onEtiqueta, onPrecioAncla, onMostrarInicio, onReordenar, max, onEditar, mostrarInputs = true, mostrarLista = true,
  // Ambos modales se montan por portal en <body>, así que compiten en el
  // mismo contexto de apilado. Cuando el picker se usa DENTRO de otro modal
  // (ej. el formulario de ofertas, que va en z-index 1000) hay que subirlo
  // por encima o se abre detrás y parece que el botón no hace nada.
  zIndexModal = 100,
  themeScopeClassName = '',
  triggerLabel = 'Elegir productos',
  modalTitle = 'Seleccionar productos',
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [stock, setStock] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [pagina, setPagina] = useState(1);

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

  React.useEffect(() => {
    setPagina(1);
  }, [busqueda, tipo, categoria, marca, stock, orden, soloSeleccionados]);

  const TAMANO_PAGINA = 10;
  const totalPaginas = Math.ceil(visibles.length / TAMANO_PAGINA) || 1;
  const visiblesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * TAMANO_PAGINA;
    return visibles.slice(inicio, inicio + TAMANO_PAGINA);
  }, [visibles, pagina]);

  const cantidad = seleccion.size;
  const lleno = cantidad >= max;
  const hayFiltroActivo = !!(busqueda || categoria || marca || tipo !== 'todos' || stock !== 'todos' || soloSeleccionados);

  function limpiarFiltros() {
    setBusqueda(''); setTipo('todos'); setCategoria(''); setMarca(''); setStock('todos'); setSoloSeleccionados(false); setPagina(1);
  }

  return (
    <div className={`lb-picker ${themeScopeClassName}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[13px] font-semibold text-fg/60">{cantidad} / {max} seleccionados</span>
        <button type="button" onClick={() => setModalAbierto(true)} className="px-3 py-1.5 bg-fg/10 hover:bg-fg/20 text-fg text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
          <Search size={14} /> {triggerLabel}
        </button>
      </div>

      {modalAbierto && createPortal(
        <div className={`lb-modal-overlay fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${themeScopeClassName}`} style={{ zIndex: zIndexModal }}>
          <div className="lb-modal-panel bg-surface-2 border border-fg/10 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="lb-modal-header flex items-center justify-between p-4 border-b border-fg/10 bg-fg/5">
              <h3 className="text-base font-semibold text-fg">{modalTitle}</h3>
              <button type="button" onClick={() => setModalAbierto(false)} className="lb-modal-close p-1.5 text-fg/40 hover:text-fg hover:bg-fg/10 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
            <>
              {/* var(--color-fg-muted) y no un blanco fijo: con el blanco
                  hardcodeado este texto quedaba invisible en modo claro. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.2rem', fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
                <span>Mostrando {visiblesPaginados.length} de {visibles.length}</span>
                {totalPaginas > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button
                      type="button"
                      disabled={pagina <= 1}
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      style={{
                        padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                        background: pagina <= 1 ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                        color: pagina <= 1 ? 'var(--color-fg-subtle)' : 'var(--color-fg)', cursor: pagina <= 1 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center'
                      }}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span>{pagina} / {totalPaginas}</span>
                    <button
                      type="button"
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      style={{
                        padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                        background: pagina >= totalPaginas ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                        color: pagina >= totalPaginas ? 'var(--color-fg-subtle)' : 'var(--color-fg)', cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center'
                      }}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div className="lb-grid">
                {visiblesPaginados.map(item => {
                  const seleccionado = seleccion.has(claveItem(item));
                  return (
                    <TarjetaProducto
                      key={claveItem(item)}
                      item={item}
                      seleccionado={seleccionado}
                      deshabilitado={!seleccionado && lleno}
                      onToggle={onToggle}
                      onEditar={onEditar}
                    />
                  );
                })}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-fg-muted)' }}>
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    style={{
                      padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                      background: pagina <= 1 ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                      color: pagina <= 1 ? 'var(--color-fg-subtle)' : 'var(--color-fg)', cursor: pagina <= 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                    }}
                  >
                    <ChevronLeft size={13} /> Anterior
                  </button>
                  <span>Página {pagina} de {totalPaginas}</span>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    style={{
                      padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
                      background: pagina >= totalPaginas ? 'transparent' : 'color-mix(in srgb, var(--color-fg) 10%, transparent)',
                      color: pagina >= totalPaginas ? 'var(--color-fg-subtle)' : 'var(--color-fg)', cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                    }}
                  >
                    Siguiente <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}
            </div>
            <div className="p-4 border-t border-fg/10 bg-fg/5 flex justify-end">
              <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-colors">Listo</button>
            </div>
          </div>
        </div>, document.body)}

      {mostrarLista && (
        <>
          {mostrarInputs && (
            <p className="lb-hint">
              Arrastrá desde la manija para definir en qué orden aparecen en tu tienda.
              La etiqueta agrupa productos dentro de esta landing (ej: “Ofertas”) y funciona como filtro para el visitante.
            </p>
          )}
          <ListaOrden
            items={itemsOrdenados}
            onEtiqueta={onEtiqueta}
            onPrecioAncla={onPrecioAncla}
            onMostrarInicio={onMostrarInicio}
            onQuitar={onToggle}
            onReordenar={onReordenar}
            mostrarInputs={mostrarInputs}
          />
        </>
      )}
    </div>
  );
}
