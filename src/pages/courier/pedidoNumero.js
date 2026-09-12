export function numeroPedidoVisible(envio) {
  return envio?.numero_pedido || envio?.id || "—";
}
