import React, { useEffect, useState } from 'react';
import { ChevronDown, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

export default function SubbloqueCombo({ titulo, resumen, children, inicial = false, clave, pedido, onActivo, orden, posicion }) {
  const [abierto, setAbierto] = useState(inicial);
  useEffect(() => { if (pedido?.clave === clave) setAbierto(true); }, [pedido, clave]);
  return <section data-combo-subeditor={clave} data-combo-arrastre-hero={orden?.clave}
    data-arrastrando={orden?.arrastrando || undefined} style={Number.isFinite(posicion) ? { order: posicion } : undefined}
    className={`relative rounded-xl border bg-surface transition-[box-shadow,opacity,border-color] duration-200 ${orden?.arrastrando ? 'border-dashed border-primary bg-primary/5 opacity-60' : orden?.bloqueado ? 'border-border' : orden?.fueraDeGrupo ? 'border-border opacity-40' : orden?.recienMovido ? 'border-primary ring-4 ring-primary/25' : 'border-border'}`}
    onMouseEnter={() => onActivo?.(clave)} onDragOver={orden?.alPasar} onDrop={orden?.alSoltar}>
    <div data-combo-cabecera className="flex items-center gap-1 px-2">
    {orden && !orden.fijo && <button type="button" draggable aria-label={`Arrastrar ${titulo} dentro del encabezado`} title="Arrastrar para ordenar"
      className="touch-none select-none cursor-grab rounded p-1 text-fg-muted hover:text-primary-text focus-visible:outline-primary active:cursor-grabbing"
      {...orden.puntero}
      onDragStart={orden.alArrastrar} onDragEnd={orden.alTerminar} onKeyDown={e => {
        if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); orden.subir?.(); }
        if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); orden.bajar?.(); }
      }}><GripVertical size={15} /></button>}
    <button type="button" aria-expanded={abierto} aria-label={`Editar ${titulo}`}
      className="flex min-w-0 flex-1 items-center gap-3 py-3 px-1 text-left" onClick={() => setAbierto(!abierto)}>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-fg">{titulo}</span>
        {!abierto && resumen && <span className="block truncate text-xs text-fg-muted mt-1">{resumen}</span>}
      </span><ChevronDown size={16} className={`shrink-0 text-fg-muted transition-transform ${abierto ? 'rotate-180' : ''}`} />
    </button>
    {orden?.bloqueado ? <span title="No se puede soltar en este bloque" aria-label="Destino bloqueado" className="shrink-0 text-xs text-fg-muted">🔒</span>
      : orden?.fijo ? <span className="text-[11px] font-medium text-fg-muted">🔒 Fijo</span>
      : orden?.fueraDeGrupo ? <span title="Pertenece a otro grupo" className="shrink-0 text-xs text-fg-muted">🔒</span> : null}
    {orden && !orden.fijo && <div className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label={`Subir ${titulo} dentro del encabezado`} disabled={!orden.subir} onClick={orden.subir}
        className="rounded p-1 text-fg-muted hover:text-primary-text disabled:opacity-20"><ArrowUp size={14} /></button>
      <button type="button" aria-label={`Bajar ${titulo} dentro del encabezado`} disabled={!orden.bajar} onClick={orden.bajar}
        className="rounded p-1 text-fg-muted hover:text-primary-text disabled:opacity-20"><ArrowDown size={14} /></button>
    </div>}
    </div>
    {abierto && <div className="border-t border-border p-3 space-y-4">{children}</div>}
  </section>;
}
