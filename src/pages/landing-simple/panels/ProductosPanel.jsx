import React, { useMemo, useState } from 'react';
import ProductPicker from '../../landing/ProductPicker';
import '../../landing/landing.css';

// Mismo tope que el backend (MAX_ITEMS_POR_LANDING en landing.service.js,
// reutilizado también acá — no hay un tope propio del modo rígido).
const MAX_ITEMS = 40;

function clave(tipo, id) { return `${tipo}:${id}`; }

/**
 * Envuelve el ProductPicker ya existente (pages/landing/ProductPicker.jsx,
 * genérico) — el comercio solo selecciona/quita/ordena productos, nunca
 * toca cómo se ven (eso lo define el template). "items" entra/sale en el
 * shape de LandingItem: [{tipo, referencia_id, etiqueta, orden}].
 */
export default function ProductosPanel({ items, catalogo, onChange, draft, onCampo }) {
  const [seleccion, setSeleccion] = useState(() => {
    const map = new Map();
    (items || []).forEach(it => map.set(clave(it.tipo, it.referencia_id), { id: it.referencia_id, tipo: it.tipo, etiqueta: it.etiqueta || '', precio_ancla: it.precio_ancla != null ? it.precio_ancla : '' }));
    return map;
  });

  function emitir(nuevaSeleccion) {
    setSeleccion(nuevaSeleccion);
    onChange(Array.from(nuevaSeleccion.values()).map((v, idx) => {
      let ancla = null;
      if (v.precio_ancla !== '' && v.precio_ancla != null) {
        const parsed = Number(v.precio_ancla);
        if (!isNaN(parsed)) ancla = parsed;
      }
      return {
        tipo: v.tipo, referencia_id: v.id, etiqueta: v.etiqueta || null, precio_ancla: ancla, orden: idx,
      };
    }));
  }

  function onToggle(item) {
    const k = clave(item.tipo, item.id);
    const copia = new Map(seleccion);
    if (copia.has(k)) copia.delete(k);
    else copia.set(k, { id: item.id, tipo: item.tipo, etiqueta: '', precio_ancla: item.precio_tachado || '' });
    emitir(copia);
  }

  function onEtiqueta(item, etiqueta) {
    const k = clave(item.tipo, item.id);
    if (!seleccion.has(k)) return;
    const copia = new Map(seleccion);
    copia.set(k, { ...copia.get(k), etiqueta });
    emitir(copia);
  }

  function onPrecioAncla(item, precio_ancla) {
    const k = clave(item.tipo, item.id);
    if (!seleccion.has(k)) return;
    const copia = new Map(seleccion);
    copia.set(k, { ...copia.get(k), precio_ancla });
    emitir(copia);
  }

  function onReordenar(desde, hasta) {
    const entradas = Array.from(seleccion.entries());
    const [movida] = entradas.splice(desde, 1);
    entradas.splice(hasta, 0, movida);
    emitir(new Map(entradas));
  }

  const itemsOrdenados = useMemo(() => {
    const porClave = new Map();
    (catalogo?.productos || []).forEach(p => porClave.set(clave('producto', p.id), p));
    (catalogo?.combos || []).forEach(c => porClave.set(clave('combo', c.id), c));

    return Array.from(seleccion.entries()).map(([k, v]) => {
      const entidad = porClave.get(k);
      return {
        id: v.id,
        tipo: v.tipo,
        etiqueta: v.etiqueta,
        precio_ancla: v.precio_ancla,
        nombre: entidad?.nombre || '(ya no disponible)',
        imagen: entidad?.imagen || null,
        precio_efectivo: entidad?.precio_efectivo ?? entidad?.precio_base ?? null,
        no_disponible: !entidad,
      };
    });
  }, [seleccion, catalogo]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-white">Título de la sección</label>
        <input
          type="text"
          value={draft?.productos_titulo || ''}
          onChange={e => onCampo?.('productos_titulo', e.target.value)}
          placeholder="Productos destacados"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <p className="text-xs text-white/40">Título de "Productos destacados" en el inicio. Si lo personalizás, también se usa como título de la página completa de Catálogo.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-white">Productos</label>
        <ProductPicker
          catalogo={catalogo}
          seleccion={seleccion}
          itemsOrdenados={itemsOrdenados}
          onToggle={onToggle}
          onEtiqueta={onEtiqueta}
          onPrecioAncla={onPrecioAncla}
          onReordenar={onReordenar}
          max={MAX_ITEMS}
        />
      </div>
    </div>
  );
}
