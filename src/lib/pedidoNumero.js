export function numeroPedidoVisible(envio) {
  if (envio?.numero_pedido_visible) {
    const referencia = String(envio.numero_pedido_visible).match(/^(.*)-(\d+)$/);
    if (referencia) return `${Array.from(referencia[1].toUpperCase().replace(/\s/g, '')).slice(0, 3).join('')}-${referencia[2]}`;
  }
  const numero = Number(envio?.numero_pedido_tienda ?? (envio?.tienda_id ? null : envio?.numero_pedido));
  if (!Number.isInteger(numero) || numero <= 0) return "—";
  const tienda = String(envio?.tienda_nombre || envio?.Tienda?.nombre || envio?.tienda?.nombre || "Sin tienda").trim();
  const prefijo = Array.from(tienda.toUpperCase().replace(/\s/g, '')).slice(0, 3).join('');
  return `${prefijo}-${1000 + numero}`;
}
