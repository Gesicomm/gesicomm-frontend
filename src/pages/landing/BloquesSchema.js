import {
  LayoutTemplate, Image as ImageIcon, FileText, AlignLeft,
  MessageCircle, Rocket, MessageSquareQuote, CheckSquare,
  HelpCircle, Link as LinkIcon, SplitSquareHorizontal, ShieldCheck, Grid
} from 'lucide-react';

const SIZE_OPTIONS = [
  { value: 'sm', label: 'Pequeo' },
  { value: 'md', label: 'Mediano' },
  { value: 'lg', label: 'Grande' }
];

export const CATEGORIAS_SECCION = [
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'confianza', label: 'Confianza' },
  { id: 'informacion', label: 'Informacin' },
  { id: 'conversion', label: 'Conversin' },
  { id: 'estructura', label: 'Estructurales' }
];

export const BLOQUES_SCHEMA = {
  // -------------------------
  // STORYTELLING
  // -------------------------
  image_text: {
    type: 'image_text',
    name: 'Imagen + Texto',
    icon: SplitSquareHorizontal,
    categoria: 'storytelling',
    schemaVersion: 1,
    migrations: {
      1: (data) => {
         // Example migration from v1 to v2: if we ever changed 'titulo' to 'heading'
         // data.contenido.heading = data.contenido.titulo;
         return data;
      }
    },
    templates: [
      { id: 'image_left', label: 'Imagen Izquierda' },
      { id: 'image_right', label: 'Imagen Derecha' },
      { id: 'image_large_left', label: 'Img Grande Izquierda' },
      { id: 'image_large_right', label: 'Img Grande Derecha' },
      { id: 'image_top', label: 'Imagen Arriba' },
      { id: 'overlay', label: 'Texto sobre imagen' },
      { id: 'split_50_50', label: 'Split 50/50' }
    ],
    contentSchema: [
      { key: 'imagen', type: 'image', label: 'Imagen principal' },
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'texto', type: 'textarea', label: 'Descripcin' },
      { key: 'boton_texto', type: 'text', label: 'Texto del botn' },
      { key: 'boton_link', type: 'text', label: 'Enlace del botn' }
    ],
    designSchema: []
  },
  
  // -------------------------
  // ECOMMERCE
  // -------------------------
  productos: {
    type: 'productos',
    name: 'Productos',
    icon: Grid,
    categoria: 'ecommerce',
    singleton: true,
    templates: [
      { id: 'grid_4', label: 'Grilla 4 columnas' },
      { id: 'grid_3', label: 'Grilla 3 columnas' },
      { id: 'carousel', label: 'Carrusel horizontal' },
      { id: 'featured', label: 'Producto destacado' },
      { id: 'banner_oferta', label: 'Banner de oferta (Fondo + Botn)' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo de la seccin' },
      { key: 'descuento', type: 'text', label: 'Descuento Aplicable (%)' },
      { key: 'boton_texto', type: 'text', label: 'Texto del botn (Banner)' },
      { key: 'imagen_fondo', type: 'image', label: 'Imagen de fondo (Banner)' }
    ]
  },
  categorias: {
    type: 'categorias',
    name: 'Categoras',
    icon: LayoutTemplate,
    categoria: 'ecommerce',
    templates: [
      { id: 'grid', label: 'Grilla estndar' },
      { id: 'carousel', label: 'Carrusel' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' }
    ]
  },
  destacados: {
    type: 'destacados',
    name: 'Coleccin Destacada',
    icon: LayoutTemplate,
    categoria: 'ecommerce',
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' }
    ]
  },

  // -------------------------
  // CONFIANZA
  // -------------------------
  before_after: {
    type: 'before_after',
    name: 'Antes y Despus',
    icon: SplitSquareHorizontal,
    categoria: 'confianza',
    templates: [
      { id: 'slider', label: 'Slider Interactivo' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'descripcion', type: 'textarea', label: 'Descripcin' }
    ]
  },
  testimonios: {
    type: 'testimonios',
    name: 'Testimonios',
    icon: MessageSquareQuote,
    categoria: 'confianza',
    templates: [
      { id: '3_cards', label: 'Grilla de 3 tarjetas' },
      { id: 'carousel', label: 'Carrusel' },
      { id: 'featured', label: 'Testimonio destacado' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo de seccin' }
    ]
  },
  logo_list: {
    type: 'logo_list',
    name: 'Marcas / Logos',
    icon: ShieldCheck,
    categoria: 'confianza',
    templates: [
      { id: 'static_grid', label: 'Fila esttica' },
      { id: 'horizontal_scroll', label: 'Desplazamiento contnuo' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo (ej: Visto en)' }
    ]
  },
  beneficios: {
    type: 'beneficios',
    name: 'Beneficios',
    icon: CheckSquare,
    categoria: 'confianza',
    templates: [
      { id: '4_columns', label: 'Grilla de 4 columnas' },
      { id: '3_columns', label: 'Grilla de 3 columnas' },
      { id: 'list', label: 'Lista vertical' }
    ],
    contentSchema: [] // Fixed rows managed by specific inspector for now
  },

  // -------------------------
  // INFORMACION
  // -------------------------
  rich_text: {
    type: 'rich_text',
    name: 'Texto Libre',
    icon: AlignLeft,
    categoria: 'informacion',
    templates: [
      { id: 'centered', label: 'Centrado (Editorial)' },
      { id: 'left_aligned', label: 'Alineado a la izquierda' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'texto', type: 'textarea', label: 'Contenido' },
      { key: 'tamano', type: 'select', label: 'Tamao del texto', options: SIZE_OPTIONS }
    ]
  },
  faq: {
    type: 'faq',
    name: 'Preguntas frecuentes',
    icon: HelpCircle,
    categoria: 'informacion',
    templates: [
      { id: 'accordion', label: 'Acorden clsico' },
      { id: 'grid', label: 'Grilla de preguntas' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'icono', type: 'select', label: 'cono de preguntas', options: [
        { value: 'none', label: 'Ninguno' },
        { value: 'check', label: 'Checkbox' },
        { value: 'chevron', label: 'Flecha' },
        { value: 'dot', label: 'Punto' }
      ]}
    ]
  },
  como_funciona: {
    type: 'como_funciona',
    name: 'Cmo funciona',
    icon: HelpCircle,
    categoria: 'informacion',
    templates: [
      { id: 'steps_horizontal', label: 'Pasos horizontales' },
      { id: 'steps_vertical', label: 'Pasos verticales' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' }
    ]
  },

  // -------------------------
  // CONVERSION
  // -------------------------
  cta: {
    type: 'cta',
    name: 'Llamado a la accin',
    icon: Rocket,
    categoria: 'conversion',
    templates: [
      { id: 'centered', label: 'Banner centrado' },
      { id: 'split', label: 'Dividido con botn a un lado' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'subtitulo', type: 'textarea', label: 'Subttulo' },
      { key: 'boton_texto', type: 'text', label: 'Texto del botn' },
      { key: 'boton_link', type: 'text', label: 'Link del botn' }
    ]
  },
  banner: {
    type: 'banner',
    name: 'Banner',
    icon: ImageIcon,
    categoria: 'conversion',
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo del banner' },
      { key: 'subtitulo', type: 'textarea', label: 'Subttulo' },
      { key: 'boton_texto', type: 'text', label: 'Texto del botn' },
      { key: 'boton_link', type: 'text', label: 'Link del botn' },
      { key: 'imagen', type: 'image', label: 'Imagen de fondo' },
      { key: 'altura', type: 'select', label: 'Altura del banner', options: SIZE_OPTIONS }
    ]
  },
  redes_sociales: {
    type: 'redes_sociales',
    name: 'Redes sociales',
    icon: LinkIcon,
    categoria: 'conversion',
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo' },
      { key: 'instagram', type: 'text', label: 'Usuario Instagram' },
      { key: 'facebook', type: 'text', label: 'Usuario Facebook' },
      { key: 'tiktok', type: 'text', label: 'Usuario TikTok' }
    ]
  },

  // -------------------------
  // ESTRUCTURA
  // -------------------------
  scrolling_text: {
    type: 'scrolling_text',
    name: 'Texto Deslizante',
    icon: AlignLeft,
    categoria: 'estructura',
    templates: [
      { id: 'marquee', label: 'Marquesina infinita' }
    ],
    contentSchema: [] // Managed by specific inspector
  },
  hero: {
    type: 'hero',
    name: 'Hero (Inicio)',
    icon: Rocket,
    categoria: 'estructura',
    singleton: true,
    templates: [
      { id: 'image_background', label: 'Imagen de fondo' },
      { id: 'split_image_text', label: 'Dividido (Izquierda texto, Derecha img)' },
      { id: 'minimal_center', label: 'Minimalista Centrado' },
      { id: 'carousel', label: 'Carrusel de imgenes' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo principal' },
      { key: 'descripcion', type: 'textarea', label: 'Descripcin' },
      { key: 'imagen_fondo', type: 'image', label: 'Imagen principal (1)' },
      { key: 'imagen_fondo_2', type: 'image', label: 'Imagen (2)' },
      { key: 'imagen_fondo_3', type: 'image', label: 'Imagen (3)' }
    ],
    designSchema: [
      { key: 'mostrar_estadisticas', type: 'boolean', label: 'Mostrar estadsticas (Productos, Categoras)' },
      { key: 'autoplay', type: 'boolean', label: 'Autoplay Carrusel' },
      { key: 'mostrar_boton_catalogo', type: 'boolean', label: 'Mostrar botn "Ver catlogo"' },
      { key: 'mostrar_boton_whatsapp', type: 'boolean', label: 'Mostrar botn "Escribinos" (WhatsApp)' }
    ]
  },
  header: {
    type: 'header',
    name: 'Encabezado',
    icon: LayoutTemplate,
    categoria: 'estructura',
    singleton: true,
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'logo_texto', type: 'text', label: 'Texto del logo (opcional)' }
    ]
  },
  product_detail: {
    type: 'product_detail',
    name: 'Detalle de Producto',
    icon: ImageIcon,
    categoria: 'estructura',
    singleton: true,
  },
  producto_galeria: {
    type: 'producto_galeria',
    name: 'Galería de producto',
    icon: ImageIcon,
    categoria: 'ecommerce',
  },
  announcement_bar: {
    type: 'announcement_bar',
    name: 'Barra superior',
    icon: MessageCircle,
    categoria: 'estructura',
    singleton: true,
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'texto', type: 'text', label: 'Mensaje' }
    ],
    designSchema: [
      { key: 'color_fondo', type: 'color', label: 'Color de fondo' },
      { key: 'color_texto', type: 'color', label: 'Color de texto' }
    ]
  },
  footer: {
    type: 'footer',
    name: 'Pie de pǭgina',
    icon: LayoutTemplate,
    categoria: 'estructura',
    singleton: true,
    templates: [
      { id: 'standard', label: 'Estndar' }
    ],
    contentSchema: [
      { key: 'titulo', type: 'text', label: 'Ttulo del pie' },
      { key: 'descripcion', type: 'textarea', label: 'Descripcin breve' }
    ]
  }
};

export const VALORES_DEFECTO_POR_TIPO = {
  producto_galeria: { activo: true, template: 'standard', config: {}, contenido: { imagenes: [] } },
  scrolling_text: { activo: true, template: 'marquee', config: { colorScheme: 'dark' }, contenido: {} },
  before_after: { activo: true, template: 'slider', config: { colorScheme: 'default' }, contenido: { titulo: 'Resultados reales' } },
  header: { activo: true, template: 'standard', config: { colorScheme: 'default' }, contenido: {} },
  announcement_bar: { activo: true, template: 'standard', config: {}, contenido: { texto: 'Bienvenidos a nuestra tienda!' } },
  hero: { activo: true, template: 'image_background', config: { colorScheme: 'dark', mostrar_estadisticas: false }, contenido: { titulo: 'Nueva Landing', descripcion: 'Descripcin de tu negocio' } },
  beneficios: { activo: true, template: '4_columns', config: { colorScheme: 'default' }, contenido: {} },
  categorias: { activo: true, template: 'grid', config: { colorScheme: 'default' }, contenido: {} },
  destacados: { activo: true, template: 'standard', config: { colorScheme: 'default' }, contenido: {} },
  productos: { activo: true, template: 'grid_4', config: { colorScheme: 'default' }, contenido: {} },
  banner: { activo: true, template: 'standard', config: { colorScheme: 'default' }, contenido: { titulo: 'Promocin especial', boton_texto: 'Ver mǭs', altura: 'md' } },
  rich_text: { activo: true, template: 'centered', config: { colorScheme: 'default' }, contenido: { titulo: 'Nosotros', texto: 'Contanos algo de tu negocio.', tamano: 'md' } },
  image_text: { activo: true, template: 'image_left', config: { colorScheme: 'default' }, contenido: { titulo: 'Ttulo', texto: 'Escrib ac...', boton_texto: '' } },
  como_funciona: { activo: true, template: 'steps_horizontal', config: { colorScheme: 'default' }, contenido: { titulo: 'Cmo comprar' } },
  faq: { activo: true, template: 'accordion', config: { colorScheme: 'default' }, contenido: { icono: 'none' } },
  testimonios: { activo: true, template: '3_cards', config: { colorScheme: 'default' }, contenido: {} },
  logo_list: { activo: true, template: 'static_grid', config: { colorScheme: 'default' }, contenido: { titulo: 'Visto en' } },
  cta: { activo: true, template: 'centered', config: { colorScheme: 'primary' }, contenido: { titulo: 'Ests listo?', boton_texto: 'Comprar ahora' } },
  redes_sociales: { activo: true, template: 'standard', config: { colorScheme: 'default' }, contenido: { titulo: 'Seguinos' } },
  footer: { activo: true, template: 'standard', config: { colorScheme: 'default' }, contenido: {} }
};
export const getSeccionesBase = () => ['header', 'hero', 'beneficios', 'categorias', 'destacados', 'banner', 'productos', 'testimonios', 'faq', 'footer'].map(tipo => ({ tipo, ...VALORES_DEFECTO_POR_TIPO[tipo] }));

// Plantillas por defecto de las páginas fijas nuevas (ver Landing.tipo_pagina)
// — mismo patrón que getSeccionesBase(), listas más cortas porque cada
// página tiene un propósito distinto (no repiten hero/beneficios/etc.).
export const getSeccionesCatalogo = () => ['header', 'productos', 'footer'].map(tipo => ({ tipo, ...VALORES_DEFECTO_POR_TIPO[tipo] }));

export const getSeccionesContacto = () => {
  const base = ['header', 'hero', 'rich_text', 'footer'].map(tipo => ({ tipo, ...VALORES_DEFECTO_POR_TIPO[tipo] }));
  const hero = base.find(s => s.tipo === 'hero');
  if (hero) hero.contenido = { ...hero.contenido, titulo: 'Hablemos', descripcion: 'Escribinos y te respondemos a la brevedad.' };
  const texto = base.find(s => s.tipo === 'rich_text');
  if (texto) texto.contenido = { ...texto.contenido, titulo: 'Contacto', texto: 'Contanos qué necesitás — completá el formulario o escribinos por WhatsApp.' };
  return base;
};
