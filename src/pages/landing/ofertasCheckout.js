export function precioOfertaCheckout(oferta) {
  return Number(
    oferta?.precio_efectivo
    ?? oferta?.precio_order_bump
    ?? oferta?.precio_normal
    ?? oferta?.precio
    ?? 0
  ) || 0;
}

export function detalleOfertaCheckout(oferta) {
  const complementario = oferta?.producto_complementario || oferta?.productos_incluidos?.[0] || null;
  const imagen = oferta?.imagen || oferta?.imagen_url || complementario?.imagen || null;
  const precioNormal = Number(oferta?.precio_normal ?? oferta?.precio ?? 0) || 0;
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
