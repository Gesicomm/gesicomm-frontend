// Cuando un EnvioItem viene de una oferta (order bump, upsell o paquete),
// el backend guarda `nombre_producto` ya combinado: "Producto — Nombre de
// la oferta" (ver PricingService.resolverPrecioItem en el backend; el
// armador manual de NuevoPedidoModal hace el mismo combinado al vender).
// `oferta_nombre` guarda esa misma segunda mitad por separado para
// reportería. Mostrar los dos tal cual deja el nombre de la oferta
// duplicado en pantalla — este helper separa el nombre base del producto
// para no repetirlo.
export function nombreBaseItem(item) {
  const nombre = item?.nombre_producto || "";
  const oferta = item?.oferta_nombre;
  const sufijo = oferta ? ` — ${oferta}` : null;
  if (sufijo && nombre.endsWith(sufijo)) {
    return nombre.slice(0, -sufijo.length);
  }
  return nombre;
}

// Paquete (pack por cantidad) usa `estrategia='normal'`, igual que una
// venta sin oferta — la única diferencia es que sí tiene oferta_id/nombre.
// Por eso no alcanza con mirar origen_venta solo.
export function tipoLineaItem(item) {
  if (!item?.oferta_nombre) return null;
  if (item.origen_venta === "order_bump" || item.origen_venta === "upsell") return "Upsell";
  if (item.origen_venta === "combo" || (item.Ofertum || item.Oferta)?.tipo_contenido === 'combo') return "Combo";
  return "Paquete";
}

// El snapshot ya tiene cantidades físicas totales: nunca multiplicarlo de
// nuevo. La receta de una oferta, en cambio, es por presentación comprada.
export function contenidoItem(item) {
  const cantidad = Number(item?.cantidad) || 1;
  const vendidos = item?.componentes_vendidos || [];
  // Sequelize infiere el alias singular "Ofertum" para el modelo Oferta.
  const receta = item?.oferta_componentes || item?.Ofertum?.componentes || item?.Oferta?.componentes || [];
  const fuente = vendidos.length ? vendidos : receta;
  const esOferta = Boolean(item?.oferta_id || item?.oferta_nombre || item?.origen_venta === 'combo');
  if (!fuente.length && esOferta) return { unidades: null, componentes: [], esOferta };
  const componentes = fuente.length ? fuente.map(c => ({
    producto_id: c.producto_id,
    nombre: c.producto?.nombre || (Number(c.producto_id) === Number(item.producto_id) ? nombreBaseItem(item) : `Producto #${c.producto_id}`),
    variante: c.variante?.nombre || (Number(c.producto_id) === Number(item.producto_id) ? item.Variante?.nombre : null) || (c.variante_id ? `Variante #${c.variante_id}` : null),
    cantidad: Number(c.cantidad) * (vendidos.length ? 1 : cantidad),
  })) : [{ producto_id: item.producto_id, nombre: nombreBaseItem(item), variante: item.Variante?.nombre, cantidad }];
  return { unidades: componentes.reduce((total, c) => total + c.cantidad, 0), componentes, esOferta };
}
