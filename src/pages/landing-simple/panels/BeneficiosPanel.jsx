import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { CATALOGO_ICONOS_BENEFICIOS, getIconoBeneficio } from '../templates/iconosBeneficios';

const CAMPO = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30';
const MAX_BENEFICIOS = 6;

/**
 * Alta/edición/baja/orden de las tarjetas de la sección "Beneficios" —
 * mismo patrón que FaqPanel.jsx, más un selector del ícono de la tarjeta
 * (catálogo fijo compartido por los 4 templates, ver
 * templates/iconosBeneficios.js — nunca texto/HTML libre, solo una clave).
 */
export default function BeneficiosPanel({ beneficios, onChange }) {
  const [pickerAbierto, setPickerAbierto] = useState(null);

  function agregar() {
    onChange([...(beneficios || []), { titulo: '', texto: '', icono: 'shield' }]);
  }
  function actualizar(idx, campo, valor) {
    onChange(beneficios.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));
  }
  function elegirIcono(idx, key) {
    actualizar(idx, 'icono', key);
    setPickerAbierto(null);
  }
  function quitar(idx) {
    onChange(beneficios.filter((_, i) => i !== idx));
    if (pickerAbierto === idx) setPickerAbierto(null);
  }
  function mover(idx, delta) {
    const destino = idx + delta;
    if (destino < 0 || destino >= beneficios.length) return;
    const copia = [...beneficios];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    onChange(copia);
  }

  const lleno = (beneficios || []).length >= MAX_BENEFICIOS;

  return (
    <div className="flex flex-col gap-4">
      {(beneficios || []).length === 0 && (
        <p className="text-xs text-white/40">Todavía no agregaste beneficios.</p>
      )}
      {(beneficios || []).map((b, idx) => {
        const IconoActual = getIconoBeneficio(b.icono);
        return (
          <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setPickerAbierto(pickerAbierto === idx ? null : idx)}
                title="Cambiar ícono"
                className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white shrink-0"
              >
                <IconoActual size={16} />
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={b.titulo}
                  onChange={e => actualizar(idx, 'titulo', e.target.value)}
                  placeholder="Título"
                  maxLength={100}
                  className={CAMPO}
                />
                <input
                  type="text"
                  value={b.texto}
                  onChange={e => actualizar(idx, 'texto', e.target.value)}
                  placeholder="Texto"
                  maxLength={300}
                  className={CAMPO}
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => mover(idx, 1)} disabled={idx === beneficios.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-white/50">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => quitar(idx)} className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {pickerAbierto === idx && (
              <div className="grid grid-cols-7 gap-1.5 p-2 rounded-lg bg-black/30 border border-white/10">
                {CATALOGO_ICONOS_BENEFICIOS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => elegirIcono(idx, key)}
                    title={label}
                    className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${b.icono === key ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10'}`}
                  >
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={agregar}
        disabled={lleno}
        title={lleno ? `Máximo ${MAX_BENEFICIOS} beneficios` : undefined}
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white self-start"
      >
        <Plus size={13} /> Agregar beneficio
      </button>
    </div>
  );
}
