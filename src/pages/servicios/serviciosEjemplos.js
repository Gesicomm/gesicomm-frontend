// Perfiles de muestra para visualizar el directorio antes de la primera aprobación.
// Las ilustraciones son locales y no representan a personas ni proveedores reales.
function retrato({ fondo, luz, piel, pelo, ropa, detalle }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" role="img">
    <defs><linearGradient id="f" x2="1" y2="1"><stop stop-color="${fondo}"/><stop offset="1" stop-color="${luz}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#08251b" flood-opacity=".18"/></filter></defs>
    <rect width="720" height="520" fill="url(#f)"/><circle cx="615" cy="70" r="144" fill="#fff" opacity=".15"/><circle cx="100" cy="448" r="200" fill="#fff" opacity=".13"/>
    <path d="M84 520c25-126 115-194 276-194s251 68 276 194" fill="${ropa}" filter="url(#s)"/>
    <path d="M297 316h126v112c-33 35-94 35-126 0z" fill="${piel}"/>
    <ellipse cx="360" cy="205" rx="111" ry="135" fill="${pelo}"/>
    <ellipse cx="360" cy="224" rx="88" ry="111" fill="${piel}"/>
    <path d="M274 185c18-103 142-150 205-36-23-15-47-47-60-68-28 59-88 84-145 104z" fill="${pelo}"/>
    <path d="M324 235h14m44 0h14" stroke="#382b29" stroke-width="6" stroke-linecap="round"/><path d="M343 280q17 12 34 0" fill="none" stroke="#8b5149" stroke-width="5" stroke-linecap="round"/>
    <path d="M234 385q58-54 91-44l35 58 35-58q49-8 91 44" fill="${detalle}" opacity=".65"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SERVICIOS_EJEMPLO = [
  { id: 'ejemplo-video', ejemplo: true, nombre: 'Ana · perfil de ejemplo', categoria: 'editor_videos', especialidad: 'Editor de videos', oferta: 'Videos que cuentan tu historia', descripcion: 'Edición de Reels, videos de producto y piezas para redes. Una propuesta visual pensada para que tu marca se destaque.', foto_url: retrato({ fondo: '#96d7bf', luz: '#d9f5de', piel: '#d3a17b', pelo: '#25332d', ropa: '#173d35', detalle: '#69b69a' }) },
  { id: 'ejemplo-envios', ejemplo: true, nombre: 'Mateo · perfil de ejemplo', categoria: 'envios', especialidad: 'Envíos y logística', oferta: 'Entregas simples, clientes felices', descripcion: 'Coordinación de envíos para tiendas en Asunción y alrededores, con seguimiento claro desde la salida hasta la entrega.', foto_url: retrato({ fondo: '#b4d5d3', luz: '#e0f5e8', piel: '#ad795e', pelo: '#211e22', ropa: '#224f58', detalle: '#79b1ad' }) },
  { id: 'ejemplo-publicidad', ejemplo: true, nombre: 'Luz · perfil de ejemplo', categoria: 'media_buyer', especialidad: 'Publicidad', oferta: 'Campañas para crecer con foco', descripcion: 'Planificación y optimización de anuncios para llegar a las personas adecuadas y convertir interés en oportunidades.', foto_url: retrato({ fondo: '#b4d3b5', luz: '#e7f4cc', piel: '#be8c6e', pelo: '#45302a', ropa: '#324a33', detalle: '#a5ca86' }) },
];
