export function precioOfertaCheckout(oferta) {
  return Number(
    oferta?.precio_efectivo
    ?? oferta?.precio_order_bump
    ?? oferta?.precio_normal
    ?? oferta?.precio
    ?? 0
  ) || 0;
}

export function precioVentaProducto(producto) {
  return Number(
    producto?.precio_efectivo
    ?? producto?.precio_usuario
    ?? producto?.precio_base
    ?? producto?.precio
    ?? producto?.precio_normal
    ?? 0
  ) || 0;
}

export function precioNormalOfertaCheckout(oferta) {
  const complementario = oferta?.producto_complementario || oferta?.productos_incluidos?.[0] || null;
  const precioComplementario = precioVentaProducto(complementario);
  const precioOferta = Number(oferta?.precio_normal ?? oferta?.precio ?? 0) || 0;
  return ['order_bump', 'upsell'].includes(oferta?.estrategia) && precioComplementario > 0
    ? precioComplementario
    : precioOferta;
}

export function detalleOfertaCheckout(oferta) {
  const complementario = oferta?.producto_complementario || oferta?.productos_incluidos?.[0] || null;
  const imagen = oferta?.imagen || oferta?.imagen_url || complementario?.imagen || null;
  const precioNormal = precioNormalOfertaCheckout(oferta);
  const precioFinal = precioOfertaCheckout(oferta);
  return { complementario, imagen, precioNormal, precioFinal };
}

export function ofertaCheckoutPublicable(oferta) {
  if (!oferta || !['order_bump', 'upsell'].includes(oferta.estrategia)) return false;
  const detalle = detalleOfertaCheckout(oferta);
  return Boolean(
    detalle.complementario
    && detalle.imagen
    && detalle.precioFinal > 0
    && (detalle.precioNormal <= 0 || detalle.precioFinal <= detalle.precioNormal)
  );
}

export function ordenarOfertasCheckout(ofertas = [], idsConfigurados = new Set()) {
  return [...ofertas].sort((a, b) => {
    const aConfigurada = idsConfigurados.has(Number(a.id)) ? 1 : 0;
    const bConfigurada = idsConfigurados.has(Number(b.id)) ? 1 : 0;
    return bConfigurada - aConfigurada;
  });
}

/**
 * Cross-sell del carrito: otros productos del catálogo de la landing, a su
 * precio normal (no es una oferta). Solo los que se pueden sumar con un
 * toque — con imagen, precio, stock y sin variantes que elegir (esos
 * necesitan pasar por su ficha). Primero los de la misma categoría que lo
 * que ya está en el carrito.
 *
 * @param {Array} catalogo       items públicos de la landing (catalogo_items)
 * @param {Array} itemsCarrito   valores del Map del carrito ({ contentId })
 */
export function calcularCrossSells(catalogo = [], itemsCarrito = [], max = 3) {
  if (!itemsCarrito.length || !catalogo.length) return [];
  const enCarrito = new Set(itemsCarrito.map(it => it.contentId));
  // Lo que ya se ofrece como bump/upsell de algo del carrito no se repite
  // acá a precio lleno: se vería el mismo producto a dos precios. El DTO
  // del complemento no trae id, así que se compara por nombre.
  const nombreClave = n => String(n || '').trim().toLowerCase();
  const enOfertas = new Set(
    itemsCarrito.flatMap(it => {
      const ofertas = catalogo.find(i => i.content_id === it.contentId)?.ofertas || [];
      return ofertas.flatMap(o => [o.producto_complementario, ...(o.productos_incluidos || [])])
        .filter(Boolean)
        .map(c => nombreClave(c.nombre));
    })
  );
  const categorias = new Set(
    itemsCarrito
      .map(it => catalogo.find(i => i.content_id === it.contentId)?.categoria)
      .filter(Boolean)
  );
  return catalogo
    .filter(i => !enCarrito.has(i.content_id)
      && !enOfertas.has(nombreClave(i.nombre))
      && Number(i.precio) > 0
      && i.imagen
      && !(i.variantes?.length)
      && (i.stock == null || i.stock > 0))
    .sort((a, b) => (categorias.has(b.categoria) ? 1 : 0) - (categorias.has(a.categoria) ? 1 : 0))
    .slice(0, max);
}
