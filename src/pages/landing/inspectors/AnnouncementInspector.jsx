import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function AnnouncementInspector({ seccion, onUpdate }) {
  const mensajes = seccion.contenido?.mensajes || [];

  const handleUpdate = (nuevos) => {
    onUpdate(seccion.id, { contenido: { ...seccion.contenido, mensajes: nuevos } });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(mensajes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    handleUpdate(items);
  };

  const handleAdd = () => {
    handleUpdate([...mensajes, 'Nuevo mensaje...']);
  };

  const handleRemove = (index) => {
    handleUpdate(mensajes.filter((_, i) => i !== index));
  };

  const handleChange = (index, value) => {
    const nuevos = [...mensajes];
    nuevos[index] = value;
    handleUpdate(nuevos);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--vit-text)] mb-2">Mensajes Carrusel</label>
        <p className="text-xs text-[var(--vit-muted)] mb-4">
          Agrega varios mensajes para que pasen automáticamente en la barra superior.
        </p>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="mensajes-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {mensajes.map((msg, index) => (
                  <Draggable key={index} draggableId={`msg-\${index}`} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-start gap-2 bg-[var(--vit-surface)] p-2 rounded-lg border border-[var(--vit-border)]"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="mt-2 cursor-grab text-[var(--vit-muted)] hover:text-[var(--vit-text)]"
                        >
                          <GripVertical size={16} />
                        </div>
                        <input
                          type="text"
                          value={msg}
                          onChange={(e) => handleChange(index, e.target.value)}
                          className="flex-1 rounded-md border border-[var(--vit-border)] bg-[var(--vit-card-bg)] px-3 py-2 text-sm text-[var(--vit-text)] outline-none focus:border-[var(--vit-primary)]"
                          placeholder="Ej: Envo gratis a todo el pas..."
                        />
                        <button
                          onClick={() => handleRemove(index)}
                          className="mt-2 text-[var(--vit-muted)] hover:text-red-500 transition-colors"
                          title="Eliminar mensaje"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          onClick={handleAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--vit-border)] py-3 text-sm font-medium text-[var(--vit-muted)] hover:border-[var(--vit-primary)] hover:text-[var(--vit-primary)] transition"
        >
          <Plus size={16} />
          Agregar otro mensaje
        </button>
      </div>
    </div>
  );
}
