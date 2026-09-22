import API from './api';

export const ofertaService = {
  // soloActivas: la baja es lógica, así que por defecto la lista trae también
  // las dadas de baja (las necesita la pantalla de administración, que las
  // marca como inactivas). Quien solo muestra ofertas vigentes debe pedirlo.
  listarPorProducto: (productoId, { soloActivas = false } = {}) =>
    API.get(`/productos/${productoId}/ofertas`, { params: soloActivas ? { soloActivas: true } : {} }).then(r => r.data),

  crear: (productoId, payload) =>
    API.post(`/productos/${productoId}/ofertas`, payload).then(r => r.data),

  actualizar: (id, payload) =>
    API.put(`/ofertas/${id}`, payload).then(r => r.data),

  eliminar: (id) =>
    API.delete(`/ofertas/${id}`).then(r => r.data),

  // Imagen propia de la oferta — una sola (Oferta.imagen_url). Subir
  // reemplaza la anterior y el backend borra el archivo viejo del disco.
  // Quitarla no deja la tarjeta sin foto: vuelve a usarse la del producto.
  subirImagen: (id, archivo) => {
    const fd = new FormData();
    fd.append('imagen', archivo);
    return API.post(`/ofertas/${id}/imagen`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  quitarImagen: (id) =>
    API.delete(`/ofertas/${id}/imagen`).then(r => r.data),
};
export function ofertaAFormaPublica(o, productoAnclaId) {
  // Bump y upsell viven en el checkout; un paquete (estrategia 'normal') se
  // elige en la ficha del producto.
  const esCheckout = o.estrategia === 'order_bump' || o.estrategia === 'upsell';
  const componentes = o.componentes || [];
  const compPack = componentes.find(c => Number(c.producto_id) === Number(productoAnclaId)) || componentes[0];
  const unidades = o.tipo_contenido === 'pack' ? (Number(o.unidades ?? compPack?.cantidad) || null) : null;
  const comps = componentes.filter(c => Number(c.producto_id) !== Number(productoAnclaId));
  const productos_incluidos = comps.map(c => {
    const imgs = c.producto?.imagenes || [];
    const principal = imgs.find(i => i.es_principal) || imgs[0];
    return { nombre: c.producto?.nombre || null, imagen: principal?.url || null };
  }).filter(x => x.nombre);

  const precioNormal = Number(o.precio_normal ?? o.precio) || 0;
  const bump = (o.precio_order_bump === null || o.precio_order_bump === undefined)
    ? null : Number(o.precio_order_bump);

  return {
    id: o.id,
    nombre: o.nombre,
    estrategia: o.estrategia,
    tipo_contenido: o.tipo_contenido,
    descripcion: o.descripcion || null,
    // Imagen propia de la oferta (Oferta.imagen_url). El DTO público la
    // publica como `imagen` (ver landing.service.js), así que acá se traduce
    // igual: si no, la tarjeta del paquete se veía con foto en la landing
    // publicada y sin foto en el preview.
    imagen: o.imagen_url || null,
    precio: precioNormal,
    precio_normal: precioNormal,
    precio_order_bump: bump,
    precio_efectivo: esCheckout ? (bump ?? precioNormal) : precioNormal,
    beneficios: Array.isArray(o.beneficios) ? o.beneficios : null,
    unidades,
    producto_complementario: productos_incluidos[0] || null,
    productos_incluidos,
  };
}
