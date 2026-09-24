"use client"

import { useState } from "react"
import { STATUS, formatGs } from "../../lib/courier"
import { OrderCard } from "./order-card"

export function KanbanColumn({
  estado,
  meta: metaProp,
  envios,
  couriers,
  draggingId,
  onDragStartCard,
  onDragEndCard,
  onDropCard,
  onChangeEstado,
  onAbrirSeguimiento,
  onAbrirTimelineAbastecimiento,
  onAccionSiguiente,
  isAdmin,
  readOnly = false,
  emptyText = "Sin envíos",
}) {
  const [isOver, setIsOver] = useState(false)
  const meta = metaProp || STATUS[estado]
  const total = envios.reduce((sum, e) => sum + (Number(e.monto) || 0), 0)

  return (
    <section
      onDragOver={(e) => {
        if (readOnly) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!isOver) setIsOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false)
      }}
      onDrop={(e) => {
        if (readOnly) return
        e.preventDefault()
        setIsOver(false)
        onDropCard(estado)
      }}
      className={`kanban-column ${isOver ? 'is-over' : ''} ${readOnly ? 'is-readonly' : ''}`}
      aria-label={`Columna ${meta.label}`}
    >
      <div className="kanban-col-header">
        <h3 className="kanban-col-title">
          <span className={`kanban-dot ${meta.columnBar}`} />
          {meta.label}
        </h3>
        <span className="kanban-col-count">{envios.length}</span>
      </div>

      <div className="kanban-col-total">
        {formatGs(total)}
      </div>

      <div className="kanban-cards">
        {envios.length === 0 ? (
          <div
            className={`empty-state ${isOver ? 'is-over' : ''}`}
            style={{ padding: '2rem', border: '1px dashed var(--color-border-strong)', background: 'transparent' }}
          >
            {isOver ? "Soltar aquí" : emptyText}
          </div>
        ) : (
          envios.map((envio) => (
            <OrderCard
              key={envio.id}
              envio={envio}
              courier={couriers.find((c) => c.id === envio.courier_id)}
              dragging={draggingId === envio.id}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              onChangeEstado={onChangeEstado}
              onAbrirSeguimiento={onAbrirSeguimiento}
              onAbrirTimelineAbastecimiento={onAbrirTimelineAbastecimiento}
              onAccionSiguiente={onAccionSiguiente}
              isAdmin={isAdmin}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </section>
  )
}
