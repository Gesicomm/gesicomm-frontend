import { ofertaService } from '../../services/ofertaService';
import { funnelService } from '../../services/funnelService';

/** Slug del template que ofrece un complemento durante la compra. */
export const SLUG_VENTA_COMPLEMENTO = 'venta-complemento';

/**
 * El complemento de un embudo es, por debajo, una Oferta con
 * estrategia='order_bump'. El comercio nunca ve eso: elige "qué producto
 * ofrecer y a qué precio" y este helper lo traduce.
 *
 * Detalle que importa: los componentes llevan SOLO el producto
 * complementario, no el principal. El checkout suma esta oferta como una
 * línea aparte del producto que ya se está comprando (ver comprarAhora en
 * LandingPublica.jsx), así que incluir el principal acá le entregaría al
 * cliente dos unidades y descontaría stock de más.
 *
 * tipo_contenido='combo' porque un "pack" solo admite el propio producto
 * ancla como componente (ver oferta.service.js#validarComponentesParaTipo).
 */
export function armarPayloadComplemento({
  nombreComplemento, complementoId, precio, precioLista, descripcion,
  cantidad = 1, codigoExistente, productoId,
}) {
  const bump = Number(precio) || 0;
  // Los dos precios existen a propósito (ver Oferta.js): precio_normal es el
  // de referencia (lo que vale por su canal habitual) y precio_order_bump es
  // el promocional que se cobra al aceptarlo en el checkout. El tachado del
  // checkout se dibuja SOLO si el normal es mayor — si el comercio no carga
  // un precio de lista, ambos quedan iguales y no se tacha nada (no se
  // inventa un "antes" que nunca existió).
  const lista = Number(precioLista) || 0;
  return {
    codigo: codigoExistente || `CMP-${productoId}-${Date.now().toString(36).toUpperCase()}`,
    nombre: `Complemento — ${nombreComplemento}`,
    tipo_contenido: 'combo',
    estrategia: 'order_bump',
    precio_normal: lista > bump ? lista : bump,
    precio_order_bump: bump,
    descripcion: descripcion?.trim() || null,
    activo: true,
    componentes: [{ producto_id: Number(complementoId), cantidad: Math.max(1, Number(cantidad) || 1) }],
  };
}

/**
 * Crea (o actualiza) la oferta del complemento y la deja enlazada al embudo.
 * Devuelve el embudo ya actualizado.
 */
export async function guardarComplementoDelFunnel({
  funnel,
  productoId,
  complementoId,
  precio,
  precioLista,
  descripcion,
  cantidad,
  nombreComplemento,
  ofertaExistente = null,
}) {
  const payload = armarPayloadComplemento({
    nombreComplemento,
    complementoId,
    precio,
    precioLista,
    descripcion,
    cantidad,
    productoId,
    codigoExistente: ofertaExistente?.codigo,
  });

  const oferta = ofertaExistente
    ? await ofertaService.actualizar(ofertaExistente.id, payload)
    : await ofertaService.crear(productoId, payload);

  // Una sola oferta en el checkout: este embudo ofrece UN complemento, no
  // una lista. Reemplaza en vez de acumular para que cambiar de complemento
  // no deje el anterior colgado en el checkout.
  return funnelService.actualizar(funnel.id, {
    content: { ...(funnel.content || {}), ofertas_producto_vista: [oferta.id] },
  });
}

/** La oferta de complemento actualmente enlazada a este embudo, si existe. */
export function encontrarOfertaComplemento(funnel, ofertas) {
  const ids = new Set((funnel?.content?.ofertas_producto_vista || []).map(Number));
  if (!ids.size) return null;
  return (ofertas || []).find(o => ids.has(Number(o.id)) && o.estrategia === 'order_bump') || null;
}

/** El producto que se ofrece como complemento en esa oferta. */
export function productoDelComplemento(oferta, productoPrincipalId) {
  const comp = (oferta?.componentes || []).find(
    c => Number(c.producto_id) !== Number(productoPrincipalId)
  ) || (oferta?.componentes || [])[0];
  return comp ? Number(comp.producto_id) : null;
}

/**
 * Todo lo configurable del complemento, leído de la Oferta — para precargar
 * el configurador sin que el comercio tenga que recargarlo a mano.
 */
export function leerConfigComplemento(oferta, productoPrincipalId) {
  if (!oferta) return null;
  const comp = (oferta.componentes || []).find(
    c => Number(c.producto_id) !== Number(productoPrincipalId)
  ) || (oferta.componentes || [])[0];
  if (!comp) return null;

  const bump = oferta.precio_order_bump ?? oferta.precio_normal ?? oferta.precio ?? null;
  const normal = oferta.precio_normal ?? oferta.precio ?? null;
  return {
    productoId: Number(comp.producto_id),
    precio: bump,
    // Solo se considera "precio de lista" si de verdad es mayor: si son
    // iguales no hay descuento que mostrar y el campo debe verse vacío.
    precioLista: normal != null && bump != null && normal > bump ? normal : null,
    descripcion: oferta.descripcion || '',
    cantidad: Number(comp.cantidad) || 1,
  };
}
