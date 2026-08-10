import React, { useState } from 'react';
import { Eye, EyeOff, GripVertical, Plus, Copy, Trash2 } from 'lucide-react';
import { BLOQUES_SCHEMA } from './BloquesSchema';

const HEADER_TYPES = ['header', 'announcement_bar'];
const FOOTER_TYPES = ['footer'];

export default function SidebarSecciones({
  secciones,
  onSelect,
  onAddClick,
  onToggleVisible,
  onDuplicate,
  onDelete,
  onReorder,
  selectedId
}) {
  const headerSections = secciones.filter(s => HEADER_TYPES.includes(s.tipo));
  const footerSections = secciones.filter(s => FOOTER_TYPES.includes(s.tipo));
  const templateSections = secciones.filter(s => !HEADER_TYPES.includes(s.tipo) && !FOOTER_TYPES.includes(s.tipo));

  const [draggedId, setDraggedId] = useState(null);
  const [overId, setOverId] = useState(null);

  // `secciones` es la lista global (incluye header/footer) — hay que
  // traducir el id de la fila arrastrada a su índice ahí, porque
  // onReorder (handleReordenarSeccion en LandingEditor) opera sobre esa
  // lista completa, no sobre `templateSections` filtrada.
  function soltar(destinoId) {
    setDraggedId(null);
    setOverId(null);
    if (!draggedId || draggedId === destinoId) return;
    const fromIndex = secciones.findIndex(s => s.id === draggedId);
    const toIndex = secciones.findIndex(s => s.id === destinoId);
    if (fromIndex === -1 || toIndex === -1) return;
    onReorder(fromIndex, toIndex);
  }

  const renderSectionItem = (sec, arrastrable) => {
    const schema = BLOQUES_SCHEMA[sec.tipo] || { name: sec.tipo, icon: Plus };
    const Icono = schema.icon;

    return (
      <div
        key={sec.id || sec.tipo}
        draggable={arrastrable}
        onDragStart={arrastrable ? (e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(sec.id); } : undefined}
        onDragOver={arrastrable ? (e) => { e.preventDefault(); if (draggedId && draggedId !== sec.id) setOverId(sec.id); } : undefined}
        onDragLeave={arrastrable ? () => setOverId(prev => (prev === sec.id ? null : prev)) : undefined}
        onDrop={arrastrable ? (e) => { e.preventDefault(); soltar(sec.id); } : undefined}
        onDragEnd={arrastrable ? () => { setDraggedId(null); setOverId(null); } : undefined}
        className={`group relative flex items-center justify-between py-2 px-1 transition-colors cursor-pointer ${sec.id === selectedId ? 'bg-[var(--vit-surface)] border-l-2 border-[var(--vit-accent)]' : 'border-l-2 border-transparent'} ${!sec.activo ? 'opacity-50' : ''} ${draggedId === sec.id ? 'opacity-40' : ''} ${overId === sec.id ? 'lb-sidebar-drop-target' : ''}`}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span
            className={`p-1 text-[var(--vit-muted-2)] opacity-0 group-hover:opacity-100 transition-opacity ${arrastrable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          >
            <GripVertical size={14} />
          </span>
          <button
            type="button"
            className="flex flex-1 items-center gap-2 overflow-hidden text-left"
            onClick={() => onSelect(sec.id)}
          >
            <Icono size={15} className="flex-shrink-0 text-[var(--vit-muted)]" />
            <span className="truncate text-sm font-medium text-[var(--vit-text)]">
              {sec.nombre_interno || schema.name}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-1.5 text-[var(--vit-muted-2)] hover:bg-[var(--vit-border)] hover:text-[var(--vit-text)]"
            onClick={() => onToggleVisible(sec.id)}
            title={sec.activo ? 'Ocultar' : 'Mostrar'}
          >
            {sec.activo ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {!sec.fijo && (
            <>
              <button
                type="button"
                className="rounded p-1.5 text-[var(--vit-muted-2)] hover:bg-[var(--vit-border)] hover:text-[var(--vit-text)]"
                onClick={() => onDuplicate(sec.id)}
                title="Duplicar"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-[var(--vit-muted-2)] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444]"
                onClick={() => onDelete(sec.id)}
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[var(--vit-card-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--vit-border)] p-4">
        <h3 className="font-semibold text-[var(--vit-text)]">Página principal</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* HEADER */}
        <div className="border-b border-[var(--vit-border)] p-2">
          <div className="px-2 py-1 flex items-center justify-between">
             <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Header</span>
          </div>
          <div className="flex flex-col">
            {headerSections.map(sec => renderSectionItem(sec, false))}
          </div>
        </div>

        {/* TEMPLATE */}
        <div className="border-b border-[var(--vit-border)] p-2">
          <div className="px-2 py-1 flex items-center justify-between">
             <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Template</span>
          </div>
          <div className="flex flex-col">
            {templateSections.length === 0 ? (
               <div className="py-6 flex flex-col items-center justify-center text-center px-4">
                 <p className="text-sm font-medium text-[var(--vit-text)]">Plantilla vacía</p>
                 <p className="mt-1 text-xs text-[var(--vit-muted-2)] max-w-[200px]">Agregá secciones para empezar a diseñar el cuerpo de la página.</p>
               </div>
            ) : (
              templateSections.map(sec => renderSectionItem(sec, true))
            )}
          </div>
          <div className="mt-2 px-1">
             <button
               onClick={onAddClick}
               className="flex w-full items-center gap-2 rounded-md border border-dashed border-[var(--vit-border)] bg-[var(--vit-surface)] p-2 text-sm font-medium text-[var(--vit-accent)] transition-colors hover:border-[var(--vit-accent-soft)] hover:bg-[var(--vit-accent-soft)]"
             >
               <Plus size={14} /> Agregar sección
             </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-2">
          <div className="px-2 py-1 flex items-center justify-between">
             <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Footer</span>
          </div>
          <div className="flex flex-col">
            {footerSections.map(sec => renderSectionItem(sec, false))}
          </div>
        </div>
      </div>
    </div>
  );
}
