"use client"

import { useEffect, useRef } from "react"
import { STATUS_ORDER } from "../../lib/courier"
import { KanbanColumn } from "./kanban-column"

const ABASTECIMIENTO_SEGUIMIENTO_ESTADOS = [
  "pago_enviado",
  "pago_validado",
  "proveedor_contactado",
  "enviado_por_proveedor",
  "en_transito_a_gesicomm",
  "recibido_en_gesicomm",
  "preparando_envio_a_deposito_cliente",
  "despachado_a_deposito_cliente",
  "en_transito_a_deposito_cliente",
  "recibido_en_deposito_cliente",
  "disponible_en_gesicomm",
]

const ABASTECIMIENTO_SEGUIMIENTO_LANE = {
  id: "AbastecimientoSeguimiento",
  type: "abastecimiento",
  label: "En seguimiento abastecimiento",
  columnBar: "bg-purple-400",
  emptyText: "Sin abastecimientos en seguimiento",
}

function tieneSeguimientoAbastecimiento(envio) {
  return ABASTECIMIENTO_SEGUIMIENTO_ESTADOS.includes(envio?.abastecimiento_estado)
}

function buildLanes() {
  return STATUS_ORDER.flatMap((estado) => {
    const lane = { id: estado, type: "estado", estado }
    return estado === "Confirmado" ? [lane, ABASTECIMIENTO_SEGUIMIENTO_LANE] : [lane]
  })
}

export function KanbanBoard({
  envios,
  couriers,
  draggingId,
  onDragStartCard,
  onDragEndCard,
  onDropCard,
  onChangeEstado,
  onAbrirDetalle,
  onAbrirSeguimiento,
  onAbrirTimelineAbastecimiento,
  onAccionSiguiente,
  isAdmin,
}) {
  const boardRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  const stopAutoScroll = () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const getScrollContainer = () => {
    const board = boardRef.current
    return board?.closest(".pt-kanban-wrap") || board
  }

  const tickAutoScroll = () => {
    const scroller = getScrollContainer()
    if (!scroller || draggingId == null) {
      stopAutoScroll()
      return
    }

    const rect = scroller.getBoundingClientRect()
    const { x, y } = pointerRef.current
    const isVerticallyInside = y >= rect.top - 32 && y <= rect.bottom + 32
    const edge = Math.min(120, Math.max(72, rect.width * 0.14))
    let delta = 0

    if (isVerticallyInside && x > rect.right - edge) {
      delta = Math.ceil(((x - (rect.right - edge)) / edge) * 28)
    } else if (isVerticallyInside && x < rect.left + edge) {
      delta = -Math.ceil((((rect.left + edge) - x) / edge) * 28)
    }

    if (delta !== 0) {
      scroller.scrollLeft += delta
    }

    rafRef.current = window.requestAnimationFrame(tickAutoScroll)
  }

  useEffect(() => {
    if (draggingId == null) {
      stopAutoScroll()
      return undefined
    }

    const handleDragOver = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(tickAutoScroll)
      }
    }

    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("drop", stopAutoScroll)
    window.addEventListener("dragend", stopAutoScroll)

    return () => {
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("drop", stopAutoScroll)
      window.removeEventListener("dragend", stopAutoScroll)
      stopAutoScroll()
    }
  }, [draggingId])

  const lanes = buildLanes()

  return (
    <div ref={boardRef} className="kanban-board">
      {lanes.map((lane) => (
        <KanbanColumn
          key={lane.id}
          estado={lane.estado || lane.id}
          meta={lane.type === "abastecimiento" ? lane : undefined}
          envios={envios.filter((e) => (
            lane.type === "abastecimiento"
              ? tieneSeguimientoAbastecimiento(e)
              : e.estado === lane.estado && !(lane.estado === "Confirmado" && tieneSeguimientoAbastecimiento(e))
          ))}
          couriers={couriers}
          draggingId={draggingId}
          onDragStartCard={onDragStartCard}
          onDragEndCard={onDragEndCard}
          onDropCard={onDropCard}
          onChangeEstado={onChangeEstado}
          onAbrirDetalle={onAbrirDetalle}
          onAbrirSeguimiento={onAbrirSeguimiento}
          onAbrirTimelineAbastecimiento={onAbrirTimelineAbastecimiento}
          onAccionSiguiente={onAccionSiguiente}
          isAdmin={isAdmin}
          readOnly={lane.type === "abastecimiento"}
          emptyText={lane.emptyText}
        />
      ))}
    </div>
  )
}
