import {
  LayoutTemplate, Image as ImageIcon, FileText, AlignLeft,
  MessageCircle, Rocket, MessageSquareQuote, CheckSquare,
  HelpCircle, Link as LinkIcon
} from 'lucide-react';


const SIZE_OPTIONS = [
  { value: 'sm', label: 'Pequeño' },
  { value: 'md', label: 'Mediano' },
  { value: 'lg', label: 'Grande' }
];

// Agrupan el selector "Agregar sección" — mismo orden en que se muestran los grupos.
export const CATEGORIAS_SECCION = [
  { id: 'estructura', label: 'Estructura' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'prueba_social', label: 'Prueba social' },
  { id: 'conversion', label: 'Conversión' },
];

export const BLOQUES_SCHEMA = {
  header: {
    type: 'header',
    name: 'Encabezado',
    icon: LayoutTemplate,
    categoria: 'estructura',
    singleton: true,
    settingsSchema: [
      { key: 'logo_texto', type: 'text', label: 'Texto del logo (opcional)' }
    ]
  },
  announcement_bar: {
    type: 'announcement_bar',
    name: 'Barra superior',
    icon: MessageCircle,
    categoria: 'estructura',
    singleton: true,
    settingsSchema: [
      { key: 'texto', type: 'text', label: 'Mensaje' },
      { key: 'color_fondo', type: 'color', label: 'Color de fondo' },
      { key: 'color_texto', type: 'color', label: 'Color de texto' }
    ]
  },
  hero: {
    type: 'hero',
    name: 'Inicio (Hero)',
    icon: Rocket,
    categoria: 'estructura',
    singleton: true,
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título principal' },
      { key: 'descripcion', type: 'textarea', label: 'Descripción' },
      { key: 'tamano', type: 'select', label: 'Tamaño del texto', options: SIZE_OPTIONS }
    ]
  },
  beneficios: {
    type: 'beneficios',
    name: 'Beneficios',
    icon: CheckSquare,
    categoria: 'contenido',
    settingsSchema: [] // Beneficios fijos por ahora, pero escalable a configurables
  },
  categorias: {
    type: 'categorias',
    name: 'Categorías',
    icon: LayoutTemplate,
    categoria: 'contenido',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título de sección' }
    ]
  },
  destacados: {
    type: 'destacados',
    name: 'Destacados',
    icon: LayoutTemplate,
    categoria: 'contenido',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título' }
    ]
  },
  productos: {
    type: 'productos',
    name: 'Catálogo de productos',
    icon: LayoutTemplate,
    categoria: 'estructura',
    singleton: true,
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título de la grilla' }
    ]
  },
  banner: {
    type: 'banner',
    name: 'Banner',
    icon: ImageIcon,
    categoria: 'conversion',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título del banner' },
      { key: 'subtitulo', type: 'textarea', label: 'Subtítulo' },
      { key: 'boton_texto', type: 'text', label: 'Texto del botón' },
      { key: 'boton_link', type: 'text', label: 'Link del botón (URL completa o /)' },
      { key: 'imagen', type: 'image', label: 'Imagen de fondo' },
      { key: 'altura', type: 'select', label: 'Altura del banner', options: SIZE_OPTIONS }
    ]
  },
  texto: {
    type: 'texto',
    name: 'Texto libre',
    icon: AlignLeft,
    categoria: 'contenido',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título' },
      { key: 'texto', type: 'textarea', label: 'Contenido' },
      { key: 'tamano', type: 'select', label: 'Tamaño del texto', options: SIZE_OPTIONS }
    ]
  },
  como_funciona: {
    type: 'como_funciona',
    name: 'Cómo funciona',
    icon: HelpCircle,
    categoria: 'contenido',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título' }
      // Podría expandirse a array de pasos
    ]
  },
  faq: {
    type: 'faq',
    name: 'Preguntas frecuentes',
    icon: HelpCircle,
    categoria: 'prueba_social',
    settingsSchema: [] // Se maneja con el componente de FAQ existente por ahora
  },
  testimonios: {
    type: 'testimonios',
    name: 'Testimonios',
    icon: MessageSquareQuote,
    categoria: 'prueba_social',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título de sección' }
    ]
  },
  redes_sociales: {
    type: 'redes_sociales',
    name: 'Redes sociales',
    icon: LinkIcon,
    categoria: 'conversion',
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título' },
      { key: 'instagram', type: 'text', label: 'Usuario Instagram' },
      { key: 'facebook', type: 'text', label: 'Usuario Facebook' },
      { key: 'tiktok', type: 'text', label: 'Usuario TikTok' }
    ]
  },
  footer: {
    type: 'footer',
    name: 'Pie de página',
    icon: LayoutTemplate,
    categoria: 'estructura',
    singleton: true,
    settingsSchema: [
      { key: 'titulo', type: 'text', label: 'Título del pie' },
      { key: 'descripcion', type: 'textarea', label: 'Descripción breve' }
    ]
  }
};

export const VALORES_DEFECTO_POR_TIPO = {
  header: { activo: true },
  announcement_bar: { activo: true, contenido: { texto: '¡Bienvenidos a nuestra tienda!' } },
  hero: { activo: true, contenido: { titulo: 'Nueva Landing', descripcion: 'Descripción de tu negocio', tamano: 'md' } },
  beneficios: { activo: true },
  categorias: { activo: true },
  destacados: { activo: true },
  productos: { activo: true },
  banner: { activo: true, contenido: { titulo: 'Promoción especial', boton_texto: 'Ver más', altura: 'md' } },
  texto: { activo: true, contenido: { titulo: 'Nosotros', texto: 'Contanos algo de tu negocio.', tamano: 'md' } },
  como_funciona: { activo: true, contenido: { titulo: 'Cómo comprar' } },
  faq: { activo: true },
  testimonios: { activo: true },
  redes_sociales: { activo: true, contenido: { titulo: 'Seguinos' } },
  footer: { activo: true }
};
