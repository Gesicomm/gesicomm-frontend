// Atajos de URL compartidos por TODO el armador de landing — cualquier
// campo de link (footer, banner, CTA, imagen+texto, menú del header, etc)
// usa esto mismo, vía renderInput({type:'url'}) en SchemaInspector.jsx, así
// no hay que repetir la lista ni arriesgarse a que un lugar linkee a un id
// que no existe y otro a uno viejo.
//
// Los valores de ancla tienen que coincidir EXACTO con el id="lp-..." real
// de cada sección pública, si no el link no lleva a ningún lado:
//   #lp-productos  -> LandingProductos.jsx
//   #lp-destacados -> LandingFeatured.jsx
//   #lp-categorias -> LandingCategoryStrip.jsx
//   #lp-opiniones  -> LandingTestimonials.jsx
//   #lp-faq        -> LandingFaq.jsx
// (Contacto queda afuera a propósito: el header linkea a #lp-contacto pero
// hoy ninguna sección pública define ese id — es un link roto preexistente,
// no algo para copiar acá.)
export const ANCLAS_SECCION = [
  { value: '#lp-productos', label: 'Catálogo / Productos' },
  { value: '#lp-destacados', label: 'Destacados' },
  { value: '#lp-categorias', label: 'Categorías' },
  { value: '#lp-opiniones', label: 'Opiniones' },
  { value: '#lp-faq', label: 'Preguntas frecuentes' },
];

const RUTAS_FIJAS_POR_TIPO = {
  catalogo: 'catalogo',
  contacto: 'contacto',
  politica_privacidad: 'politica-privacidad',
  politica_reembolso: 'politica-reembolso',
  terminos_servicio: 'terminos-servicio',
  politica_envio: 'politica-envio',
  aviso_legal: 'aviso-legal',
};

// `paginas` es lo que devuelve GET /mis-landings/paginas (id, tipo_pagina,
// slug, titulo/nombre) — mismo array que ya usa LandingEditor.jsx para los
// tabs Inicio/Catálogo/Contacto, y que InspectorSeccion.jsx ya reenvía a
// cada inspector de sección.
export function atajosDePaginas(paginas) {
  return (paginas || [])
    .filter(p => p.slug)
    .map(p => {
      const fija = RUTAS_FIJAS_POR_TIPO[p.tipo_pagina];
      return {
        value: fija ? `/${fija}` : `/l/${p.slug}`,
        label: p.titulo || p.nombre || p.tipo_pagina,
      };
    });
}
