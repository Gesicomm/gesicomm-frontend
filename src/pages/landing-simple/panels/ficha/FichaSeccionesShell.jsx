import React, { useState } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';

/**
 * Layout compartido por los 5 paneles de "Ficha avanzada" (Fitness, Tech,
 * Beauty, Básico, Combo). Es puramente presentacional: no conoce `editar`,
 * herencia ni `CAMPOS` de ninguna ficha — cada panel sigue siendo dueño de
 * sus datos y le pasa acá solo lo que hace falta para dibujar la lista y
 * navegar.
 *
 * Reemplaza el acordeón de 12-13 secciones abriéndose una encima de otra
 * (todas compitiendo por el mismo scroll) por dos vistas: una lista plana
 * de secciones y, al tocar una, un inspector de esa sección sola con botón
 * de volver. El estado de cuál está seleccionada vive acá adentro — el
 * panel que lo usa no necesita saberlo.
 */
export default function FichaSeccionesShell({ secciones, onToggleActivo, renderInspector }) {
  const [seccionKey, setSeccionKey] = useState(null);

  if (seccionKey) {
    const sec = secciones.find(s => s.key === seccionKey);
    if (!sec) {
      setSeccionKey(null);
      return null;
    }
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setSeccionKey(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg/50 hover:text-fg w-fit -ml-1 px-1 py-1"
        >
          <ArrowLeft size={13} /> Secciones
        </button>
        <div className="flex items-center gap-2.5">
          <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${sec.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
            {sec.numero}
          </span>
          <span className="text-sm font-semibold text-fg">{sec.label}</span>
          <label className="ml-auto shrink-0 inline-flex items-center cursor-pointer" title={sec.activo ? 'Ocultar sección' : 'Mostrar sección'}>
            <input
              type="checkbox"
              checked={sec.activo}
              onChange={e => onToggleActivo(sec.key, e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          {renderInspector(sec.key)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {secciones.map(sec => (
        <button
          key={sec.key}
          type="button"
          onClick={() => setSeccionKey(sec.key)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-fg/10 bg-fg/[0.02] hover:bg-fg/[0.05] text-left transition-colors"
        >
          <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${sec.activo ? 'bg-fg text-canvas' : 'bg-fg/10 text-fg/40'}`}>
            {sec.numero}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-fg truncate">{sec.label}</span>
            {sec.badge && (
              <span className={`block text-[10px] truncate ${sec.badgeDestacado ? 'text-[var(--color-accent-text)]/80' : 'text-fg/35'}`}>
                {sec.badge}
              </span>
            )}
          </span>
          <label
            className="shrink-0 inline-flex items-center cursor-pointer"
            title={sec.activo ? 'Ocultar sección' : 'Mostrar sección'}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={sec.activo}
              onChange={e => onToggleActivo(sec.key, e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
          </label>
          <ChevronRight size={15} className="text-fg/25 shrink-0" />
        </button>
      ))}
    </div>
  );
}
