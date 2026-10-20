import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const trackearEvento = vi.fn();
const registrarEventoLanding = vi.fn().mockResolvedValue(undefined);

vi.mock('../../lib/metaPixel', () => ({
  generarEventId: () => 'ev-1',
  leerCookiesFacebook: () => ({ fbc: null, fbp: 'fb.1.2.3' }),
  trackearEvento: (...a) => trackearEvento(...a),
}));
vi.mock('../../lib/googleAnalytics', () => ({ trackearEventoGA: vi.fn() }));
vi.mock('../../lib/tiktokPixel', () => ({ trackearEventoTikTok: vi.fn() }));
vi.mock('../../services/landingPublicaService', () => ({
  registrarEventoLanding: (...a) => registrarEventoLanding(...a),
  recalcularCarritoLanding: vi.fn().mockResolvedValue({ total: 100000, descuentos_aplicados: [] }),
  crearCheckoutLanding: vi.fn().mockResolvedValue({ pedido_id: 9, numero_pedido: 12, numero_pedido_tienda: 1, tienda_id: 9, tienda_nombre: 'Alibaguay', numero_pedido_visible: 'ALI-1001', purchase_event_id: 'purchase-9', monto: 100000 }),
  validarCuponLanding: vi.fn(),
}));

const { useStoreCart } = await import('./useStoreCart');
const { crearCheckoutLanding, recalcularCarritoLanding } = await import('../../services/landingPublicaService');

const item = { tipo: 'producto', referencia_id: 7, content_id: 'producto-7', nombre: 'Remera', precio: 50000, imagenes: [] };
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

function nombresTrackeados() {
  return trackearEvento.mock.calls.map(c => c[0]);
}

beforeEach(() => {
  localStorage.clear();
  trackearEvento.mockClear();
  registrarEventoLanding.mockClear();
});

describe('useStoreCart — InitiateCheckout', () => {
  it('alterna el descuento anticipado sin perder el precio original ni acumular redondeos', () => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.agregarAlCarrito({ item, cantidad: 2, precio: 45000, descuentoBotonPct: 10, precioAntesBoton: 50000 }));
    const linea = () => Array.from(result.current.carrito.values())[0];
    expect(linea().precio).toBe(45000);
    act(() => result.current.cambiarMetodoPago('efectivo'));
    expect(linea()).toMatchObject({ precio: 50000, descuentoBotonPct: null });
    act(() => result.current.cambiarMetodoPago('pagopar'));
    expect(linea()).toMatchObject({ precio: 45000, descuentoBotonPct: 10 });
    act(() => result.current.cambiarMetodoPago('contra_entrega'));
    expect(linea()).toMatchObject({ precio: 50000, cantidad: 2 });
  });

  it.each(['efectivo', 'contra_entrega', 'pagopar'])('confirma con el descuento que corresponde al método final %s', async (metodo) => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.agregarAlCarrito({ item, cantidad: 1, precio: 45000, descuentoBotonPct: 10, precioAntesBoton: 50000 }));
    // La confirmación vuelve a comprobar el método, incluso sin un evento change previo.
    await act(async () => result.current.confirmarPedido({ nombre_cliente: 'Ana', payment_method: metodo }));
    const pct = metodo === 'pagopar' ? 10 : undefined;
    expect(recalcularCarritoLanding).toHaveBeenLastCalledWith('tienda', [expect.objectContaining({ descuento_boton_pct: pct })]);
    expect(crearCheckoutLanding).toHaveBeenLastCalledWith('tienda', expect.objectContaining({
      payment_method: metodo, items: [expect.objectContaining({ descuento_boton_pct: pct })],
    }));
  });

  it('sale al iniciar el checkout, con el valor del carrito, y una sola vez por carrito', () => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.agregarAlCarrito({ item, cantidad: 2, precio: 50000 }));
    trackearEvento.mockClear();

    act(() => result.current.iniciarCheckout());
    act(() => result.current.iniciarCheckout());

    expect(nombresTrackeados()).toEqual(['InitiateCheckout']);
    expect(trackearEvento.mock.calls[0][2]).toEqual(expect.objectContaining({
      content_ids: ['producto-7'], value: 100000, currency: 'PYG', num_items: 2,
    }));
    expect(registrarEventoLanding).toHaveBeenCalledWith('tienda', expect.objectContaining({ event_name: 'InitiateCheckout', fbp: 'fb.1.2.3' }));
  });

  it('si cambia el carrito, es otro inicio', () => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.agregarAlCarrito({ item, cantidad: 1, precio: 50000 }));
    act(() => result.current.iniciarCheckout());
    act(() => result.current.agregarAlCarrito({ item, cantidad: 1, precio: 50000 }));
    trackearEvento.mockClear();
    act(() => result.current.iniciarCheckout());
    expect(nombresTrackeados()).toEqual(['InitiateCheckout']);
  });

  it('con el carrito vacío no sale nada', () => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.iniciarCheckout());
    expect(trackearEvento).not.toHaveBeenCalled();
  });

  it('confirmar el pedido manda Purchase y ya no InitiateCheckout', async () => {
    const { result } = renderHook(() => useStoreCart('tienda', {}, [item]), { wrapper });
    act(() => result.current.agregarAlCarrito({ item, cantidad: 2, precio: 50000 }));
    trackearEvento.mockClear();
    let checkout;
    await act(async () => { checkout = await result.current.confirmarPedido({ nombre_cliente: 'Ana' }); });
    expect(checkout).toMatchObject({ numero_pedido_visible: 'ALI-1001', numero_pedido_tienda: 1, tienda_id: 9 });
    expect(nombresTrackeados()).toEqual(['Purchase']);
    expect(trackearEvento.mock.calls[0][1]).toBe('purchase-9');
  });
});
