import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmacionPedidoWhatsappModal } from './ConfirmacionPedidoWhatsappModal';
import { etapaDePedido, estadoDePedido } from './orderLifecycle';

const pedido = {
  id: 40, estado: 'Confirmado', es_lead: false, numero_pedido_visible: 'MIT-1001',
  nombre_cliente: 'Ana', telefono: '0981111222', monto: 150000,
  direccion: 'Calle 123', ciudad: 'Luque', pago_anticipado: false,
  items: [{ nombre_producto: 'Silla', cantidad: 2 }, { nombre_producto: 'Mesa', cantidad: 1 }],
};

test('ofrece el resumen completo de un pedido que ya está pendiente de preparación en Logística', () => {
  render(<ConfirmacionPedidoWhatsappModal open envio={pedido} onClose={() => {}} />);
  const texto = screen.getByRole('textbox', { name: 'Resumen para WhatsApp' }).value;
  expect(texto).toContain('Silla x2, Mesa');
  expect(texto).toContain('150.000 Gs');
  expect(texto).toContain('Calle 123, Luque');
  expect(texto).toContain('Pago: Contra entrega');
  expect(screen.getByText(/Ya está en Gestión Logística, pendiente de preparación/)).toBeInTheDocument();
  expect(etapaDePedido(pedido)).toBe('logistica');
  expect(estadoDePedido(pedido).label).toBe('Pendiente de preparación');
  const enlace = screen.getByRole('link', { name: 'Enviar resumen por WhatsApp' });
  expect(decodeURIComponent(enlace.href)).toContain(texto);
});

test('cerrar el resumen conserva el pedido confirmado en Logística', () => {
  const onClose = vi.fn();
  render(<ConfirmacionPedidoWhatsappModal open envio={pedido} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
  expect(onClose).toHaveBeenCalled();
  expect(pedido.estado).toBe('Confirmado');
  expect(etapaDePedido(pedido)).toBe('logistica');
});

test('respeta la plantilla personalizada y agrega entrega y pago anticipado', () => {
  render(<ConfirmacionPedidoWhatsappModal open envio={{ ...pedido, pago_anticipado: true, metodo_pago: 'Transferencia' }} tienda={{ mensaje_confirmacion_pedido: '{cliente}: {producto}. Total {total}' }} onClose={() => {}} />);
  const texto = screen.getByRole('textbox').value;
  expect(texto).toContain('Ana: Silla x2, Mesa. Total 150.000 Gs');
  expect(texto.match(/Silla/g)).toHaveLength(1);
  expect(texto).toContain('Pago: Anticipado · Transferencia');
});
