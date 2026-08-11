import React, { useState } from 'react';
import { Eye, EyeOff, GripVertical, Plus, Copy, Trash2 } from 'lucide-react';
import { BLOQUES_SCHEMA } from './BloquesSchema';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    // Si lo suelta en el mismo lugar
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Encontramos de dónde vino globalmente
    const fromIndex = secciones.findIndex(s => s.id === draggableId);
    if (fromIndex === -1) return;
    
    // Determinamos la lista destino
    let targetList;
    if (destination.droppableId === 'header') targetList = headerSections;
    else if (destination.droppableId === 'footer') targetList = footerSections;
    else targetList = templateSections;
    
    let toIndex = -1;
    
    // Si se suelta más allá de los elementos existentes, va al final del subgrupo
    if (destination.index >= targetList.length) {
       if (targetList.length === 0) {
           // Grupo vacío
           if (destination.droppableId === 'header') toIndex = 0;
           else if (destination.droppableId === 'footer') toIndex = secciones.length - 1;
           else toIndex = headerSections.length;
       } else {
           // Después del último del grupo
           const lastItemId = targetList[targetList.length - 1].id;
           toIndex = secciones.findIndex(s => s.id === lastItemId);
           // Si arrastramos de arriba hacia abajo, el toIndex ya es correcto o +1
           // onReorder ya hace splice
       }
    } else {
       // Se soltó en una posición específica
       const targetId = targetList[destination.index].id;
       toIndex = secciones.findIndex(s => s.id === targetId);
    }
    
    if (toIndex !== -1) {
       onReorder(fromIndex, toIndex);
    }
  };

  const renderSectionItem = (sec, arrastrable, index) => {
    const schema = BLOQUES_SCHEMA[sec.tipo] || { name: sec.tipo, icon: Plus };
    const Icono = schema.icon;

    if (!arrastrable) {
       return (
          <div key={sec.id || sec.tipo} className={`group relative flex items-center justify-between py-2 px-1 transition-colors ${sec.id === selectedId ? 'bg-[var(--vit-surface)] border-l-2 border-[var(--vit-accent)]' : 'border-l-2 border-transparent'} ${!sec.activo ? 'opacity-50' : ''}`}>
             <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <span className="p-1 w-[22px]" />
                <button type="button" className="flex flex-1 items-center gap-2 overflow-hidden text-left" onClick={() => onSelect(sec.id)}>
                   <Icono size={15} className="flex-shrink-0 text-[var(--vit-muted)]" />
                   <span className="truncate text-sm font-medium text-[var(--vit-text)]">{sec.nombre_interno || schema.name}</span>
                </button>
             </div>
          </div>
       );
    }

    return (
      <Draggable key={sec.id} draggableId={sec.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group relative flex items-center justify-between py-2 px-1 transition-colors cursor-pointer ${sec.id === selectedId ? 'bg-[var(--vit-surface)] border-l-2 border-[var(--vit-accent)]' : 'border-l-2 border-transparent'} ${!sec.activo ? 'opacity-50' : ''} ${snapshot.isDragging ? 'opacity-90 shadow-md bg-[var(--vit-surface)]' : ''}`}
            style={provided.draggableProps.style}
          >
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <span {...provided.dragHandleProps} className="p-1 text-[var(--vit-muted-2)] focus:outline-none">
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

            <div className={`flex items-center gap-1 transition-opacity ${snapshot.isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
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
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[var(--vit-card-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--vit-border)] p-4">
        <h3 className="font-semibold text-[var(--vit-text)]">Página principal</h3>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-y-auto">
          
          {/* HEADER */}
          <Droppable droppableId="header">
            {(provided) => (
              <div className="border-b border-[var(--vit-border)] p-2" ref={provided.innerRef} {...provided.droppableProps}>
                <div className="px-2 py-1 flex items-center justify-between">
                   <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Header</span>
                </div>
                <div className="flex flex-col min-h-[10px]">
                  {headerSections.map((sec, index) => renderSectionItem(sec, true, index))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

          {/* TEMPLATE */}
          <Droppable droppableId="template">
            {(provided) => (
              <div className="border-b border-[var(--vit-border)] p-2" ref={provided.innerRef} {...provided.droppableProps}>
                <div className="px-2 py-1 flex items-center justify-between">
                   <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Template</span>
                </div>
                <div className="flex flex-col min-h-[40px]">
                  {templateSections.length === 0 ? (
                     <div className="py-6 flex flex-col items-center justify-center text-center px-4">
                       <p className="text-sm font-medium text-[var(--vit-text)]">Plantilla vacía</p>
                       <p className="mt-1 text-xs text-[var(--vit-muted-2)] max-w-[200px]">Agregá secciones para empezar a diseñar el cuerpo de la página.</p>
                     </div>
                  ) : (
                    templateSections.map((sec, index) => renderSectionItem(sec, true, index))
                  )}
                  {provided.placeholder}
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
            )}
          </Droppable>

          {/* FOOTER */}
          <Droppable droppableId="footer">
            {(provided) => (
              <div className="p-2" ref={provided.innerRef} {...provided.droppableProps}>
                <div className="px-2 py-1 flex items-center justify-between">
                   <span className="text-xs font-semibold text-[var(--vit-muted)] uppercase tracking-wider">Footer</span>
                </div>
                <div className="flex flex-col min-h-[10px]">
                  {footerSections.map((sec, index) => renderSectionItem(sec, true, index))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

        </div>
      </DragDropContext>
    </div>
  );
}
