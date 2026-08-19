import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';

/**
 * Alta/edición/baja/orden del CONTENIDO de la única sección FAQ que ya
 * existe en el template — nunca agrega una segunda sección FAQ (spec
 * punto 7). "faq" es un array plano en memoria, se persiste completo en
 * el próximo Guardar (mismo patrón que testimonios en LandingEditor.jsx).
 */
export default function FaqPanel({ faq, onChange }) {
  function agregar() {
    onChange([...(faq || []), { pregunta: '', respuesta: '' }]);
  }
  function actualizar(idx, campo, valor) {
    onChange(faq.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
  }
  function quitar(idx) {
    onChange(faq.filter((_, i) => i !== idx));
  }
  function mover(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= faq.length) return;
    const copia = [...faq];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    onChange(copia);
  }

  return (
    <div className="flex flex-col gap-4">
      {(faq || []).length === 0 && (
        <p className="text-xs text-white/40">Todavía no agregaste preguntas.</p>
      )}
      {(faq || []).map((f, idx) => (
        <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                value={f.pregunta}
                onChange={e => actualizar(idx, 'pregunta', e.target.value)}
                placeholder="Pregunta"
                className={CAMPO}
              />
              <textarea
                value={f.respuesta}
                onChange={e => actualizar(idx, 'respuesta', e.target.value)}
                placeholder="Respuesta"
                rows={2}
                className={CAMPO}
              />
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
                <ChevronUp size={14} />
              </button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === faq.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
                <ChevronDown size={14} />
              </button>
              <button type="button" onClick={() => quitar(idx)} className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white self-start"
      >
        <Plus size={13} /> Agregar pregunta
      </button>
    </div>
  );
}
