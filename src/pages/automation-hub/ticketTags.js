// Clasificación low/mid/high ticket de un lead — vive como un tag más
// (no es columna nueva del tablero). Mismos valores que usa el backend
// (ver gesicomm-automation-hub/src/utils/ticketTags.js) para que el tag que
// pone ManyChat (a partir de HG/MD/LT) y el que elige un vendedor a mano
// coincidan.
export const TICKET_OPTIONS = [
  { value: 'high-ticket', label: 'High ticket' },
  { value: 'mid-ticket', label: 'Mid ticket' },
  { value: 'low-ticket', label: 'Low ticket' },
];

const TICKET_VALUES = TICKET_OPTIONS.map((o) => o.value);

export function obtenerTicketTag(tags) {
  return (tags || []).find((t) => TICKET_VALUES.includes(t)) || '';
}

export function reemplazarTicketTag(tags, nuevoTicketTag) {
  const sinTicket = (tags || []).filter((t) => !TICKET_VALUES.includes(t));
  return nuevoTicketTag ? [...sinTicket, nuevoTicketTag] : sinTicket;
}

export function etiquetaTicket(ticketTag) {
  return TICKET_OPTIONS.find((o) => o.value === ticketTag)?.label || '';
}
