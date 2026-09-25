import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, PackageSearch } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

/**
 * Buscador de productos para armar combos (y cualquier elección de un
 * producto entre cientos). Reemplaza al <select> nativo, donde no se podía
 * buscar por parte del nombre, categoría ni proveedor.
 *
 * - Texto libre sin tildes y por palabras sueltas, en nombre, categoría,
 *   marca, proveedor y SKU: "suple natu" encuentra "Suplemento Natural…".
 * - Filtros por categoría (chips con cantidad) y por proveedor.
 * - "Sugeridos": cuando no se escribió nada, primero los que comparten
 *   categoría o proveedor con el producto de referencia (lo que suele ir
 *   junto en un combo).
 * - Teclado: ↑ ↓ para moverse, Enter para elegir.
 */

const normalizar = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const precioDe = p => Number(p?.precio_efectivo ?? p?.precio_usuario ?? p?.precio_base ?? p?.precio ?? 0) || 0;
const gs = n => `Gs ${Math.round(Number(n) || 0).toLocaleString('es-PY')}`;
const POR_PAGINA = 40;

/** El nombre con las palabras buscadas resaltadas (sin romper las tildes del original). */
function Resaltado({ texto, palabras }) {
  if (!palabras.length) return texto;
  const base = normalizar(texto);
  const marcas = new Array(texto.length).fill(false);
  palabras.forEach(pal => {
    let i = base.indexOf(pal);
    while (pal && i !== -1) { for (let k = i; k < i + pal.length; k++) marcas[k] = true; i = base.indexOf(pal, i + pal.length); }
  });
  const partes = [];
  let desde = 0;
  for (let i = 1; i <= texto.length; i++) {
    if (i === texto.length || marcas[i] !== marcas[desde]) {
      const trozo = texto.slice(desde, i);
      partes.push(marcas[desde] ? <mark key={desde} className="bg-accent/25 text-fg rounded-sm">{trozo}</mark> : trozo);
      desde = i;
    }
  }
  return partes;
}

export default function SelectorProducto({
  productos, excluir = [], referencia = null, onElegir, onCerrar = null, autoFocus = true, etiqueta = 'Buscar un producto',
}) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [activo, setActivo] = useState(0);
  const [limite, setLimite] = useState(POR_PAGINA);
  const listaRef = useRef(null);
  const excluidos = useMemo(() => new Set(excluir.map(Number)), [excluir]);

  const disponibles = useMemo(() => productos.filter(p => !excluidos.has(Number(p.id))), [productos, excluidos]);

  const categorias = useMemo(() => {
    const conteo = new Map();
    disponibles.forEach(p => { if (p.categoria) conteo.set(p.categoria, (conteo.get(p.categoria) || 0) + 1); });
    return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  }, [disponibles]);
  const proveedores = useMemo(
    () => [...new Set(disponibles.map(p => p.proveedor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [disponibles],
  );

  const palabras = useMemo(() => normalizar(q).split(/\s+/).filter(Boolean), [q]);
  const resultados = useMemo(() => {
    let lista = disponibles.filter(p => (!categoria || p.categoria === categoria) && (!proveedor || p.proveedor === proveedor));
    if (palabras.length) {
      lista = lista.filter(p => {
        const texto = normalizar([p.nombre, p.categoria, p.marca, p.proveedor, p.sku].filter(Boolean).join(' '));
        return palabras.every(w => texto.includes(w));
      });
      // Primero los que tienen la búsqueda en el nombre.
      const enNombre = p => palabras.every(w => normalizar(p.nombre).includes(w));
      lista = [...lista.filter(enNombre), ...lista.filter(p => !enNombre(p))];
    } else if (referencia) {
      const afin = p => (referencia.categoria && p.categoria === referencia.categoria) || (referencia.proveedor && p.proveedor === referencia.proveedor);
      lista = [...lista.filter(afin), ...lista.filter(p => !afin(p))];
    }
    return lista;
  }, [disponibles, categoria, proveedor, palabras, referencia]);

  const cantidadAfines = !palabras.length && referencia
    ? resultados.filter(p => (referencia.categoria && p.categoria === referencia.categoria) || (referencia.proveedor && p.proveedor === referencia.proveedor)).length
    : 0;

  useEffect(() => { setActivo(0); setLimite(POR_PAGINA); }, [q, categoria, proveedor]);
  useEffect(() => {
    listaRef.current?.querySelector(`[data-idx="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  const visibles = resultados.slice(0, limite);

  function alTeclear(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, visibles.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && visibles[activo]) { e.preventDefault(); onElegir(visibles[activo]); }
    else if (e.key === 'Escape' && onCerrar) { e.stopPropagation(); onCerrar(); }
  }

  const hayFiltros = q || categoria || proveedor;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="p-3 space-y-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-border bg-canvas px-3 focus-within:border-primary">
            <Search size={15} className="text-fg-muted shrink-0" />
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={alTeclear}
              autoFocus={autoFocus}
              placeholder="Nombre, categoría, marca o proveedor"
              aria-label={etiqueta}
              aria-controls="selector-producto-resultados"
              className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-muted/70 outline-none"
            />
          </label>
          {proveedores.length > 1 && (
            <select
              value={proveedor}
              onChange={e => setProveedor(e.target.value)}
              aria-label="Proveedor"
              className="h-10 max-w-[180px] rounded-lg border border-border bg-canvas px-2.5 text-sm text-fg"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {onCerrar && (
            <button type="button" onClick={onCerrar} aria-label="Cerrar buscador" className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2">
              <X size={16} />
            </button>
          )}
        </div>
        {categorias.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Categorías">
            <button
              type="button"
              onClick={() => setCategoria('')}
              aria-pressed={!categoria}
              className={`shrink-0 h-7 px-2.5 rounded-full text-xs font-medium border ${!categoria ? 'bg-fg text-canvas border-fg' : 'border-border text-fg-muted hover:text-fg'}`}
            >
              Todas
            </button>
            {categorias.map(([cat, n]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(c => (c === cat ? '' : cat))}
                aria-pressed={categoria === cat}
                className={`shrink-0 h-7 px-2.5 rounded-full text-xs font-medium border whitespace-nowrap ${categoria === cat ? 'bg-fg text-canvas border-fg' : 'border-border text-fg-muted hover:text-fg'}`}
              >
                {cat} <span className="opacity-60 tabular-nums">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="px-3 pt-2 text-[11px] text-fg-muted">
        {palabras.length || categoria || proveedor
          ? `${resultados.length.toLocaleString('es-PY')} producto${resultados.length === 1 ? '' : 's'}`
          : cantidadAfines > 0
            ? `Primero, ${cantidadAfines} de la misma categoría o proveedor que ${referencia.nombre?.split(/\s[-–—]\s/)[0]}`
            : `${resultados.length.toLocaleString('es-PY')} productos`}
      </p>

      <ul id="selector-producto-resultados" ref={listaRef} role="listbox" aria-label="Productos" className="max-h-[320px] overflow-y-auto p-1.5">
        {visibles.length === 0 && (
          <li className="px-4 py-8 text-center">
            <PackageSearch size={22} className="mx-auto text-fg-muted" />
            <p className="mt-2 text-sm text-fg">Ningún producto coincide{q ? ` con “${q}”` : ''}.</p>
            <p className="text-xs text-fg-muted mt-0.5">Probá con menos palabras o sacá los filtros.</p>
            {hayFiltros && (
              <button type="button" onClick={() => { setQ(''); setCategoria(''); setProveedor(''); }} className="mt-2 text-xs font-semibold text-primary-text hover:underline">
                Sacar búsqueda y filtros
              </button>
            )}
          </li>
        )}
        {visibles.map((p, idx) => {
          const sinStock = p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0;
          const src = p.imagen ? getMediaUrl(p.imagen) : null;
          return (
            <li key={p.id} role="option" aria-selected={idx === activo} data-idx={idx}>
              <button
                type="button"
                onClick={() => onElegir(p)}
                onMouseEnter={() => setActivo(idx)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left ${idx === activo ? 'bg-surface-2' : ''}`}
              >
                {src
                  ? <img src={src} alt="" className={`w-11 h-11 rounded-lg object-cover bg-surface-2 shrink-0 ${sinStock ? 'opacity-50' : ''}`} loading="lazy" />
                  : <span className="w-11 h-11 rounded-lg bg-surface-2 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg leading-snug line-clamp-2"><Resaltado texto={p.nombre || ''} palabras={palabras} /></span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-muted">
                    {p.categoria && <span className="rounded bg-surface-2 px-1.5 py-px text-fg/80">{p.categoria}</span>}
                    {p.proveedor && <span>{p.proveedor}</span>}
                    {sinStock ? <span className="text-danger">Sin stock</span> : (p.stock != null && <span>Stock {Number(p.stock).toLocaleString('es-PY')}</span>)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-fg tabular-nums">{gs(precioDe(p))}</span>
              </button>
            </li>
          );
        })}
        {resultados.length > limite && (
          <li className="px-2 py-2 text-center">
            <button type="button" onClick={() => setLimite(l => l + POR_PAGINA)} className="text-xs font-semibold text-primary-text hover:underline">
              Mostrar {Math.min(POR_PAGINA, resultados.length - limite)} más
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
