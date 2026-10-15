import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, EyeOff, Pencil, Search, Tag, Tags, X } from 'lucide-react';
import { getMediaUrl } from '../../services/api';
import { precioDeVenta } from './PrecioAnclaItem';

/**
 * "Organizar productos" (pestaña Categorías de Configurar tienda): la lista
 * de productos de la landing con selección múltiple, para marcar varios de
 * una como oferta o meterlos en una colección ("Ofertas del día",
 * "Novedades"…). No inventa datos nuevos: todo cae en lo que la landing ya
 * guarda —
 *   oferta    → precio tachado (anclas), badge (insignia_principal) y, si
 *               lleva contador, venta.urgencia (productos + fin_at). El
 *               contador es uno solo para toda la tienda.
 *   colección → etiqueta del producto en esta landing (landing_items), que
 *               el catálogo público ya usa como filtro y como badge.
 */

export const MAX_PRODUCTOS_CONTADOR = 12; // espejo de limpiarUrgencia (backend)
export const MAX_ETIQUETA = 50; // landing_items.etiqueta es STRING(50)

export const COLECCIONES_SUGERIDAS = ['Ofertas del día', 'Novedades', 'Más vendidos', 'Recomendados', 'Liquidación'];
export const BADGES_OFERTA = ['Oferta', 'Oferta del día', 'Solo por hoy', 'Liquidación', 'Hot sale'];
const DESCUENTOS_RAPIDOS = [10, 15, 20, 30, 40, 50];

const pad = n => String(n).padStart(2, '0');
const aInputLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Atajos del contador, en hora local del navegador (la del comercio). El
// valor es el de un <input type="datetime-local">, igual que urgenciaFinAt.
export function finDeAtajo(atajo, ahora = new Date()) {
  const d = new Date(ahora.getTime());
  switch (atajo) {
    case 'hoy': d.setHours(23, 59, 0, 0); return aInputLocal(d);
    case '24h': return aInputLocal(new Date(ahora.getTime() + 24 * 3600 * 1000));
    case '48h': return aInputLocal(new Date(ahora.getTime() + 48 * 3600 * 1000));
    case 'finde': {
      // Hasta el domingo 23:59 (si hoy es domingo, hoy mismo).
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
      d.setHours(23, 59, 0, 0);
      return aInputLocal(d);
    }
    case '7d': d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); return aInputLocal(d);
    default: return '';
  }
}

const ATAJOS_CONTADOR = [
  ['hoy', 'Solo por hoy'],
  ['24h', '24 horas'],
  ['48h', '48 horas'],
  ['finde', 'Hasta el domingo'],
  ['7d', '7 días'],
  ['fecha', 'Elegir fecha'],
  ['ninguno', 'Sin contador'],
];

export function etiquetasDe(item) {
  return String(item?.etiqueta || '').split(',').map(t => t.trim()).filter(Boolean);
}
const normalizar = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export function conEtiqueta(etiqueta, nombre) {
  const lista = etiquetasDe({ etiqueta });
  if (lista.some(t => normalizar(t) === normalizar(nombre))) return lista.join(', ');
  // landing_items.etiqueta es STRING(50): si no entra, queda como estaba.
  const siguiente = [...lista, nombre.trim()].join(', ');
  return siguiente.length > MAX_ETIQUETA ? lista.join(', ') : siguiente;
}
export function sinEtiqueta(etiqueta, nombre) {
  return etiquetasDe({ etiqueta }).filter(t => normalizar(t) !== normalizar(nombre)).join(', ');
}

function formatoGs(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? `Gs. ${Math.round(v).toLocaleString('es-PY')}` : '';
}
function fechaLegible(valorLocal) {
  if (!valorLocal) return '';
  const d = new Date(valorLocal);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PY', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function imagenDe(item) {
  const lista = Array.isArray(item?.imagenes) ? item.imagenes : [];
  const primera = lista.find(img => img?.es_principal) || lista[0];
  return getMediaUrl(item?.imagen || item?.imagen_url || item?.url_imagen || primera?.url || primera || '');
}
const precioDe = item => Number(precioDeVenta(item)) || Number(item?.precio_efectivo ?? item?.precio_usuario ?? item?.precio_base ?? item?.precio) || 0;

// Una marca de la fila (descuento, contador, badge, colección) con su × para
// quitarla sin abrir "Editar promo".
function Marca({ etiqueta, icono = null, tono = '', quitar, onQuitar }) {
  const tonos = {
    success: 'bg-success/10 text-success font-bold',
    warning: 'bg-warning/15 text-warning font-semibold',
    primary: 'bg-primary/10 text-primary font-semibold',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-0.5 text-[11px] ${tonos[tono] || 'border border-border bg-surface-2 font-medium text-fg-muted'}`}>
      {icono}{etiqueta}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onQuitar(); }}
        aria-label={quitar}
        title={quitar}
        className="grid h-4 w-4 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100"
      >
        <X size={10} />
      </button>
    </span>
  );
}

function Chip({ activo, onClick, children, contar }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${activo ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg hover:border-border-strong'}`}
    >
      {children}
      {contar != null && <span className={`tabular-nums ${activo ? 'text-primary-fg/80' : 'text-fg-muted'}`}>{contar}</span>}
    </button>
  );
}

export default function OrganizadorProductos({
  productos,
  enContador,
  contadorFinAt,
  contadorTitulo,
  categoriaActiva = '',
  onCategoria,
  onAplicarOferta,
  onLimpiar,
  onColeccion,
  onEditar,
  onDespublicar,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState(''); // '' | 'oferta' | 'sin_oferta' | 'col:<nombre>'
  const [marcados, setMarcados] = useState(() => new Set());
  const [modal, setModal] = useState(null); // 'oferta' | 'coleccion' | 'quitar_coleccion'

  const enContadorSet = useMemo(() => new Set(enContador || []), [enContador]);
  const filas = useMemo(() => productos.map((item) => {
    const contentId = item.content_id;
    const precio = precioDe(item);
    // Lo mismo que pinta el runtime: el de la landing o, si no tiene, el tachado del producto.
    const ancla = Number(String(item.precio_ancla ?? item.precio_tachado ?? '').replace(/\D/g, '')) || 0;
    const descuento = ancla > precio && precio > 0 ? Math.round((1 - precio / ancla) * 100) : 0;
    return { item, contentId, precio, ancla, descuento, etiquetas: etiquetasDe(item), contador: enContadorSet.has(contentId) };
  }), [productos, enContadorSet]);

  const categorias = useMemo(() => {
    const conteo = new Map();
    filas.forEach(f => { if (f.item.categoria) conteo.set(f.item.categoria, (conteo.get(f.item.categoria) || 0) + 1); });
    return Array.from(conteo.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [filas]);
  const colecciones = useMemo(() => {
    const conteo = new Map();
    filas.forEach(f => f.etiquetas.forEach((t) => {
      const ya = Array.from(conteo.keys()).find(k => normalizar(k) === normalizar(t));
      conteo.set(ya || t, (conteo.get(ya || t) || 0) + 1);
    }));
    return Array.from(conteo.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [filas]);
  const totalOferta = filas.filter(f => f.descuento > 0 || f.contador).length;

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return filas.filter((f) => {
      if (categoriaActiva && f.item.categoria !== categoriaActiva) return false;
      if (filtro === 'oferta' && !(f.descuento > 0 || f.contador)) return false;
      if (filtro === 'sin_oferta' && (f.descuento > 0 || f.contador)) return false;
      if (filtro.startsWith('col:') && !f.etiquetas.some(t => normalizar(t) === normalizar(filtro.slice(4)))) return false;
      if (q && !normalizar([f.item.titulo_comercial, f.item.nombre, f.item.categoria, f.item.etiqueta].filter(Boolean).join(' ')).includes(q)) return false;
      return true;
    });
  }, [filas, busqueda, filtro, categoriaActiva]);

  // Lo marcado que ya no está en la landing (despublicado) se suelta solo.
  useEffect(() => {
    const ids = new Set(filas.map(f => f.contentId));
    setMarcados(prev => {
      const siguiente = new Set([...prev].filter(id => ids.has(id)));
      return siguiente.size === prev.size ? prev : siguiente;
    });
  }, [filas]);
  // Un filtro de colección que quedó vacío (se quitó la última) vuelve a "Todos".
  useEffect(() => {
    if (filtro.startsWith('col:') && !colecciones.some(([c]) => normalizar(c) === normalizar(filtro.slice(4)))) setFiltro('');
  }, [colecciones, filtro]);

  const marcadosLista = filas.filter(f => marcados.has(f.contentId));
  const todosVisiblesMarcados = visibles.length > 0 && visibles.every(f => marcados.has(f.contentId));
  const algunVisibleMarcado = visibles.some(f => marcados.has(f.contentId));

  function alternar(id) {
    setMarcados(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }
  function alternarVisibles() {
    setMarcados(prev => {
      const s = new Set(prev);
      if (todosVisiblesMarcados) visibles.forEach(f => s.delete(f.contentId));
      else visibles.forEach(f => s.add(f.contentId));
      return s;
    });
  }
  const limpiar = () => setMarcados(new Set());

  if (!productos.length) {
    return <p className="text-sm text-fg-muted">Esta landing todavía no tiene productos para mostrar.</p>;
  }

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          aria-label="Buscar productos"
          placeholder="Buscar por nombre, categoría o colección"
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-primary"
        />
      </label>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">Categoría</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por categoría">
          <Chip activo={!categoriaActiva} onClick={() => onCategoria('')} contar={filas.length}>Todas</Chip>
          {categorias.map(([cat, n]) => (
            <Chip key={cat} activo={categoriaActiva === cat} onClick={() => onCategoria(cat)} contar={n}>{cat}</Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">Mostrar</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por oferta o colección">
          <Chip activo={!filtro} onClick={() => setFiltro('')}>Todos</Chip>
          <Chip activo={filtro === 'oferta'} onClick={() => setFiltro('oferta')} contar={totalOferta}>En oferta</Chip>
          <Chip activo={filtro === 'sin_oferta'} onClick={() => setFiltro('sin_oferta')} contar={filas.length - totalOferta}>Sin oferta</Chip>
          {colecciones.map(([col, n]) => (
            <Chip key={col} activo={normalizar(filtro.slice(4)) === normalizar(col) && filtro.startsWith('col:')} onClick={() => setFiltro(`col:${col}`)} contar={n}>
              <Tags size={12} /> {col}
            </Chip>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-3 py-2">
          <input
            type="checkbox"
            aria-label={todosVisiblesMarcados ? 'Desmarcar los productos de la lista' : 'Marcar todos los productos de la lista'}
            checked={todosVisiblesMarcados}
            ref={el => { if (el) el.indeterminate = !todosVisiblesMarcados && algunVisibleMarcado; }}
            onChange={alternarVisibles}
            disabled={!visibles.length}
            className="h-4 w-4 accent-primary"
          />
          <span className="flex-1 text-xs text-fg-muted">
            {visibles.length === filas.length ? `${filas.length} producto${filas.length === 1 ? '' : 's'}` : `${visibles.length} de ${filas.length} productos`}
          </span>
          {marcados.size > 0 && <span className="text-xs font-semibold text-primary">{marcados.size} marcado{marcados.size === 1 ? '' : 's'}</span>}
        </div>
        {visibles.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">No hay productos con este filtro.</p>
        ) : (
          <ul className="max-h-[440px] divide-y divide-border overflow-y-auto">
            {visibles.map(({ item, contentId, precio, ancla, descuento, etiquetas, contador }) => {
              const marcado = marcados.has(contentId);
              const img = imagenDe(item);
              const nombre = item.titulo_comercial || item.nombre;
              return (
                <li key={contentId} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors ${marcado ? 'bg-primary/[0.06]' : 'hover:bg-surface-2/60'}`}>
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(contentId)}
                    aria-label={`Marcar ${nombre}`}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  {/* Clic en la fila = marcar (atajo: la casilla es el control accesible). Las × de las marcas cortan el clic. */}
                  <div onClick={() => alternar(contentId)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
                      {img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{nombre}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-mono font-semibold tabular-nums text-fg">{formatoGs(precio) || 'Sin precio'}</span>
                        {ancla > precio && <span className="font-mono tabular-nums text-fg-muted line-through">{formatoGs(ancla)}</span>}
                        <span className="truncate text-fg-muted">{item.categoria || 'Sin categoría'}</span>
                      </span>
                      {(descuento > 0 || contador || item.insignia_principal || etiquetas.length > 0) && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {descuento > 0 && (
                            <Marca tono="success" etiqueta={`-${descuento}%`} quitar={`Quitar descuento de ${nombre}`} onQuitar={() => onLimpiar([item], { descuento: true, contador: true, badgeOferta: true })} />
                          )}
                          {contador && (
                            <Marca tono="warning" icono={<Clock size={11} />} etiqueta="Contador" quitar={`Quitar contador de ${nombre}`} onQuitar={() => onLimpiar([item], { contador: true })} />
                          )}
                          {item.insignia_principal && (
                            <Marca tono="primary" icono={<Tag size={11} />} etiqueta={item.insignia_principal} quitar={`Quitar badge de ${nombre}`} onQuitar={() => onLimpiar([item], { badge: true })} />
                          )}
                          {etiquetas.map(t => (
                            <Marca key={t} etiqueta={t} quitar={`Quitar ${nombre} de ${t}`} onQuitar={() => onLimpiar([item], { colecciones: [t] })} />
                          ))}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(contentId)}
                      title="Editar promo de este producto"
                      aria-label={`Editar promo de ${nombre}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <Pencil size={14} />
                    </button>
                    {onDespublicar && (
                      <button
                        type="button"
                        onClick={() => onDespublicar(item)}
                        title="Sacar de esta landing (no se borra del catálogo)"
                        aria-label={`Despublicar ${nombre}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <EyeOff size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {marcados.size > 0 && (
        <div className="sticky bottom-2 z-10 rounded-xl border border-primary/40 bg-surface p-3 shadow-lg" role="toolbar" aria-label="Acciones sobre los productos marcados">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">{marcados.size} producto{marcados.size === 1 ? '' : 's'} marcado{marcados.size === 1 ? '' : 's'}</p>
            <button type="button" onClick={limpiar} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">
              <X size={13} /> Desmarcar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModal('oferta')} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-fg hover:bg-primary-hover">
              <Clock size={14} /> Marcar como oferta
            </button>
            <button type="button" onClick={() => setModal('coleccion')} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg hover:border-border-strong">
              <Tags size={14} /> Agregar a colección
            </button>
            <button
              type="button"
              onClick={() => { onLimpiar(marcadosLista.map(f => f.item), { descuento: true, contador: true, badgeOferta: true }); limpiar(); }}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg-muted hover:border-border-strong hover:text-fg"
            >
              Quitar oferta
            </button>
            <button
              type="button"
              onClick={() => setModal('quitar_coleccion')}
              disabled={!marcadosLista.some(f => f.etiquetas.length)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg-muted hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"
            >
              Quitar de colección
            </button>
            <button
              type="button"
              onClick={() => { onLimpiar(marcadosLista.map(f => f.item), { descuento: true, contador: true, badge: true, colecciones: 'todas' }); limpiar(); }}
              title="Saca descuento, contador, badge y colecciones en esta landing. El producto sigue publicado."
              className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-3 text-xs font-semibold text-danger hover:bg-danger/[0.08]"
            >
              <X size={14} /> Quitar todo (oferta, badge y colecciones)
            </button>
          </div>
        </div>
      )}

      {modal === 'oferta' && (
        <ModalOfertaMasiva
          filas={marcadosLista}
          enContador={enContadorSet}
          contadorFinAt={contadorFinAt}
          contadorTitulo={contadorTitulo}
          onCerrar={() => setModal(null)}
          onAplicar={(cambios) => { onAplicarOferta(marcadosLista.map(f => f.item), cambios); setModal(null); limpiar(); }}
        />
      )}
      {(modal === 'coleccion' || modal === 'quitar_coleccion') && (
        <ModalColeccion
          quitar={modal === 'quitar_coleccion'}
          filas={marcadosLista}
          colecciones={colecciones.map(([c]) => c)}
          onCerrar={() => setModal(null)}
          onAplicar={(nombre) => { onColeccion(marcadosLista.map(f => f.item), nombre, modal === 'quitar_coleccion'); setModal(null); limpiar(); }}
        />
      )}
    </div>
  );
}

function Modal({ titulo, subtitulo, onCerrar, children, pie }) {
  useEffect(() => {
    const alTeclear = e => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-6" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-fg-muted">{subtitulo}</p>}
          </div>
          <button type="button" onClick={onCerrar} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-fg-muted hover:border-border-strong hover:text-fg" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{pie}</div>
      </div>
    </div>
  );
}

function Rotulo({ children, ayuda }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold text-fg">{children}</p>
      {ayuda && <p className="mt-0.5 text-xs text-fg-muted">{ayuda}</p>}
    </div>
  );
}

export function ModalOfertaMasiva({ filas, enContador, contadorFinAt, contadorTitulo, onCerrar, onAplicar }) {
  const contadorVigente = contadorFinAt && new Date(contadorFinAt).getTime() > Date.now();
  const [pct, setPct] = useState('');
  const [badge, setBadge] = useState('Oferta');
  const [atajo, setAtajo] = useState(contadorVigente ? 'mantener' : 'hoy');
  const [fecha, setFecha] = useState(contadorFinAt || finDeAtajo('24h'));
  const [titulo, setTitulo] = useState(contadorTitulo || '');

  const pctNum = Number(String(pct).replace(',', '.'));
  const pctValido = pct === '' || (Number.isFinite(pctNum) && pctNum > 0 && pctNum < 95);
  const finElegido = atajo === 'ninguno' ? '' : atajo === 'mantener' ? contadorFinAt : atajo === 'fecha' ? fecha : finDeAtajo(atajo);
  const finValido = atajo === 'ninguno' || (finElegido && new Date(finElegido).getTime() > Date.now());
  const sinDescuento = pct === '' ? filas.filter(f => !(f.ancla > f.precio)).length : 0;
  const nuevosEnContador = atajo === 'ninguno' ? 0 : filas.filter(f => !enContador.has(f.contentId)).length;
  const sobran = Math.max(0, enContador.size + nuevosEnContador - MAX_PRODUCTOS_CONTADOR);
  const tituloSugerido = atajo === 'hoy' ? 'Ofertas del día' : atajo === 'finde' ? 'Ofertas del fin de semana' : 'Ofertas por tiempo limitado';

  function elegirAtajo(valor) {
    setAtajo(valor);
    if (valor === 'hoy' && (badge === 'Oferta' || !badge)) setBadge('Solo por hoy');
  }

  return (
    <Modal
      titulo="Marcar como oferta"
      subtitulo={`${filas.length} producto${filas.length === 1 ? '' : 's'}: ${filas.slice(0, 3).map(f => f.item.titulo_comercial || f.item.nombre).join(', ')}${filas.length > 3 ? '…' : ''}`}
      onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" onClick={onCerrar} className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Cancelar</button>
          <button
            type="button"
            disabled={!pctValido || !finValido}
            onClick={() => onAplicar({ pct: pct === '' ? null : pctNum, badge: badge.trim(), finAt: finElegido || null, titulo: titulo.trim() || tituloSugerido })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check size={15} /> Aplicar a {filas.length}
          </button>
        </>
      )}
    >
      <section role="group" aria-label="Descuento">
        <Rotulo ayuda="Se calcula el precio anterior de cada producto a partir de su precio actual. Vacío = dejar el precio anterior que ya tengan.">Descuento</Rotulo>
        <div className="flex flex-wrap items-center gap-1.5">
          {DESCUENTOS_RAPIDOS.map(n => <Chip key={n} activo={pctNum === n} onClick={() => setPct(String(n))}>{n}%</Chip>)}
          <label className="relative">
            <span className="sr-only">Otro porcentaje</span>
            <input
              inputMode="numeric"
              value={pct}
              onChange={e => setPct(e.target.value.replace(/[^\d.,]/g, '').slice(0, 4))}
              placeholder="Otro"
              aria-label="Porcentaje de descuento"
              className={`h-8 w-20 rounded-full border bg-surface pl-3 pr-6 text-xs text-fg outline-none focus:border-primary ${pctValido ? 'border-border' : 'border-danger'}`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-muted">%</span>
          </label>
        </div>
        {!pctValido && <p className="mt-1.5 text-xs text-danger">El descuento tiene que estar entre 1% y 94%.</p>}
        {sinDescuento > 0 && (
          <p className="mt-1.5 text-xs text-warning">
            {sinDescuento} producto{sinDescuento === 1 ? '' : 's'} no tiene{sinDescuento === 1 ? '' : 'n'} precio anterior: sin un descuento no se va{sinDescuento === 1 ? '' : 'n'} a ver como oferta.
          </p>
        )}
        {pctValido && pct !== '' && filas[0] && filas[0].precio > 0 && (
          <p className="mt-1.5 text-xs text-fg-muted">
            Ej.: {filas[0].item.nombre} queda {formatoGs(filas[0].precio)}, antes {formatoGs(Math.ceil(filas[0].precio / (1 - pctNum / 100)))}.
          </p>
        )}
      </section>

      <section role="group" aria-label="Badge">
        <Rotulo ayuda="La etiqueta destacada que se ve sobre la foto.">Badge</Rotulo>
        <div className="flex flex-wrap gap-1.5">
          {BADGES_OFERTA.map(b => <Chip key={b} activo={badge === b} onClick={() => setBadge(b)}>{b}</Chip>)}
        </div>
        <input
          value={badge}
          onChange={e => setBadge(e.target.value.slice(0, 40))}
          aria-label="Texto del badge"
          placeholder="Texto propio"
          className="mt-2 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
        />
      </section>

      <section role="group" aria-label="Duración">
        <Rotulo ayuda="Cuenta regresiva en la tarjeta del producto y en el bloque “Oferta flash” del inicio. Es una sola para toda la tienda: cambiarla acá también cambia la de las otras ofertas.">¿Hasta cuándo dura?</Rotulo>
        <div className="flex flex-wrap gap-1.5">
          {contadorVigente && <Chip activo={atajo === 'mantener'} onClick={() => setAtajo('mantener')}>Usar el actual</Chip>}
          {ATAJOS_CONTADOR.map(([k, label]) => <Chip key={k} activo={atajo === k} onClick={() => elegirAtajo(k)}>{label}</Chip>)}
        </div>
        {atajo === 'fecha' && (
          <input
            type="datetime-local"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            aria-label="Fecha y hora de fin"
            className="mt-2 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          />
        )}
        {atajo !== 'ninguno' && (
          <p className={`mt-2 text-xs ${finValido ? 'text-fg-muted' : 'text-danger'}`}>
            {finValido ? <>Termina el <span className="font-semibold text-fg">{fechaLegible(finElegido)}</span>.</> : 'Elegí una fecha futura.'}
          </p>
        )}
        {sobran > 0 && (
          <p className="mt-1.5 text-xs text-warning">
            El contador admite hasta {MAX_PRODUCTOS_CONTADOR} productos en total: {sobran} quedan con precio y badge de oferta, pero sin cuenta regresiva.
          </p>
        )}
        {atajo !== 'ninguno' && (
          <label className="mt-3 block text-xs text-fg-muted">
            Título del bloque de ofertas en el inicio
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value.slice(0, 80))}
              placeholder={tituloSugerido}
              className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            />
            <span className="mt-1 flex flex-wrap gap-1.5">
              {['Ofertas del día', 'Ofertas del fin de semana', 'Ofertas de la semana', 'Últimas unidades'].map(t => (
                <button key={t} type="button" onClick={() => setTitulo(t)} className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-fg-muted hover:border-border-strong hover:text-fg">{t}</button>
              ))}
            </span>
          </label>
        )}
      </section>
    </Modal>
  );
}

export function ModalColeccion({ quitar, filas, colecciones, onCerrar, onAplicar }) {
  const deLosMarcados = useMemo(() => {
    const vistas = [];
    filas.forEach(f => f.etiquetas.forEach((t) => { if (!vistas.some(v => normalizar(v) === normalizar(t))) vistas.push(t); }));
    return vistas;
  }, [filas]);
  const opciones = quitar
    ? deLosMarcados
    : [...colecciones, ...COLECCIONES_SUGERIDAS.filter(s => !colecciones.some(c => normalizar(c) === normalizar(s)))];
  const [nombre, setNombre] = useState(quitar ? (deLosMarcados[0] || '') : '');
  const limpio = nombre.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const nueva = !quitar && limpio && !colecciones.some(c => normalizar(c) === normalizar(limpio));

  return (
    <Modal
      titulo={quitar ? 'Quitar de una colección' : 'Agregar a una colección'}
      subtitulo={`${filas.length} producto${filas.length === 1 ? '' : 's'} marcado${filas.length === 1 ? '' : 's'}`}
      onCerrar={onCerrar}
      pie={(
        <>
          <button type="button" onClick={onCerrar} className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg">Cancelar</button>
          <button
            type="button"
            disabled={!limpio}
            onClick={() => onAplicar(limpio)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${quitar ? 'bg-danger text-white hover:bg-danger/90' : 'bg-primary text-primary-fg hover:bg-primary-hover'}`}
          >
            <Check size={15} /> {quitar ? 'Quitar' : (nueva ? `Crear “${limpio}”` : 'Agregar')}
          </button>
        </>
      )}
    >
      <section>
        <Rotulo ayuda={quitar ? 'Los productos dejan de estar en esa colección. No se borran de la landing.' : 'La colección se ve como etiqueta en la tarjeta y como filtro en el catálogo de la tienda. Un producto puede estar en varias.'}>
          {quitar ? '¿De cuál?' : 'Elegí una o creá una nueva'}
        </Rotulo>
        <div className="flex flex-wrap gap-1.5">
          {opciones.map(c => <Chip key={c} activo={normalizar(nombre) === normalizar(c)} onClick={() => setNombre(c)}>{c}</Chip>)}
        </div>
        {!quitar && (
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value.slice(0, 40))}
            onKeyDown={e => { if (e.key === 'Enter' && limpio) onAplicar(limpio); }}
            aria-label="Nombre de la colección"
            placeholder="O escribí una nueva, ej.: Día de la madre"
            className="mt-3 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
          />
        )}
      </section>
    </Modal>
  );
}
