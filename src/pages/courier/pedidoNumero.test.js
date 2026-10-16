import { numeroPedidoVisible } from './pedidoNumero';

test('muestra las primeras tres letras con guion y secuencia desde 1001', () => {
  expect(numeroPedidoVisible({ id: 900, numero_pedido: 1, tienda_nombre: 'Casa López' })).toBe('CAS-1001');
  expect(numeroPedidoVisible({ numero_pedido: 2, Tienda: { nombre: 'Casa López' } })).toBe('CAS-1002');
});

test('abrevia también respuestas con el nombre completo y admite nombres cortos', () => {
  expect(numeroPedidoVisible({ numero_pedido_visible: 'Alibaguay-1001' })).toBe('ALI-1001');
  expect(numeroPedidoVisible({ numero_pedido_visible: 'ALI-1002' })).toBe('ALI-1002');
  expect(numeroPedidoVisible({ numero_pedido_tienda: 1, tienda_nombre: 'AB' })).toBe('AB-1001');
  expect(numeroPedidoVisible({ numero_pedido_tienda: 2, tienda_nombre: 'X' })).toBe('X-1002');
});

test('Alibaguay empieza en 1001 aunque los correlativos de la cuenta sean 3 y 4', () => {
  expect(numeroPedidoVisible({ id: 3, tienda_id: 9, numero_pedido: 3, numero_pedido_tienda: 1, tienda_nombre: 'Alibaguay' })).toBe('ALI-1001');
  expect(numeroPedidoVisible({ id: 4, tienda_id: 9, numero_pedido: 4, numero_pedido_tienda: 2, tienda_nombre: 'Alibaguay' })).toBe('ALI-1002');
  expect(numeroPedidoVisible({ id: 4, tienda_id: 9, numero_pedido: 4, tienda_nombre: 'Alibaguay' })).toBe('—');
});

test('respeta la referencia de la API y no usa el id técnico como correlativo', () => {
  expect(numeroPedidoVisible({ id: 900, numero_pedido: 1, numero_pedido_visible: 'MIT-1001' })).toBe('MIT-1001');
  expect(numeroPedidoVisible({ id: 900 })).toBe('—');
});


test('los leads tienen referencia de contacto sin número de pedido', () => {
  expect(numeroPedidoVisible({ id: 88, es_lead: true, numero_pedido: null, numero_pedido_tienda: null })).toBe('LEAD-88');
  expect(numeroPedidoVisible({ id: 88, es_lead: true, numero_pedido_visible: 'ALI-1001' })).toBe('LEAD-88');
});
