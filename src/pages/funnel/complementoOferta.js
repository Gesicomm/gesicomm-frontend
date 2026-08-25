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
export function armarPayloadComplemento({ nombreComplemento, complementoId, precio, codigoExistente, productoId }) {
  return {
    codigo: codigoExistente || `CMP-${productoId}-${Date.now().toString(36).toUpperCase()}`,
    nombre: `Complemento — ${nombreComplemento}`,
    tipo_contenido: 'combo',
    estrategia: 'order_bump',
    // Los dos precios existen a propósito (ver Oferta.js): el bump es lo
    // que se cobra al aceptarlo en el checkout.
    precio_normal: precio,
    precio_order_bump: precio,
    activo: true,
    componentes: [{ producto_id: Number(complementoId), cantidad: 1 }],
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
  nombreComplemento,
  ofertaExistente = null,
}) {
  const payload = armarPayloadComplemento({
    nombreComplemento,
    complementoId,
    precio,
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
