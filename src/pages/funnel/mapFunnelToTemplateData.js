import { getMediaUrl } from '../../services/api';

/**
 * Forma canónica que consume VentaDirectaTemplate.jsx. Un único shape para
 * que el preview del editor y la página pública rendericen exactamente el
 * mismo componente con exactamente los mismos datos — nunca pueden
 * divergir. Mismo criterio que mapLandingToTemplateData.js del módulo de
 * landing.
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

/** El tema del embudo: lo que eligió el comercio, o null para que el template use su default. */
function temaDe(fuente) {
  return {
    fondo: fuente?.color_fondo || null,
    texto: fuente?.color_texto || null,
    acento: fuente?.color_primario || null,
  };
}

/**
 * EDITOR — desde funnelService.obtener() + el detalle del producto
 * (productService.detalle/imagenes/variantes). El producto no vive en el
 * embudo: se lee de la ficha del producto, que es la única fuente de
 * verdad de fotos, precio y stock.
 */
export function mapEditorDraftToFunnelData(draft, producto, imagenes, variantes, tienda) {
  const precioBase = Number(producto?.precio_base) || 0;
  const tachado = producto?.precio_tachado ? Number(producto.precio_tachado) : null;

  return {
    slug: draft?.slug,
    // El nombre del COMERCIO, nunca el del producto: es lo que va en el
    // header y en el "© 2026 …" del pie.
    nombreComercio: tienda?.nombre || draft?.titulo || 'Mi tienda',
    logo: tienda?.logo ? getMediaUrl(tienda.logo) : null,
    tema: temaDe(draft),
    producto: producto ? {
      id: producto.id,
      nombre: producto.nombre,
      descripcion_larga: producto.descripcion_larga || producto.descripcion_corta || '',
      imagenes: (imagenes || []).map(i => getMediaUrl(i.url)),
      precio: precioBase,
      precio_antes: tachado,
      descuento_pct: tachado && tachado > precioBase
        ? Math.round((1 - precioBase / tachado) * 100)
        : 0,
      // Solo cuenta como oferta con vencimiento si hay un descuento activo
      // Y una fecha real de fin — si no, el template no muestra countdown.
      oferta_termina: (Number(producto.descuento_porcentaje) > 0 && producto.descuento_fin) || null,
      stock: producto.cantidad_disponible,
      variantes: (variantes || []).filter(v => v.activo !== false).map(v => ({
        id: v.id,
        nombre: v.nombre,
        stock: v.stock,
        precio_efectivo: precioBase + (Number(v.precio_diferencial) || 0),
        imagenes: [],
      })),
    } : null,
    contenido: draft?.content || {},
    beneficios: (draft?.beneficios || []).map(b => ({ titulo: b.titulo, texto: b.texto })),
    opiniones: (draft?.testimonios || []).map(t => ({
      nombre: t.nombre, calificacion: t.calificacion, comentario: t.comentario,
    })),
    faq: (draft?.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })),
    contacto: { whatsapp: draft?.contacto_whatsapp || tienda?.whatsapp || '' },
  };
}

/**
 * PÚBLICO — desde el DTO de obtenerLandingPublica(). El backend ya
 * resolvió precio efectivo, variantes, stock e imágenes (ver
 * landing.service.js#obtenerPublica, que sintetiza el item del embudo a
 * partir de Landing.producto_id), así que acá solo se reacomoda la forma.
 */
export function mapPublicDtoToFunnelData(dto) {
  const item = dto?.items?.[0] || null;

  return {
    slug: dto?.slug,
    nombreComercio: dto?.tienda?.nombre || dto?.titulo || 'Mi tienda',
    logo: dto?.logo_imagen ? getMediaUrl(dto.logo_imagen) : null,
    tema: {
      fondo: dto?.tema?.fondo || null,
      texto: dto?.tema?.texto || null,
      acento: dto?.tema?.primario || null,
    },
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
