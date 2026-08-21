import React from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const MAX = 12;

/**
 * Opiniones de clientes. Las carga el comercio a mano — el sistema todavía
 * no tiene reseñas de compradores verificados.
 *
 * Si no se carga ninguna, el embudo NO muestra estrellas ni sección de
 * opiniones: es preferible no mostrar prueba social a inventarla. El
 * promedio que aparece arriba se calcula de estas mismas opiniones, nunca
 * es un número fijo.
 */
export default function OpinionesPanel({ opiniones, onChange }) {
  const items = opiniones || [];

  function agregar() {
    if (items.length >= MAX) return;
    onChange([...items, { nombre: '', calificacion: 5, comentario: '' }]);
  }
  function actualizar(idx, campo, valor) {
    onChange(items.map((o, i) => (i === idx ? { ...o, [campo]: valor } : o)));
  }
  function quitar(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-white/40 leading-relaxed">
        Cargá opiniones reales de tus clientes. Si no cargás ninguna, el embudo
        no muestra estrellas ni esta sección — mejor eso que inventar reseñas.
      </p>

      {items.length === 0 && (
        <p className="text-xs text-white/40">Todavía no agregaste opiniones.</p>
      )}

      {items.map((o, idx) => (
        <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={o.nombre || ''}
              onChange={e => actualizar(idx, 'nombre', e.target.value)}
              placeholder="Nombre del cliente"
              className={`${CAMPO} mr-2`}
            />
            <button
              type="button"
              onClick={() => quitar(idx)}
              className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => actualizar(idx, 'calificacion', n)}
                aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
                className="p-0.5"
              >
                <Star
                  size={17}
                  className={n <= Number(o.calificacion) ? 'text-amber-400' : 'text-white/20'}
                  fill={n <= Number(o.calificacion) ? 'currentColor' : 'transparent'}
                />
              </button>
            ))}
          </div>

          <textarea
            value={o.comentario || ''}
            onChange={e => actualizar(idx, 'comentario', e.target.value)}
            placeholder="Me encantó, llegó rapidísimo."
            rows={2}
            className={CAMPO}
          />
        </div>
      ))}

      {items.length < MAX && (
        <button
          type="button"
          onClick={agregar}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white self-start"
        >
          <Plus size={13} /> Agregar opinión
        </button>
      )}
    </div>
  );
}
