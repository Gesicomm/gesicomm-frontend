"use client"

import { STATUS_ORDER } from "../../lib/courier"
import { KanbanColumn } from "./kanban-column"

export function KanbanBoard({
  envios,
  couriers,
  draggingId,
  onDragStartCard,
  onDragEndCard,
  onDropCard,
  onChangeEstado,
}) {
  return (
    <div className="kanban-board">
      {STATUS_ORDER.map((estado) => (
        <KanbanColumn
          key={estado}
          estado={estado}
          envios={envios.filter((e) => e.estado === estado)}
          couriers={couriers}
          draggingId={draggingId}
          onDragStartCard={onDragStartCard}
          onDragEndCard={onDragEndCard}
          onDropCard={onDropCard}
          onChangeEstado={onChangeEstado}
        />
      ))}
    </div>
  )
}
