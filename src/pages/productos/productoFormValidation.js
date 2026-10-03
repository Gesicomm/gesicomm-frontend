const CAMPOS = {
  nombre: { tab: 'basica', label: 'Nombre', id: 'prod-nombre' },
  sku: { tab: 'basica', label: 'SKU', id: 'prod-sku' },
  precio_base: { tab: 'comercial', label: 'Precio de venta', id: 'prod-precio-base' },
};

export function erroresDelProducto(errors, prefix = '') {
  return Object.entries(errors || {}).flatMap(([key, error]) => {
    if (!error || key === 'ref') return [];
    const campo = prefix ? `${prefix}.${key}` : key;
    if (error.message || error.type) {
      const meta = CAMPOS[campo] || {
        tab: /^(variantes|opciones|stock_)/.test(campo) ? 'stock' : 'basica',
        label: campo,
      };
      return [{ campo, ...meta, message: error.message || 'Revisá este campo.' }];
    }
    return erroresDelProducto(error, campo);
  });
}

// Referencia local del producto nuevo; nunca se persiste como ID.
export const PRODUCTO_NUEVO = -1;

export function ofertaBorradorPayload(oferta) {
  const { id, imagen_archivo, ...payload } = oferta;
  return {
    ...payload,
    // Las URL blob son previews locales, no imágenes publicables.
    imagen_url: payload.imagen_url?.startsWith('blob:') ? null : payload.imagen_url,
    componentes: payload.componentes.map(c => Number(c.producto_id) === PRODUCTO_NUEVO
      ? { ...c, producto_id: null, es_producto_actual: true }
      : c),
  };
}
