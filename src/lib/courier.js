// Tipos eliminados, convertido a JavaScript puro

export const STATUS_ORDER = [
  "Pendiente",
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
    chipBg: "bg-amber-400/20",
    chipText: "text-amber-700",
  },
  "En camino": {
    label: "En camino",
    columnBar: "bg-blue-400",
    chipBg: "bg-blue-400/20",
    chipText: "text-blue-700",
  },
  "Entregado": {
    label: "Entregado",
    columnBar: "bg-emerald-400",
    chipBg: "bg-emerald-400/20",
    chipText: "text-emerald-700",
  },
  "Reagendado": {
    label: "Reagendado",
    columnBar: "bg-orange-400",
    chipBg: "bg-orange-400/20",
    chipText: "text-orange-700",
  },
  "Devuelto": {
    label: "Devuelto",
    columnBar: "bg-indigo-400",
    chipBg: "bg-indigo-400/20",
    chipText: "text-indigo-700",
  },
  "Perdido": {
    label: "Perdido",
    columnBar: "bg-red-500",
    chipBg: "bg-red-500/20",
    chipText: "text-red-700",
  },
  "Cancelado": {
    label: "Cancelado",
    columnBar: "bg-red-400",
    chipBg: "bg-red-400/20",
    chipText: "text-red-700",
  },
  "Rendido": {
    label: "Rendido",
    columnBar: "bg-purple-400",
    chipBg: "bg-purple-400/20",
    chipText: "text-purple-700",
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
