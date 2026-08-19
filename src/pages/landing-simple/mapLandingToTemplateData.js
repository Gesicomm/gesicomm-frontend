import { getMediaUrl } from '../../services/api';

/**
 * Forma canónica que consumen los 3 componentes de template rígido
 * (templates/FitnessTemplate.jsx, BeautyTemplate.jsx, TechTemplate.jsx).
 * Un único shape para que el preview del editor y la landing pública
 * rendericen exactamente el mismo componente con exactamente los mismos
 * datos — nunca pueden divergir.
 *
 * @typedef {object} TemplateData
 * @property {string} nombreComercio
 * @property {string|null} logo
 * @property {{titulo:string, subtitulo:string, imagen:string|null, ctaTexto:string, ctaLink:string}} hero
 * @property {Array<{id:string, nombre:string, precio:number|null, precioAntes:number|null, imagen:string|null}>} productos
 * @property {{whatsapp:string, telefono:string, email:string, direccion:string, instagram:string, facebook:string}} contacto
 * @property {Array<{pregunta:string, respuesta:string}>} faq
 * @property {Array<{titulo:string, texto:string}>} beneficios
 * @property {{titulo:string, texto:string}} contenidoAdicional
 * @property {{fondo:string|null, texto:string|null, acento:string|null}} tema — null = el template usa su paleta default.
 */

/** Desde el detalle que devuelve landingSimpleService (editor: crear/obtener/actualizar) + catálogo del picker. */
export function mapEditorDraftToTemplateData(draft, catalogo) {
  const porClave = new Map();
  (catalogo?.productos || []).forEach(p => porClave.set(`producto:${p.id}`, p));
  (catalogo?.combos || []).forEach(c => porClave.set(`combo:${c.id}`, c));

  // El preview del home solo muestra los items con mostrar_en_inicio (mismo
  // filtro que aplica el backend en obtenerPublica) — el resto solo
  // aparece en la página de Catálogo completo (/catalogo), no acá.
  const productos = (draft?.items || [])
    .filter(item => item.mostrar_en_inicio !== false)
    .map(item => {
      const c = porClave.get(`${item.tipo}:${item.referencia_id}`);
      const finalId = c?.slug ? c.slug : `${item.tipo}:${item.referencia_id}`;
      return {
        id: finalId,
        nombre: c?.nombre || '(producto no disponible)',
        precio: c?.precio_efectivo ?? c?.precio_base ?? null,
        precioAntes: item.precio_ancla ? Number(item.precio_ancla) : (c?.precio_tachado ? Number(c.precio_tachado) : null),
        imagen: c?.imagen ? getMediaUrl(c.imagen) : null,
        etiqueta: item.etiqueta || null,
      };
    });

  return {
    slug: draft?.slug,
    nombreComercio: draft?.titulo,
    logo: draft?.logo_imagen ? getMediaUrl(draft.logo_imagen) : null,
    hero: {
      titulo: draft?.banner_titulo || '',
      subtitulo: draft?.banner_subtitulo || '',
      imagen: draft?.banner_imagen ? getMediaUrl(draft.banner_imagen) : null,
      ctaTexto: draft?.banner_boton_texto || '',
      ctaLink: draft?.banner_boton_link || '',
      opacidad: draft?.banner_opacidad,
    },
    productosTitulo: draft?.productos_titulo || 'Productos destacados',
    // Propios de la página /catalogo, independientes de productosTitulo.
    catalogoTitulo: draft?.catalogo_titulo || '',
    catalogoDescripcion: draft?.catalogo_descripcion || '',
    productos,
    contacto: {
      whatsapp: draft?.contacto_whatsapp || '',
      telefono: draft?.contacto_telefono || '',
      email: draft?.contacto_email || '',
      direccion: draft?.contacto_direccion || '',
      ciudad: draft?.contacto_ciudad || '',
      pais: draft?.contacto_pais || '',
      horarios: draft?.contacto_horarios || '',
      instagram: draft?.contacto_instagram || '',
      facebook: draft?.contacto_facebook || '',
      tiktok: draft?.contacto_tiktok || '',
      youtube: draft?.contacto_youtube || '',
      twitter: draft?.contacto_twitter || '',
    },
    faq: (draft?.faq || []).map(f => ({ pregunta: f.pregunta, respuesta: f.respuesta })),
    beneficios: (draft?.beneficios || []).map(b => ({ titulo: b.titulo, texto: b.texto, icono: b.icono })),
    contenidoAdicional: {
      titulo: draft?.contenido_titulo || '',
      texto: draft?.contenido_texto || '',
    },
    tema: {
      fondo: draft?.color_fondo || null,
      texto: draft?.color_texto || null,
      acento: draft?.color_primario || null,
    },
  };
}

/** Desde el DTO público (GET /api/l/:slug, LandingService.obtenerPublica). */
export function mapPublicDtoToTemplateData(dto) {
  return {
    slug: dto?.slug,
    nombreComercio: dto?.titulo || dto?.tienda?.nombre,
    logo: dto?.logo_imagen ? getMediaUrl(dto.logo_imagen) : null,
    hero: {
      titulo: dto?.banner?.titulo || dto?.titulo || '',
      subtitulo: dto?.banner?.subtitulo || '',
      imagen: dto?.banner?.imagen ? getMediaUrl(dto.banner.imagen) : null,
      ctaTexto: dto?.banner?.boton_texto || '',
      ctaLink: dto?.banner?.boton_link || '',
      opacidad: dto?.banner_opacidad,
    },
    productosTitulo: dto?.productos_titulo || 'Productos destacados',
    catalogoTitulo: dto?.catalogo_titulo || '',
    catalogoDescripcion: dto?.catalogo_descripcion || '',
    productos: (dto?.items || []).map(i => ({
      id: i.content_id,
      nombre: i.nombre,
      precio: i.precio,
      precioAntes: i.precio_antes,
      imagen: i.imagen ? getMediaUrl(i.imagen) : null,
      etiqueta: i.etiqueta || null,
      stock: i.stock,
      // Con variantes u ofertas hay que elegir una opción antes de agregar
      // al carrito — el botón de la tarjeta lleva al detalle en ese caso
      // (ver AccionesProducto en templates/sections.jsx).
      tieneOpciones: !!(i.variantes?.length || (i.ofertas || []).some(o => o.estrategia === 'normal')),
    })),
    contacto: {
      whatsapp: dto?.contacto_whatsapp || dto?.contacto_landing?.whatsapp || '',
      telefono: dto?.contacto_telefono || dto?.contacto_landing?.telefono || '',
      email: dto?.contacto_email || dto?.contacto_landing?.email || '',
      direccion: dto?.contacto_direccion || dto?.contacto_landing?.direccion || '',
      ciudad: dto?.contacto_landing?.ciudad || '',
      pais: dto?.contacto_landing?.pais || '',
      horarios: dto?.contacto_landing?.horarios || '',
      instagram: dto?.contacto_instagram || dto?.contacto_landing?.instagram || '',
      facebook: dto?.contacto_facebook || dto?.contacto_landing?.facebook || '',
      tiktok: dto?.contacto_tiktok || dto?.contacto_landing?.tiktok || '',
      youtube: dto?.contacto_youtube || dto?.contacto_landing?.youtube || '',
      twitter: dto?.contacto_twitter || dto?.contacto_landing?.twitter || '',
      // Plantilla de mensaje de WhatsApp configurada en Mi tienda
      // (Tienda.mensaje_contacto, placeholders {producto}/{precio}/{url} —
      // ver lib/mensajeWhatsapp.js). Faltaban acá, así que las landings
      // rígidas armaban el link con el texto por defecto e ignoraban lo
      // que el comercio configuró.
      mensaje: dto?.contacto?.mensaje || '',
      incluir_precio: !!dto?.contacto?.incluir_precio,
      incluir_url: !!dto?.contacto?.incluir_url,
    },
    faq: dto?.faq || [],
    beneficios: dto?.beneficios || [],
    contenidoAdicional: {
      titulo: dto?.contenido_titulo || '',
      texto: dto?.contenido_texto || '',
    },
    tema: {
      fondo: dto?.tema?.fondo || null,
      texto: dto?.tema?.texto || null,
      acento: dto?.tema?.primario || null,
    },
  };
}
