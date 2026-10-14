import { describe, expect, it } from 'vitest';
import { generarPreviewMensaje, armarLinkWhatsappCarrito } from './mensajeWhatsapp';

describe('generarPreviewMensaje', () => {
  it('usa la URL pública real de la tienda cuando se pasa en opciones', () => {
    const mensaje = generarPreviewMensaje('{url} Hola, quiero consultar por {producto}.', {
      url: 'llevatelofacil.shop',
    });

    expect(mensaje).toBe('llevatelofacil.shop Hola, quiero consultar por Chomba Lacoste Clásica.');
    expect(mensaje).not.toContain('sommix.gesicomm.com');
  });
});

it('el WhatsApp del checkout usa la referencia de la tienda, nunca la secuencia compartida', () => {
  const link = armarLinkWhatsappCarrito({ whatsapp: '595981111222' }, [{ nombre: 'Remera', cantidad: 1, precio: 50000 }], {
    pedido_id: 900, tienda_id: 9, numero_pedido: 3, numero_pedido_tienda: 1, tienda_nombre: 'Alibaguay',
  });
  expect(decodeURIComponent(link)).toContain('pedido #ALI-1001');
});
