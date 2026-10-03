import { getMediaUrl } from '../../services/api';

/**
 * Forma canónica que consume VentaDirectaTemplate.jsx. Un único shape para
 * que la página pública legacy renderice VentaDirectaTemplate.jsx con una
 * forma estable. Mismo criterio que mapLandingToTemplateData.js del módulo
 * de landing.
 *
 * @typedef {object} FunnelTemplateData
 * @property {string} nombreComercio
 * @property {string|null} logo
 * @property {{fondo:string|null, texto:string|null, acento:string|null}} tema
 * @property {object|null} producto — nombre, imagenes[], precio, precio_antes, descuento_pct, stock, variantes[], descripcion_larga, oferta_termina
 * @property {object} contenido — propuesta_valor, cta_primario, confianza[], etc.
 * @property {Array<{titulo:string, texto:string}>} beneficios
 * @property {Array<{nombre:string, calificacion:number, comentario:string}>} opiniones
 * @property {Array<{pregunta:string, respuesta:string}>} faq
 */

/**
 * PÚBLICO — desde el DTO de obtenerLandingPublica(). El backend ya
 * resolvió precio efectivo, variantes, stock e imágenes (ver
 * landing.service.js#obtenerPublica, que sintetiza el item legacy a partir
 * de Landing.producto_id), así que acá solo se reacomoda la forma.
 */
export function mapPublicDtoToFunnelData(dto) {
  // `items` solo viaja cuando difiere de catalogo_items (plantillas rígidas).
  // En un embudo son el mismo array de un solo elemento —su producto—, así que
  // resolver acá no cambia qué se vende. Ver landing.service.js#obtenerPublica.
  const item = (dto?.items ?? dto?.catalogo_items)?.[0] || null;

  return {
    slug: dto?.slug,
    nombreComercio: dto?.tienda?.nombre || dto?.titulo || 'Mi tienda',
    logo: dto?.logo_imagen ? getMediaUrl(dto.logo_imagen) : null,
    tema: {
      fondo: dto?.tema?.fondo || null,
      texto: dto?.tema?.texto || null,
      acento: dto?.tema?.primario || null,
    },
    templateSlug: dto?.template?.slug,
    producto: item ? {
      id: item.id,
      content_id: item.content_id,
      nombre: item.nombre,
      descripcion_larga: item.descripcion_larga || item.descripcion || '',
      imagenes: (item.imagenes || []).map(u => getMediaUrl(u)),
      precio: item.precio,
      precio_antes: item.precio_antes,
      descuento_pct: item.descuento_pct,
      oferta_termina: item.oferta_termina || null,
      stock: item.stock,
      variantes: (item.variantes || []).map(v => ({
        ...v,
        imagenes: (v.imagenes || []).map(u => getMediaUrl(u)),
      })),
      // Campos de marketing del producto (herencia para el embudo)
      propuesta_valor: item.propuesta_valor || null,
      beneficios: item.beneficios || [],
      confianza: item.confianza || [],
      preguntas_frecuentes: item.preguntas_frecuentes || [],
      sobre_este_producto: item.sobre_este_producto || null,
    } : null,
    contenido: dto?.content || {},
    beneficios: (dto?.beneficios || []).map(b => ({ titulo: b.titulo, texto: b.texto })),
    opiniones: (dto?.testimonios || []).map(t => ({
      nombre: t.nombre, calificacion: t.calificacion, comentario: t.comentario,
    })),
    faq: (dto?.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })),
    contacto: dto?.contacto || {},
  };
}
