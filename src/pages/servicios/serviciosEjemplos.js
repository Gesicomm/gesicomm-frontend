// Material de muestra usado exclusivamente en la vista previa privada del proveedor.
function portfolioMuestra({ fondo, acento, titulo, numero }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 600">
    <rect width="840" height="600" fill="${fondo}"/><circle cx="697" cy="105" r="215" fill="${acento}" opacity=".23"/>
    <rect x="90" y="64" width="660" height="472" rx="34" fill="#fff" opacity=".94"/>
    <rect x="124" y="102" width="592" height="306" rx="21" fill="${acento}"/>
    <circle cx="420" cy="255" r="61" fill="#fff" opacity=".9"/><path d="M405 222v67l53-34z" fill="${acento}"/>
    <text x="126" y="456" fill="#12392c" font-family="Arial,sans-serif" font-size="31" font-weight="700">${titulo}</text>
    <text x="126" y="501" fill="#4d6c5c" font-family="Arial,sans-serif" font-size="18">Portafolio de ejemplo · ${numero}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PORTAFOLIO_EJEMPLO = [
  { storage_key: 'ejemplo-video-01', url: portfolioMuestra({ fondo: '#bce8ce', acento: '#235342', titulo: 'Video de producto', numero: '01' }), alt: 'Ilustración de un video de producto de ejemplo' },
  { storage_key: 'ejemplo-video-02', url: portfolioMuestra({ fondo: '#d4e8db', acento: '#56977b', titulo: 'Campaña en redes', numero: '02' }), alt: 'Ilustración de una campaña en redes de ejemplo' },
];
