// Tipos eliminados, convertido a JavaScript puro

export const STATUS_ORDER = [
  "Pendiente",
  "Confirmado",
  "En camino",
  "Entregado",
  "Reagendado",
  "Devuelto",
  "Perdido",
  "Cancelado",
  "Rendido"
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
    columnBar: "bg-cyan-400",
    chipBg: "rgba(34, 211, 238, 0.15)",
    chipText: "#22d3ee",
  },
  "En camino": {
    label: "En camino",
    columnBar: "bg-blue-400",
    chipBg: "rgba(96, 165, 250, 0.15)",
    chipText: "#60a5fa",
  },
  "Entregado": {
    label: "Entregado",
    columnBar: "bg-emerald-400",
    chipBg: "rgba(52, 211, 153, 0.15)",
    chipText: "#34d399",
  },
  "Reagendado": {
    label: "Reagendado",
    columnBar: "bg-orange-400",
    chipBg: "rgba(251, 146, 60, 0.15)",
    chipText: "#fb923c",
  },
  "Devuelto": {
    label: "Devuelto",
    columnBar: "bg-indigo-400",
    chipBg: "rgba(129, 140, 248, 0.15)",
    chipText: "#818cf8",
  },
  "Perdido": {
    label: "Perdido",
    columnBar: "bg-red-500",
    chipBg: "rgba(248, 113, 113, 0.15)",
    chipText: "#f87171",
  },
  "Cancelado": {
    label: "Cancelado",
    columnBar: "bg-red-400",
    chipBg: "rgba(248, 113, 113, 0.15)",
    chipText: "#f87171",
  },
  "Rendido": {
    label: "Rendido",
    columnBar: "bg-purple-400",
    chipBg: "rgba(196, 181, 253, 0.15)",
    chipText: "#c4b5fd",
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
