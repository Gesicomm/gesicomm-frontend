import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductPicker from '../../landing/ProductPicker';
import '../../landing/landing.css';

// Mismo tope que el backend (MAX_ITEMS_POR_LANDING en landing.service.js,
// reutilizado también acá — no hay un tope propio del modo rígido).
const MAX_ITEMS = 40;

const CAMPO = 'w-full bg-fg/5 border border-fg/10 rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg/30 focus:outline-none focus:border-primary/50 transition-colors';

function clave(tipo, id) { return `${tipo}:${id}`; }

/**
 * Editor de la página de CATÁLOGO — completamente separado del de la
 * página de inicio (ver panels/DestacadosPanel.jsx, que es el que elige
 * qué productos se muestran en el inicio).
 *
 * Acá se administra el catálogo en sí: qué productos existen en la
 * landing, en qué orden, con qué etiqueta y precio ancla, más el título y
 * descripción propios de esta página. Agregar un producto acá NO lo
 * publica en el inicio: eso se decide aparte, en "Destacados"
 * (mostrar_en_inicio arranca en false).
 *
 * "items" entra/sale en el shape de LandingItem:
 * [{tipo, referencia_id, etiqueta, precio_ancla, orden, mostrar_en_inicio}].
 */
export default function CatalogoPanel({ items, catalogo, onChange, draft, onCampo, onEditarProducto }) {
  const [seleccion, setSeleccion] = useState(() => {
    const map = new Map();
    (items || []).forEach(it => map.set(clave(it.tipo, it.referencia_id), {
      id: it.referencia_id, tipo: it.tipo, etiqueta: it.etiqueta || '', precio_ancla: it.precio_ancla != null ? it.precio_ancla : '',
      mostrar_en_inicio: it.mostrar_en_inicio === true,
    }));
    return map;
  });

  // onChange sube a LandingSimpleEditor en cada cambio de `seleccion` — vía
  // efecto, no llamado a mano en cada handler. Eso importa porque los
  // handlers usan `setSeleccion(prev => ...)` (forma funcional): si dos
  // toggles ocurren en el mismo tick de React (ej. clicks rápidos en dos
  // tarjetas seguidas), cada uno debe partir del `prev` más reciente, no
  // de la `seleccion` ya obsoleta capturada en el closure del render
  // anterior — si no, el segundo pisa al primero y se pierde una selección
  // en silencio.
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return; }
    onChange(Array.from(seleccion.values()).map((v, idx) => {
      let ancla = null;
      if (v.precio_ancla !== '' && v.precio_ancla != null) {
        const parsed = Number(v.precio_ancla);
        if (!isNaN(parsed)) ancla = parsed;
      }
      return {
        tipo: v.tipo, referencia_id: v.id, etiqueta: v.etiqueta || null, precio_ancla: ancla, orden: idx,
        mostrar_en_inicio: v.mostrar_en_inicio === true,
      };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion]);

  function onToggle(item) {
    const k = clave(item.tipo, item.id);
    setSeleccion(prev => {
      const copia = new Map(prev);
      if (copia.has(k)) copia.delete(k);
      // mostrar_en_inicio en false a propósito: agregar un producto al
      // catálogo NO debe publicarlo automáticamente en la página de inicio
      // (antes sí pasaba y aparecía solo). Eso se elige en "Destacados".
      else copia.set(k, { id: item.id, tipo: item.tipo, etiqueta: '', precio_ancla: item.precio_tachado || '', mostrar_en_inicio: false });
      return copia;
    });
  }

  function onEtiqueta(item, etiqueta) {
    // item llega con id y tipo desde itemsOrdenados — reconstruimos la clave
    // igual que al insertar para que `has` no falle.
    const k = clave(item.tipo, item.id);
    setSeleccion(prev => {
      const copia = new Map(prev);
      // Fallback: si por algún motivo la clave no está (no debería pasar),
      // buscamos por id para no perder la edición silenciosamente.
      if (!copia.has(k)) {
        const entrada = [...copia.entries()].find(([, v]) => v.id === item.id && v.tipo === item.tipo);
        if (!entrada) return prev;
        const [kReal, vReal] = entrada;
        copia.set(kReal, { ...vReal, etiqueta });
        return copia;
      }
      copia.set(k, { ...copia.get(k), etiqueta });
      return copia;
    });
  }

  function onPrecioAncla(item, precio_ancla) {
    const k = clave(item.tipo, item.id);
    setSeleccion(prev => {
      const copia = new Map(prev);
      if (!copia.has(k)) {
        const entrada = [...copia.entries()].find(([, v]) => v.id === item.id && v.tipo === item.tipo);
        if (!entrada) return prev;
        const [kReal, vReal] = entrada;
        copia.set(kReal, { ...vReal, precio_ancla });
        return copia;
      }
      copia.set(k, { ...copia.get(k), precio_ancla });
      return copia;
    });
  }

  function onReordenar(desde, hasta) {
    setSeleccion(prev => {
      const entradas = Array.from(prev.entries());
      const [movida] = entradas.splice(desde, 1);
      entradas.splice(hasta, 0, movida);
      return new Map(entradas);
    });
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
    <div className="flex flex-col gap-5">
      <p className="text-xs text-fg/40 leading-relaxed">
        Esta es la página de <strong className="text-fg/70">Catálogo completo</strong>. Los productos que agregues acá
        NO aparecen en el inicio: eso se elige en la pestaña <strong className="text-fg/70">Destacados</strong>.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-fg/70">Título de la página</label>
        <input
          type="text"
          value={draft?.catalogo_titulo || ''}
          onChange={e => onCampo?.('catalogo_titulo', e.target.value)}
          placeholder="Catálogo de Productos"
          className={CAMPO}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-fg/70">Descripción</label>
        <textarea
          value={draft?.catalogo_descripcion || ''}
          onChange={e => onCampo?.('catalogo_descripcion', e.target.value)}
          placeholder="Ej: Todo lo que necesitás para dormir mejor, en un solo lugar."
          rows={2}
          className={`${CAMPO} resize-none`}
        />
        <p className="text-xs text-fg/40">Aparece debajo del título. Opcional.</p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <label className="text-sm font-semibold text-fg">Productos del catálogo</label>
        <ProductPicker
          catalogo={catalogo}
          seleccion={seleccion}
          itemsOrdenados={itemsOrdenados}
          onToggle={onToggle}
          onEtiqueta={onEtiqueta}
          onPrecioAncla={onPrecioAncla}
          onReordenar={onReordenar}
          max={MAX_ITEMS}
          onEditar={onEditarProducto}
        />
      </div>
    </div>
  );
}
