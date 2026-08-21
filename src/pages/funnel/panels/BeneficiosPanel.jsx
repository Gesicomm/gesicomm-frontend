import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const MAX = 6;

/**
 * Beneficios rápidos — el bloque de ✓ que va DEBAJO del bloque de compra,
 * no arriba: no debe competir con el CTA. Si el comercio no carga ninguno,
 * la sección simplemente no aparece (no se inventan beneficios genéricos).
 */
export default function BeneficiosPanel({ beneficios, onChange }) {
  const items = beneficios || [];

  function agregar() {
    if (items.length >= MAX) return;
    onChange([...items, { titulo: '', texto: '' }]);
  }
  function actualizar(idx, campo, valor) {
    onChange(items.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));
  }
  function quitar(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function mover(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= items.length) return;
    const copia = [...items];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    onChange(copia);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-white/40 leading-relaxed">
        Tres o cuatro razones concretas por las que vale la pena. Van debajo del
        bloque de compra, para no competir con el botón.
      </p>

      {items.length === 0 && (
        <p className="text-xs text-white/40">Todavía no agregaste beneficios.</p>
      )}

      {items.map((b, idx) => (
        <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-start gap-2">
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={b.titulo || ''}
              onChange={e => actualizar(idx, 'titulo', e.target.value)}
              placeholder="Resultado profesional"
              className={CAMPO}
            />
            <textarea
              value={b.texto || ''}
              onChange={e => actualizar(idx, 'texto', e.target.value)}
              placeholder="Detalle opcional"
              rows={2}
              className={CAMPO}
            />
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
              <ChevronUp size={14} />
            </button>
            <button type="button" onClick={() => mover(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={() => quitar(idx)} className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {items.length < MAX && (
        <button
          type="button"
          onClick={agregar}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white self-start"
        >
          <Plus size={13} /> Agregar beneficio
        </button>
      )}
    </div>
  );
}
