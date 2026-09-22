import { getMediaUrl } from '../../services/api';

/**
 * Galería de una tarjeta de producto, ya resuelta a URLs absolutas y con la
 * principal primero. Cae a `imagen` sola cuando el origen no manda galería
 * (items viejos en cache, combos sin producto padre), así el componente de
 * la tarjeta nunca tiene que distinguir los dos casos.
 */
export function galeriaTarjetaDeItem(item) {
  const urls = (item?.imagenes || []).map(urlTarjetaDeMedio).filter(Boolean);
  if (!urls.length) return item?.imagen ? [getMediaUrl(item.imagen)] : [];
  return urls.map(getMediaUrl);
}

export function urlTarjetaDeMedio(medio) {
  if (!medio) return null;
  if (typeof medio === 'string') return medio;
  if (medio.tipo === 'video') return medio.portada || medio.miniatura || null;
  return medio.url || medio.imagen || medio.src || null;
}

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

/**
 * Desde el detalle que devuelve landingSimpleService (editor:
 * crear/obtener/actualizar) + catálogo del picker + la tienda (Mi tienda),
 * de donde sale la plantilla del mensaje de WhatsApp.
 */
export function mapEditorDraftToTemplateData(draft, catalogo, tienda) {
  const porClave = new Map();
  (catalogo?.productos || []).forEach(p => porClave.set(`producto:${p.id}`, p));
  (catalogo?.combos || []).forEach(c => porClave.set(`combo:${c.id}`, c));

  // El preview del home solo muestra los items con mostrar_en_inicio (mismo
  // filtro que aplica el backend en obtenerPublica) — el resto solo
  // aparece en la página de Catálogo completo (/catalogo), no acá.
  // Un item cuyo producto ya no está en el catálogo (dado de baja, o de otro
  // comercio) no llega nunca a la landing publicada: el backend lo filtra al
  // armar itemsDto. El preview lo dibujaba igual como "(producto no
  // disponible)", así que el comercio veía una tarjeta fantasma que además
  // le corría la grilla respecto de la página real.
  const productos = (draft?.items || [])
    .filter(item => item.mostrar_en_inicio !== false)
    .filter(item => porClave.has(`${item.tipo}:${item.referencia_id}`))
    .map(item => {
      const c = porClave.get(`${item.tipo}:${item.referencia_id}`);
      const finalId = c?.slug ? c.slug : `${item.tipo}:${item.referencia_id}`;
      return {
        id: finalId,
        nombre: c?.nombre || '(producto no disponible)',
        precio: c?.precio_efectivo ?? c?.precio_base ?? null,
        precioAntes: item.precio_ancla ? Number(item.precio_ancla) : (c?.precio_tachado ? Number(c.precio_tachado) : null),
        imagen: c?.imagen ? getMediaUrl(c.imagen) : null,
        // Galería completa: la tarjeta la rota al pasar el mouse por encima
        // (ver ImagenProductoHover). `imagen` sigue siendo la principal.
        imagenes: galeriaTarjetaDeItem(c),
        etiqueta: item.etiqueta || null,
        envioIncluido: item.envio_incluido === true,
        // stock y tieneOpciones deciden qué botón dibuja la tarjeta (ver
        // AccionesProducto en templates/sections.jsx). Sin ellos el preview
        // mostraba "Agregar al carrito" en productos que en la publicada
        // llevan al detalle, o los daba por disponibles estando sin stock.
        stock: c?.cantidad_disponible ?? c?.stock ?? null,
        tieneOpciones: !!(c?.variantes?.length || (c?.ofertas || []).some(o => o.estrategia === 'normal')),
      };
    });

  return {
    slug: draft?.slug,
    nombreComercio: draft?.titulo || '',
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
      // La plantilla del mensaje vive en Mi tienda y los dos toggles en la
      // landing — mismas dos fuentes que usa el DTO público. Sin esto el
      // link de WhatsApp del preview salía con el texto por defecto y el de
      // la landing publicada con el que el comercio configuró.
      mensaje: tienda?.mensaje_contacto || '',
      incluir_precio: !!draft?.whatsapp_incluir_precio,
      incluir_url: !!draft?.whatsapp_incluir_url,
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
    // Solo lo configurado EN ESTA LANDING (panel Marca). Antes caía a
    // Tienda.nombre, así que una landing sin nombre propio mostraba en la
    // publicada el nombre del comercio configurado en Mi tienda mientras el
    // preview del editor lo mostraba vacío — la misma landing, dos textos.
    nombreComercio: dto?.titulo || '',
    logo: dto?.logo_imagen ? getMediaUrl(dto.logo_imagen) : null,
    hero: {
      // La portada muestra el título del BANNER y nada más. Caer a
      // dto.titulo hacía que el nombre del comercio se colara como titular
      // del hero sin que nadie lo hubiera escrito ahí.
      titulo: dto?.banner?.titulo || '',
      subtitulo: dto?.banner?.subtitulo || '',
      imagen: dto?.banner?.imagen ? getMediaUrl(dto.banner.imagen) : null,
      ctaTexto: dto?.banner?.boton_texto || '',
      ctaLink: dto?.banner?.boton_link || '',
      // Viene dentro de `banner`, no en la raíz del DTO: leerlo de la raíz
      // daba undefined siempre y la publicada ignoraba la opacidad elegida.
      opacidad: dto?.banner?.opacidad,
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
      imagenes: galeriaTarjetaDeItem(i),
      etiqueta: i.etiqueta || null,
      envioIncluido: i.envio_incluido === true,
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
