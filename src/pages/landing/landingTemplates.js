import {
  Layers, Shirt, Cpu, UtensilsCrossed, Sofa, Sparkles, Briefcase,
} from 'lucide-react';

/**
 * Plantillas por rubro para "Empezar una landing nueva" — cada una define
 * secciones + contenido de ejemplo + tema visual (colores/tipografía/
 * esquinas) usando SOLO tipos de sección y campos de tema que ya existen
 * en BLOQUES_SCHEMA/landingDiseno.js. No requieren ninguna migración.
 *
 * `testimonios`/`faqs`/`mostrarTestimonios`/`mostrarFaq` se aplican además
 * de `secciones` porque LandingPreview.jsx todavía renderiza esos dos
 * bloques desde el estado plano de LandingEditor (no desde
 * seccion.contenido.items) — ver LandingEditor.jsx handleElegirPlantilla.
 */

const HEADER = { tipo: 'header', nombre_interno: 'Header', activo: true, fijo: true };
const FOOTER_BASE = { tipo: 'footer', nombre_interno: 'Footer', activo: true, fijo: true };

export const LANDING_TEMPLATES = [
  {
    id: 'en_blanco',
    nombre: 'En blanco',
    rubro: 'General',
    descripcion: 'Arrancá desde cero, sin estilo ni contenido predefinido.',
    icono: Layers,
    colorSwatch: '#64748b',
    tema: {},
    secciones: [
      HEADER,
      { tipo: 'announcement_bar', nombre_interno: 'Barra superior', activo: false, contenido: { texto: '¡Recibilo en 24hs!' } },
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Nueva landing', descripcion: 'Contale a tus clientes qué vendés.' } },
      { tipo: 'beneficios', nombre_interno: 'Beneficios', activo: true },
      { tipo: 'categorias', nombre_interno: 'Categorías', activo: true },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
  },
  {
    id: 'moda',
    nombre: 'Moda y accesorios',
    rubro: 'Moda',
    descripcion: 'Vidriera cálida con look editorial: categorías, destacados y una sección de talles y cambios.',
    icono: Shirt,
    colorSwatch: '#a8324a',
    tema: { tema_modo: 'claro', color_primario: '#a8324a', fuente: 'poppins', radio_bordes: 'grande' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Tu estilo, a tu manera', descripcion: 'Nueva colección disponible — envíos a todo el país.' } },
      { tipo: 'categorias', nombre_interno: 'Categorías', activo: true, contenido: { titulo: 'Comprá por categoría' } },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true, contenido: { titulo: 'Lo más elegido' } },
      { tipo: 'banner', nombre_interno: 'Banner de temporada', activo: true, contenido: { titulo: 'Nueva temporada', subtitulo: 'Descubrí las últimas prendas antes que nadie', boton_texto: 'Ver colección', altura: 'md' } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true, contenido: { titulo: 'Todos los productos' } },
      { tipo: 'como_funciona', nombre_interno: 'Talles y cambios', activo: true, contenido: { titulo: 'Talles y cambios', pasos: ['Consultá la guía de talles de cada producto', 'Si no es tu talle, coordinamos el cambio sin costo', 'Probátelo tranquilo en tu casa'] } },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
    testimonios: [
      { nombre: 'Valentina R.', foto: null, calificacion: 5, comentario: 'La calidad de la ropa superó lo que esperaba, y llegó rapidísimo.' },
      { nombre: 'Camila G.', foto: null, calificacion: 5, comentario: 'Me encantó poder cambiar el talle sin drama. Vuelvo a comprar seguro.' },
    ],
    faqs: [
      { pregunta: '¿Puedo cambiar el talle si no me queda?', respuesta: 'Sí, tenés 7 días desde que lo recibís para coordinar el cambio sin costo.' },
      { pregunta: '¿Hacen envíos a todo el país?', respuesta: 'Sí, enviamos a todo Paraguay. El tiempo de entrega depende de tu zona.' },
    ],
  },
  {
    id: 'tecnologia',
    nombre: 'Electrónica y tecnología',
    rubro: 'Tecnología',
    descripcion: 'Estilo oscuro y directo, con garantía y soporte técnico bien visibles.',
    icono: Cpu,
    colorSwatch: '#2563eb',
    tema: { tema_modo: 'oscuro', color_primario: '#2563eb', fuente: 'inter', radio_bordes: 'chico' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Lo último en tecnología, a un clic', descripcion: 'Equipos originales, con garantía y soporte real.' } },
      { tipo: 'beneficios', nombre_interno: 'Beneficios', activo: true },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true, contenido: { titulo: 'Más vendidos' } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true, contenido: { titulo: 'Catálogo completo' } },
      { tipo: 'como_funciona', nombre_interno: 'Garantía y soporte', activo: true, contenido: { titulo: 'Garantía y soporte', pasos: ['Todos los equipos tienen garantía oficial', 'Soporte técnico por WhatsApp ante cualquier duda', 'Cambios sin costo si llega con un defecto de fábrica'] } },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
    faqs: [
      { pregunta: '¿Los equipos tienen garantía?', respuesta: 'Sí, todos los productos incluyen garantía oficial del fabricante o de la tienda.' },
      { pregunta: '¿Qué hago si el producto llega con un problema?', respuesta: 'Nos escribís por WhatsApp y coordinamos el cambio o la reparación sin costo.' },
    ],
  },
  {
    id: 'gastronomia',
    nombre: 'Comida y gastronomía',
    rubro: 'Gastronomía',
    descripcion: 'Pensada para pedidos: menú por categorías y pasos claros de pedido → pago → entrega.',
    icono: UtensilsCrossed,
    colorSwatch: '#e85d04',
    tema: { tema_modo: 'claro', color_primario: '#e85d04', fuente: 'poppins', radio_bordes: 'grande' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Pedí y recibí en tu casa', descripcion: 'Hecho al momento, con delivery propio en tu zona.' } },
      { tipo: 'categorias', nombre_interno: 'Menú', activo: true, contenido: { titulo: 'Nuestro menú' } },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true, contenido: { titulo: 'Los favoritos de siempre' } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true, contenido: { titulo: 'Todo el menú' } },
      { tipo: 'como_funciona', nombre_interno: 'Cómo pedir', activo: true, contenido: { titulo: 'Cómo pedir', pasos: ['Elegí tus platos del menú', 'Confirmá el pedido por WhatsApp', 'Lo recibís calentito en la puerta de tu casa'] } },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
    testimonios: [
      { nombre: 'Diego M.', foto: null, calificacion: 5, comentario: 'Pedimos seguido, siempre llega rápido y calentito.' },
    ],
    faqs: [
      { pregunta: '¿Cuál es el horario de pedidos?', respuesta: 'Tomamos pedidos todos los días de 11 a 22 hs.' },
      { pregunta: '¿A qué zonas hacen delivery?', respuesta: 'Cubrimos toda la ciudad y alrededores — consultanos tu zona por WhatsApp.' },
    ],
  },
  {
    id: 'hogar',
    nombre: 'Hogar y decoración',
    rubro: 'Hogar',
    descripcion: 'Tonos neutros y cálidos para mostrar ambientes, con banner de inspiración.',
    icono: Sofa,
    colorSwatch: '#8a6d4b',
    tema: { tema_modo: 'claro', color_primario: '#8a6d4b', fuente: 'outfit', radio_bordes: 'grande' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Espacios con identidad propia', descripcion: 'Muebles y objetos de decoración para cada rincón de tu casa.' } },
      { tipo: 'categorias', nombre_interno: 'Categorías', activo: true, contenido: { titulo: 'Explorá por ambiente' } },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true },
      { tipo: 'banner', nombre_interno: 'Banner', activo: true, contenido: { titulo: 'Renová tu living', subtitulo: 'Descuentos en la nueva colección de temporada', boton_texto: 'Ver más', altura: 'md' } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
    faqs: [
      { pregunta: '¿Hacen envíos de muebles grandes?', respuesta: 'Sí, coordinamos el envío según el tamaño y tu ubicación.' },
    ],
  },
  {
    id: 'belleza',
    nombre: 'Belleza y cosmética',
    rubro: 'Belleza',
    descripcion: 'Paleta suave y moderna, con foco en beneficios del producto y opiniones reales.',
    icono: Sparkles,
    colorSwatch: '#d6336c',
    tema: { tema_modo: 'claro', color_primario: '#d6336c', fuente: 'poppins', radio_bordes: 'grande' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'Cuidate como te merecés', descripcion: 'Productos originales para tu rutina de belleza.' } },
      { tipo: 'beneficios', nombre_interno: 'Beneficios', activo: true },
      { tipo: 'destacados', nombre_interno: 'Destacados', activo: true, contenido: { titulo: 'Los más pedidos' } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true },
      { tipo: 'como_funciona', nombre_interno: 'Cómo comprar', activo: true, contenido: { titulo: 'Cómo comprar', pasos: ['Elegí tus productos favoritos', 'Coordinamos el pago por WhatsApp', 'Lo recibís en la puerta de tu casa'] } },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      FOOTER_BASE,
    ],
    testimonios: [
      { nombre: 'Ana L.', foto: null, calificacion: 5, comentario: 'Productos 100% originales, tal cual se ven en las fotos.' },
    ],
  },
  {
    id: 'servicios',
    nombre: 'Servicios',
    rubro: 'Servicios',
    descripcion: 'Sin grilla de catálogo — pensada para vender un servicio, no productos físicos.',
    icono: Briefcase,
    colorSwatch: '#0ea5e9',
    tema: { tema_modo: 'oscuro', color_primario: '#0ea5e9', fuente: 'inter', radio_bordes: 'mediano' },
    secciones: [
      HEADER,
      { tipo: 'hero', nombre_interno: 'Inicio', activo: true, fijo: true, contenido: { titulo: 'El servicio que estabas buscando', descripcion: 'Contale a tus clientes qué resolvés y por qué elegirte a vos.' } },
      { tipo: 'beneficios', nombre_interno: 'Beneficios', activo: true },
      { tipo: 'como_funciona', nombre_interno: 'Cómo funciona', activo: true, contenido: { titulo: 'Cómo trabajamos', pasos: ['Nos contás qué necesitás', 'Te enviamos una propuesta a medida', 'Coordinamos y lo resolvemos'] } },
      { tipo: 'productos', nombre_interno: 'Productos', activo: true, fijo: true, contenido: { titulo: 'Nuestros servicios' } },
      { tipo: 'testimonios', nombre_interno: 'Opiniones', activo: true },
      { tipo: 'faq', nombre_interno: 'Preguntas frecuentes', activo: true },
      { tipo: 'banner', nombre_interno: 'Banner de contacto', activo: true, contenido: { titulo: '¿Tenés una consulta?', subtitulo: 'Escribinos y te respondemos a la brevedad', boton_texto: 'Contactar', altura: 'sm' } },
      FOOTER_BASE,
    ],
    faqs: [
      { pregunta: '¿Cómo coordino una consulta?', respuesta: 'Escribinos por WhatsApp y coordinamos según tu disponibilidad.' },
    ],
  },
];
