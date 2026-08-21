import React from 'react';
import { Plus, Trash2, Truck, Lock, Undo2, ShieldCheck, Headphones } from 'lucide-react';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const MAX = 3;

// Set cerrado, igual que en el backend (funnel.service.js) — el comercio
// elige de esta lista, no escribe un icono libre.
const ICONOS = [
  { id: 'envio', label: 'Envío', Icono: Truck },
  { id: 'pago', label: 'Pago', Icono: Lock },
  { id: 'devolucion', label: 'Devolución', Icono: Undo2 },
  { id: 'garantia', label: 'Garantía', Icono: ShieldCheck },
  { id: 'soporte', label: 'Soporte', Icono: Headphones },
];

/**
 * Franja de confianza: los 3 elementos chiquitos debajo del CTA que
 * eliminan dudas antes de comprar.
 *
 * A propósito son texto libre y no promesas prearmadas: solo el comercio
 * sabe si realmente hace envíos a todo el país o acepta devoluciones. El
 * sistema no puede garantizar por él.
 */
export default function ConfianzaPanel({ content, onContent }) {
  const items = content.confianza || [];

  function set(nuevos) {
    onContent({ ...content, confianza: nuevos });
  }
  function agregar() {
    if (items.length >= MAX) return;
    set([...items, { icono: 'envio', texto: '' }]);
  }
  function actualizar(idx, campo, valor) {
    set(items.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c)));
  }
  function quitar(idx) {
    set(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-white/40 leading-relaxed">
        Aparecen debajo del botón de compra. Escribí solo lo que tu tienda
        realmente cumple — una promesa que no puedas sostener genera reclamos,
        no ventas.
      </p>

      {items.length === 0 && (
        <p className="text-xs text-white/40">Todavía no agregaste elementos de confianza.</p>
      )}

      {items.map((c, idx) => (
        <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50">Elemento {idx + 1}</span>
            <button
              type="button"
              onClick={() => quitar(idx)}
              className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex gap-1.5">
            {ICONOS.map(({ id, label, Icono }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => actualizar(idx, 'icono', id)}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg border transition-colors ${
                  c.icono === id
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                <Icono size={15} />
              </button>
            ))}
          </div>

          <input
            type="text"
            value={c.texto || ''}
            onChange={e => actualizar(idx, 'texto', e.target.value)}
            placeholder="Envío a todo el país"
            maxLength={60}
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
          <Plus size={13} /> Agregar elemento
        </button>
      )}
    </div>
  );
}
