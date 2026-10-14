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
  crearCheckoutLanding: vi.fn().mockResolvedValue({ pedido_id: 9, numero_pedido: 12, purchase_event_id: 'purchase-9', monto: 100000 }),
  validarCuponLanding: vi.fn(),
}));

const { useStoreCart } = await import('./useStoreCart');

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
    await act(async () => { await result.current.confirmarPedido({ nombre_cliente: 'Ana' }); });
    expect(nombresTrackeados()).toEqual(['Purchase']);
    expect(trackearEvento.mock.calls[0][1]).toBe('purchase-9');
  });
});
