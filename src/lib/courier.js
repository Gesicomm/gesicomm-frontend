// Tipos eliminados, convertido a JavaScript puro

// Catálogo autoritativo de estado operativo — ver plan Gestión de Pedidos,
// sección 3 y envioController.ESTADOS_OPERATIVOS (backend). "Rendido"/
// "En camino"/"En Tránsito"/"Reagendado" ya no son valores válidos: el
// primero pasó a ser Envio.estado_financiero (independiente del estado
// operativo), y los otros dos se renombraron a Despachado/Reprogramado.
export const STATUS_ORDER = [
  "Pendiente",
  "EnSeguimiento",
  "Confirmado",
  "Preparado",
  "Despachado",
  "Reprogramado",
  "Entregado",
  "Cancelado",
  "Devuelto",
  "Perdido",
];

export const STATUS = {
  "EnSeguimiento": {
    label: "En Seguimiento",
    columnBar: "bg-blue-300",
    chipBg: "color-mix(in srgb, #3b82f6 14%, transparent)",
    chipText: "#3b82f6",
  },
  "Pendiente": {
    label: "Pendiente",
    columnBar: "bg-amber-400",
    chipBg: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
    chipText: "var(--color-warning)",
  },
  "Confirmado": {
    label: "Confirmado",
    columnBar: "bg-teal-400",
    chipBg: "color-mix(in srgb, var(--color-info) 14%, transparent)",
    chipText: "var(--color-info)",
  },
  "Preparado": {
    label: "Preparado",
    columnBar: "bg-purple-400",
    chipBg: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
    chipText: "var(--color-primary-text)",
  },
  "Despachado": {
    label: "Despachado",
    columnBar: "bg-blue-400",
    chipBg: "color-mix(in srgb, var(--color-info) 14%, transparent)",
    chipText: "var(--color-info)",
  },
  "Reprogramado": {
    label: "Reprogramado",
    columnBar: "bg-orange-400",
    chipBg: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
    chipText: "var(--color-warning)",
  },
  "Entregado": {
    label: "Entregado",
    columnBar: "bg-emerald-400",
    chipBg: "color-mix(in srgb, var(--color-success) 14%, transparent)",
    chipText: "var(--color-success)",
  },
  "Cancelado": {
    label: "Cancelado",
    columnBar: "bg-red-400",
    chipBg: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
    chipText: "var(--color-danger)",
  },
  "Devuelto": {
    label: "Devuelto",
    columnBar: "bg-stone-400",
    chipBg: "color-mix(in srgb, var(--color-fg-muted) 14%, transparent)",
    chipText: "var(--color-fg-muted)",
  },
  "Perdido": {
    label: "Perdido",
    columnBar: "bg-red-500",
    chipBg: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
    chipText: "var(--color-danger)",
  },
};

export function formatGs(value) {
  if (value == null) return "Gs. 0";
  return `Gs. ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function formatFecha(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
