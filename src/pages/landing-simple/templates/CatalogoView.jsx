import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ImageOff, Pencil, ShoppingCart } from 'lucide-react';
import { hexToRgba } from './themeUtils';
import { ImagenProductoHover, textoOMuestra } from './sections';

const OPCIONES_ORDEN = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'az', label: 'Alfabéticamente, A-Z' },
  { id: 'za', label: 'Alfabéticamente, Z-A' },
  { id: 'min-max', label: 'Precio, menor a mayor' },
  { id: 'max-min', label: 'Precio, mayor a menor' },
];

const fmtPrecio = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num || 0);
const pctDescuento = (antes, ahora) => {
  const precioAntes = Number(antes);
  const precioActual = Number(ahora);
  if (!(precioAntes > precioActual && precioActual > 0)) return null;
  return Math.round(((precioAntes - precioActual) / precioAntes) * 100);
};

/**
 * Cuerpo de la página de Catálogo completo (título + barra de filtros +
 * grilla de productos) — el ÚNICO renderer, montado tanto por
 * CatalogoPublico.jsx (landing real) como por CatalogoPreview.jsx (editor).
 * Antes cada uno dibujaba su propia versión y se fueron desincronizando
 * (ver memoria gesicomm-preview-igual-publicada). Cada lado sigue
 * ocupándose de lo suyo (data-fetching, header, carrito vs. panel de
 * edición) y le pasa acá productos ya normalizados a esta forma:
 *   { id, nombre, precio, precioAntes, imagen, imagenes, categoria, etiqueta, stock }
 *
 * `previewMode` únicamente cambia el cartel de "catálogo vacío" (todavía no
 * se agregó ningún producto) y el badge "Editar" al pasar el mouse por una
 * tarjeta — cualquier otra diferencia visual con la página pública es un bug.
 *
 * Modo controlado (`filtrosControlados` + `onFiltrosControladosChange`):
 * lo usa CatalogoPublico.jsx porque el catálogo público pagina del lado del
 * servidor — `productos` ya viene filtrado/ordenado/recortado a UNA
 * página, así que acá no hay que volver a filtrarlo, solo mostrar los
 * controles y avisar al padre qué cambió para que pida la página de nuevo.
 * Sin esas props (CatalogoPreview.jsx, el editor) el componente sigue
 * siendo no-controlado: filtra/ordena en memoria sobre el array completo,
 * exactamente como antes.
 */
export default function CatalogoView({
  productos, titulo, descripcion, tema, bordeSuave, onClickProducto, previewMode = false, gridClassName = 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  filtrosControlados = null, onFiltrosControladosChange = null,
  categoriasDisponibles = null, etiquetasDisponibles = null, totalResultados = null,
  paginacion = null, onCambiarPagina = null, cargando = false,
}) {
  const modoControlado = !!filtrosControlados;

  const [filtroOrdenState, setFiltroOrdenState] = useState('destacados');
  const [filtroPrecioMinState, setFiltroPrecioMinState] = useState('');
  const [filtroPrecioMaxState, setFiltroPrecioMaxState] = useState('');
  const [filtroDisponibilidadState, setFiltroDisponibilidadState] = useState('todos');
  const [filtroCategoriaState, setFiltroCategoriaState] = useState('todas');
  const [filtroEtiquetaState, setFiltroEtiquetaState] = useState('todas');

  const filtroOrden = modoControlado ? (filtrosControlados.orden ?? 'destacados') : filtroOrdenState;
  const filtroPrecioMin = modoControlado ? (filtrosControlados.precioMin ?? '') : filtroPrecioMinState;
  const filtroPrecioMax = modoControlado ? (filtrosControlados.precioMax ?? '') : filtroPrecioMaxState;
  const filtroDisponibilidad = modoControlado ? (filtrosControlados.disponibilidad ?? 'todos') : filtroDisponibilidadState;
  const filtroCategoria = modoControlado ? (filtrosControlados.categoria ?? 'todas') : filtroCategoriaState;
  const filtroEtiqueta = modoControlado ? (filtrosControlados.etiqueta ?? 'todas') : filtroEtiquetaState;

  function setFiltroOrden(v) { modoControlado ? onFiltrosControladosChange({ orden: v }) : setFiltroOrdenState(v); }
  function setFiltroPrecioMin(v) { modoControlado ? onFiltrosControladosChange({ precioMin: v }) : setFiltroPrecioMinState(v); }
  function setFiltroPrecioMax(v) { modoControlado ? onFiltrosControladosChange({ precioMax: v }) : setFiltroPrecioMaxState(v); }
  function setFiltroDisponibilidad(v) { modoControlado ? onFiltrosControladosChange({ disponibilidad: v }) : setFiltroDisponibilidadState(v); }
  function setFiltroCategoria(v) { modoControlado ? onFiltrosControladosChange({ categoria: v }) : setFiltroCategoriaState(v); }
  function setFiltroEtiqueta(v) { modoControlado ? onFiltrosControladosChange({ etiqueta: v }) : setFiltroEtiquetaState(v); }

  const categoriasUnicas = categoriasDisponibles ?? Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))).sort();
  const etiquetasUnicas = etiquetasDisponibles ?? Array.from(new Set(productos.map(p => p.etiqueta).filter(Boolean))).sort();

  // En modo controlado `productos` YA es la página filtrada/ordenada que
  // pidió el padre — filtrar/ordenar de nuevo acá sería, en el mejor caso,
  // redundante, y en el peor (si algún campo no coincidiera 1:1 con el
  // criterio del backend) mostraría una grilla recortada distinta de lo
  // que dice la barra de filtros.
  const filteredAndSortedProducts = modoControlado ? productos : productos.filter(p => {
    if (filtroPrecioMin && p.precio < Number(filtroPrecioMin)) return false;
    if (filtroPrecioMax && p.precio > Number(filtroPrecioMax)) return false;
    // Disponibilidad: `stock` es null cuando el producto no rastrea stock
    // (siempre disponible) — solo se filtra cuando el dato existe.
    if (filtroDisponibilidad === 'en_stock' && p.stock != null && p.stock <= 0) return false;
    if (filtroDisponibilidad === 'agotado' && !(p.stock != null && p.stock <= 0)) return false;
    if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
    if (filtroEtiqueta !== 'todas' && p.etiqueta !== filtroEtiqueta) return false;
    return true;
  }).sort((a, b) => {
    if (filtroOrden === 'az') return a.nombre.localeCompare(b.nombre);
    if (filtroOrden === 'za') return b.nombre.localeCompare(a.nombre);
    if (filtroOrden === 'min-max') return a.precio - b.precio;
    if (filtroOrden === 'max-min') return b.precio - a.precio;
    return 0; // destacados (default)
  });

  const hayFiltrosActivos = filtroPrecioMin || filtroPrecioMax || filtroDisponibilidad !== 'todos' || filtroCategoria !== 'todas' || filtroEtiqueta !== 'todas';
  function limpiarFiltros() {
    if (modoControlado) {
      onFiltrosControladosChange({ precioMin: '', precioMax: '', disponibilidad: 'todos', categoria: 'todas', etiqueta: 'todas' });
      return;
    }
    setFiltroPrecioMinState('');
    setFiltroPrecioMaxState('');
    setFiltroDisponibilidadState('todos');
    setFiltroCategoriaState('todas');
    setFiltroEtiquetaState('todas');
  }

  const inputClase = 'bg-transparent px-3 py-2 rounded-lg text-sm font-medium outline-none transition-colors';
  const catalogoVacio = productos.length === 0;
  const tituloVista = textoOMuestra(titulo, 'Título del catálogo', previewMode);
  const descripcionVista = textoOMuestra(descripcion, 'Una línea que cuente qué vas a encontrar acá.', previewMode);

  return (
    <div className="max-w-7xl mx-auto w-full px-6 pt-8 pb-20">
      {/* Título y descripción: vacíos = un ejemplo atenuado en el preview del
          armador (para ver dónde van) y nada en la landing publicada. */}
      {(tituloVista.texto || descripcionVista.texto) && (
        <div className="mb-6">
          {tituloVista.texto && <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${tituloVista.clase}`}>{tituloVista.texto}</h1>}
          {descripcionVista.texto && (
            <p className={`${tituloVista.texto ? 'mt-2 ' : ''}max-w-2xl text-sm ${descripcionVista.clase}`} style={{ color: hexToRgba(tema.texto, 0.6) }}>{descripcionVista.texto}</p>
          )}
        </div>
      )}

      {/* Barra de filtros horizontal — compacta, sin sidebar ni drawer móvil. */}
      <div className="flex flex-wrap items-center gap-3 pb-5 mb-6" style={{ borderBottom: `1px solid ${bordeSuave}` }}>
        <select
          value={filtroOrden}
          onChange={e => setFiltroOrden(e.target.value)}
          className={inputClase}
          style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
        >
          {OPCIONES_ORDEN.map(o => <option key={o.id} value={o.id} style={{ color: '#000' }}>{o.label}</option>)}
        </select>

        <select
          value={filtroDisponibilidad}
          onChange={e => setFiltroDisponibilidad(e.target.value)}
          className={inputClase}
          style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
        >
          <option value="todos" style={{ color: '#000' }}>Disponibilidad: todas</option>
          <option value="en_stock" style={{ color: '#000' }}>En stock</option>
          <option value="agotado" style={{ color: '#000' }}>Agotado</option>
        </select>

        {categoriasUnicas.length > 0 && (
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className={inputClase}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            <option value="todas" style={{ color: '#000' }}>Categoría: todas</option>
            {categoriasUnicas.map(cat => <option key={cat} value={cat} style={{ color: '#000' }}>{cat}</option>)}
          </select>
        )}

        {etiquetasUnicas.length > 0 && (
          <select
            value={filtroEtiqueta}
            onChange={e => setFiltroEtiqueta(e.target.value)}
            className={inputClase}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            <option value="todas" style={{ color: '#000' }}>Etiqueta: todas</option>
            {etiquetasUnicas.map(etq => <option key={etq} value={etq} style={{ color: '#000' }}>{etq}</option>)}
          </select>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Precio mín"
            value={filtroPrecioMin}
            onChange={e => setFiltroPrecioMin(e.target.value)}
            className={`${inputClase} w-28`}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          />
          <span style={{ color: hexToRgba(tema.texto, 0.4) }}>–</span>
          <input
            type="number"
            placeholder="Precio máx"
            value={filtroPrecioMax}
            onChange={e => setFiltroPrecioMax(e.target.value)}
            className={`${inputClase} w-28`}
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          />
        </div>

        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros} className="text-xs font-semibold underline underline-offset-2 hover:opacity-70" style={{ color: hexToRgba(tema.texto, 0.6) }}>
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-sm" style={{ color: hexToRgba(tema.texto, 0.5) }}>
          {(totalResultados ?? filteredAndSortedProducts.length)} producto{(totalResultados ?? filteredAndSortedProducts.length) === 1 ? '' : 's'}
        </span>
      </div>

      {catalogoVacio && previewMode ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: `1px dashed ${bordeSuave}` }}>
          <ImageOff size={32} style={{ color: hexToRgba(tema.texto, 0.25), margin: '0 auto 0.75rem' }} />
          <p className="font-semibold mb-1">Todavía no agregaste productos</p>
          <p className="text-sm" style={{ color: hexToRgba(tema.texto, 0.5) }}>Elegilos en el panel de la izquierda, pestaña "Catálogo".</p>
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl" style={{ border: `1px dashed ${bordeSuave}`, backgroundColor: hexToRgba(tema.texto, 0.02) }}>
          <ImageOff size={40} className="opacity-20 mb-4" />
          <h3 className="text-lg font-bold mb-2">No se encontraron productos</h3>
          <p className="opacity-60 max-w-sm text-sm">Intenta ajustar los filtros para ver más resultados.</p>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="mt-6 px-6 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: tema.acento, color: tema.fondo }}>Limpiar filtros</button>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 md:gap-5 ${gridClassName}`} style={cargando ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          {filteredAndSortedProducts.map((p) => {
            const agotado = p.stock != null && p.stock <= 0;
            const enOferta = p.precioAntes != null && p.precio != null && Number(p.precioAntes) > Number(p.precio);
            const descuento = pctDescuento(p.precioAntes, p.precio);
            const descripcion = p.descripcion || p.mensajeComercial || '';
            const categoria = p.marca || p.categoria || '';
            return (
              <div
                key={p.id}
                onClick={() => onClickProducto(p)}
                className="group flex min-h-full cursor-pointer flex-col overflow-hidden rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{ backgroundColor: tema.fondo, border: `1px solid ${bordeSuave}` }}
              >
                <div className="aspect-[4/3] relative flex items-center justify-center" style={{ backgroundColor: hexToRgba(tema.texto, 0.045) }}>
                  <ImagenProductoHover
                    imagenes={p.imagenes}
                    imagen={p.imagen}
                    alt={p.nombre}
                    fallback={<ImageOff size={28} style={{ color: hexToRgba(tema.texto, 0.2) }} />}
                    imgClassName="w-full h-full object-contain p-5 transition-opacity duration-500 ease-out"
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {agotado && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: tema.texto, color: tema.fondo }}>Agotado</span>
                    )}
                    {enOferta && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: tema.acento, color: tema.fondo }}>-{descuento}%</span>
                    )}
                    {p.etiqueta && !enOferta && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: hexToRgba(tema.texto, 0.85), color: tema.fondo }}>{p.etiqueta}</span>
                    )}
                  </div>
                  {previewMode && (
                    // Pista de que la tarjeta es clickeable para editar — el
                    // comercio no encontraba cómo editar desde acá.
                    <span
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: tema.acento, color: tema.fondo }}
                    >
                      <Pencil size={10} /> Editar
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {categoria && <div className="mb-2 text-[11px] font-bold uppercase" style={{ color: hexToRgba(tema.texto, 0.55) }}>{categoria}</div>}
                  <h3 className="min-h-[2.6em] text-[15px] font-extrabold leading-snug">{p.nombre}</h3>
                  {descripcion && <p className="mt-2 line-clamp-2 min-h-[2.8em] text-sm leading-snug" style={{ color: hexToRgba(tema.texto, 0.62) }}>{descripcion}</p>}
                  <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                    {enOferta && <span className="basis-full text-xs line-through" style={{ color: hexToRgba(tema.texto, 0.45) }}>{fmtPrecio(p.precioAntes)}</span>}
                    <span className="text-xl font-black leading-none" style={{ color: tema.texto }}>{fmtPrecio(p.precio)}</span>
                    {enOferta && <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ backgroundColor: hexToRgba(tema.acento, 0.13), color: tema.acento }}>Oferta</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold" style={{ color: agotado ? hexToRgba(tema.texto, 0.48) : '#0f9f6e' }}>
                    <CheckCircle2 size={14} />
                    <span>{agotado ? 'Sin stock por ahora' : 'Disponible'}</span>
                  </div>
                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-extrabold transition-transform group-hover:-translate-y-0.5"
                      style={{ backgroundColor: tema.acento, color: tema.fondo }}
                      onClick={(e) => { e.stopPropagation(); onClickProducto(p); }}
                    >
                      <ShoppingCart size={16} />
                      Comprar ahora
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginador — solo en modo controlado y con más de una página. Antes
          el catálogo traía TODOS los productos de una: en una tienda con
          cientos de items eso era el pedido más pesado de toda la landing
          pública (ver memoria de performance del catálogo). */}
      {paginacion && paginacion.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            type="button"
            onClick={() => onCambiarPagina(paginacion.pagina - 1)}
            disabled={paginacion.pagina <= 1 || cargando}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-70"
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            Anterior
          </button>
          <span className="text-sm" style={{ color: hexToRgba(tema.texto, 0.6) }}>
            Página {paginacion.pagina} de {paginacion.totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => onCambiarPagina(paginacion.pagina + 1)}
            disabled={paginacion.pagina >= paginacion.totalPaginas || cargando}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:opacity-70"
            style={{ border: `1px solid ${bordeSuave}`, color: tema.texto }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
