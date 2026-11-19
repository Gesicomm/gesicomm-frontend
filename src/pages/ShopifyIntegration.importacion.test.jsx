import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShopifyIntegration, { AvisosShopifyAviso, CotizacionTienda, ImportacionPedidosAviso } from './ShopifyIntegration';
import shopifyService from '../services/shopifyService';

// La sesión real devuelve siempre el mismo usuario; uno nuevo por render
// recargaría el estado sin parar.
const sesion = { usuario: { id: 1 }, cargando: false };
vi.mock('../hooks/useSesion', () => ({ default: () => sesion }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/shopifyService', () => ({
  default: { getStatus: vi.fn(), syncPedidos: vi.fn(), reintentarAvisos: vi.fn(async () => ({ reintentados: 1 })), listPedidos: vi.fn(async () => ({ pedidos: [] })), listClientes: vi.fn(async () => ({ clientes: [] })), listLogs: vi.fn(async () => ({ logs: [] })) },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('ImportacionPedidosAviso', () => {
  it('en curso: avance con total y porcentaje', () => {
    render(<ImportacionPedidosAviso importacion={{ estado: 'en_curso', procesados: 500, total: 1240, errores: 0 }} />);
    expect(screen.getByText('Importando el historial de pedidos')).toBeTruthy();
    expect(screen.getByText('500 de 1.240 pedidos · 40%')).toBeTruthy();
  });

  it('interrumpida: ofrece continuar desde donde quedó', () => {
    const onContinuar = vi.fn();
    render(<ImportacionPedidosAviso importacion={{ estado: 'interrumpido', procesados: 499, total: 620, errores: 1, reanudable: true }} onContinuar={onContinuar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar importación' }));
    expect(onContinuar).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/sin repetir los anteriores/)).toBeTruthy();
  });

  it('terminada con errores: dice cuántos y dónde mirar', () => {
    render(<ImportacionPedidosAviso importacion={{ estado: 'error', procesados: 619, total: 620, errores: 1 }} />);
    expect(screen.getByText('Historial importado con pedidos pendientes de revisar')).toBeTruthy();
    expect(screen.getByText(/1 pedido\(s\) no se pudieron importar/)).toBeTruthy();
  });

  it('sin importación previa no muestra nada', () => {
    const { container } = render(<ImportacionPedidosAviso importacion={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ShopifyIntegration: avance de la importación', () => {
  const tienda = (importacion) => ({ id: 7, shop_domain: 'tienda.myshopify.com', estado: 'conectado', currency: 'PYG', importacion_pedidos: importacion });

  it('relee el estado mientras importa y deja de hacerlo al terminar', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let actual = { estado: 'en_curso', procesados: 250, total: 600, errores: 0 };
    shopifyService.getStatus.mockImplementation(async () => ({ tiendas: [tienda(actual)], logs: [] }));

    render(<MemoryRouter><ShopifyIntegration /></MemoryRouter>);
    expect(await screen.findByText('250 de 600 pedidos · 42%')).toBeTruthy();

    actual = { estado: 'en_curso', procesados: 500, total: 600, errores: 0 };
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(await screen.findByText('500 de 600 pedidos · 83%')).toBeTruthy();

    actual = { estado: 'ok', procesados: 600, total: 600, errores: 0, terminado_at: '2026-11-19T18:00:00Z' };
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(await screen.findByText('Historial de pedidos importado')).toBeTruthy();
    const llamadas = shopifyService.getStatus.mock.calls.length;

    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(shopifyService.getStatus.mock.calls.length).toBe(llamadas);
  });

  it('el botón de pedidos queda deshabilitado mientras importa', async () => {
    shopifyService.getStatus.mockResolvedValue({ tiendas: [tienda({ estado: 'en_curso', procesados: 1, total: 10, errores: 0 })], logs: [] });
    render(<MemoryRouter><ShopifyIntegration /></MemoryRouter>);
    const boton = await screen.findByRole('button', { name: /Pedidos y ventas/ });
    expect(boton.disabled).toBe(true);
  });
});

describe('AvisosShopifyAviso: cambios que Gesicom manda a Shopify', () => {
  it('sin nada pendiente ni con error no muestra nada', () => {
    const { container } = render(<AvisosShopifyAviso avisos={{ pendientes: 0, errores: 0 }} />);
    expect(container.innerHTML).toBe('');
  });

  it('mientras manda, lo dice en una línea', () => {
    render(<AvisosShopifyAviso avisos={{ pendientes: 3, errores: 0 }} />);
    expect(screen.getByText('Mandando 3 cambios de pedidos a Shopify…')).toBeTruthy();
  });

  it('si falta un permiso, explica qué hacer y deja reintentar', () => {
    const onReintentar = vi.fn();
    render(<AvisosShopifyAviso avisos={{ pendientes: 0, errores: 1, ultimo_error: 'Falta un permiso en la app de Shopify: Access denied' }} onReintentar={onReintentar} />);
    expect(screen.getByText('1 cambio no llegó a Shopify')).toBeTruthy();
    expect(screen.getByText(/le falta un permiso/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('en la pantalla, Reintentar llama al servidor para esa tienda', async () => {
    shopifyService.getStatus.mockResolvedValue({ tiendas: [{ id: 7, shop_domain: 't.myshopify.com', estado: 'conectado', currency: 'PYG', avisos_a_shopify: { pendientes: 0, errores: 2, ultimo_error: 'Shopify API 503' } }], logs: [] });
    render(<MemoryRouter><ShopifyIntegration /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await act(async () => {});
    expect(shopifyService.reintentarAvisos).toHaveBeenCalledWith(7);
  });
});

describe('CotizacionTienda', () => {
  const tienda = (c) => ({ id: 7, cotizacion: { moneda_origen: 'USD', moneda_destino: 'PYG', modo: 'auto', misma_moneda: false, vigente: 7843, automatica: 7843, automatica_at: '2026-11-19T15:00:00Z', manual: 7800, usando_manual_por_falta: false, ...c } });

  it('automática: muestra la vigente, de cuándo es y la fuente', () => {
    render(<CotizacionTienda tienda={tienda()} onGuardar={() => {}} onActualizar={() => {}} />);
    expect(screen.getByText(/1 USD =/).textContent).toMatch(/7\.843 PYG · automática, del/);
    expect(screen.getByRole('radio', { name: 'Automática' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('link', { name: 'ExchangeRate-API' })).toBeTruthy();
  });

  it('sin automática tomada avisa que usa la manual', () => {
    render(<CotizacionTienda tienda={tienda({ vigente: 7800, automatica: null, automatica_at: null, usando_manual_por_falta: true })} onGuardar={() => {}} />);
    expect(screen.getByText(/mientras tanto se usa la manual/)).toBeTruthy();
  });

  it('pasar a manual y guardar un valor', () => {
    const onGuardar = vi.fn();
    const { rerender } = render(<CotizacionTienda tienda={tienda()} onGuardar={onGuardar} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Manual' }));
    expect(onGuardar).toHaveBeenCalledWith({ cotizacion_modo: 'manual' });
    rerender(<CotizacionTienda tienda={tienda({ modo: 'manual', vigente: 7800 })} onGuardar={onGuardar} />);
    fireEvent.change(screen.getByLabelText('1 USD ='), { target: { value: '7900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onGuardar).toHaveBeenLastCalledWith({ cotizacion_pyg: 7900 });
  });

  it('cambiar la moneda nacional', () => {
    const onGuardar = vi.fn();
    render(<CotizacionTienda tienda={tienda()} onGuardar={onGuardar} />);
    fireEvent.change(screen.getByLabelText(/Moneda nacional/), { target: { value: 'ARS' } });
    expect(onGuardar).toHaveBeenCalledWith({ moneda_destino: 'ARS' });
  });

  it('misma moneda: no ofrece cotización', () => {
    render(<CotizacionTienda tienda={tienda({ moneda_origen: 'PYG', misma_moneda: true })} onGuardar={() => {}} />);
    expect(screen.getByText(/no hace falta convertir/)).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Manual' })).toBeNull();
  });
});
