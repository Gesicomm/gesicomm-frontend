// Tipos eliminados, convertido a JavaScript puro

// Catálogo autoritativo de estado operativo — ver plan Gestión de Pedidos,
// sección 3 y envioController.ESTADOS_OPERATIVOS (backend). "Rendido"/
// "En camino"/"En Tránsito"/"Reagendado" ya no son valores válidos: el
// primero pasó a ser Envio.estado_financiero (independiente del estado
// operativo), y los otros dos se renombraron a Despachado/Reprogramado.
export const STATUS_ORDER = [
  "Pendiente",
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
  "Pendiente": {
    label: "Pendiente",
    columnBar: "bg-amber-400",
    chipBg: "rgba(251, 191, 36, 0.15)",
    chipText: "#fbbf24",
  },
  "Confirmado": {
    label: "Confirmado",
    columnBar: "bg-teal-400",
    chipBg: "rgba(45, 212, 191, 0.15)",
    chipText: "#2dd4bf",
  },
  "Preparado": {
    label: "Preparado",
    columnBar: "bg-[#3d5fa3]",
    chipBg: "rgba(61, 95, 163, 0.15)",
    chipText: "#3d5fa3",
  },
  "Despachado": {
    label: "Despachado",
    columnBar: "bg-blue-400",
    chipBg: "rgba(96, 165, 250, 0.15)",
    chipText: "#60a5fa",
  },
  "Reprogramado": {
    label: "Reprogramado",
    columnBar: "bg-orange-400",
    chipBg: "rgba(251, 146, 60, 0.15)",
    chipText: "#fb923c",
  },
  "Entregado": {
    label: "Entregado",
    columnBar: "bg-emerald-400",
    chipBg: "rgba(52, 211, 153, 0.15)",
    chipText: "#34d399",
  },
  "Cancelado": {
    label: "Cancelado",
    columnBar: "bg-red-400",
    chipBg: "rgba(248, 113, 113, 0.15)",
    chipText: "#f87171",
  },
  "Devuelto": {
    label: "Devuelto",
    columnBar: "bg-[#a8917a]",
    chipBg: "rgba(168, 145, 122, 0.15)",
    chipText: "#a8917a",
  },
  "Perdido": {
    label: "Perdido",
    columnBar: "bg-red-500",
    chipBg: "rgba(248, 113, 113, 0.15)",
    chipText: "#f87171",
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
